/**
 * Pure paging maths for `BoardViewport`. The component measures the rendered
 * tiles; these functions turn the measurements into pages, the current page
 * and the visible columns. Kept apart so they can be tested without layout.
 */

import { type DeviceType, NOTE_COLS } from "../../lib/board-dimensions";

/**
 * How a board pages when it scrolls:
 * - `note`: a one-row note array snaps one Note at a time ("Note 1 of 3").
 * - `array-column`: a multi-row note array snaps one column of Notes at a time
 *   ("Column 1 of 2 · 4 notes").
 * - `column`: everything else snaps per tile column ("Columns 1–16 of 22").
 */
export type BoardViewportPaging = "note" | "array-column" | "column";

export function pagingKind(deviceType: DeviceType, notesWide: number, notesTall: number): BoardViewportPaging {
  if (deviceType !== "note_array" || notesWide <= 1) return "column";
  return notesTall > 1 ? "array-column" : "note";
}

/** The column index each page starts at. */
export function pageStartColumns(paging: BoardViewportPaging, cols: number): number[] {
  const step = paging === "column" ? 1 : NOTE_COLS;
  const starts: number[] = [];
  for (let c = 0; c < cols; c += step) starts.push(c);
  return starts;
}

/**
 * Each page's scroll offset: its first tile's left edge relative to the first
 * tile. With `scroll-padding-left` equal to the bezel padding, that is also the
 * `scrollLeft` CSS snapping lands on.
 */
export function pageOffsets(tileOffsets: readonly number[], startColumns: readonly number[]): number[] {
  return startColumns.filter((c) => c < tileOffsets.length).map((c) => tileOffsets[c]);
}

/**
 * The page in view: the last one whose start has been reached (half a pixel of
 * slack for sub-pixel scrolls), or the last page once the scroll is at its end,
 * since the last page's start can lie beyond the maximum scroll.
 */
export function currentPage(offsets: readonly number[], scrollLeft: number, maxScroll: number): number {
  if (offsets.length === 0) return 0;
  if (scrollLeft >= maxScroll - 0.5) return offsets.length - 1;
  let page = 0;
  offsets.forEach((offset, i) => {
    if (offset <= scrollLeft + 0.5) page = i;
  });
  return page;
}

/**
 * The 1-based range of columns wholly inside the scrollport. Column `c` sits at
 * `padding + tileOffsets[c]` in the scroller's content.
 */
export function visibleColumns(
  tileOffsets: readonly number[],
  tileWidth: number,
  padding: number,
  scrollLeft: number,
  clientWidth: number,
): { first: number; last: number } {
  let first = -1;
  let last = -1;
  tileOffsets.forEach((offset, c) => {
    const left = padding + offset;
    if (left >= scrollLeft - 0.5 && left + tileWidth <= scrollLeft + clientWidth + 0.5) {
      if (first < 0) first = c;
      last = c;
    }
  });
  if (first < 0) return { first: 1, last: 1 };
  return { first: first + 1, last: last + 1 };
}
