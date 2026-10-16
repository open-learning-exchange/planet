#!/usr/bin/env bash
# OpenHands runs this at workspace initialization — before session-level skill
# discovery scans .agents/skills/. Submodules must be initialized by then, or
# the gitlinks are empty directories and no SKILL.md is found.
# An init failure (e.g. no network) must not kill the session: degrade
# gracefully — already-initialized submodules keep working, uninitialized
# ones just don't load this session.
set -uo pipefail
cd "$(dirname "$0")/.." || {
  echo "setup.sh: cannot locate workspace root" >&2
  exit 1
}
git submodule update --init --recursive ||
  echo "setup.sh: submodule init failed (offline?) — continuing without uninitialized skills" >&2
exit 0
