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
#   version.sh {read|next} <package-file>
#   version.sh apply <package-file> <name>
#   version.sh myplanet <package-file> <latest> <min>   (blank = leave as is)
#   version.sh check-myplanet <version>                 (prints it normalized)
#   version.sh myplanet-defaults <workflow-file> <package-file>
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

# A workflow_dispatch default has to be literal text -- GitHub does not
# evaluate expressions in the `on:` block -- so the dispatch form can only
# show the current pins if they are written into the file. Each bump re-syncs
# them, which is what keeps the form honest.
set_input_default() {
    local wf=$1 input=$2 val=$3
    # Scoped to one input block, which ends at its `type:` line.
    sed -i -E \
        "/^[[:space:]]*${input}:[[:space:]]*$/,/^[[:space:]]*type:/ s/^([[:space:]]*default:[[:space:]]*).*/\1'${val}'/" \
        "$wf"
}

input_default() {
    sed -nE \
        "/^[[:space:]]*$2:[[:space:]]*$/,/^[[:space:]]*type:/ s/^[[:space:]]*default:[[:space:]]*'?([^']*)'?[[:space:]]*$/\1/p" \
        "$1" | head -1
}

has_input() { grep -qE "^[[:space:]]*$2:[[:space:]]*$" "$1"; }

sync_myplanet_defaults() {
    local wf=$1 file=$2 got_latest got_min
    [ -f "$wf" ] || die "no such file: $wf"

    read_myplanet "$file"
    [ -n "$mp_latest" ] && [ -n "$mp_min" ] || die "no myplanet pins to copy out of $file"

    # A branch whose copy of the workflow predates these inputs has nothing to
    # fill in. Prefilling the form is a convenience; never fail a merge over
    # it -- the pins in package.json are what actually ship.
    if ! has_input "$wf" myplanet_latest || ! has_input "$wf" myplanet_min; then
        echo "version.sh: $wf has no myplanet_* dispatch inputs, leaving it alone" >&2
        return 0
    fi

    set_input_default "$wf" myplanet_latest "$mp_latest"
    set_input_default "$wf" myplanet_min    "$mp_min"

    got_latest=$(input_default "$wf" myplanet_latest)
    got_min=$(input_default "$wf" myplanet_min)
    [ "$got_latest" = "$mp_latest" ] || die "failed to write the myplanet_latest default into $wf (got '$got_latest')"
    [ "$got_min" = "$mp_min" ]       || die "failed to write the myplanet_min default into $wf (got '$got_min')"
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
        ;;
    myplanet)
        apply_myplanet "${2:?package file required}" "${3-}" "${4-}"
        ;;
    check-myplanet)
        normalize_myplanet "${2:?version required}"
        echo
        ;;
    myplanet-defaults)
        sync_myplanet_defaults "${2:?workflow file required}" "${3:?package file required}"
        ;;
    *)
        die "usage: version.sh {read|next|apply|myplanet|check-myplanet|myplanet-defaults} <package-file|version|workflow-file> [args]"
        ;;
esac
