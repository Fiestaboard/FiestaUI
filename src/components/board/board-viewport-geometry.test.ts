import { describe, expect, it } from "vitest";

import { currentPage, pageOffsets, pageStartColumns, pagingKind, visibleColumns } from "./board-viewport-geometry";

describe("pagingKind", () => {
  it("pages a one-row note array by Note", () => {
    expect(pagingKind("note_array", 3, 1)).toBe("note");
  });

  it("pages a multi-row note array by array column", () => {
    expect(pagingKind("note_array", 2, 2)).toBe("array-column");
  });

  it("pages everything else, and a one-Note-wide array, by tile column", () => {
    expect(pagingKind("flagship", 1, 1)).toBe("column");
    expect(pagingKind("panel", 1, 1)).toBe("column");
    expect(pagingKind("note", 1, 1)).toBe("column");
    expect(pagingKind("note_array", 1, 3)).toBe("column");
  });
});

describe("pageStartColumns", () => {
  it("starts a page at every Note boundary", () => {
    expect(pageStartColumns("note", 45)).toEqual([0, 15, 30]);
    expect(pageStartColumns("array-column", 30)).toEqual([0, 15]);
  });

  it("starts a page at every column otherwise", () => {
    expect(pageStartColumns("column", 4)).toEqual([0, 1, 2, 3]);
  });
});

describe("pageOffsets", () => {
  it("reads each page's start from the tile offsets", () => {
    const offsets = Array.from({ length: 45 }, (_, c) => c * 16 + Math.floor(c / 15) * 10);
    expect(pageOffsets(offsets, [0, 15, 30])).toEqual([0, 250, 500]);
  });

  it("drops a start column the row does not have", () => {
    expect(pageOffsets([0, 16], [0, 1, 2])).toEqual([0, 16]);
  });
});

describe("currentPage", () => {
  const offsets = [0, 250, 500];

  it("is the last page whose start has been reached", () => {
    expect(currentPage(offsets, 0, 400)).toBe(0);
    expect(currentPage(offsets, 249.5, 400)).toBe(1);
    expect(currentPage(offsets, 300, 400)).toBe(1);
  });

  it("is the last page at the end of the scroll, even short of its start", () => {
    expect(currentPage(offsets, 400, 400)).toBe(2);
  });

  it("is 0 with no pages", () => {
    expect(currentPage([], 10, 0)).toBe(0);
  });
});

describe("visibleColumns", () => {
  const offsets = Array.from({ length: 22 }, (_, c) => c * 17);

  it("counts the columns wholly inside the window, 1-based", () => {
    // pad 12: column c spans [12 + 17c, 12 + 17c + 14]
    expect(visibleColumns(offsets, 14, 12, 0, 280)).toEqual({ first: 1, last: 15 });
  });

  it("moves with the scroll", () => {
    expect(visibleColumns(offsets, 14, 12, 51, 280)).toEqual({ first: 4, last: 18 });
  });

  it("falls back to the first column when nothing fits", () => {
    expect(visibleColumns(offsets, 14, 12, 0, 5)).toEqual({ first: 1, last: 1 });
  });
});
