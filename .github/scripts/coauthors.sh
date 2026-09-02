#!/usr/bin/env bash
#
# Build the squash commit body: one Co-authored-by per collaborator who
# worked on the PR, then $OWNER_LOGIN if they did not author it. The PR
# description is discarded. Coding agents fall out for free -- they commit as
# Bot accounts or leave trailers that tie back to no GitHub account.
#
# Usage: REPO=owner/name PR=123 coauthors.sh   (empty output is legitimate)
#
set -euo pipefail

REPO="${REPO:?}"
PR="${PR:?}"
OWNER_LOGIN="${OWNER_LOGIN:-dogi}"

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

noreply_for() { printf '%s <%s@users.noreply.github.com>' "$1" "$1"; }

declare -A collaborators=()

# Needs push access; failing here beats crediting nobody.
collab_raw=$(
    gh api "repos/$REPO/collaborators?per_page=100" --paginate \
        --jq '.[] | select(.type == "User") | .login' | tr '[:upper:]' '[:lower:]'
)
while IFS= read -r col; do
    if [ -n "$col" ]; then
        collaborators["$col"]=1
    fi
done <<<"$collab_raw"

pr_json=$(gh pr view "$PR" --repo "$REPO" --json author,body)
author_login=$(jq -r '.author.login // ""' <<<"$pr_json")
pr_body=$(jq -r '.body // ""' <<<"$pr_json")

commits=$(gh api "repos/$REPO/pulls/$PR/commits?per_page=100" --paginate)

candidates=""

while IFS= read -r login; do
    if [ -n "$login" ]; then
        candidates+="$login"$'\n'
    fi
done < <(jq -r '.[] | select(.author != null) | select(.author.type == "User") | .author.login' <<<"$commits")

trailers=$(
    { jq -r '.[].commit.message' <<<"$commits"; printf '%s\n' "$pr_body"; } \
    | grep -iE '^[[:space:]]*co-authored-by:[[:space:]]*' || true
)

while IFS= read -r line; do
    if [ -z "$line" ]; then
        continue
    fi
    email=$(sed -nE 's/.*<([^>]+)>.*/\1/p' <<<"$line")
    case "$email" in
        *@users.noreply.github.com)
            login=${email%@users.noreply.github.com}
            login=${login#*+}   # drop the numeric id prefix, if any
            candidates+="$login"$'\n'
            ;;
        *)
            # Not a GitHub address -- this is what drops the coding agents.
            ;;
    esac
done <<<"$trailers"

author_l=$(lower "$author_login")
owner_l=$(lower "$OWNER_LOGIN")

body=""
declare -A seen=()

while IFS= read -r login; do
    if [ -z "$login" ]; then
        continue
    fi
    l=$(lower "$login")

    case "$l" in
        *'[bot]') continue ;;
    esac
    if [ "$l" = "$author_l" ]; then
        continue                       # already the commit author
    fi
    if [ "$l" = "$owner_l" ]; then
        continue                       # appended at the end instead
    fi
    if [[ -n "${seen["$l"]:-}" ]]; then
        continue
    fi
    if [[ -z "${collaborators["$l"]:-}" ]]; then
        continue
    fi

    seen["$l"]=1
    body+="Co-authored-by: $(noreply_for "$login")"$'\n'
done <<<"$candidates"

if [ -n "$author_l" ] && [ "$author_l" != "$owner_l" ]; then
    body+="Co-authored-by: $(noreply_for "$OWNER_LOGIN")"$'\n'
fi

printf '%s' "$body"
