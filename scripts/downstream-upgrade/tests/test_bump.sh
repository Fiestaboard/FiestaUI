#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)

mk_app() { # dir
  mkdir -p "$1"
  cat > "$1/package.json" <<'EOF'
{
  "name": "app",
  "dependencies": { "@fiestaboard/ui": "^0.3.0" }
}
EOF
}

# App in a subdirectory (FiestaBoard's web/): pins the exact version.
mk_app "$tmp/fb/web"
SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/fb" 0.4.0 web
assert_file_contains "$tmp/fb/web/package.json" '"@fiestaboard/ui": "0.4.0"' "exact pin written in subdir app"

# App at the repo root (the docs site): same bump, no subdir argument.
mk_app "$tmp/docs"
SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/docs" 0.4.0
assert_file_contains "$tmp/docs/package.json" '"@fiestaboard/ui": "0.4.0"' "exact pin written in root app"

# An explicit "." subdir is equivalent to omitting it.
mk_app "$tmp/docs-dot"
SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/docs-dot" 0.5.0 .
assert_file_contains "$tmp/docs-dot/package.json" '"@fiestaboard/ui": "0.5.0"' "explicit . subdir works"

# Missing args → non-zero exit.
if SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/fb" 2>/dev/null; then
  fail "missing version should exit non-zero"
fi

# Missing package.json in the app dir → non-zero exit.
mkdir -p "$tmp/empty"
if SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/empty" 0.4.0 2>/dev/null; then
  fail "missing package.json should exit non-zero"
fi

# Right repo, wrong subdir → non-zero exit rather than a silent no-op.
if SKIP_INSTALL=1 "$SCRIPTS/bump.sh" "$tmp/fb" 0.4.0 nope 2>/dev/null; then
  fail "missing app subdir should exit non-zero"
fi
