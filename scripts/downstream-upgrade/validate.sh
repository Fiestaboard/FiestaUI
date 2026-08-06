#!/usr/bin/env bash
# Validate the FiestaBoard web app: typecheck + unit tests. All output is
# appended to <log-file> so a fix attempt can read the failure context.
# Both commands run even if the first fails. Exit 0 iff both pass.
#
# FiestaBoard runs its whole vitest suite in one process here (its own CI
# shards suites across jobs), which occasionally flakes on cross-suite
# pollution — e.g. React act(...) stderr noise from board-display-colors that
# only surfaces when unrelated suites share a process. A flaky red baseline
# false-positives the upgrade and burns a human on relabeling, so retry the
# test target up to TEST_RETRIES times before declaring it red. Typecheck is
# deterministic and never retried.
#
# Usage: validate.sh <fiestaboard-dir> <log-file>
set -uo pipefail

FB_DIR="${1:?usage: validate.sh <fiestaboard-dir> <log-file>}"
LOG="${2:?usage: validate.sh <fiestaboard-dir> <log-file>}"
TEST_RETRIES="${TEST_RETRIES:-1}"

run_target() { # target [header] -> 0 if the command passes
  local target="$1"
  echo "=== ${2:-$target} ===" >> "$LOG"
  (cd "$FB_DIR/web" && npm run "$target") >> "$LOG" 2>&1
}

status=0

run_target typecheck || status=1

if ! run_target test:run; then
  test_ok=0
  attempt=1
  while [ "$attempt" -le "$TEST_RETRIES" ]; do
    if run_target test:run "test:run (retry $attempt/$TEST_RETRIES after failure)"; then
      test_ok=1
      break
    fi
    attempt=$((attempt + 1))
  done
  [ "$test_ok" = 1 ] || status=1
fi

exit $status
