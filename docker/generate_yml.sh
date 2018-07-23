#!/bin/bash

COMMIT_HASH=$(git rev-parse --short=8 HEAD)
PACKAGE_VERSION=$(cat ../package.json \
  | grep version \
  | head -1 \
  | awk -F: '{ print $2 }' \
  | sed 's/[",]//g' \
  | tr -d '[[:space:]]')
BRANCH=$(git rev-parse --abbrev-ref HEAD)
SUFFIX="$PACKAGE_VERSION-$BRANCH-$COMMIT_HASH"

{
  echo "services:"
  echo "  couchdb:"
  echo "    expose:"
  echo "      - 5984"
  echo "    image: treehouses/couchdb:2.1.2"
  echo "    ports:"
  echo "      - \"2200:5984\""
  echo "  db-init:"
  echo "    image: treehouses/planet-tags:db-init-$SUFFIX"
  echo "    depends_on:"
  echo "      - couchdb"
  echo "    environment:"
  echo "      - COUCHDB_HOST=http://couchdb:5984"
  echo "  planet:"
  echo "    image: treehouses/planet-tags:$SUFFIX"
  echo "    ports:"
  echo "      - \"80:80\""
  echo "    volumes:"
  echo "      - \"/var/run/docker.sock:/var/run/docker.sock\""
  echo "    environment:"
  echo "      - MULTIPLE_IPS=true"
  echo "      - HOST_PROTOCOL=http"
  echo "      - DB_HOST=127.0.0.1"
  echo "      - DB_PORT=2200"
  echo "      - CENTER_ADDRESS=earth.ole.org:2200"
  echo "    depends_on:"
  echo "      - couchdb"
  echo "version: \"2\""
} > "planet-$SUFFIX.yml"
