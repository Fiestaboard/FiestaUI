import { describe, expect, it } from "vitest";

import { getNoteArrayGeometry, getNoteRange } from "./note-array-geometry";

describe("Note array geometry", () => {
  it("maps row-major Notes to zero-based end-exclusive ranges on one canvas", () => {
    expect(getNoteRange(1)).toEqual({ note: 1, rowStart: 0, rowEnd: 3, columnStart: 0, columnEnd: 15 });
    expect(getNoteRange(4)).toEqual({ note: 4, rowStart: 3, rowEnd: 6, columnStart: 15, columnEnd: 30 });
    expect(getNoteRange(5, 3, 2)).toEqual({ note: 5, rowStart: 3, rowEnd: 6, columnStart: 15, columnEnd: 30 });
  });

  it.each([null, 0, -1, 5, 1.5, NaN, Infinity])("treats invalid or all-note selection %s as no range", (note) => {
    expect(getNoteRange(note)).toBeNull();
  });

  it("aligns small board seams between the tiles without adding outer gutters", () => {
    const geometry = getNoteArrayGeometry();
    expect(geometry.width).toBe(483);
    expect(geometry.height).toBe(129);
    expect(geometry.columnSeams).toEqual([241.5]);
    expect(geometry.rowSeams).toEqual([64.5]);
    expect(geometry.notes[3]).toEqual({
      note: 4,
      rowStart: 3,
      rowEnd: 6,
      columnStart: 15,
      columnEnd: 30,
      x: 246,
      y: 69,
      width: 237,
      height: 60,
    });
  });

  it("supports editor pitches and the ruler's drawn ten-pixel seam", () => {
    const geometry = getNoteArrayGeometry({
      notesWide: 3,
      notesTall: 1,
      tileWidth: 14,
      tileHeight: 40,
      columnGap: 2,
      rowGap: 0,
      seamGap: 10,
    });
    expect(geometry.width).toBe(738);
    expect(geometry.height).toBe(120);
    expect(geometry.columnSeams).toEqual([244, 494]);
    expect(geometry.rowSeams).toEqual([]);
    expect(geometry.notes[2]).toMatchObject({ x: 500, y: 0, width: 238, height: 120 });
  });

  it("uses the same bounded axes as the shared board renderer", () => {
    const geometry = getNoteArrayGeometry({ notesWide: Infinity, notesTall: NaN });
    expect(geometry.notes).toHaveLength(8);
    expect(geometry.notesWide).toBe(8);
    expect(geometry.notesTall).toBe(1);
    expect(getNoteRange(2, 0, 2.9)).toEqual({ note: 2, rowStart: 3, rowEnd: 6, columnStart: 0, columnEnd: 15 });
  });

  it("falls back from invalid metrics and supports a zero seam", () => {
    const geometry = getNoteArrayGeometry({
      notesWide: 1,
      notesTall: 1,
      tileWidth: 0,
      tileHeight: NaN,
      columnGap: -1,
      rowGap: Infinity,
      seamGap: -5,
    });
    expect(geometry).toMatchObject({ width: 237, height: 60, columnSeams: [], rowSeams: [] });
    expect(getNoteArrayGeometry({ seamGap: 0 }).width).toBe(477);
    expect(getNoteArrayGeometry({ tileWidth: Number.MAX_VALUE, seamGap: Number.MAX_VALUE }).width).toBe(483);
  });
});
