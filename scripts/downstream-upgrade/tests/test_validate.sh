#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)

mk_fixture() { # dir typecheck_cmd test_cmd
  mkdir -p "$1/web"
  cat > "$1/web/package.json" <<EOF
{ "name": "web", "scripts": { "typecheck": "$2", "test:run": "$3" } }
EOF
}

mk_fixture "$tmp/green" "echo tc-ok" "echo test-ok"
"$SCRIPTS/validate.sh" "$tmp/green" "$tmp/green.log" || fail "green fixture should pass"
assert_file_contains "$tmp/green.log" "tc-ok" "typecheck output captured"
assert_file_contains "$tmp/green.log" "test-ok" "test output captured"

mk_fixture "$tmp/red" "echo tc-broke && exit 1" "echo test-broke && exit 1"
if "$SCRIPTS/validate.sh" "$tmp/red" "$tmp/red.log"; then
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
"$SCRIPTS/validate.sh" "$tmp/flaky" "$tmp/flaky.log" \
  || fail "flaky test passing on retry should be green"
assert_file_contains "$tmp/flaky.log" "retry 1/1" "retry attempt logged"

# Typecheck is deterministic and never retried, even when it fails.
mk_fixture "$tmp/tc-red" "echo tc-broke && exit 1" "echo test-ok"
if "$SCRIPTS/validate.sh" "$tmp/tc-red" "$tmp/tc-red.log"; then
  fail "typecheck failure should fail validation"
fi
assert_eq "1" "$(grep -c '^=== typecheck' "$tmp/tc-red.log")" "typecheck not retried"
