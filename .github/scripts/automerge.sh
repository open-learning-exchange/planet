#!/usr/bin/env bash
#
# Drain the automerge queue. Per PR labelled $LABEL -- those also labelled
# $PRIORITY_LABEL first, then lowest number within each tier:
#
#   1. merge $BASE into the PR branch          (a conflict relabels it and moves on)
#   2. bump the version on the PR branch
#   3. push, and wait for the builders on that prepared commit (red relabels too)
#   4. wait for $BASE to be settled and green, then squash merge
#   5. tag the merge and publish its release
#
# A PR the queue cannot land is relabelled and left for a human while the
# drain carries on. Only a repo-wide problem stops it: $BASE red after a
# merge, a refused merge, a release that would not cut. Both waits sit in
# front of step 4 so they overlap: $BASE releases the previous merge while
# this PR builds.
#
set -euo pipefail

REPO="${REPO:?}"
BASE="${BASE:?}"

# queue,priority,conflict,failing in one field: an empty slot means that label
# goes unused, a slot left off the end keeps the default below.
if [ -n "${LABELS:-}" ]; then
    label_i=0
    while IFS= read -r label_part; do
        label_part="${label_part#"${label_part%%[![:space:]]*}"}"
        label_part="${label_part%"${label_part##*[![:space:]]}"}"
        case "$label_i" in
            0) LABEL="$label_part" ;;
            1) PRIORITY_LABEL="$label_part" ;;
            2) CONFLICT_LABEL="$label_part" ;;
            3) FAILING_LABEL="$label_part" ;;
        esac
        label_i=$(( label_i + 1 ))
    done <<<"$(printf '%s' "$LABELS" | tr ',' '\n')"
fi

LABEL="${LABEL:?the queue label may not be blank -- it is the first slot of LABELS}"
PRIORITY_LABEL="${PRIORITY_LABEL-priority}"
CONFLICT_LABEL="${CONFLICT_LABEL-conflict}"
FAILING_LABEL="${FAILING_LABEL-failing}"
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
BASE_RERUN_ATTEMPTS="${BASE_RERUN_ATTEMPTS:-1}"
case "$BASE_RERUN_ATTEMPTS" in *[!0-9]*|"") BASE_RERUN_ATTEMPTS=1 ;; esac
HEAD_RERUN_ATTEMPTS="${HEAD_RERUN_ATTEMPTS:-1}"
case "$HEAD_RERUN_ATTEMPTS" in *[!0-9]*|"") HEAD_RERUN_ATTEMPTS=1 ;; esac

RUN_APPEAR_TIMEOUT_SEC=300
RERUN_START_TIMEOUT_SEC=180
POLL_INTERVAL_SEC=20
PR_SETTLE_TIMEOUT_SEC=120
MERGE_RETRY_DELAYS='5 10 15'

self_ref="${GITHUB_WORKFLOW_REF:-}"
self_ref="${self_ref%@*}"
SELF_WORKFLOW_PATH="${self_ref#*/*/}"
SELF_WORKFLOW_PATH="${SELF_WORKFLOW_PATH:-.github/workflows/automerge.yml}"
SELF_RUN_ID="${GITHUB_RUN_ID:-}"

log()     { printf '%s | %s\n' "$(date -u +%H:%M:%S)" "$*"; }
summary() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '%s\n' "$*" >> "$GITHUB_STEP_SUMMARY"; return 0; }

merged_count=0
merged_list=""
conflict_count=0
conflict_list=""
failing_count=0
failing_list=""
skip_numbers=""
last_base_sha=""
link_note=""

MAX_REPREPARES=2
reprep_pr=""
reprep_n=0
rerun_log=""

