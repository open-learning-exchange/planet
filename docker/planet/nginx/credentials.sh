#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

YML_PATH=credentials/credentials.yml
PLANET_USER=${PLANET_CREDENTIALS%%,*}
PLANET_PASS=${PLANET_CREDENTIALS##*,}
if [ -f "$YML_PATH" ]; then
  OLD_USER=$(grep COUCHDB_USER $YML_PATH | sed -e 's/.*=//')
fi

if [ -z "$OLD_USER" ] || [ "$PLANET_USER" == "$OLD_USER" ]; then
  rm credentials/credentials.yml
  echo "services:
    db-init:
      environment:
        - COUCHDB_USER=$PLANET_USER
        - COUCHDB_PASS=$PLANET_PASS
  version: \"2\"" >> $YML_PATH
fi