#!/usr/bin/env bash
# Shared assertions for the offline script tests. Source from test_*.sh.
set -euo pipefail

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

assert_eq() { # expected actual msg
  [ "$1" = "$2" ] || fail "$3 (expected '$1', got '$2')"
}

assert_file_contains() { # file needle msg
  grep -qF -- "$2" "$1" || fail "$3 ('$2' not found in $1)"
}

make_tmp() {
  local d
  d=$(mktemp -d "${TMPDIR:-/tmp}/du-test.XXXXXX")
  # shellcheck disable=SC2064
  trap "rm -rf '$d'" EXIT
  echo "$d"
}
