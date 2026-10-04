import { describe, expect, it } from "vitest";

import { type BoardToken, cellsToGrid, cellsToText, messageToGrid, messageToText, parseLine } from "./board-characters";

/*
 * The parser itself is pinned by scripts/ci/tests/board-characters.test.mjs
 * (the Python parity contract). These cover the cells-in path a split-flap
 * renderer takes when FiestaBoard core has already parsed the markup once:
 * the same grid and the same accessible text as parsing the message here.
 */

const EXT = { extendedMarkup: true };
const parsed = (message: string, cols = Infinity) => message.split("\n").map((line) => parseLine(line, cols, EXT));

describe("cellsToGrid", () => {
  it("fits a parsed grid to the board exactly as messageToGrid fits the message", () => {
    const message = "{red:HOT} {black/white:UV 6}\n{icon:sun} 72° ♥\nTOO LONG FOR A NOTE ROW";
    for (const [deviceType, rows, cols] of [
      ["flagship", 6, 22],
      ["note", 3, 15],
    ] as const) {
      expect(cellsToGrid(parsed(message), rows, cols, deviceType)).toEqual(
        messageToGrid(message, rows, cols, deviceType, undefined, EXT),
      );
    }
  });

  it("draws code 62 as the flap this board carries, and leaves every other cell as given", () => {
    const cells: BoardToken[][] = [
      [
        { type: "char", value: "°" },
        { type: "char", value: "♥" },
      ],
    ];
    expect(cellsToGrid(cells, 1, 2, "flagship").map((row) => row.map((t) => (t as { value: string }).value))).toEqual([
      ["°", "°"],
    ]);
    expect(cellsToGrid(cells, 1, 2, "flagship", "heart")[0].map((t) => (t as { value: string }).value)).toEqual([
      "♥",
      "♥",
    ]);
    expect(cellsToGrid(cells, 1, 2, "note")[0].map((t) => (t as { value: string }).value)).toEqual(["♥", "♥"]);
    // A rich cell keeps its colours and icon through the projection; a tile
    // keeps the spelling it arrived with.
    const rich: BoardToken[][] = [
      [
        { type: "char", value: "A", color: "red", background: "white" },
        { type: "color", code: "65", icon: "sun" },
        { type: "color", code: "red" },
        { type: "char", value: "a" },
      ],
    ];
    expect(cellsToGrid(rich, 1, 4)[0]).toEqual(rich[0]);
  });

  it("pads a short grid with blanks and clips a long one", () => {
    const A: BoardToken = { type: "char", value: "A" };
    expect(cellsToGrid([[A]], 2, 3)).toEqual([
      [A, { type: "char", value: " " }, { type: "char", value: " " }],
      [
        { type: "char", value: " " },
        { type: "char", value: " " },
        { type: "char", value: " " },
      ],
    ]);
    expect(cellsToGrid([[A, A, A, A], [A], [A]], 2, 3)).toEqual([
      [A, A, A],
      [A, { type: "char", value: " " }, { type: "char", value: " " }],
    ]);
    expect(cellsToGrid([], 1, 2)).toEqual(messageToGrid("", 1, 2));
  });
});

describe("cellsToText", () => {
  it("names a parsed grid as messageToText names the message", () => {
    const message = "{red:HOT} {black/white:UV 6}\n{icon:sun} 72° ♥  {63}";
    expect(cellsToText(parsed(message), "flagship")).toBe(messageToText(message, "flagship", undefined, EXT));
    expect(cellsToText(parsed(message), "flagship", "heart")).toBe(messageToText(message, "flagship", "heart", EXT));
    expect(cellsToText(parsed(message), "note")).toBe("HOT UV 6 72♥ ♥");
    expect(cellsToText([], "flagship")).toBe("");
  });
});