pick_pr() {
    gh pr list \
        --repo "$REPO" \
        --state open \
        --base "$BASE" \
        --label "$LABEL" \
        --limit 1000 \
        --json number,title,isDraft,headRefName,headRefOid,headRepositoryOwner,labels \
      | jq -c --arg skip "$skip_numbers" --arg prio "$PRIORITY_LABEL" '
            [ $skip | split(" ")[] | select(length > 0) | tonumber ] as $done
            | ($done | map({ key: tostring, value: true }) | from_entries) as $doneSet
            | map(select(.isDraft | not))
            | map(select(.number as $n | $doneSet | has($n | tostring) | not))
            | map(. + { priority: (
                  ($prio | length > 0)
                  and (((.labels // []) | map(.name) | index($prio)) != null)
              ) })
            | sort_by([ (if .priority then 0 else 1 end), .number ]) | first'
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
        CONFLICTING) return 1 ;;
        *)
            log "  #$pr mergeability is ${state:-unavailable} -- letting step 1 decide" ;;
    esac
}

add_marker_label() {
    local pr=$1 label=$2 color=$3 desc=$4
    gh pr edit "$pr" --repo "$REPO" --add-label "$label" >/dev/null 2>&1 && return 0
    gh label create "$label" --repo "$REPO" \
        --color "$color" --description "$desc" >/dev/null 2>&1 || true
    gh pr edit "$pr" --repo "$REPO" --add-label "$label" >/dev/null 2>&1
}

# Drop $LABEL so the queue moves on, and mark why on the PR itself.
retire_pr() {
    local pr=$1 marker=$2 color=$3 desc=$4 what=$5

    if [ "$DRY_RUN" = 'true' ]; then
        log "  dry run: #$pr $what -- would relabel it and move on"
        summary "| #$pr | | dry run: **$what** |"
        return 0
    fi

    local marked=""
    log "  #$pr $what -- dropping '$LABEL', moving on to the next PR"
    if [ -n "$marker" ]; then
        if add_marker_label "$pr" "$marker" "$color" "$desc"; then
            marked=", added \`$marker\`"
        else
            log "  #$pr: could not add '$marker'"
        fi
    fi
    if gh pr edit "$pr" --repo "$REPO" --remove-label "$LABEL" >/dev/null 2>&1; then
        summary "| #$pr | | **$what**: dropped \`$LABEL\`$marked |"
    else
        log "  #$pr: could not remove '$LABEL' -- skipped for this drain only"
        summary "| #$pr | | **$what**: \`$LABEL\` could not be removed |"
    fi
    return 0
}

handle_conflict() {
    conflict_count=$(( conflict_count + 1 ))
    conflict_list="$conflict_list #$1"
    retire_pr "$1" "$CONFLICT_LABEL" BD8652 'merge conflict' "conflicts with \`$BASE\`"
}

handle_failing() {
    failing_count=$(( failing_count + 1 ))
    failing_list="$failing_list #$1"
    retire_pr "$1" "$FAILING_LABEL" B60205 'builders failing on the prepared commit' \
        'failed its builders on the prepared commit'
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

# $2 filters by head branch. Left blank on $BASE, where the release tag's own
# builders carry the merge commit under the tag ref and must still be judged.
runs_for() {
    local raw
    raw=$(gh api "repos/$REPO/actions/runs?head_sha=$1&per_page=100" 2>/dev/null) \
        || { echo '[]'; return 0; }
    jq -c --arg self "$SELF_WORKFLOW_PATH" --arg run "$SELF_RUN_ID" --arg branch "${2:-}" '
        [ .workflow_runs[]?
          | select(.path | startswith(".github/workflows/"))
          | select(.path != $self)
          | select(($run | length == 0) or ((.id | tostring) != $run))
          | select(($branch | length == 0) or (.head_branch == $branch))
          | {id, name, status, conclusion} ]' <<<"$raw" 2>/dev/null || echo '[]'
}

# A re-run lands as a second run under the same name, so a name that is green
# anywhere on this sha is green -- the failed attempt it replaced is not.
runs_bad() {
    jq -c '
        ([ .[] | select(.status == "completed" and .conclusion == "success") | .name ] | unique) as $green
        | [ .[]
            | select(.status == "completed")
            | select(.conclusion != "success" and .conclusion != "skipped"
                     and .conclusion != "neutral" and .conclusion != "cancelled")
            | select(.name as $n | $green | index($n) | not) ]' <<<"$1"
}

runs_green()   { jq '[.[] | select(.conclusion == "success")] | length' <<<"$1"; }
runs_pending() { jq '[.[] | select(.status != "completed")] | length' <<<"$1"; }

runs_missing() {
    jq -r --arg req "$2" '
        [ ($req | split(",")[] | gsub("^\\s+|\\s+$"; "")) | select(length > 0) ] as $need
        | ([ .[] | select(.status == "completed" and .conclusion == "success") | .name ] | unique) as $green
        | [ $need[] | select(. as $n | $green | index($n) | not) ]
        | join(", ")
    ' <<<"$1"
}

# 0 green, 2 a red verdict on this commit, 1 no verdict at all.
wait_for_runs() {
    local sha=$1 need=$2 absent=$3 branch=${4:-}
    local deadline=$(( SECONDS + WAIT_TIMEOUT_MIN * 60 ))
    local appear_deadline=$(( SECONDS + RUN_APPEAR_TIMEOUT_SEC ))
    local runs total bad pending failed green missing announced=0

    log "  waiting for workflows on ${sha:0:7}${branch:+ ($branch)} (timeout ${WAIT_TIMEOUT_MIN}m)"
    while :; do
        runs=$(runs_for "$sha" "$branch")
        total=$(jq 'length' <<<"$runs")

        if [ "$total" -gt 0 ]; then
            bad=$(runs_bad "$runs")
            failed=$(jq 'length' <<<"$bad")
            if [ "$failed" -ne 0 ]; then
                jq -r '.[] | "    \(.conclusion)\t\(.name)"' <<<"$bad"
                log "  $failed workflow(s) failed on ${sha:0:7}"
                return 2
            fi

            pending=$(runs_pending "$runs")
            missing=$(runs_missing "$runs" "$need")

            if [ "$pending" -eq 0 ] && [ -z "$missing" ]; then
                jq -r '.[] | "    \(.conclusion)\t\(.name)"' <<<"$runs"
                green=$(runs_green "$runs")
                log "  $green of $total workflow(s) green on ${sha:0:7}, none red"
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

rerun_count_for() {
    local id=$1 n=0 e
    for e in $rerun_log; do
        [ "$e" = "$id" ] && n=$((n + 1))
    done
    printf '%s\n' "$n"
}

wait_run_restarted() {
    local id=$1 status deadline=$(( SECONDS + RERUN_START_TIMEOUT_SEC ))
    while [ "$SECONDS" -lt "$deadline" ]; do
        status=$(gh api "repos/$REPO/actions/runs/$id" --jq '.status' 2>/dev/null || echo '')
        [ "$status" = 'completed' ] || return 0
        sleep 5
    done
    log "  run $id still reads as completed ${RERUN_START_TIMEOUT_SEC}s after the re-run request"
    return 1
}

# True when at least one red run was actually restarted, so the caller waits again.
rerun_failed_runs() {
    local sha=$1 branch=${2:-} attempts=${3:-$BASE_RERUN_ATTEMPTS} id name triggered=0
    [ "$attempts" -gt 0 ] || return 1

    while IFS=$'\t' read -r id name; do
        [ -n "$id" ] || continue
        if [ "$(rerun_count_for "$id")" -ge "$attempts" ]; then
            log "  $name failed again after $attempts re-run(s) -- taking it as real"
            continue
        fi
        if gh api -X POST "repos/$REPO/actions/runs/$id/rerun-failed-jobs" >/dev/null 2>&1 \
           || gh api -X POST "repos/$REPO/actions/runs/$id/rerun" >/dev/null 2>&1; then
            rerun_log="$rerun_log $id"
            triggered=1
            log "  re-running $name on ${sha:0:7} (run $id)"
            wait_run_restarted "$id" || true
        else
            log "  could not re-run $name (run $id) -- does the token have actions: write?"
        fi
    done < <(jq -r '.[] | "\(.id)\t\(.name)"' <<<"$(runs_bad "$(runs_for "$sha" "$branch")")")

    [ "$triggered" -eq 1 ]
}

wait_base_green() {
    local sha=$1 rc=0
    while :; do
        wait_for_runs "$sha" '' pass && return 0
        rc=$?
        [ "$rc" -eq 2 ] || return 1
        [ "$BASE_RERUN_ATTEMPTS" -gt 0 ] \
            && log "  ${sha:0:7} built green as a PR head minutes ago -- treating this as flaky"
        rerun_failed_runs "$sha" || return 1
    done
}

base_already_failed() {
    local sha=$1 runs bad
    runs=$(runs_for "$sha")
    bad=$(jq -r '.[] | "\(.conclusion)\t\(.name)"' <<<"$(runs_bad "$runs")")
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

merge_with_retry() {
    local pr=$1 head_sha=$2 delay live
    shift 2

    for delay in $MERGE_RETRY_DELAYS ''; do
        merge_out=$(gh pr merge "$pr" "$@" 2>&1) && return 0

        case "$merge_out" in *"Head branch was modified"*) ;; *) return 1 ;; esac

        live=$(gh pr view "$pr" --repo "$REPO" --json headRefOid --jq '.headRefOid' 2>/dev/null || echo '')
        if [ "$live" != "$head_sha" ]; then
            log "  #$pr head moved to ${live:-unknown} -- the green commit is gone, not retrying"
            return 1
        fi

        [ -n "$delay" ] || break
        log "  merge of #$pr hit GitHub's head race, but ${head_sha:0:7} is still the head -- retrying in ${delay}s"
        sleep "$delay"
    done
    return 1
}

# GitHub links a PR to its issue from the PR *description*, never from its
# title, and a squash merge made through the API does not fire the closing
# keyword in the commit message either. A title-only `(fixes #N)` therefore
# merges perfectly green and leaves the issue open, silently -- so put the
# keyword where GitHub actually reads it before handing the PR to the merge.
# `(connects #N)` is deliberately left alone: that issue is meant to stay open.
link_fixed_issues() {
    local pr=$1 title=$2 body n kind

    for n in $(grep -oE '\(fixes #[0-9]+\)' <<<"$title" | grep -oE '[0-9]+'); do
        body=$(gh pr view "$pr" --repo "$REPO" --json body --jq '.body // ""' 2>/dev/null || echo '')
        if grep -qiE "(fix(e[sd])?|close[sd]?|resolve[sd]?)[[:space:]]+#$n([^0-9]|$)" <<<"$body"; then
            continue
        fi

        # A number that turns out to be a pull request would close that PR.
        kind=$(gh api "repos/$REPO/issues/$n" \
                 --jq 'if .pull_request then "pr" else "issue" end' 2>/dev/null || echo '')
        case "$kind" in
            issue) ;;
            pr) log "  #$pr claims to fix #$n, which is a pull request -- not linking it"; continue ;;
            *)  log "  #$pr claims to fix #$n, which could not be read -- not linking it"; continue ;;
        esac

        if [ "$DRY_RUN" = 'true' ]; then
            log "  dry run: would add 'Fixes #$n' to #$pr's description so the merge closes it"
            continue
        fi

        if gh pr edit "$pr" --repo "$REPO" --body "Fixes #$n"$'\n\n'"$body" >/dev/null 2>&1; then
            log "  linked #$pr to #$n through its description"
            link_note="$link_note, closes #$n"
        else
            log "  could not add 'Fixes #$n' to #$pr's description -- #$n will stay open"
        fi
    done
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

