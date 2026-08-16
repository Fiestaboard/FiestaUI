/**
 * Character counting logic for FiestaBoard.
 *
 * Must match backend logic in src/templates/engine.py `_count_tiles()`. The
 * per-node-type widths below are a parity contract with that function: if the
 * editor and the renderer disagree about how many tiles a token occupies, the
 * overflow warning lies. Change one, change both.
 */

import type { JSONContent } from "@tiptap/react";

import { CURSOR_ANCHOR } from "../constants";

/**
 * Calculate the rendered length of a line in characters/tiles.
 * Matches backend _count_tiles() logic.
 */
export function calculateLineLength(lineContent: JSONContent[]): number {
  if (!lineContent || lineContent.length === 0) {
    return 0;
  }

  let tileCount = 0;

  for (const node of lineContent) {
    switch (node.type) {
      case "text":
        // Regular text counts as actual length (exclude end-of-line cursor placeholder)
        tileCount += (node.text || "").replaceAll(CURSOR_ANCHOR, "").length;
        break;

      case "variable":
        // Variables count as maxLength
        tileCount += node.attrs?.maxLength || 10;
        break;

      case "colorTile":
        // Color tiles count as 1 character
        tileCount += 1;
        break;

      case "fillSpace":
        // fill_space is calculated dynamically, counts as 0 here
        tileCount += 0;
        break;

      case "formula":
        // Formula result length is dynamic; use a conservative estimate
        tileCount += node.attrs?.estimatedLength ?? 10;
        break;

      default:
        break;
    }
  }

  return tileCount;
}

/**
 * Check if a line will overflow the board width.
 *
 * PORTED FIX: the app read a module-level `BOARD_WIDTH` constant here, which
 * hard-coded flagship's 22 columns. Editing a Note template (15 columns) — or
 * any note_array — therefore reported "no overflow" for lines that overflow on
 * the real hardware. `boardWidth` is now a required parameter so the caller's
 * device always decides. Resolve it with `resolveDimensions(deviceType).cols`
 * (see ../constants); reach for DEFAULT_BOARD_WIDTH only when no device is
 * known at all.
 *
 * @param lineContent  Inline nodes of a single line.
 * @param boardWidth   Columns available on the target device.
 */
export function willOverflow(lineContent: JSONContent[], boardWidth: number): boolean {
  return calculateLineLength(lineContent) > boardWidth;
}

/**
 * Get overflow amount (0 if no overflow).
 *
 * @param lineContent  Inline nodes of a single line.
 * @param boardWidth   Columns available on the target device.
 */
export function getOverflowAmount(lineContent: JSONContent[], boardWidth: number): number {
  return Math.max(0, calculateLineLength(lineContent) - boardWidth);
}
