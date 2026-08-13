#!/usr/bin/env bash
#
# planet version helper. package.json carries one semver <major>.<minor>.<patch>
# and every merge bumps the patch, with each block rolling over at 99:
# 0.22.99 -> 0.23.0. Releases are tagged v<version>, so each merge needs its
# own number.
#
#   version.sh {read|next} <package-file>
#   version.sh apply <package-file> <name>
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
    *)
        die "usage: version.sh {read|next|apply} <package-file> [name]"
        ;;
esac
