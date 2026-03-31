#!/usr/bin/env bash
set -euo pipefail

# load .env if it exists
[ -f .env ] && source .env

CHAT_PORT="${CHAT_PORT:-5000}"
COUCH_PORT="${COUCH_PORT:-2200}"
PARENT_PROTOCOL="${PARENT_PROTOCOL:-https}"

TEMPLATE_FILE="src/environments/environment.template"
OUTPUT_FILE="src/environments/environment.dev.ts"

if [ ! -f "${TEMPLATE_FILE}" ]; then
  echo "Error: ${TEMPLATE_FILE} not found. Cannot generate ${OUTPUT_FILE}." >&2
  exit 1
fi

sed \
  -e "s/{{CHAT_PORT}}/${CHAT_PORT}/g" \
  -e "s/{{COUCH_PORT}}/${COUCH_PORT}/g" \
  -e "s/{{PARENT_PROTOCOL}}/${PARENT_PROTOCOL}/g" \
  "${TEMPLATE_FILE}" > "${OUTPUT_FILE}"

echo "chatapi running on port: ${CHAT_PORT}"
echo "couchdb running on port: ${COUCH_PORT}"
echo "parent protocol: ${PARENT_PROTOCOL}"

if [ ! -s "${OUTPUT_FILE}" ]; then
  echo "Error: failed to generate ${OUTPUT_FILE}." >&2
  exit 1
fi
