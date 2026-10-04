import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { messageToText, parseLine } from "../../lib/board-characters";
import { BoardDisplay } from "./board-display";
import { BoardTeaser } from "./board-teaser";
import { DisplayPreview } from "./display-preview";
import { ScaledBoardDisplay } from "./scaled-board-display";
import { StaticBoardDisplay } from "./static-board-display";

/*
 * The coordinated major (plan Task 12): every split-flap renderer reads the
 * extended markup by default, and `extendedMarkup={false}` is the opt-out for
 * a board driven by a FiestaBoard older than parser parity.
 *
 * The parser itself did NOT flip — `parseLine` still defaults the option off,
 * because it is the parity contract the Python port is checked against — so
 * these tests pin the two layers against each other: a renderer's default
 * output must equal the cells-in rendering of the *extended* parse, and its
 * opt-out output must equal the cells-in rendering of the *base* parse. The
 * DOM is compared through the tile hooks the renderers put on every cell and
 * the `role="img"` name, exactly as cells-in.test.tsx does.
 */

const MESSAGE = "{red:HOT} {icon:sun} 72°\n{black/white:OPEN} {icon:x}";
const EXTENDED = (line: string) => parseLine(line, Infinity, { extendedMarkup: true });
const BASE = (line: string) => parseLine(line, Infinity);
const grid = (parse: (line: string) => ReturnType<typeof parseLine>) => MESSAGE.split("\n").map(parse);

const tiles = (board: HTMLElement, hook = "data-note-tile") =>
  Array.from(board.querySelectorAll(`[${hook}]`)).map((tile) => tile.textContent ?? "");

// What a Note draws for the message in each mode, as its accessible name says
// it: the degradation (letters survive, icons are tiles, so they say nothing)
// and the literal markers of the opt-out.
const DEGRADED = "Board preview: HOT 72♥ OPEN";
const LITERAL = "Board preview: {RED:HOT} {ICON:SUN} 72♥ {BLACK/WHITE:OPEN} {ICON:X}";

afterEach(cleanup);

