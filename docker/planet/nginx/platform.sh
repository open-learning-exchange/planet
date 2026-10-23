#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: application/json"
echo ""

docker_api() {
  curl -s --unix-socket /var/run/docker.sock "http://localhost$1"
}

CONTAINERS=$(docker_api "/containers/json?all=1")
[ -n "$CONTAINERS" ] || CONTAINERS="[]"

# Upgrades retag images to :local, so the version lives in each image's other tags
IMAGES=$(echo "$CONTAINERS" | jq -r '.[].ImageID' | sort -u | while read -r ID; do
  docker_api "/images/$ID/json"
done | jq -s '.')
[ -n "$IMAGES" ] || IMAGES="[]"

jq -n \
  --arg planetVersion "$(cat version 2>/dev/null)" \
  --arg apkServed "$(cat fs/apkversion 2>/dev/null)" \
  --arg arch "$(uname -m)" \
  --arg storageFree "$(df -h / | tail -1 | awk '{print $4}')" \
  --arg couchdb "$(curl -s -m 5 http://couchdb:5984/ | jq -r '.version // empty')" \
  --arg docker "$(docker_api /version | jq -r '.Version // empty')" \
  --argjson containers "$CONTAINERS" \
  --argjson images "$IMAGES" \
  '($images | map({ (.Id): . }) | add // {}) as $byId
  | {
      planetVersion: $planetVersion,
      apkServed: $apkServed,
      arch: $arch,
      storageFree: $storageFree,
      couchdbVersion: $couchdb,
      dockerVersion: $docker,
      containers: [ $containers[] | {
        service: (.Labels["com.docker.compose.service"] // (.Names[0] | ltrimstr("/"))),
        image: .Image,
        tags: [ ($byId[.ImageID].RepoTags // [])[] | select(test(":(local|latest)$") | not) ],
        digest: (($byId[.ImageID].RepoDigests // [])[0] // "" | split("@")[1] // ""),
        imageCreated: ($byId[.ImageID].Created // ""),
        state: .State,
        status: .Status
      } ]
    }'
