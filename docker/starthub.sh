#!/usr/bin/env bash
set -euo pipefail

TARGET_FILE="${STARTHUB_FILE:-/srv/starthub}"

usage() {
  cat <<USAGE
Usage: $(basename "$0") <true|false|status>

Writes an explicit start-hub toggle value to 
  ${TARGET_FILE}

Environment:
  STARTHUB_FILE  Optional path override (default: /srv/starthub)
USAGE
}

require_parent_dir() {
  local parent
  parent="$(dirname "$TARGET_FILE")"
  if [[ ! -d "$parent" ]]; then
    echo "Error: expected parent directory '$parent' to exist." >&2
    echo "Create it first or set STARTHUB_FILE to a valid location." >&2
    exit 1
  fi
}

require_writable_target() {
  if [[ -e "$TARGET_FILE" && ! -w "$TARGET_FILE" ]]; then
    echo "Error: '$TARGET_FILE' exists but is not writable by user $(id -un)." >&2
    exit 1
  fi

  local parent
  parent="$(dirname "$TARGET_FILE")"
  if [[ ! -e "$TARGET_FILE" && ! -w "$parent" ]]; then
    echo "Error: cannot create '$TARGET_FILE' because '$parent' is not writable by user $(id -un)." >&2
    exit 1
  fi
}

print_status() {
  if [[ -f "$TARGET_FILE" ]]; then
    echo "starthub=$(<"$TARGET_FILE")"
  else
    echo "starthub=<unset> (file does not exist at $TARGET_FILE)"
  fi
}

main() {
  local action="${1:-}"
  case "$action" in
    true|false)
      require_parent_dir
      require_writable_target
      printf '%s\n' "$action" > "$TARGET_FILE"
      echo "Wrote '$action' to $TARGET_FILE"
      ;;
    status)
      print_status
      ;;
    -h|--help|help|"")
      usage
      ;;
    *)
      echo "Error: unsupported value '$action'. Expected true, false, or status." >&2
      usage >&2
      exit 2
      ;;
  esac
}

main "$@"
