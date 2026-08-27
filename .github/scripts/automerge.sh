#!/usr/bin/env bash
#
# Drain the automerge queue. Per PR labelled $LABEL, lowest number first:
#
#   1. merge $BASE into the PR branch          (a conflict stops the drain)
#   2. bump the version on the PR branch
#   3. push, and wait for the builders on that prepared commit
#   4. wait for $BASE to be settled and green, then squash merge
#   5. tag the merge and publish its release
#
# Stop on the first failure. Both waits sit in front of step 4 so they
# overlap: $BASE releases the previous merge while this PR builds.
#
set -euo pipefail

REPO="${REPO:?}"
BASE="${BASE:?}"
LABEL="${LABEL:?}"
PKG_FILE="${PKG_FILE:?}"
VERSION_SH="${VERSION_SH:?}"
COAUTHORS_SH="${COAUTHORS_SH:?}"
REQUIRE_CHECKS="${REQUIRE_CHECKS:-true}"
REQUIRED_WORKFLOWS="${REQUIRED_WORKFLOWS:-}"
DELETE_BRANCH="${DELETE_BRANCH:-true}"
CREATE_RELEASE="${CREATE_RELEASE:-true}"
DRY_RUN="${DRY_RUN:-true}"
MAX_MERGES="${MAX_MERGES:-0}"
WAIT_TIMEOUT_MIN="${WAIT_TIMEOUT_MIN:-45}"
USING_PAT="${USING_PAT:-false}"
MYPLANET_LATEST="${MYPLANET_LATEST:-}"
MYPLANET_MIN="${MYPLANET_MIN:-}"

RUN_APPEAR_TIMEOUT_SEC=300
POLL_INTERVAL_SEC=20
PR_SETTLE_TIMEOUT_SEC=120

self_ref="${GITHUB_WORKFLOW_REF:-}"
self_ref="${self_ref%@*}"
SELF_WORKFLOW_PATH="${self_ref#*/*/}"
SELF_WORKFLOW_PATH="${SELF_WORKFLOW_PATH:-.github/workflows/automerge.yml}"
SELF_RUN_ID="${GITHUB_RUN_ID:-}"

log()     { printf '%s | %s\n' "$(date -u +%H:%M:%S)" "$*"; }
summary() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '%s\n' "$*" >> "$GITHUB_STEP_SUMMARY"; return 0; }

merged_count=0
merged_list=""
skip_numbers=""
last_base_sha=""

MAX_REPREPARES=2
reprep_pr=""
reprep_n=0

pick_pr() {
    gh pr list \
        --repo "$REPO" \
        --state open \
        --base "$BASE" \
        --label "$LABEL" \
        --limit 100 \
        --json number,title,isDraft,headRefName,headRefOid,headRepositoryOwner \
      | jq -c --arg skip "$skip_numbers" '
            [ $skip | split(" ")[] | select(length > 0) | tonumber ] as $done
            | map(select(.isDraft | not))
            | map(select(.number as $n | $done | index($n) | not))
            | sort_by(.number) | first'
}

pr_state()  { gh pr view "$1" --repo "$REPO" --json state --jq '.state' 2>/dev/null || echo ''; }
pr_review() { gh pr view "$1" --repo "$REPO" --json reviewDecision --jq '.reviewDecision' 2>/dev/null || echo ''; }

check_mergeable() {
    local pr=$1 state=""
    for _ in 1 2 3 4 5; do
        state=$(gh pr view "$pr" --repo "$REPO" --json mergeable --jq '.mergeable' 2>/dev/null || echo '')
        case "$state" in MERGEABLE|CONFLICTING) break ;; esac
        sleep 5
    done
    case "$state" in
        MERGEABLE) ;;
        CONFLICTING)
            log "  #$pr conflicts with $BASE -- needs a human"
            return 1 ;;
        *)
            log "  #$pr mergeability is ${state:-unavailable} -- letting step 1 decide" ;;
    esac
}

wait_pr_merged() {
    local pr=$1 state="" deadline=$(( SECONDS + PR_SETTLE_TIMEOUT_SEC ))
    while :; do
        state=$(pr_state "$pr")
        [ "$state" = "OPEN" ] || break
        [ "$SECONDS" -lt "$deadline" ] || { log "  #$pr still reads as open after ${PR_SETTLE_TIMEOUT_SEC}s"; break; }
        sleep 5
    done
}

