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
  echo "  db-init:"
  echo "    image: treehouses/planet-tags:db-init-$SUFFIX"
  echo "  planet:"
  echo "    image: treehouses/planet-tags:$SUFFIX"
  echo "version: \"2\""
} > "install-$SUFFIX.yml"

echo "install-$SUFFIX.yml"