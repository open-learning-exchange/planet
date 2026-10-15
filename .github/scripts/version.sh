#!/usr/bin/env bash
#
# planet version helper. package.json carries one semver <major>.<minor>.<patch>
# and every merge bumps the patch, with each block rolling over at 99:
# 0.22.99 -> 0.23.0. Releases are tagged v<version>, so each merge needs its
# own number.
#
# It also owns the two myplanet pins in the same file, which name the apk
# planets offer and the oldest one they still accept.
#
# Given a lock file, apply also moves package-lock.json's two copies of the
# version (top-level and packages[""]) so npm install on a PR branch has
# nothing to rewrite there, and so nothing to conflict on.
#
#   version.sh {read|next} <package-file>
#   version.sh apply <package-file> <name> [<lock-file>]
#   version.sh read-lock <lock-file>                    (prints top= and root=)
#   version.sh myplanet <package-file> <latest> <min>   (blank = leave as is)
#   version.sh check-myplanet <version>                 (prints it normalized)
#
# The myplanet subcommands need jq; the rest is sed only.
#
set -euo pipefail

die() { echo "version.sh: $*" >&2; exit 1; }

read_version() {
    local file=$1
    [ -f "$file" ] || die "no such file: $file"

    # head -1 keeps this on the top-level version, not a nested one.
    cur_name=$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' "$file" | head -1)

    [ -n "$cur_name" ] || die "could not find \"version\" in $file"
}

