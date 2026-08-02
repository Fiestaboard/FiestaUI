#!/usr/bin/env bash
# Run all offline tests for the downstream-upgrade scripts.
set -uo pipefail
cd "$(dirname "$0")" || exit 1
rc=0
for t in test_*.sh; do
  if bash "$t"; then
    echo "PASS: $t"
  else
    echo "FAIL: $t"
    rc=1
  fi
done
exit $rc