runs_for() {
    local raw
    raw=$(gh api "repos/$REPO/actions/runs?head_sha=$1&per_page=100" 2>/dev/null) \
        || { echo '[]'; return 0; }
    jq -c --arg self "$SELF_WORKFLOW_PATH" --arg run "$SELF_RUN_ID" '
        [ .workflow_runs[]?
          | select(.path != $self)
          | select(($run | length == 0) or ((.id | tostring) != $run))
          | {name, status, conclusion} ]' <<<"$raw" 2>/dev/null || echo '[]'
}

runs_failed()  { jq '[.[] | select(.status == "completed" and .conclusion != "success" and .conclusion != "skipped" and .conclusion != "neutral")] | length' <<<"$1"; }
runs_pending() { jq '[.[] | select(.status != "completed")] | length' <<<"$1"; }

runs_missing() {
    jq -r --arg req "$2" '
        [ ($req | split(",")[] | gsub("^\\s+|\\s+$"; "")) | select(length > 0) ] as $need
        | ([ .[] | select(.status == "completed" and .conclusion == "success") | .name ] | unique) as $green
        | [ $need[] | select(. as $n | $green | index($n) | not) ]
        | join(", ")
    ' <<<"$1"
}

wait_for_runs() {
    local sha=$1 need=$2 absent=$3
    local deadline=$(( SECONDS + WAIT_TIMEOUT_MIN * 60 ))
    local appear_deadline=$(( SECONDS + RUN_APPEAR_TIMEOUT_SEC ))
    local runs total pending failed missing announced=0

    log "  waiting for workflows on ${sha:0:7} (timeout ${WAIT_TIMEOUT_MIN}m)"
    while :; do
        runs=$(runs_for "$sha")
        total=$(jq 'length' <<<"$runs")

        if [ "$total" -gt 0 ]; then
            failed=$(runs_failed "$runs")
            if [ "$failed" -ne 0 ]; then
                jq -r '.[] | select(.status == "completed" and .conclusion != "success" and .conclusion != "skipped" and .conclusion != "neutral") | "    \(.conclusion)\t\(.name)"' <<<"$runs"
                log "  $failed workflow(s) failed on ${sha:0:7}"
                return 1
            fi

            pending=$(runs_pending "$runs")
            missing=$(runs_missing "$runs" "$need")

            if [ "$pending" -eq 0 ] && [ -z "$missing" ]; then
                jq -r '.[] | "    \(.conclusion)\t\(.name)"' <<<"$runs"
                log "  all $total workflow(s) green on ${sha:0:7}"
                return 0
            fi

            if [ "$pending" -ne 0 ] && [ "$announced" -eq 0 ]; then
                log "  $pending workflow(s) still running on ${sha:0:7}"
                announced=1
            fi
        fi

        if [ "$total" -eq 0 ] || { [ "${pending:-0}" -eq 0 ] && [ -n "${missing:-}" ]; }; then
            if [ "$SECONDS" -ge "$appear_deadline" ]; then
                if [ "$total" -eq 0 ]; then
                    if [ "$absent" = 'pass' ]; then
                        log "  no workflow runs for ${sha:0:7} -- nothing to wait for"
                        return 0
                    fi
                    log "  no workflow runs exist for ${sha:0:7} -- refusing to merge blind"
                else
                    log "  required workflow(s) never ran on ${sha:0:7}: $missing"
                fi
                if [ "$USING_PAT" != 'true' ]; then
                    log "  a push made with GITHUB_TOKEN deliberately does not trigger workflows."
                    log "  Set the AUTOMERGE_TOKEN secret to a PAT or GitHub App token so the"
                    log "  prepared commit gets its own builder runs."
                fi
                return 1
            fi
        fi

        if [ "$SECONDS" -ge "$deadline" ]; then
            log "  timed out after ${WAIT_TIMEOUT_MIN}m waiting on ${sha:0:7}"
            return 1
        fi
        sleep "$POLL_INTERVAL_SEC"
    done
}

base_already_failed() {
    local sha=$1 runs bad
    runs=$(runs_for "$sha")
    bad=$(jq -r '.[] | select(.status == "completed" and .conclusion != "success" and .conclusion != "skipped" and .conclusion != "neutral") | "\(.conclusion)\t\(.name)"' <<<"$runs")
    [ -n "$bad" ] || return 1
    printf '%s\n' "$bad" | sed 's/^/    /'
    log "the last merge has already failed on $BASE (${sha:0:7})"
    return 0
}

