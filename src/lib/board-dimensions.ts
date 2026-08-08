/**
 * Board device geometry — flagship, Note, and note-array grids.
 *
 * Extracted from FiestaBoard's board-dimensions.ts (presentational subset:
 * the app keeps its page/board compatibility helpers, which mirror Python
 * platform code). Values are a parity contract with the hardware.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
export const NOTE_ROWS = 3;
export const NOTE_COLS = 15;
export const MAX_NOTES_PER_AXIS = 8;

// ── Types ─────────────────────────────────────────────────────────────────────
/** The board hardware families a preview can render. */
export type DeviceType = "flagship" | "note" | "note_array";

export interface BoardDimensions {
  rows: number;
  cols: number;
}

// ── Static device dimensions (flagship + note) ────────────────────────────────
export const DEVICE_DIMENSIONS: Record<string, BoardDimensions> = {
  flagship: { rows: 6, cols: 22 },
  note: { rows: NOTE_ROWS, cols: NOTE_COLS },
};

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Compute dimensions for a note-array grid. Does NOT validate inputs.
 */
export function noteArrayDimensions(notes_wide: number, notes_tall: number): BoardDimensions {
  return {
    rows: notes_tall * NOTE_ROWS,
    cols: notes_wide * NOTE_COLS,
  };
}

/** Return true if device_type is "note_array". */
export function isNoteArray(deviceType: string): boolean {
  return deviceType === "note_array";
}

/**
 * Cache of computed note-array dimensions, keyed by "wide×tall".
 *
 * Guarantees a stable object identity per grid size: repeat calls with the
 * same dimensions return the same reference (matching the shared identity that
 * flagship/note already have via DEVICE_DIMENSIONS), so consumers can safely
 * pass the result into a useMemo/useEffect/memo dependency array. Allocation
 * stays at zero for repeat calls.
 */
const noteArrayCache = new Map<string, BoardDimensions>();

/**
 * Resolve board dimensions for any device type.
 *
 * - "flagship" | "note"  → looks up DEVICE_DIMENSIONS (w/h ignored)
 * - "note_array"         → computes from notes_wide × notes_tall (cached)
 * - unknown              → falls back to flagship
 *
 * The returned object identity is stable for a given (deviceType, notes_wide,
 * notes_tall): the same reference is returned on every call.
 *
 * @param deviceType  "flagship" | "note" | "note_array"
 * @param notes_wide  Number of notes wide (only used for "note_array"; default 1)
 * @param notes_tall  Number of notes tall (only used for "note_array"; default 1)
 * @returns           { rows, cols }
 */
export function resolveDimensions(deviceType: string, notes_wide = 1, notes_tall = 1): BoardDimensions {
  if (deviceType in DEVICE_DIMENSIONS) {
    return DEVICE_DIMENSIONS[deviceType];
  }
  if (deviceType === "note_array") {
    const key = `${notes_wide}×${notes_tall}`;
    let dims = noteArrayCache.get(key);
    if (dims === undefined) {
      dims = noteArrayDimensions(notes_wide, notes_tall);
      noteArrayCache.set(key, dims);
    }
    return dims;
  }
  // Unknown: fall back to flagship
  return DEVICE_DIMENSIONS.flagship;
}
