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
 *
 * Keys are derived from clamped axis counts (see clampNotesPerAxis), so the
 * cache is bounded at MAX_NOTES_PER_AXIS² entries regardless of caller input.
 */
const noteArrayCache = new Map<string, BoardDimensions>();

/** Clamp a notes-per-axis count to an integer in [1, MAX_NOTES_PER_AXIS]. */
function clampNotesPerAxis(n: number): number {
  if (Number.isNaN(n)) return 1;
  const i = Math.floor(n);
  if (i < 1) return 1;
  return i > MAX_NOTES_PER_AXIS ? MAX_NOTES_PER_AXIS : i;
}

/**
 * Resolve board dimensions for any device type.
 *
 * - "flagship" | "note"  → looks up DEVICE_DIMENSIONS (w/h ignored)
 * - "note_array"         → computes from notes_wide × notes_tall (cached)
 * - unknown              → falls back to flagship
 *
 * The returned object identity is stable for a given (deviceType, notes_wide,
 * notes_tall): the same reference is returned on every call. For "note_array",
 * notes_wide/notes_tall are clamped to integers in [1, MAX_NOTES_PER_AXIS]
 * (NaN → 1) before computing and caching.
 *
 * @param deviceType  "flagship" | "note" | "note_array"
 * @param notes_wide  Number of notes wide (only used for "note_array"; default 1)
 * @param notes_tall  Number of notes tall (only used for "note_array"; default 1)
 * @returns           { rows, cols }
 */
export function resolveDimensions(deviceType: string, notes_wide = 1, notes_tall = 1): BoardDimensions {
  if (Object.hasOwn(DEVICE_DIMENSIONS, deviceType)) {
    return DEVICE_DIMENSIONS[deviceType];
  }
  if (deviceType === "note_array") {
    const wide = clampNotesPerAxis(notes_wide);
    const tall = clampNotesPerAxis(notes_tall);
    const key = `${wide}×${tall}`;
    let dims = noteArrayCache.get(key);
    if (dims === undefined) {
      dims = noteArrayDimensions(wide, tall);
      noteArrayCache.set(key, dims);
    }
    return dims;
  }
  // Unknown: fall back to flagship
  return DEVICE_DIMENSIONS.flagship;
}
