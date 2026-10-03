import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BOARD_CHARS, parseLine } from "../../lib/board-characters";
import { BOARD_COLORS } from "../../lib/board-colors";
import { BOARD_ICON_NAMES, BOARD_ICONS } from "../../lib/board-icons";
import { LED_FONTS } from "../../lib/led-fonts";
import {
  DEFAULT_LED_TEXT_COLOR,
  frameToAscii,
  frameToBits,
  layoutLedMessage,
  LED_GLYPHS,
  LED_MATRIX_PRESETS,
  ledGlyphIndex,
  ledGridLayout,
  renderLedFrame,
} from "../../lib/led-matrix";
import * as transitions from "../../lib/led-transitions";
import { LedMatrixDisplay } from "./led-matrix-display";
import { reducedMotionQuery } from "./reduced-motion";

// The component imports `planLedTransition` from this module; wrapping it in
// a spy lets the tests see what was planned, from where, and how often the
// plan was sampled.
vi.mock("../../lib/led-transitions", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../lib/led-transitions")>();
  return { ...mod, planLedTransition: vi.fn(mod.planLedTransition) };
});
const planSpy = transitions.planLedTransition as unknown as ReturnType<typeof vi.fn>;

/*
 * The framebuffer is the contract (see docs/superpowers/specs/
 * 2026-10-03-led-matrix-display-design.md), so most of the behaviour is
 * asserted on `renderLedFrame`'s bytes, which jsdom can check exactly.
 * How the canvas paints them is VRT's job.
 */

function pixel(frame: ReturnType<typeof renderLedFrame>, x: number, y: number) {
  const i = (y * frame.width + x) * 3;
  return [frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]];
}

function litCount(frame: ReturnType<typeof renderLedFrame>) {
  let n = 0;
  for (let i = 0; i < frame.pixels.length; i += 3) {
    if (frame.pixels[i] || frame.pixels[i + 1] || frame.pixels[i + 2]) n++;
  }
  return n;
}

describe("led fonts", () => {
  it.each(Object.values(LED_FONTS))("$id glyphs are all glyphWidth × glyphHeight", (font) => {
    for (const [char, rows] of Object.entries(font.glyphs)) {
      expect(rows, char).toHaveLength(font.glyphHeight);
      for (const row of rows) expect(row, char).toMatch(new RegExp(`^[#.]{${font.glyphWidth}}$`));
    }
  });

  it.each(Object.values(LED_FONTS))("$id covers every printable split-flap character", (font) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$()-+&=;:'\"%,./?°♥";
    for (const c of chars) expect(font.glyphs[c], c).toBeDefined();
  });

  it.each(Object.values(LED_FONTS))("$id covers lowercase a–z, distinct from the capitals", (font) => {
    for (const c of "abcdefghijklmnopqrstuvwxyz") {
      expect(font.glyphs[c], c).toBeDefined();
      expect(font.glyphs[c], c).not.toEqual(font.glyphs[c.toUpperCase()]);
    }
  });

  it.each(Object.values(LED_FONTS))("$id icon glyphs are glyph-sized and only for registered icons", (font) => {
    for (const [name, rows] of Object.entries(font.icons)) {
      expect(BOARD_ICON_NAMES, name).toContain(name);
      expect(rows, name).toHaveLength(font.glyphHeight);
      for (const row of rows!) expect(row, name).toMatch(new RegExp(`^[#.]{${font.glyphWidth}}$`));
    }
  });

  it("5x7 draws every icon; 3x5 draws the ones a 3×5 cell can say", () => {
    for (const name of BOARD_ICON_NAMES) expect(LED_FONTS["5x7"].icons[name], name).toBeDefined();
    expect(Object.keys(LED_FONTS["3x5"].icons).length).toBeGreaterThanOrEqual(8);
  });
});

