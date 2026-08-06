#!/usr/bin/env bash
#
# Build Storybook, serve it, and run the axe accessibility suite against every
# story in BOTH themes — the same check CI's `a11y-tests` job runs, collapsed
# into one command.
#
# This exists so the a11y-audit bot can verify its own fixes. Orchestrating a
# background static server across separate tool calls is fragile; a single
# script that sets up, runs, and tears down is not. The audit prompt calls it
# as the gate before opening any PR.
#
# Usage:  bash .github/a11y-audit/verify-a11y.sh
# Exit:   0 = both themes clean, 1 = violations (or the suite failed to run)
#
# Assumes `npm ci` and `npx playwright install chromium` have already run —
# the workflow does both before handing control to Claude.

set -euo pipefail

PORT="${A11Y_PORT:-6006}"
cd "$(git rev-parse --show-toplevel)"

SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo "==> Building Storybook"
npm run build-storybook -- --quiet

echo "==> Serving storybook-static on port ${PORT}"
npx http-server storybook-static --port "$PORT" --silent &
SERVER_PID=$!

# Poll rather than sleep — the build machine's speed varies and a fixed sleep
# is either wasteful or flaky.
ready=false
for _ in $(seq 1 30); do
  if curl -sSf "http://localhost:${PORT}/index.html" >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done
if [ "$ready" != "true" ]; then
  echo "ERROR: Storybook server never became ready on port ${PORT}."
  exit 1
fi

# Both themes matter. Contrast is theme-dependent, so a fix that satisfies axe
# in dark mode can still fail in light mode — CI runs them as a matrix and so
# do we.
status=0
for theme in dark light; do
  url="http://localhost:${PORT}"
  if [ "$theme" = "light" ]; then
    url="${url}?globals=theme:light"
  fi
  echo "==> Running axe suite: ${theme} theme"
  if npm run test-storybook:ci -- --url "$url"; then
    echo "    ${theme}: PASS"
  else
    echo "    ${theme}: FAIL"
    status=1
  fi
done

if [ "$status" -eq 0 ]; then
  echo "==> Accessibility suite PASSED (dark + light)"
else
  echo "==> Accessibility suite FAILED — do not open a PR."
fi
exit "$status"
