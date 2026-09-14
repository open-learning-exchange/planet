#!/bin/sh

SOCKET=/var/run/docker.sock
API=http://localhost
COUCHDB=http://couchdb:5984
REPO=treehouses/planet
VARIANTS="planet db-init chatapi"

respond() {
  echo "HTTP/1.0 $1"
  echo "Content-type: text/plain"
  echo ""
}

# This endpoint can replace every image the host boots from, so it requires a
# CouchDB server admin. The browser sends AuthSession on this origin and nginx
# forwards it as HTTP_COOKIE.
authorized() {
  [ -n "$HTTP_COOKIE" ] || return 1
  roles=$(curl -s -H "Cookie: $HTTP_COOKIE" "$COUCHDB/_session" | jq -r '.userCtx.roles | join(" ")' 2>/dev/null)
  echo " $roles " | grep -q " _admin "
}

if ! authorized; then
  respond "403 Forbidden"
  echo "RESULT: error upgrade requires a signed-in Planet administrator"
  exit 0
fi

respond "200 OK"

if [ -z "$PLANET_VERSION" ]; then
  echo "RESULT: error no version supplied"
  exit 0
fi

source_image() {
  case "$1" in
    planet) echo "$REPO:$PLANET_VERSION" ;;
    *) echo "$REPO:$1-$PLANET_VERSION" ;;
  esac
}

local_image() {
  case "$1" in
    planet) echo "$REPO:local" ;;
    *) echo "$REPO:$1-local" ;;
  esac
}

previous_image() {
  case "$1" in
    planet) echo "$REPO:previous" ;;
    *) echo "$REPO:$1-previous" ;;
  esac
}

api_get() {
  curl -s --unix-socket "$SOCKET" "$API$1"
}

api_post() {
  curl -s --unix-socket "$SOCKET" -X POST "$API$1"
}

api_delete() {
  curl -s -o /dev/null --unix-socket "$SOCKET" -X DELETE "$API$1"
}

image_id() {
  api_get "/images/$1/json" | jq -r '.Id // empty' 2>/dev/null
}

# Docker answers 200 and streams progress as JSON even when a pull fails, so the
# body decides the outcome rather than the status code. Without this a failed
# pull was still retagged as :local and reported as a successful upgrade.
pull() {
  echo "Pulling $1"
  # tee rather than capture: nginx times the upstream out after 900s of silence,
  # and a large pull over a slow link needs the progress stream to keep flowing
  # while still leaving the body available to inspect for failure.
  progress=$(mktemp)
  api_post "/images/create?fromImage=$1" | tee "$progress"
  if grep -q '"errorDetail"' "$progress"; then
    rm -f "$progress"
    return 1
  fi
  rm -f "$progress"
  [ -n "$(image_id "$1")" ]
}

tag() {
  repo=${2%:*}
  name=${2##*:}
  api_post "/images/$1/tag?repo=$repo&tag=$name" > /dev/null
}

# Pull the whole set before moving any tag: a partial pull must never become the
# version the host comes up on.
for variant in $VARIANTS; do
  image=$(source_image "$variant")
  if ! pull "$image"; then
    echo "RESULT: error could not pull $image"
    exit 0
  fi
done

# Keep the outgoing images reachable as :previous, both so a bad upgrade can be
# rolled back and so the cleanup below does not read them as garbage.
for variant in $VARIANTS; do
  current=$(image_id "$(local_image "$variant")")
  if [ -n "$current" ]; then
    tag "$current" "$(previous_image "$variant")"
  fi
done

for variant in $VARIANTS; do
  tag "$(source_image "$variant")" "$(local_image "$variant")"
done

# An upgrade leaves the superseded version fully tagged, so without this every
# upgrade permanently costs another copy of all three images on an SD card that
# does not have the room. Only versioned treehouses/planet tags are considered,
# and never an image that :local or :previous still points at.
cleanup() {
  keep=$(for variant in $VARIANTS; do
    image_id "$(local_image "$variant")"
    image_id "$(previous_image "$variant")"
  done | sort -u | tr '\n' ' ')

  api_get "/images/json" \
    | jq -r --arg repo "$REPO" \
        '.[] | .Id as $id | (.RepoTags // [])[] | select(startswith($repo + ":")) | "\($id) \(.)"' \
    | while read -r id name; do
        case " $keep " in *" $id "*) continue ;; esac
        case "$name" in *:local|*-local|*:previous|*-previous) continue ;; esac
        echo "Removing superseded image $name"
        api_delete "/images/$name"
      done
}

cleanup

echo "RESULT: success"
