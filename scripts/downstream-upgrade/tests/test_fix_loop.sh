#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPTS/../.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/fb/.git" "$tmp/ui" "$tmp/bin"

# Fake claude: records one flattened line per call (the prompt arg is
# multi-line); "fixes" the app when the call count reaches $FIX_ON_ATTEMPT
# (0 = never).
cat > "$tmp/bin/claude" <<EOF
#!/usr/bin/env bash
printf '%s\n' "\$*" | tr '\n' ' ' >> "$tmp/claude-calls.log"
echo >> "$tmp/claude-calls.log"
calls=\$(wc -l < "$tmp/claude-calls.log" | tr -d ' ')
if [ "\$FIX_ON_ATTEMPT" != "0" ] && [ "\$calls" -ge "\$FIX_ON_ATTEMPT" ]; then
  touch "$tmp/fixed"
fi
EOF
chmod +x "$tmp/bin/claude"

run_loop() {
  FIESTAUI_DIR="$REPO_ROOT" DOWNSTREAM_DIR="$tmp/fb" LOG_FILE="$tmp/log" \
  DOWNSTREAM_NAME="${DOWNSTREAM_NAME:-FiestaBoard}" \
  APP_DIR="${APP_DIR:-web}" \
  VALIDATE_TARGETS="${VALIDATE_TARGETS:-typecheck test:run}" \
  PREV_VERSION=0.3.0 NEW_VERSION=0.4.0 \
  ATTEMPTS_FILE="$tmp/attempts" MAX_ATTEMPTS=3 \
  CLAUDE_BIN="$tmp/bin/claude" \
  VALIDATE_CMD="test -f '$tmp/fixed'" \
  FIX_ON_ATTEMPT="$1" "$SCRIPTS/fix-loop.sh"
}

# Fixed on attempt 2 → exit 0, exactly 2 claude calls, counter = 2.
touch "$tmp/log"
run_loop 2 || fail "should succeed when fixed on attempt 2"
assert_eq "2" "$(wc -l < "$tmp/claude-calls.log" | tr -d ' ')" "claude called twice"
assert_eq "2" "$(cat "$tmp/attempts")" "counter persisted"
# Rendered prompt reached claude with substitutions applied.
assert_file_contains "$tmp/claude-calls.log" "v0.4.0" "version substituted into prompt"
assert_file_contains "$tmp/claude-calls.log" "--model opus" "opus model requested"
# Consumer identity and its validation command are rendered, so the prompt
# tells Claude which repo it is in and how to check its own work.
assert_file_contains "$tmp/claude-calls.log" "FiestaBoard" "downstream name substituted"
assert_file_contains "$tmp/claude-calls.log" "npm run typecheck && npm run test:run" \
  "validate hint built from VALIDATE_TARGETS"

# The same loop drives a consumer with a different shape: root app, no unit
# suite. No placeholder may leak through unsubstituted.
: > "$tmp/claude-calls.log"; rm -f "$tmp/fixed" "$tmp/attempts"
DOWNSTREAM_NAME="Docs site" APP_DIR="." \
  VALIDATE_TARGETS="lint typecheck format:check build" \
  run_loop 1 || fail "docs-shaped loop should succeed when fixed on attempt 1"
assert_file_contains "$tmp/claude-calls.log" "Docs site" "docs name substituted"
assert_file_contains "$tmp/claude-calls.log" \
  "npm run lint && npm run typecheck && npm run format:check && npm run build" \
  "docs validate hint built from its own targets"
if grep -qF '{{' "$tmp/claude-calls.log"; then
  fail "unsubstituted {{PLACEHOLDER}} left in the rendered prompt"
fi

# Counter already at max → no further claude calls, exit 1.
: > "$tmp/claude-calls.log"; rm -f "$tmp/fixed"; echo 3 > "$tmp/attempts"
if run_loop 1; then fail "exhausted counter should fail without running claude"; fi
assert_eq "0" "$(wc -l < "$tmp/claude-calls.log" | tr -d ' ')" "no claude calls when exhausted"

# Never fixed → 3 attempts then exit 1.
: > "$tmp/claude-calls.log"; rm -f "$tmp/attempts"
if run_loop 0; then fail "unfixable should exit 1"; fi
assert_eq "3" "$(wc -l < "$tmp/claude-calls.log" | tr -d ' ')" "all attempts used"