describe("extendedMarkup defaults on for split-flap renderers (parser default unchanged)", () => {
  it("parseLine and messageToText keep the option off unless asked", () => {
    expect(messageToText(MESSAGE, "note")).toBe(LITERAL.replace("Board preview: ", ""));
    expect(messageToText(MESSAGE, "note", undefined, { extendedMarkup: true })).toBe(
      DEGRADED.replace("Board preview: ", ""),
    );
    for (const token of BASE("{red:A}{icon:sun}")) expect(token).not.toHaveProperty("icon");
    expect(EXTENDED("{icon:sun}")[0]).toEqual({ type: "color", code: "65", icon: "sun" });
  });

  it("StaticBoardDisplay: the default draws the degradation; extendedMarkup={false} draws the literal markers", () => {
    render(<StaticBoardDisplay cells={grid(EXTENDED)} deviceType="note" />);
    const degraded = tiles(screen.getByRole("img"));
    cleanup();
    render(<StaticBoardDisplay cells={grid(BASE)} deviceType="note" />);
    const literal = tiles(screen.getByRole("img"));
    expect(degraded).not.toEqual(literal);
    cleanup();

    render(<StaticBoardDisplay message={MESSAGE} deviceType="note" />);
    expect(screen.getByRole("img", { name: DEGRADED })).toBeInTheDocument();
    expect(tiles(screen.getByRole("img"))).toEqual(degraded);
    cleanup();

    render(<StaticBoardDisplay message={MESSAGE} deviceType="note" extendedMarkup={false} />);
    expect(screen.getByRole("img", { name: LITERAL })).toBeInTheDocument();
    expect(tiles(screen.getByRole("img"))).toEqual(literal);
  });

  it("BoardDisplay and ScaledBoardDisplay: the same default and the same opt-out", () => {
    render(<BoardDisplay message={MESSAGE} deviceType="note" isStatic />);
    expect(screen.getByRole("img", { name: DEGRADED.replace("preview", "display") })).toBeInTheDocument();
    const degraded = tiles(screen.getByRole("img"));
    cleanup();
    render(<BoardDisplay cells={grid(EXTENDED)} deviceType="note" isStatic />);
    expect(tiles(screen.getByRole("img"))).toEqual(degraded);
    cleanup();

    render(<BoardDisplay message={MESSAGE} deviceType="note" isStatic extendedMarkup={false} />);
    expect(screen.getByRole("img", { name: LITERAL.replace("preview", "display") })).toBeInTheDocument();
    const literal = tiles(screen.getByRole("img"));
    cleanup();
    render(<BoardDisplay cells={grid(BASE)} deviceType="note" isStatic />);
    expect(tiles(screen.getByRole("img"))).toEqual(literal);
    cleanup();

    // ScaledBoardDisplay spreads its props into BoardDisplay: no prop of its own.
    render(<ScaledBoardDisplay message={MESSAGE} deviceType="note" isStatic />);
    expect(screen.getByRole("img", { name: DEGRADED.replace("preview", "display") })).toBeInTheDocument();
    cleanup();
    render(<ScaledBoardDisplay message={MESSAGE} deviceType="note" isStatic extendedMarkup={false} />);
    expect(screen.getByRole("img", { name: LITERAL.replace("preview", "display") })).toBeInTheDocument();
  });

  it("BoardTeaser: a strip reads the markup by default and opts out the same way", () => {
    render(<BoardTeaser teaser="{red:HOT} {icon:sun}" tiles={9} />);
    expect(screen.getByRole("img", { name: "HOT" })).toBeInTheDocument();
    const degraded = tiles(screen.getByRole("img"), "data-teaser-tile");
    // H, O, T, a blank, the sun's yellow tile — neither of the last two says
    // anything (the name above proves the sun is a tile, not "{ICON:SUN}").
    expect(degraded.slice(0, 5)).toEqual(["H", "O", "T", "", ""]);
    cleanup();
    render(<BoardTeaser teaser="{red:HOT} {icon:sun}" tiles={9} extendedMarkup={false} />);
    expect(screen.getByRole("img", { name: "{RED:HOT} {ICON:SUN}" })).toBeInTheDocument();
    expect(tiles(screen.getByRole("img"), "data-teaser-tile").slice(0, 9)).toEqual([..."{RED:HOT}"]);
  });

  it("DisplayPreview: unset means the renderer's default; false reaches the renderer; LED is unaffected", () => {
    render(<DisplayPreview model="vestaboard_note" message={MESSAGE} />);
    expect(screen.getByRole("img", { name: DEGRADED })).toBeInTheDocument();
    cleanup();
    render(<DisplayPreview model="vestaboard_note" message={MESSAGE} extendedMarkup={false} />);
    expect(screen.getByRole("img", { name: LITERAL })).toBeInTheDocument();
    cleanup();
    render(<DisplayPreview model="vestaboard_note" message={MESSAGE} animated />);
    expect(screen.getByRole("img", { name: DEGRADED.replace("preview", "display") })).toBeInTheDocument();
    cleanup();
    // An LED matrix always reads the extended markup; the opt-out is a flap concern.
    render(<DisplayPreview model="hub75_64x32" message={MESSAGE} extendedMarkup={false} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toMatch(/HOT/);
    expect(screen.getByRole("img").getAttribute("aria-label")).not.toMatch(/\{RED/);
  });

  it("a message without the new markers draws byte-identically in both modes", () => {
    const plain = "72° SUNNY {63}\n{/red}UV {65}{65} 6 ♥";
    render(<StaticBoardDisplay message={plain} deviceType="note" />);
    const on = tiles(screen.getByRole("img"));
    const onName = screen.getByRole("img").getAttribute("aria-label");
    cleanup();
    render(<StaticBoardDisplay message={plain} deviceType="note" extendedMarkup={false} />);
    expect(tiles(screen.getByRole("img"))).toEqual(on);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe(onName);
  });
});