log "draining '$LABEL' into $BASE${PRIORITY_LABEL:+, '$PRIORITY_LABEL' first} (dry_run=$DRY_RUN)"
summary "### automerge: draining \`$LABEL\` into \`$BASE\`${PRIORITY_LABEL:+, \`$PRIORITY_LABEL\` first}"
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
        if ! wait_base_green "$last_base_sha"; then
            summary "| | | **stopped**: \`$BASE\` red after the last merge |"
            exit 1
        fi
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
    PRIORITY=$(jq -r '.priority'                <<<"$pr_json")

    TIER=""
    if [ "$PRIORITY" = true ]; then TIER=" $PRIORITY_LABEL"; fi

    log "picked$TIER #$NUMBER ($HEAD @ ${SHA:0:7}): $TITLE"

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

    if ! check_mergeable "$NUMBER"; then
        handle_conflict "$NUMBER"
        skip_numbers="$skip_numbers $NUMBER"
        continue
    fi

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
            link_fixed_issues "$NUMBER" "$TITLE"
            if [ "$CREATE_RELEASE" = 'true' ]; then
                log "           and cut v$new_name from the merge"
            fi
            summary "| #$NUMBER | → \`$new_name\` | dry run: would merge |"
        else
            git merge --abort 2>/dev/null || git reset --quiet --hard HEAD
            handle_conflict "$NUMBER"
            skip_numbers="$skip_numbers $NUMBER"
            continue
        fi
        log "dry run stops after one mergeable PR (nothing advances)"
        break
    fi

    git checkout --quiet -B "$HEAD" "origin/$HEAD"

    if ! git merge --quiet --no-edit "origin/$BASE"; then
        git merge --abort 2>/dev/null || git reset --quiet --hard HEAD
        git checkout --quiet --detach "origin/$BASE" || true
        handle_conflict "$NUMBER"
        skip_numbers="$skip_numbers $NUMBER"
        continue
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
        checks_rc=0
        while :; do
            checks_rc=0
            wait_for_runs "$merge_sha" "$REQUIRED_WORKFLOWS" fail "$HEAD" || checks_rc=$?
            [ "$checks_rc" -eq 2 ] || break
            [ "$HEAD_RERUN_ATTEMPTS" -gt 0 ] \
                && log "  re-running the red workflow(s) before taking this as #$NUMBER's"
            rerun_failed_runs "$merge_sha" "$HEAD" "$HEAD_RERUN_ATTEMPTS" || break
        done
        # 2 is a verdict on this PR alone; 1 is no verdict at all, which still stops.
        if [ "$checks_rc" -eq 2 ]; then
            handle_failing "$NUMBER"
            skip_numbers="$skip_numbers $NUMBER"
            continue
        elif [ "$checks_rc" -ne 0 ]; then
            summary "| #$NUMBER | → \`$new_name\` | **stopped**: no verdict on the prepared commit |"
            exit 1
        fi
    else
        log "  require_checks is off -- merging ${merge_sha:0:7} unverified"
    fi

    if [ "$REQUIRE_CHECKS" = 'true' ]; then
        git fetch --quiet origin "$BASE"
        wait_base_green "$(git rev-parse "origin/$BASE")" \
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

    link_note=""
    link_fixed_issues "$NUMBER" "$TITLE"

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
    if ! merge_with_retry "$NUMBER" "$merge_sha" "${ARGS[@]}"; then
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
            *"Head branch was modified"*)
                reason="**stopped**: #$NUMBER's head no longer matches what CI passed"
                log "  re-run the drain to prepare #$NUMBER on its new head."
                ;;
            *"Base branch was modified"*)
                reason="**stopped**: \`$BASE\` moved between the check and the merge"
                log "  the bump was computed against an older $BASE."
                log "  re-run the drain to prepare #$NUMBER on top of the new $BASE."
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
    summary "| #$NUMBER | → \`$new_name\` | merged as \`${last_base_sha:0:7}\`$release_note$link_note |"