verify_version_only_diff() {
    local from=$1 to=$2 files bad allowed='"version"'

    [ -z "$MYPLANET_LATEST" ] || allowed="$allowed|\"latest\""
    [ -z "$MYPLANET_MIN" ]    || allowed="$allowed|\"min\""

    files=$(git diff --name-only "$from" "$to")
    if [ "$files" != "$PKG_FILE" ]; then
        log "  bump touched unexpected files: ${files//$'\n'/, }"
        return 1
    fi

    bad=$(git diff --unified=0 "$from" "$to" -- "$PKG_FILE" \
          | grep -E '^[+-]' \
          | grep -vE '^(\+\+\+|---)' \
          | grep -vcE "^[+-][[:space:]]*($allowed)[[:space:]]*:" || true)
    if [ "${bad:-0}" -ne 0 ]; then
        log "  bump changed $bad non-version line(s)"
        return 1
    fi
    log "  bump is version-only ($from -> $to)"
}

push_with_retry() {
    local ref=$1
    for delay in 0 2 4 8 16; do
        [ "$delay" -eq 0 ] || sleep "$delay"
        if git push origin "$ref"; then
            return 0
        fi
    done
    log "  push of $ref failed after retries"
    return 1
}

log "draining '$LABEL' into $BASE (dry_run=$DRY_RUN)"
summary "### automerge: draining \`$LABEL\` into \`$BASE\`"
summary ""

if [ -n "$MYPLANET_LATEST$MYPLANET_MIN" ]; then
    log "myplanet pins: latest -> ${MYPLANET_LATEST:-unchanged}, min -> ${MYPLANET_MIN:-unchanged}"
    summary "myplanet pins: latest → \`${MYPLANET_LATEST:-unchanged}\`, min → \`${MYPLANET_MIN:-unchanged}\` (set by the first merge)"
    summary ""
fi

summary "| PR | version | result |"
summary "|---|---|---|"

git config user.name  'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'

