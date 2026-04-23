#!/usr/bin/env bash
set -euo pipefail

DEV_ENV_FILE="src/environments/environment.dev.ts"

if [ ! -f "${DEV_ENV_FILE}" ]; then
  cat <<'MSG'
Error: src/environments/environment.dev.ts is missing.

The Angular dev build in angular.json replaces src/environments/environment.ts
with this generated file.

Run `bash dev-env.sh` (or `npm run dev`) to generate it.
MSG
  exit 1
fi

if [ ! -s "${DEV_ENV_FILE}" ]; then
  echo "Error: ${DEV_ENV_FILE} exists but is empty. Re-run bash dev-env.sh." >&2
  exit 1
fi
