#!/usr/bin/env bash
set -euo pipefail

# load .env if it exists
[ -f .env ] && source .env

CHAT_PORT="${CHAT_PORT:-5000}"
COUCH_PORT="${COUCH_PORT:-2200}"
PARENT_PROTOCOL="${PARENT_PROTOCOL:-https}"

sed \
  -e "s/{{CHAT_PORT}}/${CHAT_PORT}/g" \
  -e "s/{{COUCH_PORT}}/${COUCH_PORT}/g" \
  -e "s/{{PARENT_PROTOCOL}}/${PARENT_PROTOCOL}/g" \
  src/environments/environment.template > src/environments/environment.dev.ts

echo "chatapi running on port: ${CHAT_PORT}"
echo "couchdb running on port: ${COUCH_PORT}"
echo "parent protocol: ${PARENT_PROTOCOL}"
