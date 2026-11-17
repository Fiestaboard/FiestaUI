import { NOTE_COLS, NOTE_ROWS, resolveDimensions } from "./board-dimensions";
import { deriveTileMetrics, TILE_BASE_HEIGHT } from "./board-metrics";

/** A Note's row-major number and zero-based, end-exclusive canvas range. */
export interface NoteRange {
  note: number;
  rowStart: number;
  rowEnd: number;
  columnStart: number;
  columnEnd: number;
}

export interface NoteArrayGeometryOptions {
  /** Notes per axis, bounded exactly as BoardDisplay (1–8). Defaults to 2. */
  notesWide?: number;
  notesTall?: number;
  /** Tile dimensions in canvas pixels. Defaults to the shared small tile. */
  tileWidth?: number;
  tileHeight?: number;
  /** Gutters between cells. Defaults to the shared small tile's gutter. */
  columnGap?: number;
  rowGap?: number;
  /** Additional space at physical Note boundaries. Small board default: 6px. */
  seamGap?: number;
}

export interface NoteRegion extends NoteRange {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NoteArrayGeometry {
  notesWide: number;
  notesTall: number;
  width: number;
  height: number;
  notes: NoteRegion[];
  /** Centers of the physical gaps, measured from the first tile's edge. */
  columnSeams: number[];
  rowSeams: number[];
}

/** Null means all Notes, including an invalid selection after an array resize. */
export function getNoteRange(note: number | null, notesWide = 2, notesTall = 2): NoteRange | null {
  const { cols, rows } = resolveDimensions("note_array", notesWide, notesTall);
  const wide = cols / NOTE_COLS;
  if (note === null || !Number.isInteger(note) || note < 1 || note > wide * (rows / NOTE_ROWS)) return null;
  const rowStart = Math.floor((note - 1) / wide) * NOTE_ROWS;
  const columnStart = ((note - 1) % wide) * NOTE_COLS;
  return { note, rowStart, rowEnd: rowStart + NOTE_ROWS, columnStart, columnEnd: columnStart + NOTE_COLS };
}

const smallTile = deriveTileMetrics(TILE_BASE_HEIGHT.sm);
const finiteMetric = (value: number, fallback: number, minimum: number) =>
  Number.isFinite(value) && value >= minimum && value <= Number.MAX_SAFE_INTEGER ? value : fallback;

/**
 * Geometry only: no content or renderer. Place its origin at the first tile,
 * excluding any board bezel. Hosts using another tile scale or editor rows
 * supply their measured tile dimensions/gutters; the physical seam is extra
 * space in addition to the normal gutter, matching both shared renderers.
 */
export function getNoteArrayGeometry({
  notesWide = 2,
  notesTall = 2,
  tileWidth = smallTile.width,
  tileHeight = smallTile.height,
  columnGap = smallTile.gutter,
  rowGap = smallTile.gutter,
  seamGap = 6,
}: NoteArrayGeometryOptions = {}): NoteArrayGeometry {
  const { cols, rows } = resolveDimensions("note_array", notesWide, notesTall);
  const wide = cols / NOTE_COLS;
  const tall = rows / NOTE_ROWS;
  const w = finiteMetric(tileWidth, smallTile.width, Number.MIN_VALUE);
  const h = finiteMetric(tileHeight, smallTile.height, Number.MIN_VALUE);
  const gx = finiteMetric(columnGap, smallTile.gutter, 0);
  const gy = finiteMetric(rowGap, smallTile.gutter, 0);
  const seam = finiteMetric(seamGap, 6, 0);
  const noteWidth = NOTE_COLS * w + (NOTE_COLS - 1) * gx;
  const noteHeight = NOTE_ROWS * h + (NOTE_ROWS - 1) * gy;
  const stepX = noteWidth + gx + seam;
  const stepY = noteHeight + gy + seam;
  return {
    notesWide: wide,
    notesTall: tall,
    width: wide * stepX - gx - seam,
    height: tall * stepY - gy - seam,
    notes: Array.from({ length: wide * tall }, (_, index) => ({
      ...getNoteRange(index + 1, wide, tall)!,
      x: (index % wide) * stepX,
      y: Math.floor(index / wide) * stepY,
      width: noteWidth,
      height: noteHeight,
    })),
    columnSeams: Array.from({ length: wide - 1 }, (_, index) => (index + 1) * stepX - (gx + seam) / 2),
    rowSeams: Array.from({ length: tall - 1 }, (_, index) => (index + 1) * stepY - (gy + seam) / 2),
  };
}
