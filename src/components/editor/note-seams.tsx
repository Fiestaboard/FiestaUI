"use client";

import type { ComponentProps } from "react";

import { getNoteArrayGeometry, getNoteRange, type NoteArrayGeometryOptions } from "../../lib/note-array-geometry";
import { cn } from "../../lib/utils";

export interface NoteSeamsProps extends Omit<ComponentProps<"div">, "children">, NoteArrayGeometryOptions {
  /** One-based row-major selection. Null or invalid means the entire array. */
  note?: number | null;
}

/**
 * Decorative C40 seam/range overlay. Its origin is the first tile's top-left,
 * excluding the bezel. Place beside the existing board/editor inside a
 * relative wrapper. It never renders tiles, intercepts input or owns content.
 * Default geometry matches StaticBoardDisplay size="sm" bezel={false}.
 */
export function NoteSeams({
  notesWide,
  notesTall,
  tileWidth,
  tileHeight,
  columnGap,
  rowGap,
  seamGap,
  note = null,
  className,
  style,
  ...props
}: NoteSeamsProps) {
  const geometry = getNoteArrayGeometry({ notesWide, notesTall, tileWidth, tileHeight, columnGap, rowGap, seamGap });
  const selected = getNoteRange(note, geometry.notesWide, geometry.notesTall)?.note;
  return (
    <div
      {...props}
      aria-hidden="true"
      data-slot="note-seams"
      className={cn("pointer-events-none absolute top-0 left-0", className)}
      style={{ width: geometry.width, height: geometry.height, ...style }}
    >
      {selected !== undefined &&
        geometry.notes.map((region) => (
          <div
            key={region.note}
            data-slot={region.note === selected ? "note-focus-region" : "note-dim-region"}
            data-note={region.note}
            className={
              region.note === selected
                ? "absolute outline-2 -outline-offset-2 outline-brand"
                : "absolute bg-background/65"
            }
            style={{ left: region.x, top: region.y, width: region.width, height: region.height }}
          />
        ))}
      {geometry.columnSeams.map((center) => (
        <div
          key={center}
          data-slot="note-column-seam"
          className="absolute top-0 h-full bg-brand"
          style={{ left: center - 1, width: 2 }}
        />
      ))}
      {geometry.rowSeams.map((center) => (
        <div
          key={center}
          data-slot="note-row-seam"
          className="absolute left-0 w-full bg-brand"
          style={{ top: center - 1, height: 2 }}
        />
      ))}
    </div>
  );
}
