#!/usr/bin/env bash
set -euo pipefail

# load .env if it exists
[ -f .env ] && source .env

GATEWAY_PORT="${GATEWAY_PORT:-5000}"
COUCH_PORT="${COUCH_PORT:-2200}"
PARENT_PROTOCOL="${PARENT_PROTOCOL:-https}"

sed \
  -e "s/{{GATEWAY_PORT}}/${GATEWAY_PORT}/g" \
  -e "s/{{COUCH_PORT}}/${COUCH_PORT}/g" \
  -e "s/{{PARENT_PROTOCOL}}/${PARENT_PROTOCOL}/g" \
  src/environments/environment.template > src/environments/environment.dev.ts

echo "gateway running on port: ${GATEWAY_PORT}"
echo "couchdb running on port: ${COUCH_PORT}"
echo "parent protocol: ${PARENT_PROTOCOL}"
