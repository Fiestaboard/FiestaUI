/**
 * Compact textual readout of a board's shape: `6 × 22`, or `6 × 30 · 2×2 grid`
 * when the app names the layout. The textual form of the same geometry
 * BoardTeaser / StaticBoardDisplay render from.
 *
 * Dimensions read `rows × cols` (height × width) — the convention FiestaBoard's
 * note-array work settled on. The whole readout is one `role="img"` whose
 * accessible name spells out each axis ("6 rows by 22 columns"), because
 * "6 × 22" read aloud is ambiguous about which number is which.
 *
 * The kit does not model named note-array presets; the app resolves which
 * preset (if any) the geometry matches and passes the localized name in as
 * `layoutLabel`.
 */

import { type DeviceType, resolveDimensions } from "../../lib/board-dimensions";
import { cn } from "../../lib/utils";

/**
 * Which axis reads first. `rows×cols` (the default) is the note-array
 * convention; `cols×rows` is how the redesign names hardware ("45×3", C8 /
 * CANON addendum).
 */
export type BoardSizeFormat = "rows×cols" | "cols×rows";

export interface BoardSizeIndicatorLabels {
  /** Accessible name. Default: `${rows} rows by ${cols} columns`, or columns first for `cols×rows`. */
  dimensions?: (rows: number, cols: number, format: BoardSizeFormat) => string;
  /** Accessible name when a layout name is shown alongside. Default: the above plus `, ${layout}`. */
  dimensionsWithLayout?: (rows: number, cols: number, layout: string, format: BoardSizeFormat) => string;
}

export interface BoardSizeIndicatorProps {
  deviceType: DeviceType;
  /** Note-array grid size. Both default to 1; ignored for other device types. */
  notesWide?: number;
  notesTall?: number;
  /** Panel grid size in characters; ignored for other device types. */
  gridRows?: number;
  gridCols?: number;
  /**
   * Name of the layout, appended after a separator dot — the app resolves
   * which preset (if any) the geometry matches, and localizes it. Omit for
   * the bare `rows × cols` form.
   */
  layoutLabel?: string;
  /** Axis order. Default `"rows×cols"` ("6 × 22"); `"cols×rows"` reads "22 × 6". */
  format?: BoardSizeFormat;
  labels?: BoardSizeIndicatorLabels;
  className?: string;
}

/** "1 row" / "8 rows": a 1 × 8 LED board must not read "1 rows". */
const axis = (n: number, singular: string) => `${n} ${singular}${n === 1 ? "" : "s"}`;

const spoken = (rows: number, cols: number, format: BoardSizeFormat = "rows×cols") =>
  format === "cols×rows"
    ? `${axis(cols, "column")} by ${axis(rows, "row")}`
    : `${axis(rows, "row")} by ${axis(cols, "column")}`;

export const defaultBoardSizeIndicatorLabels: Required<BoardSizeIndicatorLabels> = {
  dimensions: (rows, cols, format) => spoken(rows, cols, format),
  dimensionsWithLayout: (rows, cols, layout, format) => `${spoken(rows, cols, format)}, ${layout}`,
};

export function BoardSizeIndicator({
  deviceType,
  notesWide = 1,
  notesTall = 1,
  gridRows,
  gridCols,
  layoutLabel,
  format = "rows×cols",
  labels,
  className,
}: BoardSizeIndicatorProps) {
  const { rows, cols } = resolveDimensions(deviceType, notesWide, notesTall, gridRows, gridCols);
  const l = { ...defaultBoardSizeIndicatorLabels, ...labels };
  const layout = layoutLabel?.trim() || undefined;
  const ariaLabel = layout ? l.dimensionsWithLayout(rows, cols, layout, format) : l.dimensions(rows, cols, format);
  const dims = format === "cols×rows" ? `${cols} × ${rows}` : `${rows} × ${cols}`;

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      data-slot="board-size-indicator"
      data-rows={rows}
      data-cols={cols}
      {...(format === "rows×cols" ? {} : { "data-format": format })}
      className={cn("inline-flex items-center font-mono text-xs text-muted-foreground tabular-nums", className)}
    >
      <span aria-hidden="true">{layout ? `${dims} · ${layout}` : dims}</span>
    </span>
  );
}
