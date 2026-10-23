#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: application/json"
echo ""

COUCH=http://couchdb:5984
YML_PATH=credentials/credentials.yml

if [ -f "$YML_PATH" ]; then
  COUCH_USER=$(grep COUCHDB_USER $YML_PATH | sed -e 's/.*=//')
  COUCH_PASS=$(grep COUCHDB_PASS $YML_PATH | sed -e 's/.*=//' -e 's/\$\$/$/g')
fi

docker_api() {
  curl -s -m 5 --unix-socket /var/run/docker.sock "http://localhost$1"
}

couch() {
  if [ -n "$COUCH_USER" ]; then
    curl -s -m 10 -u "$COUCH_USER:$COUCH_PASS" -H 'Content-Type: application/json' "$COUCH$@"
  else
    curl -s -m 10 -H 'Content-Type: application/json' "$COUCH$@"
  fi
}

json_or() {
  echo "$1" | jq -e . >/dev/null 2>&1 && echo "$1" || echo "$2"
}

latest_time() {
  couch "/$1/_find" -X POST -d "{\"selector\":$2,\"fields\":[\"$3\"],\"limit\":100000}" | jq "[.docs[]?.$3 | numbers] | max"
}

CONTAINERS=$(json_or "$(docker_api '/containers/json?all=1')" '[]')
# Upgrades retag images to :local, so the version lives in each image's other tags
IMAGES=$(json_or "$(echo "$CONTAINERS" | jq -r '.[].ImageID' | sort -u | while read -r ID; do
  docker_api "/images/$ID/json"
done | jq -s '.')" '[]')

CONFIG=$(json_or "$(couch "/configurations/_all_docs?include_docs=true&limit=1" | jq '.rows[0].doc // {}')" '{}')
CODE=$(echo "$CONFIG" | jq -r '.code // empty')
DBS=$(json_or "$(couch /_all_dbs)" '[]')
USERS=$(couch '/_users/_all_docs?startkey="org.couchdb.user:"&endkey="org.couchdb.user;"' | jq '.rows // [] | length')
REPLICATIONS=$(json_or "$(couch '/_scheduler/docs/_replicator' | jq '[.docs[]?.state] | group_by(.) | map({ (.[0] // "unknown"): length }) | add // {}')" '{}')
GATEWAY=$(curl -s -m 5 -o /dev/null -w '%{http_code}' http://chatapi:5000/)
DISK=$(df -P -k fs 2>/dev/null | tail -1)

jq -n \
  --argjson generatedAt "$(date +%s000)" \
  --arg planetVersion "$(cat version 2>/dev/null)" \
  --arg apkServed "$(cat fs/apkversion 2>/dev/null)" \
  --argjson config "$CONFIG" \
  --arg arch "$(uname -m)" \
  --arg cpus "$(nproc)" \
  --arg uptime "$(cut -d' ' -f1 /proc/uptime)" \
  --arg load "$(cut -d' ' -f1-3 /proc/loadavg)" \
  --arg memTotal "$(awk '/^MemTotal:/ {print $2}' /proc/meminfo)" \
  --arg memAvailable "$(awk '/^MemAvailable:/ {print $2}' /proc/meminfo)" \
  --arg disk "$DISK" \
  --arg couchVersion "$(couch / | jq -r '.version // empty')" \
  --argjson dbs "$DBS" \
  --arg users "$USERS" \
  --argjson replications "$REPLICATIONS" \
  --arg lastSync "$(latest_time admin_activities "{\"type\":\"sync\",\"createdOn\":\"$CODE\"}" time)" \
  --arg lastUpgrade "$(latest_time admin_activities "{\"type\":\"upgrade\",\"createdOn\":\"$CODE\"}" time)" \
  --arg lastLogin "$(couch /login_activities/_find -X POST -d "{\"selector\":{\"createdOn\":\"$CODE\",\"loginTime\":{\"$gt\":0}},\"fields\":[\"loginTime\"],\"sort\":[{\"loginTime\":\"desc\"}],\"limit\":1}" | jq '.docs[0].loginTime // null')" \
  --arg gateway "$GATEWAY" \
  --arg docker "$(docker_api /version | jq -r '.Version // empty')" \
  --argjson containers "$CONTAINERS" \
  --argjson images "$IMAGES" \
  'def num: tonumber? // null;
  ($images | map({ (.Id): . }) | add // {}) as $byId
  | ($disk | split(" ") | map(select(. != ""))) as $df
  | {
      generatedAt: $generatedAt,
      planetVersion: $planetVersion,
      apkServed: $apkServed,
      planet: { code: $config.code, name: $config.name, type: $config.planetType, parentCode: $config.parentCode, parentDomain: $config.parentDomain },
      host: {
        arch: $arch,
        cpus: ($cpus | num),
        uptimeSeconds: ($uptime | num | if . then floor else . end),
        load: ($load | split(" ") | map(num)),
        memoryBytes: (($memTotal | num) as $m | if $m then $m * 1024 else null end),
        memoryAvailableBytes: (($memAvailable | num) as $m | if $m then $m * 1024 else null end)
      },
      disk: (if ($df | length) >= 5 then {
        totalBytes: (($df[1] | num) * 1024),
        usedBytes: (($df[2] | num) * 1024),
        availableBytes: (($df[3] | num) * 1024),
        usePercent: ($df[4] | rtrimstr("%") | num)
      } else null end),
      couchdb: {
        version: $couchVersion,
        databases: ($dbs | length),
        userDatabases: ($dbs | map(select(startswith("userdb-"))) | length),
        users: ($users | num),
        replications: $replications,
        lastSync: ($lastSync | num),
        lastUpgrade: ($lastUpgrade | num),
        lastLogin: ($lastLogin | num)
      },
      gateway: { up: ($gateway == "200") },
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
