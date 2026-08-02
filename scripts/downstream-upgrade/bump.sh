#!/usr/bin/env bash
# Pin @fiestaboard/ui to an exact released version in the FiestaBoard web
# app and refresh the lockfile. SKIP_INSTALL=1 skips `npm install` (tests
# and dry runs that only need the manifest change).
#
# Usage: bump.sh <fiestaboard-dir> <version>   # version without leading v
set -euo pipefail

FB_DIR="${1:?usage: bump.sh <fiestaboard-dir> <version>}"
VERSION="${2:?usage: bump.sh <fiestaboard-dir> <version>}"
WEB_DIR="$FB_DIR/web"

[ -f "$WEB_DIR/package.json" ] || { echo "no package.json in $WEB_DIR" >&2; exit 1; }

(
  cd "$WEB_DIR"
  npm pkg set "dependencies.@fiestaboard/ui=$VERSION"
  if [ "${SKIP_INSTALL:-0}" != "1" ]; then
    # --legacy-peer-deps matches FiestaBoard's own CI install flags.
    npm install --legacy-peer-deps --no-audit --fund=false
  fi
)