next_version() {
    local file=$1
    read_version "$file"

    # major is left wider so this is not the thing that breaks at 1.0.0.
    [[ "$cur_name" =~ ^([0-9]{1,3})\.([0-9]{1,2})\.([0-9]{1,2})$ ]] \
        || die "version '$cur_name' is not <major>.<minor>.<patch> with 1-2 digits in the minor and patch blocks"

    local major=$((10#${BASH_REMATCH[1]}))
    local minor=$((10#${BASH_REMATCH[2]}))
    local patch=$((10#${BASH_REMATCH[3]}))

    patch=$((patch + 1))
    if [ "$patch" -gt 99 ]; then
        patch=0
        minor=$((minor + 1))
    fi
    if [ "$minor" -gt 99 ]; then
        minor=0
        major=$((major + 1))
    fi

    new_name="${major}.${minor}.${patch}"
}

apply_version() {
    local file=$1 name=$2
    [ -f "$file" ] || die "no such file: $file"

    # 0,/re/ stops at the first match, so a nested "version" stays untouched.
    sed -i -E \
        "0,/^[[:space:]]*\"version\"[[:space:]]*:/s/^([[:space:]]*\"version\"[[:space:]]*:[[:space:]]*\")[^\"]+\"/\1${name}\"/" \
        "$file"

    read_version "$file"
    [ "$cur_name" = "$name" ] || die "failed to write version $name into $file"
}

# Every dependency entry in the lock file carries a "version" too, and those
# must stay byte-identical, so both patterns are pinned by npm's two-space
# indent: the top-level key sits at depth 1, packages[""]'s own at depth 3
# inside the "": { ... } block that closes at depth 2.
LOCK_ROOT_RANGE='/^    ""[[:space:]]*:[[:space:]]*\{$/,/^    \},?$/'
LOCK_TOP_KEY='^(  "version"[[:space:]]*:[[:space:]]*")'
LOCK_ROOT_KEY='^(      "version"[[:space:]]*:[[:space:]]*")'

read_lock() {
    local file=$1
    [ -f "$file" ] || die "no such file: $file"

    lock_top=$(sed -nE "s/${LOCK_TOP_KEY}([^\"]+)\".*/\\2/p" "$file")
    lock_root=$(sed -nE "${LOCK_ROOT_RANGE} s/${LOCK_ROOT_KEY}([^\"]+)\".*/\\2/p" "$file")

    # One each, or the patterns are reading something other than the root.
    [ -n "$lock_top" ]  && [ "$(wc -l <<<"$lock_top")" -eq 1 ] \
        || die "could not find exactly one top-level \"version\" in $file"
    [ -n "$lock_root" ] && [ "$(wc -l <<<"$lock_root")" -eq 1 ] \
        || die "could not find exactly one packages[\"\"].version in $file"
}

apply_lock() {
    local file=$1 name=$2
    [ -f "$file" ] || die "no such file: $file"

    sed -i -E \
        -e "s/${LOCK_TOP_KEY}[^\"]+\"/\\1${name}\"/" \
        -e "${LOCK_ROOT_RANGE} s/${LOCK_ROOT_KEY}[^\"]+\"/\\1${name}\"/" \
        "$file"

    read_lock "$file"
    [ "$lock_top" = "$name" ]  || die "failed to write version $name into $file (top-level)"
    [ "$lock_root" = "$name" ] || die "failed to write version $name into $file (packages[\"\"])"
}

normalize_myplanet() {
    local v=$1
    [[ "$v" =~ ^v?([0-9]{1,3})\.([0-9]{1,2})\.([0-9]{1,2})$ ]] \
        || die "myplanet version '$v' is not v<major>.<minor>.<patch> with 1-2 digits in the minor and patch blocks"

    # docker/planet/scripts/create_version_json.sh splits on [v.] to derive the
    # apk version code and pastes the value straight into the release download
    # URL, so the leading v is load-bearing rather than decoration.
    printf 'v%s.%s.%s' "${BASH_REMATCH[1]}" "${BASH_REMATCH[2]}" "${BASH_REMATCH[3]}"
}

read_myplanet() {
    local file=$1
    command -v jq >/dev/null || die "jq is required to read the myplanet pins"
    mp_latest=$(jq -r '.myplanet.latest // ""' "$file")
    mp_min=$(jq -r '.myplanet.min // ""'       "$file")
}

# Scoped to the "myplanet" object, so a same-named key elsewhere is safe.
set_in_myplanet() {
    local file=$1 key=$2 val=$3
    sed -i -E \
        "/^[[:space:]]*\"myplanet\"[[:space:]]*:[[:space:]]*\{/,/^[[:space:]]*\}/ s/^([[:space:]]*\"${key}\"[[:space:]]*:[[:space:]]*\")[^\"]*\"/\1${val}\"/" \
        "$file"
}

apply_myplanet() {
    local file=$1 latest=$2 min=$3
    [ -f "$file" ] || die "no such file: $file"
    [ -n "$latest$min" ] || return 0

    if [ -n "$latest" ]; then
        latest=$(normalize_myplanet "$latest")
        set_in_myplanet "$file" latest "$latest"
    fi
    if [ -n "$min" ]; then
        min=$(normalize_myplanet "$min")
        set_in_myplanet "$file" min "$min"
    fi

    # A key the sed range never found leaves the file untouched; catch that.
    read_myplanet "$file"
    [ -z "$latest" ] || [ "$mp_latest" = "$latest" ] || die "failed to write myplanet.latest $latest into $file"
    [ -z "$min" ]    || [ "$mp_min"    = "$min" ]    || die "failed to write myplanet.min $min into $file"
}

case "${1:-}" in
    read)
        read_version "${2:?package file required}"
        echo "name=$cur_name"
        ;;
    next)
        next_version "${2:?package file required}"
        echo "name=$new_name"
        ;;
    apply)
        apply_version "${2:?package file required}" "${3:?name required}"
        [ -z "${4:-}" ] || apply_lock "$4" "$3"
        ;;
    read-lock)
        read_lock "${2:?lock file required}"
        echo "top=$lock_top"
        echo "root=$lock_root"
        ;;
    myplanet)
        apply_myplanet "${2:?package file required}" "${3-}" "${4-}"
        ;;
    check-myplanet)
        normalize_myplanet "${2:?version required}"
        echo
        ;;
    *)
        die "usage: version.sh {read|next|apply|read-lock|myplanet|check-myplanet} <package-file|version> [args]"
        ;;
esac
