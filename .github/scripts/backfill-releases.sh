#!/usr/bin/env bash
#
# Cut the releases a drain never cut. Every merge onto $BASE bumps
# package.json's version and is meant to be tagged v<version>, but a drain run
# with create_release=false merges on regardless -- the bumps land, the tags do
# not, and nothing rebuilds the versioned images.
#
# This walks $BASE for the commits that introduced each version, keeps the ones
# with no release, and cuts them oldest first, the same way automerge.sh does:
# lightweight tag on that commit, titled "Version <version>", notes generated
# from the preceding tag. Ascending order is what makes the notes right -- each
# release's diff is measured against the one below it.
#
# Versions at or below $SINCE are left alone. Blank means the newest release
# there is, so the default run only ever fills the tail.
#
set -euo pipefail

REPO="${REPO:?}"
BASE="${BASE:?}"
PKG_FILE="${PKG_FILE:?}"
VERSION_SH="${VERSION_SH:?}"
SINCE="${SINCE:-}"
DRY_RUN="${DRY_RUN:-true}"
MAX_RELEASES="${MAX_RELEASES:-0}"
USING_PAT="${USING_PAT:-false}"

log()     { printf '%s | %s\n' "$(date -u +%H:%M:%S)" "$*"; }
summary() { [ -n "${GITHUB_STEP_SUMMARY:-}" ] && printf '%s\n' "$*" >> "$GITHUB_STEP_SUMMARY"; return 0; }

# version.sh reads a file, so hand it the blob rather than parsing here: one
# parser means a change to the version format cannot drift between the two.
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

version_at() {
    git show "$1:$PKG_FILE" >"$scratch/pkg.json" 2>/dev/null || return 0
    "$VERSION_SH" read "$scratch/pkg.json" 2>/dev/null | sed -n 's/^name=//p'
}

release_exists() {
    gh api "repos/$REPO/releases/tags/v$1" >/dev/null 2>&1
}

git fetch --quiet --tags --force origin "$BASE"

# Commits that moved the version, oldest first. A commit touching package.json
# without changing the version is not a release, so consecutive repeats drop
# out and the first commit carrying a version is the one that gets the tag --
# the same commit automerge.sh would have tagged as it merged.
history=""
prev=""
while read -r sha; do
    [ -n "$sha" ] || continue
    v=$(version_at "$sha")
    [ -n "$v" ] || continue
    [ "$v" != "$prev" ] || continue
    history="${history}${sha} ${v}"$'\n'
    prev="$v"
done < <(git log --reverse --format='%H' "origin/$BASE" -- "$PKG_FILE")

[ -n "$history" ] || { log "no versioned commits on $BASE -- nothing to do"; exit 0; }

floor="$SINCE"
if [ -z "$floor" ]; then
    floor=$(gh api "repos/$REPO/releases/latest" --jq '.tag_name' 2>/dev/null || echo '')
    floor="${floor#v}"
fi
floor="${floor#v}"

log "backfilling releases on $BASE (dry_run=$DRY_RUN)"
summary "### backfill: releases on \`$BASE\`"
summary ""

# A release published by GITHUB_TOKEN raises no `release` event, and that event
# is what builds the versioned images. The tags would appear and the images
# still would not, which is the half-fix this whole script exists to undo.
if [ "$USING_PAT" != 'true' ]; then
    log "warning: no AUTOMERGE_TOKEN -- these releases will not trigger the image builds"
    summary "> **Note**: running on \`GITHUB_TOKEN\`. The releases get cut, but a"
    summary "> \`GITHUB_TOKEN\` release raises no \`release\` event, so no versioned"
    summary "> images are built. Set \`AUTOMERGE_TOKEN\` to get the builds too."
    summary ""
fi

# Anchor on where the floor sits in history rather than comparing version
# strings: history order is what the bumps actually did, and it stays right
# through a rollover like 0.23.99 -> 0.24.0.
candidates=""
if [ -z "$floor" ]; then
    log "no release to start from -- considering every version on $BASE"
    candidates="$history"
else
    if ! grep -q " ${floor}\$" <<<"$history"; then
        log "version $floor is not on $BASE -- refusing to guess where to start"
        summary "**stopped**: \`$floor\` is not a version on \`$BASE\`"
        exit 1
    fi
    log "starting after v$floor"
    candidates=$(sed -e "1,/ ${floor}\$/d" <<<"$history")
fi

if [ -z "${candidates//[[:space:]]/}" ]; then
    log "nothing above v$floor -- releases are in step with $BASE"
    summary "Nothing to do: \`$BASE\` is at \`$floor\`, which is released."
    exit 0
fi

summary "| version | commit | result |"
summary "|---|---|---|"

made=0
failed=0
while read -r sha version; do
    [ -n "$version" ] || continue

    if [ "$MAX_RELEASES" -gt 0 ] && [ "$made" -ge "$MAX_RELEASES" ]; then
        log "reached max_releases=$MAX_RELEASES, stopping"
        summary "| | | stopped at max_releases=$MAX_RELEASES |"
        break
    fi

    if release_exists "$version"; then
        log "v$version already released -- skipping"
        summary "| \`v$version\` | \`${sha:0:7}\` | already released |"
        continue
    fi

    # A tag with no release means the tag was pushed by hand. gh leaves an
    # existing tag where it is, so say so rather than implying we placed it.
    tagged=""
    if git rev-parse -q --verify "refs/tags/v$version" >/dev/null; then
        tagged=$(git rev-list -n1 "v$version")
        if [ "$tagged" = "$sha" ]; then
            log "v$version is already tagged at ${sha:0:7}, releasing that tag"
        else
            log "v$version is already tagged at ${tagged:0:7}, not ${sha:0:7} -- needs a human"
            summary "| \`v$version\` | \`${sha:0:7}\` | **stopped**: tag points at \`${tagged:0:7}\` |"
            exit 1
        fi
    fi

    if [ "$DRY_RUN" = 'true' ]; then
        log "would release v$version at ${sha:0:7}: $(git log -1 --format='%s' "$sha")"
        summary "| \`v$version\` | \`${sha:0:7}\` | would release |"
        made=$((made + 1))
        continue
    fi

    if out=$(gh release create "v$version" \
                --repo "$REPO" \
                --target "$sha" \
                --title "Version $version" \
                --generate-notes 2>&1); then
        log "released v$version at ${sha:0:7}"
        summary "| \`v$version\` | \`${sha:0:7}\` | released |"
        made=$((made + 1))
    else
        printf '%s\n' "$out" | sed 's/^/    /'
        log "cutting v$version failed"
        log "stopping here: the next release's notes are measured from this one,"
        log "so carrying on would fold this version's changes into the one above"
        summary "| \`v$version\` | \`${sha:0:7}\` | **failed** |"
        failed=1
        break
    fi
done <<<"$candidates"

log "done: ${made} release(s) $([ "$DRY_RUN" = 'true' ] && echo 'to cut' || echo 'cut')"
summary ""
summary "**${made} release(s) $([ "$DRY_RUN" = 'true' ] && echo 'to cut' || echo 'cut')**"
[ "$failed" -eq 0 ] || exit 1