describe("LED glyph table", () => {
  it("is an identity table — every flap character, lowercase, the heart, the tiles and the icons — not Vestaboard's order", () => {
    const flap = BOARD_CHARS.filter((c) => c !== " " && !/^\d\d$/.test(c));
    for (const c of flap) expect(LED_GLYPHS, c).toContain(c);
    for (const c of "abcdefghijklmnopqrstuvwxyz") expect(LED_GLYPHS).toContain(c);
    expect(LED_GLYPHS).toContain("♥");
    for (const code of ["63", "64", "65", "66", "67", "68", "69", "70", "71"])
      expect(LED_GLYPHS).toContain(`tile:${code}`);
    for (const name of BOARD_ICON_NAMES) expect(LED_GLYPHS).toContain(`icon:${name}`);
    expect(LED_GLYPHS[0]).toBe(" ");
    expect(new Set(LED_GLYPHS).size).toBe(LED_GLYPHS.length);
    // Not BOARD_CHARS' order: digits run 0–9 here, 1–9,0 there.
    expect(LED_GLYPHS.slice(0, 72)).not.toEqual(BOARD_CHARS);
  });

  it("gives every token one glyph, aliases included, and blank for the unknown", () => {
    const idx = ledGlyphIndex;
    expect(idx({ type: "char", value: "A" })).toBe(LED_GLYPHS.indexOf("A"));
    expect(idx({ type: "char", value: "°" })).toBe(LED_GLYPHS.indexOf("°"));
    expect(idx({ type: "char", value: "♥" })).toBe(LED_GLYPHS.indexOf("♥"));
    expect(idx({ type: "color", code: "66" })).toBe(LED_GLYPHS.indexOf("tile:66"));
    expect(idx({ type: "color", code: "green" })).toBe(idx({ type: "color", code: "66" }));
    expect(idx({ type: "color", code: "purple" })).toBe(idx({ type: "color", code: "68" }));
    expect(idx({ type: "color", code: "black" })).toBe(LED_GLYPHS.indexOf("tile:70"));
    expect(idx({ type: "char", value: "b" })).toBe(LED_GLYPHS.indexOf("b"));
    expect(idx({ type: "color", code: "65", icon: "sun" })).toBe(LED_GLYPHS.indexOf("icon:sun"));
    expect(idx({ type: "char", value: "~" })).toBe(0);
    expect(idx({ type: "char", value: " " })).toBe(0);
  });
});

describe("renderLedFrame", () => {
  it("is RGB888, row-major, all off for an empty message", () => {
    const frame = renderLedFrame("", { width: 64, height: 32 });
    expect(frame.pixels).toHaveLength(64 * 32 * 3);
    expect(litCount(frame)).toBe(0);
  });

  it("draws a glyph exactly where the font says", () => {
    // 5x7 "I" top row is ".###." — origin (2,0), so x=3..5 lit, x=2 and 6 off.
    const frame = renderLedFrame("I", { width: 64, height: 32 });
    expect(DEFAULT_LED_TEXT_COLOR).toBe("#ffffff");
    const text = [255, 255, 255];
    expect(pixel(frame, 2, 0)).toEqual([0, 0, 0]);
    expect(pixel(frame, 3, 0)).toEqual(text);
    expect(pixel(frame, 5, 0)).toEqual(text);
    expect(pixel(frame, 6, 0)).toEqual([0, 0, 0]);
  });

  it("uppercases, like the flap board", () => {
    const a = renderLedFrame("hello", { width: 64, height: 32 });
    const b = renderLedFrame("HELLO", { width: 64, height: 32 });
    expect(a.pixels).toEqual(b.pixels);
  });

  it("fills a colour tile's glyph box, not its gutter, and treats black as off", () => {
    const frame = renderLedFrame("{63}{black}", { width: 64, height: 32 });
    expect(litCount(frame)).toBe(5 * 7);
    expect(pixel(frame, 2, 0)).toEqual([0xeb, 0x40, 0x34]);
    expect(pixel(frame, 7, 0)).toEqual([0, 0, 0]); // gutter column
  });

  it("clips text past the grid", () => {
    const frame = renderLedFrame("ABCDEFGHIJKLMNOP", { width: 32, height: 8, font: "3x5" });
    const eight = renderLedFrame("ABCDEFGH", { width: 32, height: 8, font: "3x5" });
    expect(frame.pixels).toEqual(eight.pixels);
  });

  it("falls back to the default text colour rather than drawing invisible text", () => {
    const frame = renderLedFrame("I", { width: 64, height: 32 }, { textColor: "rgba(255, 176, 0, 1)" });
    expect(pixel(frame, 3, 0)).toEqual([255, 255, 255]);
  });

  it("draws the 3x5 face pixel-for-pixel", () => {
    expect(frameToAscii(renderLedFrame("HI!", { width: 12, height: 5, font: "3x5" }))).toBe(
      ["#.#.###..#..", "#.#..#...#..", "###..#...#..", "#.#..#......", "#.#.###..#.."].join("\n"),
    );
  });

  it("honours textColor and keeps the heart red", () => {
    const frame = renderLedFrame("I", { width: 64, height: 32 }, { textColor: "#ffb000" });
    expect(pixel(frame, 3, 0)).toEqual([0xff, 0xb0, 0x00]);
    const heart = renderLedFrame("°", { width: 64, height: 32 }, { code62Glyph: "heart" });
    // 5x7 heart row 2 is "#####".
    expect(pixel(heart, 2, 2)).toEqual([0xeb, 0x40, 0x34]);
  });
});

