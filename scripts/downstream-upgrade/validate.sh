#!/usr/bin/env bash
# Validate the FiestaBoard web app: typecheck + unit tests. All output is
# appended to <log-file> so a fix attempt can read the failure context.
# Both commands run even if the first fails. Exit 0 iff both pass.
#
# Usage: validate.sh <fiestaboard-dir> <log-file>
set -uo pipefail

FB_DIR="${1:?usage: validate.sh <fiestaboard-dir> <log-file>}"
LOG="${2:?usage: validate.sh <fiestaboard-dir> <log-file>}"

status=0
for target in typecheck test:run; do
  echo "=== $target ===" >> "$LOG"
  if ! (cd "$FB_DIR/web" && npm run "$target") >> "$LOG" 2>&1; then
    status=1
  fi
done
exit $status
