#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)

# --- FiestaBoard shape: app in web/, typecheck + retryable unit suite ------

mk_fixture() { # dir typecheck_cmd test_cmd
  mkdir -p "$1/web"
  cat > "$1/web/package.json" <<EOF
{ "name": "web", "scripts": { "typecheck": "$2", "test:run": "$3" } }
EOF
}

fb_validate() { # dir log
  APP_DIR=web VALIDATE_TARGETS="typecheck test:run" RETRY_TARGETS="test:run" \
    "$SCRIPTS/validate.sh" "$1" "$2"
}

mk_fixture "$tmp/green" "echo tc-ok" "echo test-ok"
fb_validate "$tmp/green" "$tmp/green.log" || fail "green fixture should pass"
assert_file_contains "$tmp/green.log" "tc-ok" "typecheck output captured"
assert_file_contains "$tmp/green.log" "test-ok" "test output captured"

mk_fixture "$tmp/red" "echo tc-broke && exit 1" "echo test-broke && exit 1"
if fb_validate "$tmp/red" "$tmp/red.log"; then
  fail "red fixture should fail"
fi
assert_file_contains "$tmp/red.log" "tc-broke" "typecheck failure captured"
assert_file_contains "$tmp/red.log" "test-broke" "tests still run after typecheck fails"
# A persistently-red test is retried (default once), so it runs twice total.
assert_eq "2" "$(grep -c '^=== test:run' "$tmp/red.log")" "failed tests retried once"

# A flaky test that fails once then passes must NOT fail the baseline: the
# test command trips on the first run (no marker yet) and passes on retry.
mk_fixture "$tmp/flaky" "echo tc-ok" \
  "test -f '$tmp/flaky-marker' || { touch '$tmp/flaky-marker'; echo flake; exit 1; }"
fb_validate "$tmp/flaky" "$tmp/flaky.log" \
  || fail "flaky test passing on retry should be green"
assert_file_contains "$tmp/flaky.log" "retry 1/1" "retry attempt logged"

# Typecheck is deterministic and never retried, even when it fails.
mk_fixture "$tmp/tc-red" "echo tc-broke && exit 1" "echo test-ok"
if fb_validate "$tmp/tc-red" "$tmp/tc-red.log"; then
  fail "typecheck failure should fail validation"
fi
assert_eq "1" "$(grep -c '^=== typecheck' "$tmp/tc-red.log")" "typecheck not retried"

# --- Docs-site shape: app at the repo root, no unit suite, no retries -----

mk_docs() { # dir build_cmd
  mkdir -p "$1"
  cat > "$1/package.json" <<EOF
{ "name": "docs-site", "scripts": {
    "lint": "echo lint-ok",
    "typecheck": "echo tc-ok",
    "format:check": "echo fmt-ok",
    "build": "$2"
} }
EOF
}

docs_validate() { # dir log
  VALIDATE_TARGETS="lint typecheck format:check build" RETRY_TARGETS="" \
    "$SCRIPTS/validate.sh" "$1" "$2"
}

mk_docs "$tmp/docs-green" "echo build-ok"
docs_validate "$tmp/docs-green" "$tmp/docs-green.log" || fail "docs green fixture should pass"
for marker in lint-ok tc-ok fmt-ok build-ok; do
  assert_file_contains "$tmp/docs-green.log" "$marker" "docs target output captured ($marker)"
done

# A broken build fails validation and is NOT retried — nothing is retryable
# for this consumer, so a red build costs exactly one run.
mk_docs "$tmp/docs-red" "echo build-broke && exit 1"
if docs_validate "$tmp/docs-red" "$tmp/docs-red.log"; then
  fail "docs build failure should fail validation"
fi
assert_file_contains "$tmp/docs-red.log" "build-broke" "build failure captured"
assert_eq "1" "$(grep -c '^=== build' "$tmp/docs-red.log")" "build not retried when RETRY_TARGETS is empty"
# Earlier targets still ran: one pass surfaces every breakage.
assert_file_contains "$tmp/docs-red.log" "lint-ok" "lint ran before the failing build"
