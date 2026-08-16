#!/usr/bin/env bash
# Validate a downstream repo after the bump. What counts as "valid" is
# per-consumer: FiestaBoard runs typecheck + its unit suite; the docs site
# has no unit tests and instead has to lint, typecheck, format-check and
# actually build Docusaurus. So the target list is configuration, not a
# constant. All output is appended to <log-file> so a fix attempt can read
# the failure context. Every target runs even if an earlier one fails, so
# one pass surfaces every breakage. Exit 0 iff all targets pass.
#
# Env:
#   APP_DIR           app subdir within the repo (default ".")
#   VALIDATE_TARGETS  space-separated npm targets (default "typecheck test:run")
#   RETRY_TARGETS     space-separated subset retried on failure (default "test:run")
#   TEST_RETRIES      retries per retryable target (default 1)
#
# Only targets named in RETRY_TARGETS are retried. FiestaBoard runs its
# whole vitest suite in one process here (its own CI shards suites across
# jobs), which occasionally flakes on cross-suite pollution — e.g. React
# act(...) stderr noise from board-display-colors that only surfaces when
# unrelated suites share a process. A flaky red baseline false-positives
# the upgrade and burns a human on relabeling. Deterministic targets
# (typecheck, lint, format:check, build) are never retried.
#
# Usage: validate.sh <repo-dir> <log-file>
set -uo pipefail

REPO_DIR="${1:?usage: validate.sh <repo-dir> <log-file>}"
LOG="${2:?usage: validate.sh <repo-dir> <log-file>}"
APP_DIR="${APP_DIR:-.}"
VALIDATE_TARGETS="${VALIDATE_TARGETS:-typecheck test:run}"
RETRY_TARGETS="${RETRY_TARGETS:-test:run}"
TEST_RETRIES="${TEST_RETRIES:-1}"

run_target() { # target [header] -> 0 if the command passes
  local target="$1"
  echo "=== ${2:-$target} ===" >> "$LOG"
  (cd "$REPO_DIR/$APP_DIR" && npm run "$target") >> "$LOG" 2>&1
}

is_retryable() { # target
  local candidate
  # shellcheck disable=SC2086 # RETRY_TARGETS is an intentional word list
  for candidate in $RETRY_TARGETS; do
    [ "$candidate" = "$1" ] && return 0
  done
  return 1
}

status=0

# shellcheck disable=SC2086 # VALIDATE_TARGETS is an intentional word list
for target in $VALIDATE_TARGETS; do
  run_target "$target" && continue

  if ! is_retryable "$target"; then
    status=1
    continue
  fi

  target_ok=0
  attempt=1
  while [ "$attempt" -le "$TEST_RETRIES" ]; do
    if run_target "$target" "$target (retry $attempt/$TEST_RETRIES after failure)"; then
      target_ok=1
      break
    fi
    attempt=$((attempt + 1))
  done
  [ "$target_ok" = 1 ] || status=1
done

exit $status