describe("colour spans, icons, case and monochrome", () => {
  const RED = [0xeb, 0x40, 0x34];
  const YELLOW = [0xf8, 0xe7, 0x1c];

  it("draws a {red:…} span's letters in red and leaves the rest white", () => {
    // 3x5 "H" row 0 is "#.#"; "I" row 0 is "###".
    const frame = renderLedFrame("{red:H}I", { width: 12, height: 5, font: "3x5" });
    expect(pixel(frame, 0, 0)).toEqual(RED);
    expect(pixel(frame, 4, 0)).toEqual([255, 255, 255]);
  });

  it("takes numeric and hex span colours; a tile inside a span stays a tile", () => {
    const frame = renderLedFrame("{#00ff00:A{63}}", { width: 12, height: 5, font: "3x5" });
    expect(pixel(frame, 1, 0)).toEqual([0, 255, 0]); // "A" row 0 ".#."
    expect(pixel(frame, 4, 0)).toEqual(RED); // the tile, in its own colour
    const num = renderLedFrame("{67:I}", { width: 12, height: 5, font: "3x5" });
    expect(pixel(num, 0, 0)).toEqual([0x4a, 0x90, 0xd9]);
  });

  it("does not change what existing markup means: {red}HOT is still a tile then HOT", () => {
    expect(parseLine("{red}HOT{/red}")).toEqual([
      { type: "color", code: "red" },
      { type: "char", value: "H" },
      { type: "char", value: "O" },
      { type: "char", value: "T" },
    ]);
    const frame = renderLedFrame("{red}I", { width: 12, height: 5, font: "3x5" });
    expect(pixel(frame, 0, 0)).toEqual(RED); // tile
    expect(pixel(frame, 4, 0)).toEqual([255, 255, 255]); // I, white
  });

  it("draws an icon's glyph in its own colour", () => {
    // 5x7 sun row 0 is "..#.." at origin (2,0) → pixel (4,0).
    const frame = renderLedFrame("{icon:sun}", { width: 64, height: 32 });
    expect(pixel(frame, 4, 0)).toEqual(YELLOW);
    // An icon is content: it is named, where a tile is silent.
    expect(layoutLedMessage("{icon:sun} 72°", { width: 64, height: 32 }).text).toBe("sun 72°");
    expect(litCount(frame)).toBe(LED_FONTS["5x7"].icons.sun!.join("").split("#").length - 1);
  });

  it("draws an icon's split-flap fallback when the face has no glyph for it", () => {
    // 3x5 has no bus (fallback blank) and no snow (fallback violet tile).
    expect(litCount(renderLedFrame("{icon:bus}", { width: 12, height: 5, font: "3x5" }))).toBe(0);
    const snow = renderLedFrame("{icon:snow}", { width: 12, height: 5, font: "3x5" });
    expect(litCount(snow)).toBe(15);
    expect(pixel(snow, 0, 0)).toEqual([0x9b, 0x59, 0xb6]);
    expect(BOARD_ICONS.snow.fallback).toBe("68");
  });

  it("uppercases by default and keeps case with letterCase: mixed", () => {
    const spec = { width: 64, height: 32 } as const;
    expect(renderLedFrame("Hi", spec).pixels).toEqual(renderLedFrame("HI", spec).pixels);
    const mixed = layoutLedMessage("Hi", spec, { letterCase: "mixed" });
    expect(mixed.text).toBe("Hi");
    expect(renderLedFrame("Hi", spec, { letterCase: "mixed" }).pixels).not.toEqual(renderLedFrame("HI", spec).pixels);
  });

  it("monochrome forces every lit pixel — text, spans, tiles, icons, heart — to the panel colour", () => {
    const mono = "#ff3b1f";
    const frame = renderLedFrame(
      "{63}{red:A}{icon:sun}♥I",
      { width: 64, height: 32 },
      { monochrome: mono, textColor: "#00ff00" },
    );
    const colors = new Set<string>();
    for (let i = 0; i < frame.pixels.length; i += 3) {
      if (frame.pixels[i] || frame.pixels[i + 1] || frame.pixels[i + 2]) {
        colors.add([frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]].join(","));
      }
    }
    expect([...colors]).toEqual(["255,59,31"]);
    // Off tiles stay off, so black still means "unlit".
    expect(litCount(renderLedFrame("{black}", { width: 64, height: 32 }, { monochrome: mono }))).toBe(0);
    // The same pixels a 1-bit adapter would send.
    expect(frameToBits(frame)).toEqual(
      frameToBits(renderLedFrame("{63}{red:A}{icon:sun}♥I", { width: 64, height: 32 })),
    );
  });

  it("a block span lights the cell background and draws the glyph over it — inverse video for black/white", () => {
    // 3x5 "I" row 0 is "###": with black-on-white the glyph pixels stay off
    // and the rest of the glyph box lights white.
    const frame = renderLedFrame("{black/white:I}", { width: 12, height: 5, font: "3x5" });
    expect(pixel(frame, 0, 0)).toEqual([0, 0, 0]);
    expect(pixel(frame, 0, 1)).toEqual([255, 255, 255]); // row 1 is ".#." → x=0 is background
    expect(pixel(frame, 1, 1)).toEqual([0, 0, 0]); // the glyph pixel
    expect(pixel(frame, 3, 1)).toEqual([0, 0, 0]); // the gutter after a lone block cell stays dark
    // Red on blue: glyph red, background blue.
    const rb = renderLedFrame("{red/blue:I}", { width: 12, height: 5, font: "3x5" });
    expect(pixel(rb, 1, 1)).toEqual([0xeb, 0x40, 0x34]);
    expect(pixel(rb, 0, 1)).toEqual([0x4a, 0x90, 0xd9]);
  });

  it("joins the gutter between two cells of one block, so a run reads as a pill", () => {
    const frame = renderLedFrame("{black/white:II}", { width: 12, height: 5, font: "3x5" });
    expect(pixel(frame, 3, 1)).toEqual([255, 255, 255]); // gutter between the two cells lit
    expect(pixel(frame, 7, 1)).toEqual([0, 0, 0]); // gutter after the run dark
    const text = layoutLedMessage("{black/white:ON} AIR", { width: 64, height: 32 }).text;
    expect(text).toBe("ON AIR");
  });

  it("a block span on a monochrome panel is always inverse video", () => {
    const mono = "#ff3b1f";
    const frame = renderLedFrame("{red/blue:I}", { width: 12, height: 5, font: "3x5" }, { monochrome: mono });
    expect(pixel(frame, 1, 1)).toEqual([0, 0, 0]); // glyph unlit
    expect(pixel(frame, 0, 1)).toEqual([0xff, 0x3b, 0x1f]); // background in the panel colour
    expect(frameToBits(frame)).toEqual(
      frameToBits(renderLedFrame("{black/white:I}", { width: 12, height: 5, font: "3x5" })),
    );
  });

  it("frameToBits is 1 where any channel is lit", () => {
    const bits = frameToBits(renderLedFrame("{63}", { width: 8, height: 5, font: "3x5" }));
    expect(bits).toHaveLength(40);
    expect([...bits.subarray(0, 8)]).toEqual([1, 1, 1, 0, 0, 0, 0, 0]);
    expect([...bits].reduce((a, b) => a + b, 0)).toBe(15);
  });

  it("mono presets carry their LED colour", () => {
    expect(LED_MATRIX_PRESETS.max7219.monochrome).toBe("#ff3b1f");
    expect(LED_MATRIX_PRESETS.p10_32x16.monochrome).toBe("#ff3b1f");
    expect(LED_MATRIX_PRESETS.awtrix.monochrome).toBeUndefined();
  });

  it("keeps the heart red even inside a span", () => {
    expect(BOARD_COLORS.red).toBe("#eb4034");
    const heart = renderLedFrame("{blue:♥}", { width: 12, height: 5, font: "3x5" });
    expect(pixel(heart, 0, 0)).toEqual(RED); // 3x5 heart row 0 is "#.#"
  });
});

