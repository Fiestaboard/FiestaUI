#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"
REPO_ROOT="$(cd "$SCRIPTS/../.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/bin"

# Real git repo standing in for the FiestaBoard checkout.
git init -q "$tmp/fb"
git -C "$tmp/fb" -c user.name=t -c user.email=t@t.t commit -q --allow-empty -m base
pre_sha=$(git -C "$tmp/fb" rev-parse HEAD)

# Fake claude: logs its argv (flattened); optionally commits a swap and/or
# writes the summary, controlled by DO_SWAP / WRITE_SUMMARY.
cat > "$tmp/bin/claude" <<EOF
#!/usr/bin/env bash
printf '%s ' "\$@" | tr '\n' ' ' >> "$tmp/claude-calls.log"
echo >> "$tmp/claude-calls.log"
if [ "\${DO_SWAP:-0}" = 1 ]; then
  echo hi > swapped.txt
  git add swapped.txt
  git -c user.name=t -c user.email=t@t.t commit -q -m '[fiestaui-adoption] use Button for web/foo'
fi
if [ "\${WRITE_SUMMARY:-0}" = 1 ]; then
  printf '### Design-system adoption\n\n- Swapped: Button\n' > "\$SUMMARY_FILE"
fi
EOF
chmod +x "$tmp/bin/claude"

# Fake gh: log invocations, succeed.
cat > "$tmp/bin/gh" <<EOF
#!/usr/bin/env bash
printf '%s ' "\$@" >> "$tmp/gh-calls.log"
echo >> "$tmp/gh-calls.log"
EOF
chmod +x "$tmp/bin/gh"

run_adopt() { # <validate-cmd> [ENV=val ...]
  local validate="$1"; shift
  FIESTAUI_DIR="$REPO_ROOT" FIESTABOARD_DIR="$tmp/fb" \
  LOG_FILE="$tmp/log" SUMMARY_FILE="$tmp/summary.md" \
  NEW_VERSION=1.2.3 UI_REPO=Fiestaboard/FiestaUI \
  CLAUDE_BIN="$tmp/bin/claude" GH_BIN="$tmp/bin/gh" \
  VALIDATE_CMD="$validate" env "$@" "$SCRIPTS/adopt.sh"
}

reset_fixture() {
  git -C "$tmp/fb" reset -q --hard "$pre_sha"
  rm -f "$tmp/summary.md" "$tmp/claude-calls.log" "$tmp/gh-calls.log" "$tmp/log"
}

# 1. Green path: swap kept, summary preserved, label ensured, prompt rendered.
reset_fixture
run_adopt true DO_SWAP=1 WRITE_SUMMARY=1 || fail "green path must exit 0"
[ "$(git -C "$tmp/fb" rev-parse HEAD)" != "$pre_sha" ] || fail "swap commit should be kept"
assert_file_contains "$tmp/summary.md" "Swapped: Button" "claude summary preserved"
assert_file_contains "$tmp/claude-calls.log" "v1.2.3" "version substituted into prompt"
assert_file_contains "$tmp/claude-calls.log" "$tmp/summary.md" "summary path substituted"
assert_file_contains "$tmp/claude-calls.log" "Fiestaboard/FiestaUI" "UI repo substituted"
assert_file_contains "$tmp/claude-calls.log" "--model opus" "opus model requested"
assert_file_contains "$tmp/gh-calls.log" "label create component-request -R Fiestaboard/FiestaUI" "label ensured"

# 2. Red validation: rolled back to pre_sha, summary says so, still exit 0.
reset_fixture
run_adopt false DO_SWAP=1 WRITE_SUMMARY=1 || fail "red path must still exit 0"
assert_eq "$pre_sha" "$(git -C "$tmp/fb" rev-parse HEAD)" "rolled back to pre-adoption SHA"
assert_file_contains "$tmp/summary.md" "rolled back" "summary reports rollback"

# 3. Claude writes nothing: fallback summary is created.
reset_fixture
run_adopt true || fail "no-op path must exit 0"
assert_file_contains "$tmp/summary.md" "No swap candidates found" "fallback summary written"

# 4. gh label failure is tolerated.
reset_fixture
FIESTAUI_DIR="$REPO_ROOT" FIESTABOARD_DIR="$tmp/fb" \
LOG_FILE="$tmp/log" SUMMARY_FILE="$tmp/summary.md" \
NEW_VERSION=1.2.3 UI_REPO=Fiestaboard/FiestaUI \
CLAUDE_BIN="$tmp/bin/claude" GH_BIN=false \
VALIDATE_CMD=true "$SCRIPTS/adopt.sh" || fail "gh failure must not fail adopt.sh"
