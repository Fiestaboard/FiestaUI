#!/usr/bin/env bash
# Add a Changesets changeset to the upgrade commit, for downstream repos that
# release through Changesets (FiestaBoard). Their CI fails a PR that changes
# shipped code without one, and a design-system upgrade is a user-visible
# change that should reach a release. Repos without `.changeset/config.json`
# (the docs site) are left alone, so this is safe to run for every consumer.
#
# The changeset names the repo's ROOT package.json package: FiestaBoard's app
# lives in web/, but web/ is not a workspace — Changesets only knows the root
# package ("fiestaboard"). Always `patch`: a dependency bump of the design
# system; a breaking UI change gets its own changeset from a human.
#
# Prints the repo-relative path it wrote (for `git add`), or nothing.
#
# Usage: changeset.sh <repo-dir> <version>  # version without leading v
set -euo pipefail

REPO_DIR="${1:?usage: changeset.sh <repo-dir> <version>}"
VERSION="${2:?usage: changeset.sh <repo-dir> <version>}"
REL=".changeset/fiestaui-upgrade.md"

[ -f "$REPO_DIR/.changeset/config.json" ] || exit 0

NAME=$(node -p 'require(process.argv[1]).name' "$REPO_DIR/package.json")
[ -n "$NAME" ] && [ "$NAME" != "undefined" ] || { echo "no package name in $REPO_DIR/package.json" >&2; exit 1; }

cat > "$REPO_DIR/$REL" <<CHANGESET
---
"$NAME": patch
---

Upgrade the FiestaUI design system (\`@fiestaboard/ui\`) to v$VERSION.
CHANGESET
echo "$REL"