describe("layoutLedMessage text", () => {
  it("is what the matrix shows: clipped, tiles blank, whitespace collapsed", () => {
    const layout = layoutLedMessage("good morning {66}\nsecond line", { width: 32, height: 8, font: "3x5" });
    expect(layout.text).toBe("GOOD MOR");
  });
});

describe("LedMatrixDisplay", () => {
  beforeEach(() => {
    // jsdom has no canvas backend; it logs "not implemented" and returns null.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("names the board from its message and hides the canvas", () => {
    render(<LedMatrixDisplay message={"hello {red}world\nline two"} preset="hub75_64x32" />);
    const board = screen.getByRole("img", { name: "LED matrix preview: HELLO WOR LINE TWO" });
    expect(board.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
    expect(board).toHaveAttribute("data-matrix-width", "64");
    expect(board).toHaveAttribute("data-matrix-height", "32");
  });

  it("names only the text that fits", () => {
    render(<LedMatrixDisplay message="GOOD MORNING EVERYONE" preset="awtrix" />);
    expect(screen.getByRole("img", { name: "LED matrix preview: GOOD MOR" })).toBeInTheDocument();
  });

  it("uses the empty label with no message", () => {
    render(<LedMatrixDisplay message={null} />);
    expect(screen.getByRole("img", { name: "Empty LED matrix display" })).toBeInTheDocument();
  });

  it("lets explicit dimensions override a preset", () => {
    render(<LedMatrixDisplay message="HI" preset="awtrix" matrixWidth={64} />);
    const board = screen.getByRole("img");
    expect(board).toHaveAttribute("data-matrix-width", "64");
    expect(board).toHaveAttribute("data-matrix-height", "8");
    expect(board).toHaveAttribute("data-font", "3x5");
  });

  it("sizes the canvas from the pitch before it paints — a named size or a number of px", () => {
    render(<LedMatrixDisplay message="HI" preset="awtrix" size="lg" />);
    expect(screen.getByRole("img").querySelector("canvas")!.parentElement!.style.width).toBe(`${32 * 9}px`);
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="awtrix" size={12} />);
    expect(screen.getByRole("img").querySelector("canvas")!.parentElement!.style.width).toBe(`${32 * 12}px`);
  });

  it("resolves a choice the device cannot run to its default and says so", () => {
    render(<LedMatrixDisplay message="HI" preset="awtrix" transition="slide" />);
    const board = screen.getByRole("img");
    expect(board).toHaveAttribute("data-transition", "none");
    expect(board).toHaveAttribute("data-transition-source", "fallback");
    expect(board).toHaveAttribute("data-transition-fallback", "slide");
    cleanup();
    render(<LedMatrixDisplay message="HI" model="divoom_pixoo64" />);
    const pixoo = screen.getByRole("img");
    expect(pixoo).toHaveAttribute("data-transition", "flip");
    expect(pixoo).toHaveAttribute("data-transition-frames", "32");
    expect(pixoo).toHaveAttribute("data-matrix-width", "64");
  });

  it("takes its default transition from the device model, and 'none' or a kind overrides it", () => {
    render(<LedMatrixDisplay message="HI" preset="hub75_64x32" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-transition", "flip");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="pixoo64" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-transition", "flip");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="awtrix" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-transition", "none");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="hub75_64x32" transition="slide" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-transition", "slide");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="hub75_64x32" transition="none" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-transition", "none");
    cleanup();
    // No preset: no device to ask, so a change snaps.
    render(<LedMatrixDisplay message="HI" matrixWidth={64} matrixHeight={32} />);
    expect(screen.getByRole("img")).toHaveAttribute("data-transition", "none");
  });

  it("marks a monochrome board, from the preset or the prop", () => {
    render(<LedMatrixDisplay message="HI" preset="max7219" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-monochrome", "");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="awtrix" monochrome="#ffb000" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-monochrome", "");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="awtrix" />);
    expect(screen.getByRole("img")).not.toHaveAttribute("data-monochrome");
  });

  it("names mixed-case text as drawn", () => {
    render(<LedMatrixDisplay message="Now playing" preset="hub75_128x64" letterCase="mixed" />);
    expect(screen.getByRole("img", { name: "LED matrix preview: Now playing" })).toBeInTheDocument();
  });

  it("announces message changes through a polite live region only when asked", () => {
    const { rerender } = render(<LedMatrixDisplay message="N 2 MIN" preset="hub75_64x32" announceUpdates />);
    const region = document.querySelector('[data-slot="led-matrix-display-announcer"]')!;
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region.textContent).toBe(""); // armed empty: mounting is not news
    rerender(<LedMatrixDisplay message="N 1 MIN" preset="hub75_64x32" announceUpdates />);
    expect(region).toHaveTextContent("N 1 MIN");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="hub75_64x32" />);
    expect(document.querySelector('[data-slot="led-matrix-display-announcer"]')).toBeNull();
  });

  it("keeps the live region outside the image", () => {
    render(<LedMatrixDisplay message="HI" preset="hub75_64x32" announceUpdates />);
    const region = document.querySelector('[data-slot="led-matrix-display-announcer"]')!;
    expect(screen.getByRole("img").contains(region)).toBe(false);
  });

  describe("transitions", () => {
    // Drive rAF from fake timers at 16ms a tick, so a 480ms wipe is ~30 ticks.
    let raf: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      vi.useFakeTimers();
      planSpy.mockClear();
      raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number;
      });
      vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("plans a transition on a message change, samples it every tick, and settles on the new frame", () => {
      const { rerender } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="wipe" />);
      expect(planSpy).not.toHaveBeenCalled(); // the first paint is static
      expect(raf).not.toHaveBeenCalled();
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="wipe" />);
      expect(planSpy).toHaveBeenCalledTimes(1);
      const plan = planSpy.mock.results[0].value as transitions.LedTransition;
      expect(plan.durationMs).toBe(480);
      const frameAt = vi.spyOn(plan, "frameAt");
      vi.advanceTimersByTime(240);
      const midCalls = frameAt.mock.calls.length;
      expect(midCalls).toBeGreaterThanOrEqual(10);
      expect(frameAt.mock.calls.every(([t]) => t < 480)).toBe(true);
      vi.advanceTimersByTime(2000);
      // Settled: no more samples, and the last one was before the end — the
      // final paint is the memoized frame itself, not frameAt(duration).
      const settledCalls = frameAt.mock.calls.length;
      expect(settledCalls).toBeGreaterThan(midCalls);
      vi.advanceTimersByTime(1000);
      expect(frameAt.mock.calls.length).toBe(settledCalls);
      expect(screen.getByRole("img", { name: "LED matrix preview: CD" })).toBeInTheDocument();
    });

    it("cancels the animation frame on unmount", () => {
      const { rerender, unmount } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="fade" />);
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="fade" />);
      vi.advanceTimersByTime(50);
      const plan = planSpy.mock.results[0].value as transitions.LedTransition;
      const frameAt = vi.spyOn(plan, "frameAt");
      unmount();
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(frameAt).not.toHaveBeenCalled();
    });

    it("retargets a message that lands mid-flight from the point the first transition had reached", () => {
      const { rerender } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="fade" />);
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="fade" />);
      const first = planSpy.mock.results[0].value as transitions.LedTransition;
      const layoutAt = vi.spyOn(first, "layoutAt");
      const frameAt = vi.spyOn(first, "frameAt");
      vi.advanceTimersByTime(160);
      rerender(<LedMatrixDisplay message="EF" preset="hub75_64x32" transition="fade" />);
      expect(planSpy).toHaveBeenCalledTimes(2);
      const [from, to, , fromFrame] = planSpy.mock.calls[1];
      expect(from).toBe(layoutAt.mock.results.at(-1)!.value);
      expect(fromFrame).toBe(frameAt.mock.results.at(-1)!.value);
      expect(to.text).toBe("EF");
      const elapsed = layoutAt.mock.calls.at(-1)![0];
      expect(elapsed).toBeGreaterThan(100);
      expect(elapsed).toBeLessThan(480);
    });
  });

  it("snaps instead of animating under prefers-reduced-motion", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    // The module-scope query is what the hook reads (one MediaQueryList per
    // document); the setup stub hands out a fresh object per call.
    Object.defineProperty(reducedMotionQuery, "matches", { value: true, configurable: true });
    try {
      const { rerender } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="flip" />);
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="flip" />);
      expect(raf).not.toHaveBeenCalled();
      expect(screen.getByRole("img", { name: "LED matrix preview: CD" })).toBeInTheDocument();
    } finally {
      Object.defineProperty(reducedMotionQuery, "matches", { value: false, configurable: true });
      raf.mockRestore();
    }
  });
});