done

log "done: merged $merged_count PR(s):${merged_list:- none}"
summary ""
summary "**merged $merged_count PR(s)**:${merged_list:- none}"
if [ "$conflict_count" -ne 0 ]; then
    log "left for a human, conflicting with $BASE:$conflict_list"
    summary ""
    if [ "$DRY_RUN" = 'true' ]; then
        summary "**$conflict_count PR(s) conflict with \`$BASE\`**:$conflict_list -- a real run would drop \`$LABEL\`${CONFLICT_LABEL:+ and add \`$CONFLICT_LABEL\`} and keep draining."
    else
        summary "**$conflict_count PR(s) conflict with \`$BASE\`**:$conflict_list -- \`$LABEL\` dropped${CONFLICT_LABEL:+, \`$CONFLICT_LABEL\` added}. Resolve the conflict and re-add \`$LABEL\` to queue it again."
    fi
fi
if [ "$failing_count" -ne 0 ]; then
    log "left for a human, failing on the prepared commit:$failing_list"
    summary ""
    if [ "$DRY_RUN" = 'true' ]; then
        summary "**$failing_count PR(s) failed on their prepared commit**:$failing_list -- a real run would drop \`$LABEL\`${FAILING_LABEL:+ and add \`$FAILING_LABEL\`} and keep draining."
    else
        summary "**$failing_count PR(s) failed on their prepared commit**:$failing_list -- \`$LABEL\` dropped${FAILING_LABEL:+, \`$FAILING_LABEL\` added}. Fix the builders and re-add \`$LABEL\` to queue it again."
    fi
fi
