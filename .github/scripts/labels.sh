#!/usr/bin/env bash
#
# Label one pull request by its diff: additions + deletions
# pick one of small, medium, large, enormous,
# and on only removals code also gets `less` alongside that size label.
set -euo pipefail

REPO="${REPO:?}"
PR="${PR:?}"

SMALL_LABEL="${SMALL_LABEL:-small}"
MEDIUM_LABEL="${MEDIUM_LABEL:-medium}"
LARGE_LABEL="${LARGE_LABEL:-large}"
ENORMOUS_LABEL="${ENORMOUS_LABEL:-enormous}"
LESS_LABEL="${LESS_LABEL:-less}"

SMALL_MAX="${SMALL_MAX:-60}"
MEDIUM_MAX="${MEDIUM_MAX:-100}"
LARGE_MAX="${LARGE_MAX:-200}"

PKG_FILE="${PKG_FILE:-package.json}"
# Generated or translated: nobody reviews these line by line.
EXCLUDE_PATHS="${EXCLUDE_PATHS:-src/i18n/messages.*.xlf package-lock.json}"
DRY_RUN="${DRY_RUN:-false}"

FILES_JSON="${FILES_JSON:-}"
CURRENT_LABELS="${CURRENT_LABELS-}"

EDIT_RETRY_DELAYS='3 9'

log()     { printf '%s | %s\n' "$(date -u +%H:%M:%S)" "$*"; }
summary() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '%s\n' "$*" >> "$GITHUB_STEP_SUMMARY"; return 0; }

# Split on whitespace only. An unquoted $EXCLUDE_PATHS in a for-list would be
# pathname-expanded against whatever the runner happens to have checked out,
# quietly turning the patterns into a snapshot of today's filenames.
read -r -a EXCLUDE_GLOBS <<<"$EXCLUDE_PATHS"

excluded() {
    local path="$1" pattern
    for pattern in "${EXCLUDE_GLOBS[@]}"; do
        # shellcheck disable=SC2053  # $pattern is a glob on purpose
        [[ "$path" == $pattern ]] && return 0
    done
    return 1
}

read_files() {
    if [ -n "$FILES_JSON" ]; then
        cat "$FILES_JSON"
    else
        gh api "repos/$REPO/pulls/$PR/files?per_page=100" --paginate
    fi | jq -r '.[] | [.filename, (.additions // 0), (.deletions // 0), ((.patch // "") | @base64)] | @tsv'
}

# The automerge bump lands on the PR branch before the merge, so the size
# label must not count it. Same three keys the bump is allowed to touch.
version_lines() {
    printf '%s\n' "$1" | grep -cE "^\\$2[[:space:]]*\"(version|latest|min)\"[[:space:]]*:" || true
}

changed_files=$(read_files)

adds=0
dels=0
counted=0

while IFS=$'\t' read -r path file_adds file_dels patch64; do
    [ -n "$path" ] || continue
    if excluded "$path"; then
        log "  skipping $path"
        continue
    fi
    if [ "$path" = "$PKG_FILE" ] && [ -n "$patch64" ]; then
        patch=$(printf '%s' "$patch64" | base64 -d 2>/dev/null || printf '')
        bump_adds=$(version_lines "$patch" '+')
        bump_dels=$(version_lines "$patch" '-')
        if [ $((bump_adds + bump_dels)) -gt 0 ]; then
            file_adds=$((file_adds - bump_adds))
            file_dels=$((file_dels - bump_dels))
            [ "$file_adds" -lt 0 ] && file_adds=0
            [ "$file_dels" -lt 0 ] && file_dels=0
            log "  discounting the version bump in $path (-$bump_adds/-$bump_dels)"
        fi
    fi
    adds=$((adds + file_adds))
    dels=$((dels + file_dels))
    counted=$((counted + 1))
done <<< "$changed_files"

total=$((adds + dels))

if [ "$counted" -eq 0 ] || [ "$total" -eq 0 ]; then
    log "#$PR changes nothing this counts -- leaving its labels alone"
    exit 0
fi

if   [ "$total" -le "$SMALL_MAX" ];  then want_size="$SMALL_LABEL"
elif [ "$total" -le "$MEDIUM_MAX" ]; then want_size="$MEDIUM_LABEL"
elif [ "$total" -le "$LARGE_MAX" ];  then want_size="$LARGE_LABEL"
else                                      want_size="$ENORMOUS_LABEL"
fi

want_less=false
[ "$adds" -eq 0 ] && want_less=true

wanted="$want_size"
$want_less && wanted="$want_size + $LESS_LABEL"
log "#$PR is +$adds/-$dels over $counted file(s) -- $total line(s), $wanted"

if [ -z "${CURRENT_LABELS+set}" ]; then
    CURRENT_LABELS=$(gh pr view "$PR" --repo "$REPO" --json labels --jq '.labels[].name')
fi

holds() { printf '%s\n' "$CURRENT_LABELS" | grep -qxF "$1"; }

add=''
remove=''
for label in "$SMALL_LABEL" "$MEDIUM_LABEL" "$LARGE_LABEL" "$ENORMOUS_LABEL"; do
    if [ "$label" = "$want_size" ]; then
        if ! holds "$label"; then add="${add:+$add,}$label"; fi
    else
        if holds "$label"; then remove="${remove:+$remove,}$label"; fi
    fi
done
if $want_less; then
    if ! holds "$LESS_LABEL"; then add="${add:+$add,}$LESS_LABEL"; fi
else
    if holds "$LESS_LABEL"; then remove="${remove:+$remove,}$LESS_LABEL"; fi
fi

if [ -z "$add" ] && [ -z "$remove" ]; then
    log "  already labelled $wanted -- nothing to write"
    exit 0
fi

log "  add: ${add:-none}   remove: ${remove:-none}"

if [ "$DRY_RUN" = "true" ]; then
    log "  dry run -- not editing #$PR"
    exit 0
fi

edit_args=()
[ -n "$add" ]    && edit_args+=(--add-label "$add")
[ -n "$remove" ] && edit_args+=(--remove-label "$remove")

for delay in $EDIT_RETRY_DELAYS ''; do
    if gh pr edit "$PR" --repo "$REPO" "${edit_args[@]}" >/dev/null 2>&1; then
        summary "\`#$PR\` +$adds/-$dels over $counted file(s) -- $total line(s) -> **$wanted**"
        log "  labelled #$PR $wanted"
        exit 0
    fi
    [ -n "$delay" ] || break
    log "  edit failed, retrying in ${delay}s"
    sleep "$delay"
done

log "  could not label #$PR"
exit 1
