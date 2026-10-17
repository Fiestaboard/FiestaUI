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

export interface BoardSizeIndicatorLabels {
  /** Accessible name. Default: (rows, cols) => `${rows} rows by ${cols} columns` */
  dimensions?: (rows: number, cols: number) => string;
  /** Accessible name when a layout name is shown alongside. Default: `${rows} rows by ${cols} columns, ${layout}` */
  dimensionsWithLayout?: (rows: number, cols: number, layout: string) => string;
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
  labels?: BoardSizeIndicatorLabels;
  className?: string;
}

export const defaultBoardSizeIndicatorLabels: Required<BoardSizeIndicatorLabels> = {
  dimensions: (rows, cols) => `${rows} rows by ${cols} columns`,
  dimensionsWithLayout: (rows, cols, layout) => `${rows} rows by ${cols} columns, ${layout}`,
};

export function BoardSizeIndicator({
  deviceType,
  notesWide = 1,
  notesTall = 1,
  gridRows,
  gridCols,
  layoutLabel,
  labels,
  className,
}: BoardSizeIndicatorProps) {
  const { rows, cols } = resolveDimensions(deviceType, notesWide, notesTall, gridRows, gridCols);
  const l = { ...defaultBoardSizeIndicatorLabels, ...labels };
  const layout = layoutLabel?.trim() || undefined;
  const ariaLabel = layout ? l.dimensionsWithLayout(rows, cols, layout) : l.dimensions(rows, cols);

  return (
    <span
      role="img"
      aria-label={ariaLabel}
      data-slot="board-size-indicator"
      data-rows={rows}
      data-cols={cols}
      className={cn("inline-flex items-center font-mono text-xs text-muted-foreground tabular-nums", className)}
    >
      <span aria-hidden="true">{layout ? `${rows} × ${cols} · ${layout}` : `${rows} × ${cols}`}</span>
    </span>
  );
}
