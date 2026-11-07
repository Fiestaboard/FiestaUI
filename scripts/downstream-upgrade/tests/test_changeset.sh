#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)

# A Changesets repo (FiestaBoard): writes a patch changeset for the ROOT package.
mkdir -p "$tmp/fb/.changeset" "$tmp/fb/web"
echo '{}' > "$tmp/fb/.changeset/config.json"
echo '{ "name": "fiestaboard", "private": true }' > "$tmp/fb/package.json"
echo '{ "name": "web" }' > "$tmp/fb/web/package.json"
out=$("$SCRIPTS/changeset.sh" "$tmp/fb" 9.1.0)
assert_eq ".changeset/fiestaui-upgrade.md" "$out" "prints the path it wrote"
assert_file_contains "$tmp/fb/.changeset/fiestaui-upgrade.md" '"fiestaboard": patch' "names the root package"
assert_file_contains "$tmp/fb/.changeset/fiestaui-upgrade.md" 'v9.1.0' "mentions the version"

# Re-running for a newer version overwrites rather than stacking changesets.
"$SCRIPTS/changeset.sh" "$tmp/fb" 9.2.0 >/dev/null
assert_file_contains "$tmp/fb/.changeset/fiestaui-upgrade.md" 'v9.2.0' "overwritten for the newer version"
assert_eq "1" "$(find "$tmp/fb/.changeset" -name '*.md' | wc -l | tr -d ' ')" "one changeset"

# No Changesets config (the docs site): writes nothing, prints nothing, succeeds.
mkdir -p "$tmp/docs"
echo '{ "name": "docs" }' > "$tmp/docs/package.json"
out=$("$SCRIPTS/changeset.sh" "$tmp/docs" 9.1.0)
assert_eq "" "$out" "no output without .changeset/config.json"
[ ! -e "$tmp/docs/.changeset" ] || fail "must not create .changeset in a non-Changesets repo"

# Missing args → non-zero exit.
if "$SCRIPTS/changeset.sh" "$tmp/fb" 2>/dev/null; then
  fail "missing version should exit non-zero"
fi
