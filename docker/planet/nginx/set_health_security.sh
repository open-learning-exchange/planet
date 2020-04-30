#!/bin/bash
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

SATELLITE_PASS=$(echo $SATELLITE_CREDENTIALS | sed -e 's/\$/\$\$/g')
SATELLITE_LOGIN=$(curl -X POST -H 'Content-Type: application/json' http://couchdb:5984/_session -d $(echo '{"name":"satellite"}' | jq -rc --arg pass $SATELLITE_PASS '.password += $pass'))
YML_PATH=credentials/credentials.yml

if [ ! -f "$YML_PATH" ] || [[ -z $(echo ${SATELLITE_LOGIN} | jq 'select(.ok)') ]]; then
  exit 1
fi

PLANET_USER=$(grep COUCHDB_USER $YML_PATH | sed -e 's/.*=//')
PLANET_PASS=$(grep COUCHDB_PASS $YML_PATH | sed -e 's/.*=//')
COUCHURL="http://${PLANET_USER}:${PLANET_PASS}@couchdb:5984"
DBS=$(curl ${COUCHURL}/_all_dbs -s)

for DB in $(echo ${DBS} | jq -r .[] | tr -d '\r'); do
  if [[ $DB =~ ^userdb- ]]; then
    SECURITY=$(curl ${COUCHURL}/${DB}/_security)
    if [[ $(echo ${SECURITY} | jq '.members | select(.roles != null) | .roles | contains(["health"])') != "true" ]]; then
      curl -H 'Content-Type: application/json' -X PUT $COUCHURL/$DB/_security -d $(echo ${SECURITY} | jq -rc '.members.roles += ["health"]')
    fi
  fi
done
