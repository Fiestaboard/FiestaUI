import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BoardDisplay } from "./board-display";
import { ScaledBoardDisplay } from "./scaled-board-display";
import { StaticBoardDisplay } from "./static-board-display";

/*
 * Panel grids. A FiestaBoard "panel" is a life-size virtual split-flap board on
 * a TV, sized by character rather than by Note block: a 55" screen fits
 * 12 rows × 29 cols, which is not a multiple of a Note's 3 × 15 on either axis.
 * So a panel carries its size explicitly (`gridRows` / `gridCols`) and the
 * renderers have to draw exactly that many tiles — not a Note-array multiple,
 * and not the flagship fallback an unknown device type gets.
 *
 * A panel is one seamless surface, so it must not draw the Note-boundary seams
 * a note_array does, even where its size happens to cross a 3-row or 15-col
 * boundary (12 × 29 crosses both).
 *
 * The tiles are aria-hidden decoration, so they are counted through the
 * `data-note-tile` / `data-note-row` hooks both renderers put on every tile
 * and row — the same hooks the app's draw mode hit-tests against.
 */

function boardGrid(name: RegExp) {
  const board = screen.getByRole("img", { name });
  return {
    rows: board.querySelectorAll("[data-note-row]").length,
    tiles: board.querySelectorAll("[data-note-tile]").length,
    seams: board.querySelectorAll("[data-note-row-seam], [data-note-col-seam]").length,
    firstRowTiles: board.querySelector("[data-note-row]")?.querySelectorAll("[data-note-tile]").length,
  };
}

const SIZES = [
  { rows: 12, cols: 29 },
  { rows: 7, cols: 17 },
];

describe("BoardDisplay panel grid", () => {
  for (const { rows, cols } of SIZES) {
    it(`draws exactly ${rows}×${cols} tiles for a ${rows}×${cols} panel`, () => {
      render(<BoardDisplay message="HELLO" deviceType="panel" gridRows={rows} gridCols={cols} />);

      const grid = boardGrid(/HELLO/);
      expect(grid.rows).toBe(rows);
      expect(grid.firstRowTiles).toBe(cols);
      expect(grid.tiles).toBe(rows * cols);
    });

    it(`draws exactly ${rows}×${cols} tiles on the static path too`, () => {
      render(<BoardDisplay message="HELLO" deviceType="panel" gridRows={rows} gridCols={cols} isStatic />);

      const grid = boardGrid(/HELLO/);
      expect(grid.rows).toBe(rows);
      expect(grid.tiles).toBe(rows * cols);
    });
  }

  it("draws no Note seams on a panel that crosses Note boundaries", () => {
    render(<BoardDisplay message="HELLO" deviceType="panel" gridRows={12} gridCols={29} />);

    expect(boardGrid(/HELLO/).seams).toBe(0);
  });

  it("redraws when only the grid size changes", () => {
    // BoardDisplay is memo'd with a hand-written comparator; a prop missing
    // from it renders right on mount and then never updates.
    const { rerender } = render(<BoardDisplay message="HELLO" deviceType="panel" gridRows={12} gridCols={29} />);
    rerender(<BoardDisplay message="HELLO" deviceType="panel" gridRows={7} gridCols={17} />);

    expect(boardGrid(/HELLO/).tiles).toBe(7 * 17);
  });

  it("ignores the grid size on a non-panel device", () => {
    render(<BoardDisplay message="HELLO" deviceType="flagship" gridRows={12} gridCols={29} />);

    expect(boardGrid(/HELLO/).tiles).toBe(6 * 22);
  });
});

describe("StaticBoardDisplay panel grid", () => {
  for (const { rows, cols } of SIZES) {
    it(`draws exactly ${rows}×${cols} tiles for a ${rows}×${cols} panel`, () => {
      render(<StaticBoardDisplay message="HELLO" deviceType="panel" gridRows={rows} gridCols={cols} />);

      const grid = boardGrid(/HELLO/);
      expect(grid.rows).toBe(rows);
      expect(grid.firstRowTiles).toBe(cols);
      expect(grid.tiles).toBe(rows * cols);
    });
  }

  it("draws no Note seams on a panel that crosses Note boundaries", () => {
    render(<StaticBoardDisplay message="HELLO" deviceType="panel" gridRows={12} gridCols={29} />);

    expect(boardGrid(/HELLO/).seams).toBe(0);
  });

  it("redraws when only the grid size changes", () => {
    const { rerender } = render(<StaticBoardDisplay message="HELLO" deviceType="panel" gridRows={12} gridCols={29} />);
    rerender(<StaticBoardDisplay message="HELLO" deviceType="panel" gridRows={7} gridCols={17} />);

    expect(boardGrid(/HELLO/).tiles).toBe(7 * 17);
  });
});

describe("ScaledBoardDisplay panel grid", () => {
  it("forwards gridRows / gridCols to the board it wraps", () => {
    render(<ScaledBoardDisplay message="HELLO" deviceType="panel" gridRows={12} gridCols={29} />);

    const grid = boardGrid(/HELLO/);
    expect(grid.rows).toBe(12);
    expect(grid.tiles).toBe(12 * 29);
    expect(grid.seams).toBe(0);
  });

  it("keeps the Fit / Actual size toggle to note arrays", () => {
    render(<ScaledBoardDisplay message="HELLO" deviceType="panel" gridRows={12} gridCols={29} />);

    expect(screen.queryByRole("group", { name: "Preview size" })).toBeNull();
  });
});
