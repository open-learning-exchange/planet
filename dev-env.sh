#!/usr/bin/env bash
set -euo pipefail

# load .env if it exists
[ -f .env ] && source .env

CHAT_PORT="${CHAT_PORT:-5000}"

sed \
  -e "s/{{CHAT_PORT}}/${CHAT_PORT}/g" \
  src/environments/environment.template > src/environments/environment.dev.ts

echo "chatapi running on port: ${CHAT_PORT}"
