#!/usr/bin/env bash
# Manage the single evergreen upgrade PR on the downstream repo.
# Auth: expects GH_TOKEN (or GITHUB_TOKEN) in the environment — in the
# workflow this is the CLAUDE_BOT_APP installation token.
#
# Usage:
#   pr-sync.sh ensure-labels
#   pr-sync.sh sync <version> <body-file>
#   pr-sync.sh set-state <pending|green|blocked>
#   pr-sync.sh comment <body-file>
set -euo pipefail

REPO="${REPO:-Fiestaboard/FiestaBoard}"
BRANCH="${BRANCH:-fiestaui-upgrade}"
GH_BIN="${GH_BIN:-gh}"

open_pr() {
  "$GH_BIN" pr list -R "$REPO" --head "$BRANCH" --state open \
    --json number --jq '.[0].number // empty'
}

case "${1:?usage: pr-sync.sh <ensure-labels|sync|set-state|comment>}" in
  ensure-labels)
    "$GH_BIN" label create upgrade-pending -R "$REPO" --force \
      --color FBCA04 --description "FiestaUI upgrade: validation in progress"
    "$GH_BIN" label create upgrade-green -R "$REPO" --force \
      --color 0E8A16 --description "FiestaUI upgrade: CI confirmed green, good to merge"
    "$GH_BIN" label create upgrade-blocked -R "$REPO" --force \
      --color D93F0B --description "FiestaUI upgrade: needs a human"
    ;;
  sync)
    VERSION="${2:?sync <version> <body-file>}"
    BODY_FILE="${3:?sync <version> <body-file>}"
    TITLE="chore(deps): upgrade @fiestaboard/ui to v$VERSION"
    pr=$(open_pr)
    if [ -n "$pr" ]; then
      "$GH_BIN" pr edit "$pr" -R "$REPO" --title "$TITLE" --body-file "$BODY_FILE"
    else
      "$GH_BIN" pr create -R "$REPO" --head "$BRANCH" --base main \
        --title "$TITLE" --body-file "$BODY_FILE" --label upgrade-pending
      pr=$(open_pr)
    fi
    echo "$pr"
    ;;
  set-state)
    STATE="${2:?set-state <pending|green|blocked>}"
    pr=$(open_pr)
    [ -n "$pr" ] || { echo "no open PR for $BRANCH" >&2; exit 1; }
    add="upgrade-$STATE"
    remove=()
    for l in upgrade-pending upgrade-green upgrade-blocked; do
      [ "$l" = "$add" ] || remove+=(--remove-label "$l")
    done
    "$GH_BIN" pr edit "$pr" -R "$REPO" --add-label "$add" "${remove[@]}"
    ;;
  comment)
    BODY_FILE="${2:?comment <body-file>}"
    pr=$(open_pr)
    [ -n "$pr" ] || { echo "no open PR for $BRANCH" >&2; exit 1; }
    "$GH_BIN" pr comment "$pr" -R "$REPO" --body-file "$BODY_FILE"
    ;;
  *)
    echo "unknown subcommand: $1" >&2; exit 1
    ;;
esac
