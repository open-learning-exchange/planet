#!/usr/bin/env bash
set -euo pipefail

# load .env if it exists
[ -f .env ] && source .env

CHAT_PORT="${CHAT_PORT:-5000}"
COUCH_PORT="${COUCH_PORT:-2200}"
PARENT_PROTOCOL="${PARENT_PROTOCOL:-https}"

echo "No environment file generation is needed for local development."
echo "chatapi expected on port: ${CHAT_PORT}"
echo "couchdb expected on port: ${COUCH_PORT}"
echo "parent protocol: ${PARENT_PROTOCOL}"
