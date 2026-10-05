import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { type BoardToken, cellsToGrid, parseLine } from "../../lib/board-characters";
import { BoardDisplay } from "./board-display";
import { StaticBoardDisplay } from "./static-board-display";

/*
 * The split-flap renderers take a grid of parsed cells in place of a message
 * — the same grid FiestaBoard core hands every output after parsing the
 * markup once. What matters is that cells-in and message-in put the same
 * tiles on the board and the same text in its name, so the two are compared
 * through the rendered DOM: the tile hooks the renderers put on every cell
 * (`data-note-tile`, and `data-current-char` on the animated board) and the
 * `role="img"` name.
 */

const EXT = { extendedMarkup: true };
const parsed = (message: string) => message.split("\n").map((line) => parseLine(line, Infinity, EXT));
const MESSAGE = "{red:HOT} {black/white:UV 6} {63}\n{icon:sun} 72° ♥\nSECOND LINE";

function tiles(board: HTMLElement) {
  return Array.from(board.querySelectorAll("[data-note-tile]")).map((tile) => tile.textContent ?? "");
}

afterEach(cleanup);

describe("StaticBoardDisplay cells in", () => {
  it("draws a cell grid as it draws the message it was parsed from, and names it the same", () => {
    render(<StaticBoardDisplay message={MESSAGE} deviceType="note" extendedMarkup />);
    const fromMessage = screen.getByRole("img");
    const name = fromMessage.getAttribute("aria-label");
    const drawn = tiles(fromMessage);
    expect(name).toBe("Board preview: HOT UV 6 72♥ ♥ SECOND LINE");
    cleanup();
    render(<StaticBoardDisplay cells={parsed(MESSAGE)} deviceType="note" />);
    const fromCells = screen.getByRole("img");
    expect(fromCells.getAttribute("aria-label")).toBe(name);
    expect(tiles(fromCells)).toEqual(drawn);
    expect(drawn).toHaveLength(3 * 15);
  });

  it("wins over a message, follows the board's code-62 flap, and is empty only when it draws nothing", () => {
    render(<StaticBoardDisplay cells={parsed("CELLS")} message="MESSAGE" />);
    expect(screen.getByRole("img", { name: "Board preview: CELLS" })).toBeInTheDocument();
    cleanup();
    render(<StaticBoardDisplay cells={parsed("72°")} code62Glyph="heart" />);
    expect(screen.getByRole("img", { name: "Board preview: 72♥" })).toBeInTheDocument();
    cleanup();
    render(<StaticBoardDisplay cells={cellsToGrid([], 6, 22)} />);
    expect(screen.getByRole("img", { name: "Empty board display" })).toBeInTheDocument();
    cleanup();
    render(<StaticBoardDisplay cells={[[{ type: "color", code: "red" }]]} />);
    expect(screen.getByRole("img", { name: "Board preview" })).toBeInTheDocument();
  });
});

describe("BoardDisplay cells in", () => {
  it("draws a cell grid as it draws the message, names it the same, and re-renders when the grid changes", () => {
    render(<BoardDisplay message={MESSAGE} deviceType="note" extendedMarkup isStatic />);
    const fromMessage = screen.getByRole("img");
    const name = fromMessage.getAttribute("aria-label");
    const drawn = tiles(fromMessage);
    expect(name).toBe("Board display: HOT UV 6 72♥ ♥ SECOND LINE");
    cleanup();
    const { rerender } = render(<BoardDisplay cells={parsed(MESSAGE)} deviceType="note" isStatic />);
    const fromCells = screen.getByRole("img");
    expect(fromCells.getAttribute("aria-label")).toBe(name);
    expect(tiles(fromCells)).toEqual(drawn);
    // The memo comparator must see a new grid: a forgotten prop renders once
    // and then freezes (the failure board-code-62-glyph.test.mjs describes).
    const next: BoardToken[][] = parsed("CHANGED");
    rerender(<BoardDisplay cells={next} deviceType="note" isStatic />);
    expect(screen.getByRole("img", { name: "Board display: CHANGED" })).toBeInTheDocument();
    expect(tiles(screen.getByRole("img")).join("").trim()).toBe("CHANGED");
  });

  it("is empty when the grid draws nothing, and the cells win over a message", () => {
    render(<BoardDisplay cells={cellsToGrid([], 6, 22)} message="MESSAGE" isStatic />);
    expect(screen.getByRole("img", { name: "Empty board display" })).toBeInTheDocument();
  });
});
