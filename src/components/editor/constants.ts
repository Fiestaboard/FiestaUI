/**
 * Constants for the TipTap template editor.
 * Maps template syntax to FiestaBoard hardware constraints.
 *
 * PORTING NOTE — this file is deliberately thin. The FiestaBoard app's
 * `tiptap-template-editor/utils/constants.ts` re-declared the device grid, the
 * board palette and the board character set, all of which FiestaUI already owns
 * in `src/lib/`. Duplicating them here would give the package two sources of
 * truth for a hardware parity contract. So everything that already exists is
 * re-exported, and only genuinely new editor-specific values are defined below.
 *
 * Already owned by FiestaUI (re-exported, never redefined):
 *   - DeviceType / DEVICE_DIMENSIONS / resolveDimensions → lib/board-dimensions
 *   - BOARD_COLORS (name → hex) / BoardColorName          → lib/board-colors
 *   - BOARD_CHARS (code → character)                      → lib/board-characters
 */

import type { BoardColorName } from "../../lib/board-colors";
import type { BoardDimensions } from "../../lib/board-dimensions";
import { DEVICE_DIMENSIONS } from "../../lib/board-dimensions";

export { BOARD_CHARS } from "../../lib/board-characters";
export { BOARD_COLORS, type BoardColorName } from "../../lib/board-colors";
export {
  type BoardDimensions,
  DEVICE_DIMENSIONS,
  type DeviceType,
  resolveDimensions,
} from "../../lib/board-dimensions";

/**
 * `DeviceDimensions` was the app's name for the { rows, cols } shape that
 * FiestaUI calls `BoardDimensions`. Aliased so ported editor code reads the
 * same, without a second interface declaration.
 */
export type DeviceDimensions = BoardDimensions;

// ── Color codes ───────────────────────────────────────────────────────────────

/**
 * Color names usable inside a template token, including the `purple` alias for
 * `violet`. Wider than `BoardColorName` (which is the hardware palette) because
 * template authors may type either spelling.
 */
export type BoardColorToken = BoardColorName | "purple";

/**
 * FiestaBoard color codes (63–70), keyed by template token name.
 *
 * NEW: FiestaUI's `lib/board-colors` maps names → hex and codes → hex, but has
 * no name → numeric code direction. The editor needs it because a colorTile
 * node stores the numeric code the board hardware addresses.
 *
 * The `satisfies` clause fails the build if a palette color is ever added to
 * BOARD_COLORS without a code being assigned here.
 */
export const BOARD_COLOR_CODES = {
  red: 63,
  orange: 64,
  yellow: 65,
  green: 66,
  blue: 67,
  violet: 68,
  purple: 68, // alias
  white: 69,
  black: 70,
} as const satisfies Record<BoardColorToken, number>;

/**
 * Numeric board codes → canonical color names (71 = filled tile; the closest
 * palette entry is black). Inverse of BOARD_COLOR_CODES, minus the alias.
 */
export const BOARD_CODE_TO_COLOR: Record<number, BoardColorName> = {
  63: "red",
  64: "orange",
  65: "yellow",
  66: "green",
  67: "blue",
  68: "violet",
  69: "white",
  70: "black",
  71: "black",
};

// ── Board geometry defaults ───────────────────────────────────────────────────

/**
 * Flagship geometry, used ONLY as a default when no device is known.
 *
 * The app's constants.ts exported these as `BOARD_WIDTH` / `BOARD_LINES` and
 * modules imported them directly, which silently hard-coded flagship even when
 * the caller was editing a Note template. They are renamed to DEFAULT_* here so
 * that reaching for one is a visible choice: anything that knows its device
 * MUST take the width / line count as a parameter (see length-calculator.ts).
 */
export const DEFAULT_BOARD_WIDTH = DEVICE_DIMENSIONS.flagship.cols; // 22 characters per line
export const DEFAULT_BOARD_LINES = DEVICE_DIMENSIONS.flagship.rows; // 6 total lines

// ── Template syntax ───────────────────────────────────────────────────────────

/** Special variable names. */
export const FILL_SPACE_VAR = "fill_space";
export const FILL_SPACE_REPEAT_VAR = "fill_space_repeat";

/**
 * Zero-width space (U+200B) inserted at the start and end of each line, and on
 * both sides of every inline atom, so the caret always has a text node to sit
 * in. Without it the cursor does not render at line boundaries, and it
 * "selects" atom nodes during arrow navigation.
 *
 * Stripped on serialize so it never appears in a saved template string.
 *
 * Single source of truth: the app declared this character separately in
 * serialization.ts, stroke-transaction.ts and trailing-newline.ts (each with a
 * "mirroring serialization.ts" comment). Three copies of one caret contract is
 * exactly the drift those comments were warning about, so it lives here.
 */
export const CURSOR_ANCHOR = "\u200B";