while :; do
    if [ "$MAX_MERGES" -gt 0 ] && [ "$merged_count" -ge "$MAX_MERGES" ]; then
        log "reached max_merges=$MAX_MERGES, stopping"
        summary "| | | stopped at max_merges=$MAX_MERGES |"
        break
    fi

    if [ -n "$last_base_sha" ] && base_already_failed "$last_base_sha"; then
        summary "| | | **stopped**: \`$BASE\` red after the last merge |"
        exit 1
    fi

    git fetch --quiet origin "$BASE"
    base_at_prepare=$(git rev-parse "origin/$BASE")

    pr_json=$(pick_pr)
    if [ "$pr_json" = "null" ] || [ -z "$pr_json" ]; then
        log "no open non-draft PR labelled '$LABEL' targets $BASE -- queue empty"
        summary "| | | queue empty |"
        break
    fi

    NUMBER=$(jq -r '.number'                    <<<"$pr_json")
    TITLE=$(jq  -r '.title'                     <<<"$pr_json")
    HEAD=$(jq   -r '.headRefName'               <<<"$pr_json")
    SHA=$(jq    -r '.headRefOid'                <<<"$pr_json")
    OWNER=$(jq  -r '.headRepositoryOwner.login' <<<"$pr_json")

    log "picked #$NUMBER ($HEAD @ ${SHA:0:7}): $TITLE"

    if [ "$OWNER" != "${REPO%%/*}" ]; then
        log "  #$NUMBER comes from fork $OWNER -- cannot push a version bump to it"
        summary "| #$NUMBER | | **stopped**: fork, cannot bump |"
        exit 1
    fi

    # The list index can be stale; ask about this PR directly before working it.
    state=$(pr_state "$NUMBER")
    if [ -n "$state" ] && [ "$state" != "OPEN" ]; then
        log "  #$NUMBER is no longer open (state: $state) -- skipping"
        skip_numbers="$skip_numbers $NUMBER"
        continue
    fi

    review=$(pr_review "$NUMBER")
    case "$review" in
        REVIEW_REQUIRED|CHANGES_REQUIRED|CHANGES_REQUESTED)
            log "  #$NUMBER needs a review ($review) -- skipping, $BASE would refuse it"
            summary "| #$NUMBER | | skipped: needs a review (\`$review\`) |"
            skip_numbers="$skip_numbers $NUMBER"
            continue ;;
    esac

    check_mergeable "$NUMBER" || { summary "| #$NUMBER | | **stopped**: conflicts with \`$BASE\` |"; exit 1; }

    base_pkg="${RUNNER_TEMP:-/tmp}/base-package.json"
    git show "origin/$BASE:$PKG_FILE" > "$base_pkg"
    eval "$("$VERSION_SH" next "$base_pkg" | sed 's/^/new_/')"
    log "  version -> $new_name"

    git fetch --quiet origin "$HEAD"

    if [ "$DRY_RUN" = 'true' ]; then
        git checkout --quiet --detach "origin/$HEAD"
        if git merge --quiet --no-edit "origin/$BASE"; then
            log "  dry run: merges cleanly with $BASE, would bump to $new_name,"
            if [ -n "$MYPLANET_LATEST$MYPLANET_MIN" ]; then
                log "           pin myplanet latest=${MYPLANET_LATEST:-unchanged} min=${MYPLANET_MIN:-unchanged},"
            fi
            log "           wait for ${REQUIRED_WORKFLOWS:-the triggered workflows}, then squash merge #$NUMBER"
            if [ "$CREATE_RELEASE" = 'true' ]; then
                log "           and cut v$new_name from the merge"
            fi
            summary "| #$NUMBER | → \`$new_name\` | dry run: would merge |"
        else
            git merge --abort || true
            log "  dry run: #$NUMBER conflicts with $BASE -- needs a human"
            summary "| #$NUMBER | | dry run: **conflicts** with \`$BASE\` |"
        fi
        log "dry run stops after one PR (nothing advances)"
        break
    fi

    git checkout --quiet -B "$HEAD" "origin/$HEAD"

    if ! git merge --quiet --no-edit "origin/$BASE"; then
        git merge --abort || true
        log "  #$NUMBER conflicts with $BASE -- needs a human"
        summary "| #$NUMBER | | **stopped**: conflicts with \`$BASE\` |"
        exit 1
    fi

    pre_bump_sha=$(git rev-parse HEAD)
    "$VERSION_SH" apply "$PKG_FILE" "$new_name"

    bump_msg="version: bump to $new_name"
    if [ -n "$MYPLANET_LATEST$MYPLANET_MIN" ]; then
        mp_before=$(git show "HEAD:$PKG_FILE" | jq -r '[.myplanet.latest, .myplanet.min] | join(" ")')
        "$VERSION_SH" myplanet "$PKG_FILE" "$MYPLANET_LATEST" "$MYPLANET_MIN"
        mp_after=$(jq -r '[.myplanet.latest, .myplanet.min] | join(" ")' "$PKG_FILE")
        if [ "$mp_before" != "$mp_after" ]; then
            log "  myplanet pins: $mp_before -> $mp_after"
            bump_msg="$bump_msg, myplanet ${mp_after% *} (min ${mp_after#* })"
        else
            log "  myplanet pins already at $mp_after"
        fi
    fi

    merge_sha="$pre_bump_sha"
    if git diff --quiet -- "$PKG_FILE"; then
        log "  $PKG_FILE already at $new_name, nothing to commit"
    else
        git add "$PKG_FILE"
        git commit --quiet -m "$bump_msg"
        merge_sha=$(git rev-parse HEAD)
        verify_version_only_diff "$pre_bump_sha" "$merge_sha" \
            || { summary "| #$NUMBER | → \`$new_name\` | **stopped**: bump was not version-only |"; exit 1; }
    fi
    if [ "$merge_sha" != "$SHA" ]; then
        push_with_retry "$HEAD" \
            || { summary "| #$NUMBER | → \`$new_name\` | **stopped**: push failed |"; exit 1; }
    else
        log "  branch already merged and bumped, head unchanged at ${SHA:0:7}"
    fi

    if [ "$REQUIRE_CHECKS" = 'true' ]; then
        wait_for_runs "$merge_sha" "$REQUIRED_WORKFLOWS" fail \
            || { summary "| #$NUMBER | → \`$new_name\` | **stopped**: prepared commit not green |"; exit 1; }
    else
        log "  require_checks is off -- merging ${merge_sha:0:7} unverified"
    fi

    if [ "$REQUIRE_CHECKS" = 'true' ]; then
        git fetch --quiet origin "$BASE"
        wait_for_runs "$(git rev-parse "origin/$BASE")" '' pass \
            || { summary "| #$NUMBER | → \`$new_name\` | **stopped**: \`$BASE\` is red |"; exit 1; }

        # Prepared against a base that no longer exists; prepare again.
        git fetch --quiet origin "$BASE"
        base_now=$(git rev-parse "origin/$BASE")
        if [ "$base_now" != "$base_at_prepare" ]; then
            if [ "$NUMBER" = "$reprep_pr" ]; then
                reprep_n=$((reprep_n + 1))
            else
                reprep_pr="$NUMBER"; reprep_n=1
            fi
            if [ "$reprep_n" -gt "$MAX_REPREPARES" ]; then
                log "  $BASE keeps moving under #$NUMBER -- giving up after $MAX_REPREPARES re-preparations"
                summary "| #$NUMBER | → \`$new_name\` | **stopped**: \`$BASE\` moving under it |"
                exit 1
            fi
            log "  $BASE moved to ${base_now:0:7} while #$NUMBER was building -- re-preparing it"
            continue
        fi
    fi

    commit_body=$(REPO="$REPO" PR="$NUMBER" "$COAUTHORS_SH")
    if [ -n "$commit_body" ]; then
        log "  co-authors:"
        printf '%s\n' "$commit_body" | sed 's/^/    /'
    else
        log "  no co-authors to credit"
    fi

    ARGS=(--repo "$REPO" --squash --match-head-commit "$merge_sha"
          --subject "$TITLE (#$NUMBER)" --body "$commit_body")
    if [ "$DELETE_BRANCH" = 'true' ]; then
        ARGS+=(--delete-branch)
    fi
    if ! merge_out=$(gh pr merge "$NUMBER" "${ARGS[@]}" 2>&1); then
        printf '%s\n' "$merge_out" | sed 's/^/    /'
        log "  merge of #$NUMBER refused"
        reason="merge refused"
        case "$merge_out" in
            *"not authorized to push"*|*"Protected branch"*|*"Resource not accessible"*)
                reason="**stopped**: token may not merge into \`$BASE\`"
                log "  $BASE is protected and this token may not merge into it."
                if [ "$USING_PAT" = 'true' ]; then
                    log "  AUTOMERGE_TOKEN is set, so that account still lacks merge rights on $BASE."
                else
                    log "  Running on GITHUB_TOKEN. Set the AUTOMERGE_TOKEN secret to a PAT or"
                    log "  GitHub App token belonging to someone allowed to merge into $BASE."
                fi
                ;;
            *"base branch policy prohibits"*)
                reason="**stopped**: \`$BASE\` policy refused the merge (review? codeowner?)"
                log "  $BASE's branch protection refused this merge. The prepared commit is"
                log "  green, so the unmet requirement is a policy one -- most often a missing"
                log "  approving review, a codeowner review, or an unresolved conversation."
                log "  --auto is deliberately not used: it returns before the merge happens,"
                log "  and the drain must know the merge landed to bump the next version."
                ;;
            *"is not mergeable"*|*"required status check"*)
                reason="**stopped**: base requires checks the prepared commit has not passed"
                log "  the prepared commit has not satisfied the base's required checks."
                log "  Make sure required_workflows covers every check $BASE requires."
                ;;
        esac
        summary "| #$NUMBER | → \`$new_name\` | $reason |"
        exit 1
    fi
    log "  merged #$NUMBER"
    wait_pr_merged "$NUMBER"

    git fetch --quiet origin "$BASE"
    last_base_sha=$(git rev-parse "origin/$BASE")

    release_note=""
    if [ "$CREATE_RELEASE" = 'true' ]; then
        target=$(gh pr view "$NUMBER" --repo "$REPO" --json mergeCommit --jq '.mergeCommit.oid' 2>/dev/null || echo '')
        target="${target:-$last_base_sha}"
        if release_out=$(gh release create "v$new_name" \
                            --repo "$REPO" \
                            --target "$target" \
                            --title "Version $new_name" \
                            --generate-notes 2>&1); then
            log "  released v$new_name at ${target:0:7}"
            release_note=", released \`v$new_name\`"
        else
            printf '%s\n' "$release_out" | sed 's/^/    /'
            log "  #$NUMBER merged, but cutting v$new_name failed"
            log "  stopping here: an unreleased version builds no images, and every"
            log "  later bump would inherit the gap without anyone noticing"
            summary "| #$NUMBER | → \`$new_name\` | merged as \`${last_base_sha:0:7}\`, **release failed** |"
            exit 1
        fi
    fi

    merged_count=$((merged_count + 1))
    merged_list="$merged_list #$NUMBER"
    skip_numbers="$skip_numbers $NUMBER"
    summary "| #$NUMBER | → \`$new_name\` | merged as \`${last_base_sha:0:7}\`$release_note |"
done

log "done: merged $merged_count PR(s):${merged_list:- none}"
summary ""
summary "**merged $merged_count PR(s)**:${merged_list:- none}"
