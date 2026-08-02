#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/fb/web"
cat > "$tmp/fb/web/package.json" <<'EOF'
{
  "name": "web",
  "dependencies": { "@fiestaboard/ui": "^0.3.0" }
}
EOF

# Pins the dependency to the exact version without installing.
SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/fb" 0.4.0
assert_file_contains "$tmp/fb/web/package.json" '"@fiestaboard/ui": "0.4.0"' "exact pin written"

# Missing args → non-zero exit.
if SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/fb" 2>/dev/null; then
  fail "missing version should exit non-zero"
fi

# Missing web/package.json → non-zero exit.
mkdir -p "$tmp/empty"
if SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/empty" 0.4.0 2>/dev/null; then
  fail "missing web/package.json should exit non-zero"
fi
