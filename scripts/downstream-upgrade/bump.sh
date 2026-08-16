#!/usr/bin/env bash
# Pin @fiestaboard/ui to an exact released version in a downstream repo's
# npm app and refresh the lockfile. The app lives at the repo root for some
# consumers (the docs site) and in a subdirectory for others (FiestaBoard's
# `web/`), so the subdir is a parameter rather than a constant.
#
# SKIP_INSTALL=1 skips `npm install` (tests and dry runs that only need the
# manifest change). INSTALL_FLAGS adds flags to `npm install` — FiestaBoard
# needs --legacy-peer-deps to match its own CI install; the docs site does
# not and must not get it.
#
# Usage: bump.sh <repo-dir> <version> [app-subdir]  # version without leading v
set -euo pipefail

REPO_DIR="${1:?usage: bump.sh <repo-dir> <version> [app-subdir]}"
VERSION="${2:?usage: bump.sh <repo-dir> <version> [app-subdir]}"
APP_SUBDIR="${3:-.}"
INSTALL_FLAGS="${INSTALL_FLAGS:-}"
APP_DIR="$REPO_DIR/$APP_SUBDIR"

[ -f "$APP_DIR/package.json" ] || { echo "no package.json in $APP_DIR" >&2; exit 1; }

(
  cd "$APP_DIR"
  npm pkg set "dependencies.@fiestaboard/ui=$VERSION"
  if [ "${SKIP_INSTALL:-0}" != "1" ]; then
    # shellcheck disable=SC2086 # INSTALL_FLAGS is an intentional word list
    npm install $INSTALL_FLAGS --no-audit --fund=false
  fi
)
