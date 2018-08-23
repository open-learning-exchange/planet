#!/bin/sh
echo "HTTP/1.0 200 OK"
echo "Content-type: text/plain"
echo ""

PLANET_USER=${PLANET_CREDENTIALS%%,*}
PLANET_PASS=${PLANET_CREDENTIALS##*,}

rm admin/admin.yml
echo "services:
  db-init:
    environment:
      - COUCHDB_USER=$PLANET_USER
      - COUCHDB_PASS=$PLANET_PASS
version: \"2\"" >> admin/admin.yml
