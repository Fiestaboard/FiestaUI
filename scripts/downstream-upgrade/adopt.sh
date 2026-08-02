#!/usr/bin/env bash
# Best-effort design-system adoption pass. Runs headless Claude from the
# FiestaBoard checkout to swap hand-rolled UI onto @fiestaboard/ui, one
# commit per component ([fiestaui-adoption] prefix), then re-validates.
# A red tree is reset to the pre-adoption SHA. Adoption is opportunistic:
# this script exits 0 no matter what — only the upgrade may block the PR.
# See docs/superpowers/specs/2026-08-02-design-system-adoption-design.md.
#
# Env (required): FIESTAUI_DIR FIESTABOARD_DIR LOG_FILE SUMMARY_FILE
#                 NEW_VERSION UI_REPO
# Env (optional): CLAUDE_BIN CLAUDE_MODEL PROMPT_FILE VALIDATE_CMD GH_BIN
set -uo pipefail

: "${FIESTAUI_DIR:?}" "${FIESTABOARD_DIR:?}" "${LOG_FILE:?}" "${SUMMARY_FILE:?}"
: "${NEW_VERSION:?}" "${UI_REPO:?}"
PROMPT_FILE="${PROMPT_FILE:-$FIESTAUI_DIR/.github/prompts/design-system-adoption.md}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"
CLAUDE_MODEL="${CLAUDE_MODEL:-opus}"
GH_BIN="${GH_BIN:-gh}"
VALIDATE_CMD="${VALIDATE_CMD:-\"$FIESTAUI_DIR/scripts/downstream-upgrade/validate.sh\" \"$FIESTABOARD_DIR\" \"$LOG_FILE\"}"

pre_sha=$(git -C "$FIESTABOARD_DIR" rev-parse HEAD)

# The component-request label must exist before Claude files issues.
# Failure is tolerated: issue filing degrades, swaps still run.
"$GH_BIN" label create component-request -R "$UI_REPO" --force \
  --color 5319E7 --description "FiestaBoard needs a component the kit lacks" \
  || echo "warning: could not ensure component-request label on $UI_REPO" >&2

prompt=$(sed -e "s|{{FIESTAUI_DIR}}|$FIESTAUI_DIR|g" \
    -e "s|{{FIESTABOARD_DIR}}|$FIESTABOARD_DIR|g" \
    -e "s|{{LOG_FILE}}|$LOG_FILE|g" \
    -e "s|{{SUMMARY_FILE}}|$SUMMARY_FILE|g" \
    -e "s|{{NEW_VERSION}}|$NEW_VERSION|g" \
    -e "s|{{UI_REPO}}|$UI_REPO|g" \
    "$PROMPT_FILE")

(
  cd "$FIESTABOARD_DIR"
  "$CLAUDE_BIN" -p "$prompt" \
    --model "$CLAUDE_MODEL" \
    --add-dir "$FIESTAUI_DIR" \
    --dangerously-skip-permissions
) || echo "claude exited non-zero during adoption (continuing)" >&2

: > "$LOG_FILE"
if ! bash -c "$VALIDATE_CMD"; then
  echo "adoption left validation red — rolling back to $pre_sha" >&2
  git -C "$FIESTABOARD_DIR" reset --hard "$pre_sha"
  {
    echo "### Design-system adoption"
    echo
    echo "Attempted swaps left validation red; all adoption commits were rolled back."
  } > "$SUMMARY_FILE"
fi

if [ ! -s "$SUMMARY_FILE" ]; then
  {
    echo "### Design-system adoption"
    echo
    echo "No swap candidates found this run."
  } > "$SUMMARY_FILE"
fi

exit 0
