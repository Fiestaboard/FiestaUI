#!/usr/bin/env bash
# Bounded Claude fix loop. Renders the prompt template, runs headless
# Claude from the FiestaBoard checkout, and re-validates, up to
# MAX_ATTEMPTS total attempts tracked in ATTEMPTS_FILE (shared across the
# local-fix and CI-repair phases of one workflow run).
#
# Exit 0 = validation green. Exit 1 = attempts exhausted.
set -euo pipefail

: "${FIESTAUI_DIR:?}" "${FIESTABOARD_DIR:?}" "${LOG_FILE:?}"
: "${PREV_VERSION:?}" "${NEW_VERSION:?}"
PROMPT_FILE="${PROMPT_FILE:-$FIESTAUI_DIR/.github/prompts/downstream-upgrade-fix.md}"
ATTEMPTS_FILE="${ATTEMPTS_FILE:-$FIESTABOARD_DIR/.git/du-attempts}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
CLAUDE_MODEL="${CLAUDE_MODEL:-opus}"
VALIDATE_CMD="${VALIDATE_CMD:-\"$FIESTAUI_DIR/scripts/downstream-upgrade/validate.sh\" \"$FIESTABOARD_DIR\" \"$LOG_FILE\"}"

render_prompt() { # attempt
  sed -e "s|{{FIESTAUI_DIR}}|$FIESTAUI_DIR|g" \
      -e "s|{{FIESTABOARD_DIR}}|$FIESTABOARD_DIR|g" \
      -e "s|{{LOG_FILE}}|$LOG_FILE|g" \
      -e "s|{{PREV_VERSION}}|$PREV_VERSION|g" \
      -e "s|{{NEW_VERSION}}|$NEW_VERSION|g" \
      -e "s|{{ATTEMPT}}|$1|g" \
      -e "s|{{MAX_ATTEMPTS}}|$MAX_ATTEMPTS|g" \
      "$PROMPT_FILE"
}

count=$(cat "$ATTEMPTS_FILE" 2>/dev/null || echo 0)
while [ "$count" -lt "$MAX_ATTEMPTS" ]; do
  count=$((count + 1))
  echo "$count" > "$ATTEMPTS_FILE"
  echo "--- Claude fix attempt $count/$MAX_ATTEMPTS ---"

  prompt=$(render_prompt "$count")
  (
    cd "$FIESTABOARD_DIR"
    "$CLAUDE_BIN" -p "$prompt" \
      --model "$CLAUDE_MODEL" \
      --add-dir "$FIESTAUI_DIR" \
      --dangerously-skip-permissions
  ) || echo "claude exited non-zero on attempt $count (continuing to validate)"

  : > "$LOG_FILE"
  if bash -c "$VALIDATE_CMD"; then
    echo "validation green after attempt $count"
    exit 0
  fi
done

echo "fix attempts exhausted ($MAX_ATTEMPTS)" >&2
exit 1
