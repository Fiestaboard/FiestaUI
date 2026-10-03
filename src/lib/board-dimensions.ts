/**
 * Board device geometry — flagship, Note, note-array and panel grids.
 *
 * Extracted from FiestaBoard's board-dimensions.ts (presentational subset:
 * the app keeps its page/board compatibility helpers, which mirror Python
 * platform code). Values are a parity contract with the hardware.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
export const NOTE_ROWS = 3;
export const NOTE_COLS = 15;
export const MAX_NOTES_PER_AXIS = 8;

/**
 * Panel grid bounds. A panel — a life-size virtual split-flap board on a TV —
 * is sized by character, not by Note block, but is never smaller than one Note.
 * The maximum covers a 200" TV in portrait.
 */
export const MIN_GRID_ROWS = 3;
export const MIN_GRID_COLS = 15;
export const MAX_GRID_ROWS = 96;
export const MAX_GRID_COLS = 128;

// ── Types ─────────────────────────────────────────────────────────────────────
/**
 * The board hardware families a preview can render. `"panel"` is a virtual
 * board of any rows × cols, sized explicitly by grid_rows / grid_cols.
 */
export type DeviceType = "flagship" | "note" | "note_array" | "panel";

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

/** Return true if device_type is "panel" (an explicit rows × cols grid). */
export function isPanel(deviceType: string): boolean {
  return deviceType === "panel";
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

/**
 * Cache of panel dimensions, keyed by "rows×cols" — the same stable-identity
 * guarantee as noteArrayCache. Keys are derived from clamped axes (see
 * clampAxis), so the cache is bounded by the grid limits —
 * (MAX_GRID_ROWS − MIN_GRID_ROWS + 1) × (MAX_GRID_COLS − MIN_GRID_COLS + 1)
 * entries at most — regardless of caller input. Nothing is ever evicted:
 * eviction would hand a caller a fresh reference for a size it had already
 * resolved, breaking the identity guarantee.
 */
const panelCache = new Map<string, BoardDimensions>();

/** Clamp a value to an integer in [min, max] (NaN → min). */
function clampAxis(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min;
  const i = Math.floor(n);
  if (i < min) return min;
  return i > max ? max : i;
}

/** Clamp a notes-per-axis count to an integer in [1, MAX_NOTES_PER_AXIS]. */
function clampNotesPerAxis(n: number): number {
  return clampAxis(n, 1, MAX_NOTES_PER_AXIS);
}

/**
 * Resolve board dimensions for any device type.
 *
 * - "flagship" | "note"  → looks up DEVICE_DIMENSIONS (other args ignored)
 * - "note_array"         → computes from notes_wide × notes_tall (cached)
 * - "panel"              → grid_rows × grid_cols (cached)
 * - unknown              → falls back to flagship
 *
 * The returned object identity is stable for a given input: the same
 * reference is returned on every call. For "note_array", notes_wide/notes_tall
 * are clamped to integers in [1, MAX_NOTES_PER_AXIS] (NaN → 1) before
 * computing and caching. For "panel", grid_rows is clamped to an integer in
 * [MIN_GRID_ROWS, MAX_GRID_ROWS] and grid_cols to [MIN_GRID_COLS,
 * MAX_GRID_COLS] (NaN/undefined → the minimum). The grid args are ignored for
 * every other device type.
 *
 * @param deviceType  "flagship" | "note" | "note_array" | "panel"
 * @param notes_wide  Number of notes wide (only used for "note_array"; default 1)
 * @param notes_tall  Number of notes tall (only used for "note_array"; default 1)
 * @param grid_rows   Rows of characters (only used for "panel")
 * @param grid_cols   Columns of characters (only used for "panel")
 * @returns           { rows, cols }
 */
export function resolveDimensions(
  deviceType: string,
  notes_wide = 1,
  notes_tall = 1,
  grid_rows?: number,
  grid_cols?: number,
): BoardDimensions {
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
  if (deviceType === "panel") {
    const rows = clampAxis(grid_rows ?? MIN_GRID_ROWS, MIN_GRID_ROWS, MAX_GRID_ROWS);
    const cols = clampAxis(grid_cols ?? MIN_GRID_COLS, MIN_GRID_COLS, MAX_GRID_COLS);
    const key = `${rows}×${cols}`;
    let dims = panelCache.get(key);
    if (dims === undefined) {
      dims = { rows, cols };
      panelCache.set(key, dims);
    }
    return dims;
  }
  // Unknown: fall back to flagship
  return DEVICE_DIMENSIONS.flagship;
}
