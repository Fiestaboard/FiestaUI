#!/usr/bin/env bash
# Bounded Claude fix loop. Renders the prompt template, runs headless
# Claude from the downstream checkout, and re-validates, up to
# MAX_ATTEMPTS total attempts tracked in ATTEMPTS_FILE (shared across the
# local-fix and CI-repair phases of one workflow run).
#
# DOWNSTREAM_DIR/DOWNSTREAM_NAME/APP_DIR identify which consumer is being
# repaired (FiestaBoard's web app, the docs site, …) — they are rendered
# into the prompt so Claude knows what it is editing and how to validate.
#
# Exit 0 = validation green. Exit 1 = attempts exhausted.
set -euo pipefail

: "${FIESTAUI_DIR:?}" "${DOWNSTREAM_DIR:?}" "${LOG_FILE:?}"
: "${PREV_VERSION:?}" "${NEW_VERSION:?}"
DOWNSTREAM_NAME="${DOWNSTREAM_NAME:-the downstream app}"
APP_DIR="${APP_DIR:-.}"
VALIDATE_TARGETS="${VALIDATE_TARGETS:-typecheck test:run}"
PROMPT_FILE="${PROMPT_FILE:-$FIESTAUI_DIR/.github/prompts/downstream-upgrade-fix.md}"
ATTEMPTS_FILE="${ATTEMPTS_FILE:-$DOWNSTREAM_DIR/.git/du-attempts}"
MAX_ATTEMPTS="${MAX_ATTEMPTS:-3}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
CLAUDE_MODEL="${CLAUDE_MODEL:-opus}"
VALIDATE_CMD="${VALIDATE_CMD:-\"$FIESTAUI_DIR/scripts/downstream-upgrade/validate.sh\" \"$DOWNSTREAM_DIR\" \"$LOG_FILE\"}"

# `npm run a && npm run b`, for the human-readable instruction in the prompt.
validate_hint() {
  local target sep="" out=""
  # shellcheck disable=SC2086 # VALIDATE_TARGETS is an intentional word list
  for target in $VALIDATE_TARGETS; do
    out="$out$sep npm run $target"
    sep=" &&"
  done
  echo "${out# }"
}

render_prompt() { # attempt
  # `&` is "the whole match" in a sed replacement, so the `&&` joining the
  # validate targets has to be escaped or it renders as the placeholder,
  # twice. Nothing else substituted here can contain one.
  local hint
  hint=$(validate_hint)
  hint=${hint//&/\\&}
  sed -e "s|{{FIESTAUI_DIR}}|$FIESTAUI_DIR|g" \
      -e "s|{{DOWNSTREAM_DIR}}|$DOWNSTREAM_DIR|g" \
      -e "s|{{DOWNSTREAM_NAME}}|$DOWNSTREAM_NAME|g" \
      -e "s|{{APP_DIR}}|$APP_DIR|g" \
      -e "s|{{VALIDATE_HINT}}|$hint|g" \
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
    cd "$DOWNSTREAM_DIR"
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
