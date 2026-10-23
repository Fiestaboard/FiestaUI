#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=/dev/null
. "$(dirname "$0")/helpers.sh"
SCRIPTS="$(cd "$(dirname "$0")/.." && pwd)"

tmp=$(make_tmp)
mkdir -p "$tmp/bin"
cat > "$tmp/bin/gh" <<EOF
#!/usr/bin/env bash
echo "\$@" >> "$tmp/gh-calls.log"
case "\$1 \$2" in
  "pr list")
    if [ -f "$tmp/created-pr" ]; then
      echo 8
    else
      printf '%s' "\$PR_LIST_OUTPUT"
    fi
    ;;
  "pr create")
    touch "$tmp/created-pr"
    echo "https://github.com/acme/app/pull/8"
    ;;
  "pr edit") echo "https://github.com/acme/app/pull/\$3" ;;
esac
EOF
chmod +x "$tmp/bin/gh"

run() { GH_BIN="$tmp/bin/gh" REPO=acme/app BRANCH=fiestaui-upgrade "$SCRIPTS/pr-sync.sh" "$@"; }
echo "release notes" > "$tmp/body.md"

# No open PR → create.
: > "$tmp/gh-calls.log"
pr=$(PR_LIST_OUTPUT="" run sync 0.4.0 "$tmp/body.md")
assert_eq "8" "$pr" "sync stdout is only the created PR number"
assert_file_contains "$tmp/gh-calls.log" "pr create" "creates when none open"
assert_file_contains "$tmp/gh-calls.log" "upgrade-pending" "initial label applied"
assert_file_contains "$tmp/gh-calls.log" "chore(deps): upgrade @fiestaboard/ui to v0.4.0" "title has version"

# Open PR #7 → edit, not create.
rm "$tmp/created-pr"
: > "$tmp/gh-calls.log"
pr=$(PR_LIST_OUTPUT="7" run sync 0.5.0 "$tmp/body.md")
assert_eq "7" "$pr" "sync stdout is only the existing PR number"
assert_file_contains "$tmp/gh-calls.log" "pr edit 7" "edits existing PR"
if grep -q "pr create" "$tmp/gh-calls.log"; then fail "must not create when PR open"; fi

# set-state green swaps labels.
: > "$tmp/gh-calls.log"
PR_LIST_OUTPUT="7" run set-state green
assert_file_contains "$tmp/gh-calls.log" "--add-label upgrade-green" "adds green"
assert_file_contains "$tmp/gh-calls.log" "--remove-label upgrade-pending" "removes pending"
assert_file_contains "$tmp/gh-calls.log" "--remove-label upgrade-blocked" "removes blocked"

# comment posts to the open PR.
: > "$tmp/gh-calls.log"
PR_LIST_OUTPUT="7" run comment "$tmp/body.md"
assert_file_contains "$tmp/gh-calls.log" "pr comment 7" "comments on open PR"

# ensure-labels creates all three idempotently.
: > "$tmp/gh-calls.log"
run ensure-labels
for l in upgrade-pending upgrade-green upgrade-blocked; do
  assert_file_contains "$tmp/gh-calls.log" "$l" "label $l ensured"
done
