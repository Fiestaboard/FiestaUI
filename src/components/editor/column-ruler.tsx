import type { ComponentProps } from "react";

import { tileScaleRows } from "../../lib/board-metrics";
import { cn } from "../../lib/utils";

export interface ColumnRulerMark {
  id: string;
  type: "cut" | "zone" | "seam";
  /** One-based column immediately before the mark. */
  column: number;
  label?: string;
  /** Space inserted after a seam; defaults to the drawn 10px. Match the host board's geometry. */
  gap?: number;
}
export interface ColumnRulerProps extends Omit<ComponentProps<"div">, "children"> {
  columns: number;
  /** Cell width plus gutter. Defaults to the shared Tile sm pitch. */
  columnPitch?: number;
  visibleRange?: { start: number; end: number };
  marks?: readonly ColumnRulerMark[];
  label?: string;
}
const tile = tileScaleRows().find((row) => row.size === "sm" && row.step === "base")!;
const defaultPitch = tile.width + tile.gutter;
const positive = (value: number, fallback: number) => (Number.isFinite(value) && value > 0 ? value : fallback);

/** A read-only column axis. The host controls its visible range alongside its editor viewport. */
export function ColumnRuler({
  columns,
  columnPitch = defaultPitch,
  visibleRange,
  marks = [],
  label,
  className,
  style,
  ...props
}: ColumnRulerProps) {
  const count = Math.max(1, Math.floor(positive(columns, 1)));
  const pitch = positive(columnPitch, defaultPitch);
  const start = Math.min(count, Math.max(1, Math.floor(positive(visibleRange?.start ?? 1, 1))));
  const end = Math.min(count, Math.max(start, Math.floor(positive(visibleRange?.end ?? count, count))));
  const validMarks = marks.filter((mark) => Number.isInteger(mark.column) && mark.column >= 1 && mark.column <= count);
  const seams = validMarks.filter((mark) => mark.type === "seam" && mark.column < count);
  const gapBefore = (column: number) =>
    seams
      .filter((seam) => seam.column < column)
      .reduce((total, seam) => total + Math.max(0, Number.isFinite(seam.gap) ? seam.gap! : 10), 0);
  const offset = (start - 1) * pitch + gapBefore(start);
  const position = (column: number) => (column - 1) * pitch + gapBefore(column) - offset;
  const visibleMarks = validMarks.filter(
    (mark) => mark.column >= start && mark.column <= end && (mark.type !== "seam" || mark.column < count),
  );
  const markLabel = (mark: ColumnRulerMark) =>
    mark.label ?? (mark.type === "zone" ? `ZONE ${mark.column}` : mark.type.toUpperCase());
  return (
    <div
      {...props}
      role="img"
      aria-label={
        label ??
        `Column ruler · ${count} columns${visibleMarks.length ? ` · ${visibleMarks.map(markLabel).join(" · ")}` : ""}`
      }
      data-slot="column-ruler"
      className={cn(
        "relative h-7 shrink-0 border-b border-border bg-card font-mono text-xs leading-4 text-muted-foreground",
        className,
      )}
      style={{ width: position(end) + pitch + 64, ...style }}
    >
      <div aria-hidden="true">
        {Array.from({ length: end - start + 1 }, (_, index) => start + index).map((column) => {
          const major = column === 1 || column % 8 === 0;
          // Named marks replace the adjacent numeral, as in ZONE48 and the first column after a Note seam.
          const named = visibleMarks.some((mark) => column === mark.column + (mark.type === "seam" ? 1 : 0));
          return (
            <span
              key={column}
              data-slot="column-ruler-tick"
              data-column={column}
              className={cn("absolute bottom-0 w-px bg-muted-foreground", major ? "h-2" : "h-1")}
              style={{ left: position(column) + 14 }}
            >
              {major && !named && (
                <span className="absolute bottom-[9px] left-1/2 -translate-x-1/2 whitespace-nowrap font-normal">
                  {column}
                </span>
              )}
            </span>
          );
        })}
        {visibleMarks.map((mark) => (
          <span
            key={mark.id}
            data-slot="column-ruler-mark"
            data-type={mark.type}
            className={cn(
              "absolute inset-y-0",
              mark.type === "seam"
                ? "w-1.5 bg-secondary text-brand"
                : mark.type === "zone"
                  ? "w-0.5 bg-tag-formula text-tag-formula"
                  : "w-0.5 bg-destructive text-destructive",
            )}
            style={{ left: position(mark.column) + pitch + (mark.type === "seam" ? 10 : 7) }}
          >
            <span
              className={cn(
                "absolute top-0 whitespace-nowrap font-medium",
                mark.type === "seam" ? "left-2" : mark.type === "zone" ? "left-1" : "left-[5px]",
              )}
            >
              {markLabel(mark)}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
