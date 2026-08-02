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
