"use client";

import { type ComponentProps, useEffect, useRef } from "react";

import { NOTE_COLS, NOTE_ROWS, resolveDimensions } from "../../lib/board-dimensions";
import { getNoteRange, type NoteRange } from "../../lib/note-array-geometry";
import { cn } from "../../lib/utils";
import { SegmentedControl, SegmentedControlItem } from "../forms/toggle-card";

export interface NoteFocusLabels {
  group?: string;
  allNotes?: string;
  note?: (note: number) => string;
}

export interface NoteFocusProps extends Omit<ComponentProps<"div">, "children" | "onChange"> {
  /** One-based, row-major Note number; null shows the whole array. */
  note: number | null;
  /** Reports the selected Note and its zero-based, end-exclusive canvas range. */
  onNoteChange: (note: number | null, range: NoteRange | null) => void;
  notesWide?: number;
  notesTall?: number;
  disabled?: boolean;
  size?: "default" | "touch";
  labels?: NoteFocusLabels;
}

/**
 * C40's controlled Note selector. The host keeps one canvas and uses the range
 * to highlight/crop it. Arrow keys and Home/End select through the shared
 * radio group. Wide arrays and translated labels scroll without shrinking.
 */
export function NoteFocus({
  note,
  onNoteChange,
  notesWide = 2,
  notesTall = 2,
  disabled = false,
  size = "default",
  labels,
  className,
  ...props
}: NoteFocusProps) {
  const viewport = useRef<HTMLDivElement>(null);
  const { rows, cols } = resolveDimensions("note_array", notesWide, notesTall);
  const count = (rows / NOTE_ROWS) * (cols / NOTE_COLS);
  const selected = getNoteRange(note, notesWide, notesTall)?.note ?? null;
  const value = selected === null ? "all" : String(selected);

  useEffect(() => {
    const scroller = viewport.current!;
    const revealSelection = () => {
      const item = scroller.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]')!;
      const box = scroller.getBoundingClientRect();
      if (box.width === 0) return;
      const option = item.getBoundingClientRect();
      // Scroll this strip only; scrollIntoView can move the entire editor page.
      if (option.left < box.left + 3) scroller.scrollLeft += option.left - box.left - 3;
      else if (option.right > box.right - 3) scroller.scrollLeft += option.right - box.right + 3;
    };
    revealSelection();
    const observer = new ResizeObserver(revealSelection);
    observer.observe(scroller);
    observer.observe(scroller.firstElementChild!);
    return () => observer.disconnect();
  }, [value, count, labels]);

  return (
    <div
      {...props}
      ref={viewport}
      data-slot="note-focus"
      data-size={size}
      className={cn("max-w-full overflow-x-auto rounded-[10px]", className)}
    >
      {/* Opaque selected tint keeps brand text AA on this muted track. */}
      <SegmentedControl
        aria-label={labels?.group ?? "Focus note"}
        value={value}
        onValueChange={(next) => {
          const nextNote = next === "all" ? null : Number(next);
          onNoteChange(nextNote, getNoteRange(nextNote, notesWide, notesTall));
        }}
        disabled={disabled}
        size={size === "touch" ? "touch" : "md"}
        wrap={false}
        className="w-max gap-0.5 rounded-[10px] bg-muted p-[3px]"
      >
        <SegmentedControlItem value="all" className="shrink-0 rounded-lg data-[checked]:bg-tint-selected">
          {labels?.allNotes ?? "All notes"}
        </SegmentedControlItem>
        {Array.from({ length: count }, (_, index) => (
          <SegmentedControlItem
            key={index + 1}
            value={String(index + 1)}
            className="shrink-0 rounded-lg data-[checked]:bg-tint-selected"
          >
            {labels?.note?.(index + 1) ?? `Note ${index + 1}`}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
    </div>
  );
}
