import { describe, expect, it } from "vitest";

import { BOARD_CHARS, parseLine } from "./board-characters";
import { BOARD_COLORS } from "./board-colors";
import { BOARD_ICON_NAMES, BOARD_ICONS } from "./board-icons";
import { LED_FONTS } from "./led-fonts";
import {
  DEFAULT_LED_TEXT_COLOR,
  frameToAscii,
  frameToBits,
  layoutLedMessage,
  LED_GLYPHS,
  LED_MATRIX_PRESETS,
  ledBackgroundMask,
  ledGlyphIndex,
  ledGridLayout,
  renderLedFrame,
  renderLedGlyph,
} from "./led-matrix";

/*
 * The framebuffer is the contract (see docs/superpowers/specs/
 * 2026-10-03-led-matrix-display-design.md), so the behaviour is asserted on
 * `renderLedFrame`'s bytes, which need no canvas. How a canvas paints them
 * is the component's (and VRT's) job.
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

const RED = [0xeb, 0x40, 0x34];
const YELLOW = [0xf8, 0xe7, 0x1c];
const WHITE = [255, 255, 255];

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
    // One glyph per tile whatever its spelling — the token itself is not rewritten.
    expect(idx({ type: "color", code: "green" })).toBe(idx({ type: "color", code: "66" }));
    expect(idx({ type: "color", code: "purple" })).toBe(idx({ type: "color", code: "68" }));
    expect(idx({ type: "color", code: "black" })).toBe(LED_GLYPHS.indexOf("tile:70"));
    expect(idx({ type: "char", value: "b" })).toBe(LED_GLYPHS.indexOf("b"));
    expect(idx({ type: "color", code: "65", icon: "sun" })).toBe(LED_GLYPHS.indexOf("icon:sun"));
    expect(idx({ type: "char", value: "~" })).toBe(0);
    expect(idx({ type: "char", value: " " })).toBe(0);
  });
});

describe("ledGridLayout", () => {
  it("fits as many cells as the font allows and centres the leftover", () => {
    expect(ledGridLayout({ width: 32, height: 8, font: "3x5" })).toEqual({
      width: 32,
      height: 8,
      font: "3x5",
      rows: 1,
      cols: 8,
      originX: 0,
      originY: 1,
    });
    expect(ledGridLayout({ width: 64, height: 64, font: "3x5" })).toMatchObject({ rows: 10, cols: 16 });
    expect(ledGridLayout({ width: 64, height: 64 })).toMatchObject({ rows: 8, cols: 10, font: "5x7" });
  });

  it("clamps sizes and gives a too-small matrix a 0×0 grid", () => {
    expect(ledGridLayout({ width: 0, height: 9999 })).toMatchObject({ width: 1, height: 256, cols: 0 });
    expect(ledGridLayout({ width: NaN, height: 2.9 })).toMatchObject({ width: 1, height: 2 });
    expect(litCount(renderLedFrame("A", { width: 2, height: 2 }))).toBe(0);
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
    expect(pixel(frame, 2, 0)).toEqual([0, 0, 0]);
    expect(pixel(frame, 3, 0)).toEqual(WHITE);
    expect(pixel(frame, 5, 0)).toEqual(WHITE);
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
    expect(pixel(frame, 2, 0)).toEqual(RED);
    expect(pixel(frame, 7, 0)).toEqual([0, 0, 0]); // gutter column
  });

  it("clips text past the grid, line by line", () => {
    const frame = renderLedFrame("ABCDEFGHIJKLMNOP", { width: 32, height: 8, font: "3x5" });
    const eight = renderLedFrame("ABCDEFGH", { width: 32, height: 8, font: "3x5" });
    expect(frame.pixels).toEqual(eight.pixels);
    // A second line on a one-row clock is dropped, not wrapped.
    expect(renderLedFrame("AB\nCD", { width: 32, height: 8, font: "3x5" }).pixels).toEqual(
      renderLedFrame("AB", { width: 32, height: 8, font: "3x5" }).pixels,
    );
  });

  it("falls back to the default text colour rather than drawing invisible text", () => {
    const frame = renderLedFrame("I", { width: 64, height: 32 }, { textColor: "rgba(255, 176, 0, 1)" });
    expect(pixel(frame, 3, 0)).toEqual(WHITE);
  });

  it("draws the 3x5 face pixel-for-pixel", () => {
    expect(frameToAscii(renderLedFrame("HI!", { width: 12, height: 5, font: "3x5" }))).toBe(
      ["#.#.###..#..", "#.#..#...#..", "###..#...#..", "#.#..#......", "#.#.###..#.."].join("\n"),
    );
  });

  it("honours textColor", () => {
    const frame = renderLedFrame("I", { width: 64, height: 32 }, { textColor: "#ffb000" });
    expect(pixel(frame, 3, 0)).toEqual([0xff, 0xb0, 0x00]);
  });
});

describe("the degree sign and the heart", () => {
  const spec = { width: 12, height: 5, font: "3x5" } as const;

  it("draws each as itself: there is no code-62 flap on an LED", () => {
    const degree = renderLedFrame("°", spec);
    const heart = renderLedFrame("♥", spec);
    expect(frameToAscii(degree).split("\n")[0]).toBe("##..........");
    expect(frameToAscii(heart).split("\n")[0]).toBe("#.#.........");
    expect(degree.pixels).not.toEqual(heart.pixels);
    expect(pixel(degree, 0, 0)).toEqual(WHITE);
    expect(layoutLedMessage("72° ♥", { ...spec, width: 24 }).text).toBe("72° ♥");
  });

  it("a typed ❤ and {icon:heart} are the same heart, drawn red even inside a span", () => {
    expect(BOARD_COLORS.red).toBe("#eb4034");
    const typed = renderLedFrame("♥", spec);
    expect(renderLedFrame("❤", spec).pixels).toEqual(typed.pixels);
    expect(renderLedFrame("{icon:heart}", spec).pixels).toEqual(typed.pixels);
    expect(pixel(typed, 0, 0)).toEqual(RED); // 3x5 heart row 0 is "#.#"
    expect(pixel(renderLedFrame("{blue:♥}", spec), 0, 0)).toEqual(RED);
    // 5x7 heart row 2 is "#####".
    expect(pixel(renderLedFrame("♥", { width: 64, height: 32 }), 2, 2)).toEqual(RED);
  });
});

describe("colour spans, icons, case and monochrome", () => {
  it("draws a {red:…} span's letters in red and leaves the rest white", () => {
    // 3x5 "H" row 0 is "#.#"; "I" row 0 is "###".
    const frame = renderLedFrame("{red:H}I", { width: 12, height: 5, font: "3x5" });
    expect(pixel(frame, 0, 0)).toEqual(RED);
    expect(pixel(frame, 4, 0)).toEqual(WHITE);
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
    expect(pixel(frame, 4, 0)).toEqual(WHITE); // I, white
  });

  it("{/white:A} is literal text, not a span or an end tag", () => {
    const spec = { width: 64, height: 8, font: "3x5" } as const;
    // The braces are cells too; the face has no glyph for them, so they are
    // blank in the frame and in the text — but they take their column.
    expect(layoutLedMessage("{/white:A}", spec).text).toBe("/WHITE:A");
    expect(
      layoutLedMessage("{/white:A}", spec)
        .cells.slice(0, 2)
        .map((c) => c.glyph),
    ).toEqual([0, LED_GLYPHS.indexOf("/")]);
    expect(renderLedFrame("{/white:A}", spec).pixels).toEqual(renderLedFrame("{/WHITE:A}", spec).pixels);
    expect(renderLedFrame("{/white:A}", spec).pixels).not.toEqual(renderLedFrame("/WHITE:A", spec).pixels);
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
    expect(pixel(frame, 0, 1)).toEqual(WHITE); // row 1 is ".#." → x=0 is background
    expect(pixel(frame, 1, 1)).toEqual([0, 0, 0]); // the glyph pixel
    expect(pixel(frame, 3, 1)).toEqual([0, 0, 0]); // the gutter after a lone block cell stays dark
    // Red on blue: glyph red, background blue.
    const rb = renderLedFrame("{red/blue:I}", { width: 12, height: 5, font: "3x5" });
    expect(pixel(rb, 1, 1)).toEqual(RED);
    expect(pixel(rb, 0, 1)).toEqual([0x4a, 0x90, 0xd9]);
  });

  it("joins the gutter between two cells of one block, so a run reads as a pill", () => {
    const frame = renderLedFrame("{black/white:II}", { width: 12, height: 5, font: "3x5" });
    expect(pixel(frame, 3, 1)).toEqual(WHITE); // gutter between the two cells lit
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

  it("ledBackgroundMask marks block fields (gutters joined) and nothing else", () => {
    expect(ledBackgroundMask(layoutLedMessage("{63}AB", { width: 12, height: 5, font: "3x5" }))).toBeNull();
    const mask = ledBackgroundMask(layoutLedMessage("{black/white:II}A", { width: 12, height: 5, font: "3x5" }))!;
    expect([...mask.subarray(0, 12)]).toEqual([1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]);
  });

  it("frameToBits is 1 where any channel is lit", () => {
    const bits = frameToBits(renderLedFrame("{63}", { width: 8, height: 5, font: "3x5" }));
    expect(bits).toHaveLength(40);
    expect([...bits.subarray(0, 8)]).toEqual([1, 1, 1, 0, 0, 0, 0, 0]);
    expect([...bits].reduce((a, b) => a + b, 0)).toBe(15);
  });

  it("mono presets carry their LED colour; presets carry no appearance", () => {
    expect(LED_MATRIX_PRESETS.max7219.monochrome).toBe("#ff3b1f");
    expect(LED_MATRIX_PRESETS.p10_32x16.monochrome).toBe("#ff3b1f");
    expect(LED_MATRIX_PRESETS.awtrix.monochrome).toBeUndefined();
    for (const preset of Object.values(LED_MATRIX_PRESETS)) expect(preset).not.toHaveProperty("pixelShape");
  });
});

describe("renderLedGlyph", () => {
  it("is one glyph box holding what a cell would draw", () => {
    expect(frameToAscii(renderLedGlyph({ type: "char", value: "I" }, "3x5")).split("\n")).toEqual(
      LED_FONTS["3x5"].glyphs.I,
    );
    const tile = renderLedGlyph({ type: "color", code: "red" }, "3x5");
    expect(litCount(tile)).toBe(15);
    expect(pixel(tile, 0, 0)).toEqual(RED);
    const block = renderLedGlyph({ type: "char", value: "I", color: "black", background: "white" }, "3x5");
    expect(pixel(block, 0, 1)).toEqual(WHITE);
    expect(pixel(block, 1, 1)).toEqual([0, 0, 0]);
    expect(frameToAscii(renderLedGlyph({ type: "char", value: " ", icon: "sun" }, "5x7")).split("\n")).toEqual(
      LED_FONTS["5x7"].icons.sun,
    );
  });
});

describe("layoutLedMessage text", () => {
  it("is what the matrix shows: clipped, tiles blank, whitespace collapsed", () => {
    const layout = layoutLedMessage("good morning {66}\nsecond line", { width: 32, height: 8, font: "3x5" });
    expect(layout.text).toBe("GOOD MOR");
  });

  it("carries only the options a transition needs to redraw its cells", () => {
    expect(layoutLedMessage("A", { width: 12, height: 5, font: "3x5" }).options).toEqual({ monochrome: undefined });
    expect(layoutLedMessage("A", { width: 12, height: 5, font: "3x5" }, { monochrome: "#FFB000" }).options).toEqual({
      monochrome: "#ffb000",
    });
  });
});
