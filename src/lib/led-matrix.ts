/**
 * LED matrix geometry and the framebuffer it renders to.
 *
 * An LED matrix is `width × height` pixels, not a grid of character tiles. To
 * show the same message markup a split-flap board shows, it lays text out on a
 * character grid *derived* from its pixels and a bitmap font (./led-fonts), and
 * draws each cell into a row-major RGB888 framebuffer.
 *
 * The framebuffer is the contract. `LedMatrixDisplay` paints it to a canvas,
 * and a device adapter (AWTRIX RGB565, WLED DDP, Pixoo base64, Tronbyt WebP…)
 * would serialise the very same bytes — so the preview cannot drift from what
 * the hardware is sent, because there is no second renderer to drift.
 *
 * Parsing (uppercasing, colour tiles, end tags, colour spans, icons) is not
 * repeated here: it is `parseLine` from ./board-characters, the function every
 * split-flap renderer uses, so one message reads the same on either kind of
 * board. What an LED does *not* do is the split-flap projection to code 62:
 * a typed `°` draws a degree sign and a typed `♥` draws a heart, because the
 * panel can draw both. Only a flap board, with one flap for the two, has to
 * choose (`applyCode62Glyph`).
 *
 * Between the tokens and the pixels sits glyph identity: every cell holds a
 * stable glyph key ({@link LedGlyphKey} — the character, `tile:63`,
 * `icon:sun`), the same in every process, with {@link LED_GLYPHS} as the
 * frozen membership table of what the faces draw and a layout's own set
 * supplying any character beyond it. A layout remembers each cell's glyph,
 * which is what lets a transition turn one layout into another —
 * FiestaBoard's own flip scrambles each changing cell through its device's
 * character set and lands it on its target.
 */

import { type BoardToken, parseLine } from "./board-characters";
import { BOARD_COLORS, COLOR_CODE_MAP, resolveColorCode } from "./board-colors";
import { BOARD_ICON_NAMES, BOARD_ICONS, type BoardIconName } from "./board-icons";
import type { CharacterSet } from "./character-sets";
import { LED_FONTS, type LedFont, type LedFontId } from "./led-fonts";

/** Matrix size bounds. 256 covers a chain of four 64-wide HUB75 panels. */
export const MIN_MATRIX_SIZE = 1;
export const MAX_MATRIX_SIZE = 256;

export interface LedMatrixSpec {
  /** Pixels across. Clamped to [MIN_MATRIX_SIZE, MAX_MATRIX_SIZE]. */
  width: number;
  /** Pixels down. Clamped to [MIN_MATRIX_SIZE, MAX_MATRIX_SIZE]. */
  height: number;
  /** Bitmap font text is set in. Defaults to `"5x7"`. */
  font?: LedFontId;
}

export type LedMatrixPresetId =
  | "awtrix"
  | "wled_32x32"
  | "hub75_64x32"
  | "hub75_64x64"
  | "hub75_128x64"
  | "pixoo64"
  | "max7219"
  | "p10_32x16"
  | "tronbyt";

/**
 * The colour a single-colour panel's LEDs are. Names rather than a bare hex
 * so a FiestaBoard settings screen can offer "red / amber / green / …".
 */
export const LED_MONO_COLORS = {
  red: "#ff3b1f",
  amber: "#ffb000",
  green: "#3bff5a",
  blue: "#3b8bff",
  white: "#ffffff",
} as const;

export type LedMonoColorName = keyof typeof LED_MONO_COLORS;

/**
 * Common consumer and hobbyist matrices: the geometry and font a message is
 * laid out with — everything that changes the bytes. How a panel *looks*
 * (pixel shape, dot ratio, colours) is preview-only and lives on the device
 * model's `appearance` (./devices), never here.
 *
 * The font is the one that gives the device a usable grid — a 5×7 face on an
 * 8-pixel-tall clock fits five characters, so the clocks default to 3×5 the
 * way their own firmware does.
 *
 * LaMetric (37×8) is deliberately absent: its API takes icon + text frames,
 * never a framebuffer, so a preset would promise a preview of bytes the
 * device can never be sent.
 */
export interface LedMatrixPreset extends LedMatrixSpec {
  label: string;
  /** Set on single-colour hardware: every lit LED is this colour. */
  monochrome?: string;
}

export const LED_MATRIX_PRESETS: Readonly<Record<LedMatrixPresetId, LedMatrixPreset>> = {
  awtrix: { label: "AWTRIX / Ulanzi TC001 (32×8)", width: 32, height: 8, font: "3x5" },
  wled_32x32: { label: "WLED 32×32", width: 32, height: 32, font: "3x5" },
  hub75_64x32: { label: "HUB75 64×32", width: 64, height: 32, font: "5x7" },
  hub75_64x64: { label: "HUB75 64×64", width: 64, height: 64, font: "5x7" },
  hub75_128x64: { label: "HUB75 128×64", width: 128, height: 64, font: "5x7" },
  // 3×5 by default: a 10 × 16 character grid clears FiestaBoard's 3 × 15
  // platform floor for page content; the 5×7 face (8 × 10) is an override.
  pixoo64: { label: "Divoom Pixoo 64", width: 64, height: 64, font: "3x5" },
  // Four chained 8×8 modules: the classic red 1-bit ticker.
  max7219: { label: "MAX7219 4-in-1 (32×8, red)", width: 32, height: 8, font: "3x5", monochrome: LED_MONO_COLORS.red },
  // Tidbyt hardware / the Tronbyt server: a diffused 64×32 that takes a WebP.
  tronbyt: { label: "Tidbyt / Tronbyt (64×32)", width: 64, height: 32, font: "5x7" },
  // One P10 HUB12 DMD module: single-colour signage.
  p10_32x16: { label: "P10 DMD (32×16, red)", width: 32, height: 16, font: "5x7", monochrome: LED_MONO_COLORS.red },
};

/** Character grid derived from a matrix and font, plus where it starts. */
export interface LedGridLayout {
  width: number;
  height: number;
  font: LedFontId;
  rows: number;
  cols: number;
  /** Pixel x of the first glyph — leftover pixels are split as a margin. */
  originX: number;
  /** Pixel y of the first glyph. */
  originY: number;
}

/** A rendered frame: row-major RGB888, origin top-left, no serpentine order. */
export interface LedFrame {
  width: number;
  height: number;
  /** `width × height × 3` bytes. All-zero is every pixel off. */
  pixels: Uint8ClampedArray;
}

function clampSize(n: number): number {
  if (!Number.isFinite(n)) return MIN_MATRIX_SIZE;
  const i = Math.floor(n);
  if (i < MIN_MATRIX_SIZE) return MIN_MATRIX_SIZE;
  return i > MAX_MATRIX_SIZE ? MAX_MATRIX_SIZE : i;
}

/**
 * Lay a character grid onto a matrix: as many glyph cells as fit, with the
 * leftover pixels centred. A matrix too small for one glyph has a 0×0 grid
 * and renders dark.
 *
 *     cols = floor((width  + spacingX) / (glyphWidth  + spacingX))
 *     rows = floor((height + spacingY) / (glyphHeight + spacingY))
 */
export function ledGridLayout(spec: LedMatrixSpec): LedGridLayout {
  const width = clampSize(spec.width);
  const height = clampSize(spec.height);
  const fontId = spec.font ?? "5x7";
  const font = LED_FONTS[fontId];
  const cellW = font.glyphWidth + font.spacingX;
  const cellH = font.glyphHeight + font.spacingY;
  const cols = Math.floor((width + font.spacingX) / cellW);
  const rows = Math.floor((height + font.spacingY) / cellH);
  const usedW = cols > 0 ? cols * cellW - font.spacingX : 0;
  const usedH = rows > 0 ? rows * cellH - font.spacingY : 0;
  return {
    width,
    height,
    font: fontId,
    rows,
    cols,
    originX: Math.floor((width - usedW) / 2),
    originY: Math.floor((height - usedH) / 2),
  };
}

/** `#rrggbb` → [r, g, b], or `null` for anything else. */
export function parseHexColor(hex: string): readonly [number, number, number] | null {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex.trim());
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null;
}

/** Pure white — what a device is sent, and AWTRIX's own default text colour. */
export const DEFAULT_LED_TEXT_COLOR = "#ffffff";

/**
 * Colour tiles that mean "dark" on an emissive display. On a flap board black
 * (70) and filled (71) are painted leaves; on an LED they are unlit pixels.
 */
const OFF_TILE_CODES = new Set(["70", "71", "black"]);

/** Hex of a colour code (`"red"`, `"63"`) or a `#rrggbb`; `null` for an off colour. */
function colorCodeToHex(code: string): string | null {
  if (OFF_TILE_CODES.has(code)) return null;
  if (code.startsWith("#")) return parseHexColor(code) ? code.toLowerCase() : null;
  return resolveColorCode(code, false);
}

export type LedLetterCase = "upper" | "mixed";

export interface LedLayoutOptions {
  /** `#rrggbb` colour for glyph pixels. Defaults to (and falls back to)
   *  {@link DEFAULT_LED_TEXT_COLOR}. */
  textColor?: string;
  /**
   * A single-colour panel (P10 red, MAX7219, amber signage), given as the
   * `#rrggbb` its LEDs are. Every lit pixel becomes this colour — text,
   * colour spans, colour tiles and icons alike — so colour markup degrades to
   * on/off the way a 1-bit adapter will threshold it ({@link frameToBits}).
   * `textColor` is ignored. An unparseable value is treated as unset.
   */
  monochrome?: string;
  /**
   * `"upper"` (default) uppercases like the flap board. `"mixed"` keeps the
   * message's case and draws lowercase from the font's a–z glyphs.
   */
  letterCase?: LedLetterCase;
  /**
   * The character set the panel draws — a plugin's, when it adds characters
   * of its own: their bitmaps (`CharacterSet.glyphs`) are drawn where the
   * face has none, and win over the face's where it has one. The built-in
   * sets add nothing beyond the face.
   */
  charset?: CharacterSet;
}

/** One thing to draw: a bitmap glyph or a solid rectangle, in matrix pixels. */
export type LedDrawOp =
  | { kind: "glyph"; x: number; y: number; rows: readonly string[]; color: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string };

/**
 * The identity of a glyph, as a **stable key** that means the same thing in
 * every process — the browser preview, a second browser session, and
 * FiestaBoard's Python port of this renderer — so two of them seed a flip
 * the same way and agree on which cells changed:
 *
 * - `" "` — blank (an unlit cell; also what an undrawable character becomes).
 * - the character itself (`"A"`, `"€"`, `"♥"`, `"°"`) — one Unicode
 *   character, exactly as the set or the message spells it.
 * - `tile:<code>` — a colour tile by its canonical **numeric** code, so
 *   `{red}` and `{63}` are one glyph (`tile:63`); `{black}`, `{70}` and
 *   `{71}` are all `tile:70`. The token keeps its spelling; only the key is
 *   canonical.
 * - `icon:<name>` — an icon by its canonical name, aliases resolved
 *   (`{icon:storm}` is `icon:bolt`).
 *
 * Nothing is ever numbered: a plugin set's own character is keyed by the
 * character, whichever set declared it and whatever was laid out before.
 */
export type LedGlyphKey = string;

/** The blank glyph's key. */
export const LED_BLANK_GLYPH: LedGlyphKey = " ";

/**
 * @internal Renderer plumbing — the public surface is `layoutLedMessage`,
 * `rasterizeLedLayout`, `renderLedFrame`, the presets and the frame helpers.
 *
 * Every glyph the built-in faces can show, as a frozen **membership table**
 * of glyph keys: a character in it resolves to itself, one outside it is
 * blank unless the layout's own set draws it. Nothing reads meaning into
 * the order. (Until revision 7 this was a "drum" in Vestaboard's character
 * order and the flip walked it; FiestaBoard's LED flip is its own thing now
 * — see ./led-transitions — so the table is just membership.) It is never
 * added to: a plugin set's characters live in that set's `glyphs`, carried
 * on each layout as its own table, so no layout can see another set's.
 */
export const LED_GLYPHS: readonly LedGlyphKey[] = Object.freeze([
  LED_BLANK_GLYPH,
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  ..."!@#$()-+&=;:'\"%,./?°",
  ..."abcdefghijklmnopqrstuvwxyz",
  // The heart is its own glyph: a message that says ♥ draws one, and one that
  // says ° draws a degree sign. There is no code-62 flap here to choose for.
  "♥",
  ...["63", "64", "65", "66", "67", "68", "69", "70", "71"].map((code) => `tile:${code}`),
  ...BOARD_ICON_NAMES.map((name) => `icon:${name}`),
]);
const BUILTIN_GLYPH_KEYS: ReadonlySet<LedGlyphKey> = new Set(LED_GLYPHS);

/**
 * Numeric tile code for a colour's hex, so `{red}` and `{63}` share one
 * glyph. This is glyph identity, not token normalisation: the token keeps
 * the spelling it was parsed with.
 */
const TILE_CODE_BY_HEX = new Map<string, string>();
for (const [code, hex] of Object.entries(COLOR_CODE_MAP))
  if (!TILE_CODE_BY_HEX.has(hex)) TILE_CODE_BY_HEX.set(hex, code);

/**
 * @internal The glyph key of a parsed cell ({@link LedGlyphKey}). An unknown
 * character is blank, as on a flap — unless `custom` (the layout's set's own
 * bitmaps) draws it, in which case it is itself. Pure: nothing is registered
 * anywhere, so the answer is the same whatever was laid out before.
 */
export function ledGlyphKey(token: BoardToken, custom?: Readonly<Record<string, readonly string[]>>): LedGlyphKey {
  if (token.icon) {
    const key = `icon:${token.icon}`;
    return BUILTIN_GLYPH_KEYS.has(key) ? key : LED_BLANK_GLYPH;
  }
  if (token.type === "color") {
    const code = TILE_CODE_BY_HEX.get(resolveColorCode(token.code, false));
    return code ? `tile:${code}` : LED_BLANK_GLYPH;
  }
  const key = token.value;
  if (BUILTIN_GLYPH_KEYS.has(key)) return key;
  return custom !== undefined && Object.hasOwn(custom, key) ? key : LED_BLANK_GLYPH;
}

/** @internal What a glyph key is. */
export function ledGlyphEntry(
  glyph: LedGlyphKey,
):
  | { kind: "blank" }
  | { kind: "char"; char: string }
  | { kind: "tile"; code: string }
  | { kind: "icon"; name: BoardIconName } {
  if (glyph === LED_BLANK_GLYPH || glyph === "") return { kind: "blank" };
  if (glyph.startsWith("icon:")) return { kind: "icon", name: glyph.slice(5) as BoardIconName };
  if (glyph.startsWith("tile:")) return { kind: "tile", code: glyph.slice(5) };
  return { kind: "char", char: glyph };
}

/** One cell of a layout: what it shows and the colour its text draws in. */
export interface LedCell {
  /** The cell's glyph, by its stable key ({@link LedGlyphKey}). */
  glyph: LedGlyphKey;
  /** `#rrggbb` the cell's text draws in: its span colour, else `textColor`,
   *  else the panel's `monochrome`. Tiles and icons bring their own colour
   *  (unless the panel is monochrome), so this is informational for them. */
  color: string;
  /** `#rrggbb` the cell's background lights in, for a block span
   *  (`{black/white:OPEN}`). Unset means unlit. On a monochrome panel it is
   *  the panel colour and `color` is black: inverse video. */
  background?: string;
}

/**
 * What a message becomes before it becomes pixels: draw ops in matrix
 * coordinates, plus the text those ops actually show.
 *
 * Layout and raster are separate on purpose. Everything planned for later —
 * proportional fonts, a scrolling marquee, an 8×8 icon layer — is a new
 * *layout*; {@link rasterizeLedLayout}, the preview and every device adapter
 * stay as they are.
 */
export interface LedLayout {
  width: number;
  height: number;
  grid: LedGridLayout;
  /** `rows × cols` cells, row-major. Empty when the grid is 0×0. */
  cells: LedCell[];
  /** The options the cells were resolved with — needed to draw any other
   *  glyph into the same cells, which is what a transition does. `glyphs` is
   *  this layout's own custom-glyph table (its set's bitmaps, keyed by
   *  character): the only place a character the face lacks is drawn from.
   *  `charset` is the set the layout was drawn with, when one was given:
   *  the pool a flip's scramble draws from, so a plugin device scrambles
   *  only through its own characters (its custom bitmaps in `glyphs`). */
  options: Readonly<Pick<LedLayoutOptions, "monochrome"> & { glyphs?: CharacterSet["glyphs"]; charset?: CharacterSet }>;
  ops: LedDrawOp[];
  /**
   * The text the matrix shows, for its accessible name: rows joined with a
   * space, colour tiles and undrawable characters as blanks, icons as their
   * label ("sun"), whitespace collapsed. It is the *clipped* grid, not the
   * whole message — on a 32×8 clock clipping is the normal case, and naming
   * text nobody can see would tell a screen-reader user more than the board
   * tells a sighted one.
   */
  text: string;
}

/**
 * The glyph rows an entry draws in a font, or `null` for nothing. A set's
 * own bitmap (`CharacterSet.glyphs`) wins over the face's for the same
 * character — a plugin that redraws `0` gets its zero.
 */
function glyphRows(
  entry: ReturnType<typeof ledGlyphEntry>,
  font: LedFont,
  custom?: CharacterSet["glyphs"],
): readonly string[] | null {
  if (entry.kind === "char") return custom?.[entry.char] ?? font.glyphs[entry.char] ?? null;
  if (entry.kind === "icon") return font.icons[entry.name] ?? null;
  return null;
}

/**
 * @internal Draw one glyph into a cell. Exported for the transition engine,
 * which draws the glyphs a cell passes through on its way to its target.
 *
 * Text is set in `color` (the heart is always red, as on the flap); a set's
 * own bitmap wins over the face's for the same character. A colour tile
 * fills its cell's glyph box — not the gutter, so a run of tiles still reads
 * as cells. An icon draws in its own colour; a font without the icon's glyph
 * draws the icon's split-flap fallback. On a monochrome panel every one of
 * these is the panel's colour. An entry the font cannot draw draws blank,
 * the way an unknown character becomes code 0 on a flap.
 */
export function drawLedGlyph(
  ops: LedDrawOp[],
  glyph: LedGlyphKey,
  x: number,
  y: number,
  font: LedFont,
  color: string,
  options: LedLayout["options"],
): void {
  const mono = options.monochrome;
  const entry = ledGlyphEntry(glyph);
  if (entry.kind === "blank") return;
  if (entry.kind === "tile") {
    const hex = colorCodeToHex(entry.code);
    // On a monochrome panel a tile is the panel colour — or, inside a block
    // span (where `color` is black), an unlit square on the lit background,
    // so it still shows as a square rather than vanishing into the block.
    if (hex) ops.push({ kind: "rect", x, y, w: font.glyphWidth, h: font.glyphHeight, color: mono ? color : hex });
    return;
  }
  const rows = glyphRows(entry, font, options.glyphs);
  if (entry.kind === "icon") {
    if (!rows) {
      const { fallback } = BOARD_ICONS[entry.name];
      if (fallback !== null) drawLedGlyph(ops, ledGlyphKey(fallbackToken(fallback)), x, y, font, color, options);
      return;
    }
    // On a monochrome panel every glyph is `color` — the panel colour, or
    // black inside a block span (inverse video); elsewhere an icon brings its own.
    ops.push({ kind: "glyph", x, y, rows, color: mono ? color : BOARD_ICONS[entry.name].color });
    return;
  }
  if (!rows) return;
  const isHeart = entry.char === "♥";
  ops.push({ kind: "glyph", x, y, rows, color: mono ? color : isHeart ? BOARD_COLORS.red : color });
}

/** An icon's registered fallback as a token: a tile code or a character. */
function fallbackToken(fallback: string): BoardToken {
  return /^\d\d$/.test(fallback) ? { type: "color", code: fallback } : { type: "char", value: fallback };
}

/**
 * What a glyph contributes to the accessible text: the character it draws,
 * an icon's label (an icon is content, where a tile is decoration), or a
 * blank. Padded with spaces so a label never fuses with its neighbours.
 */
function glyphText(glyph: LedGlyphKey, font: LedFont, custom?: CharacterSet["glyphs"]): string {
  const entry = ledGlyphEntry(glyph);
  if (entry.kind === "icon") return ` ${BOARD_ICONS[entry.name].label} `;
  if (entry.kind !== "char") return " ";
  return font.glyphs[entry.char] || custom?.[entry.char] ? entry.char : " ";
}

/**
 * @internal Build a layout from resolved cells: the ops that draw them and the text
 * they show. {@link layoutLedMessage} is this after parsing; a transition is
 * this with some cells swapped for the glyphs they are passing through.
 */
export function layoutLedCells(grid: LedGridLayout, cells: LedCell[], options: LedLayout["options"]): LedLayout {
  const font = LED_FONTS[grid.font];
  const cellW = font.glyphWidth + font.spacingX;
  const cellH = font.glyphHeight + font.spacingY;
  const ops: LedDrawOp[] = [];
  const lines: string[] = [];
  for (let row = 0; row < grid.rows; row++) {
    let line = "";
    for (let col = 0; col < grid.cols; col++) {
      const cell = cells[row * grid.cols + col];
      const x = grid.originX + col * cellW;
      const y = grid.originY + row * cellH;
      // A block span lights the cell behind the glyph. Where the next cell —
      // to the right, or below — is in the same block the gutter between
      // them lights too, so a run reads as one pill and two stacked rows as
      // one slab. Two neighbours of *different* colours keep their gutter
      // unlit: a lit gutter would belong to one of them and overstate it,
      // and a 1-px gutter cannot be split, so the safe answer is the dark
      // line a split-flap board already draws between any two tiles.
      if (cell.background) {
        const right = col + 1 < grid.cols ? cells[row * grid.cols + col + 1] : undefined;
        const below = row + 1 < grid.rows ? cells[(row + 1) * grid.cols + col] : undefined;
        const joinRight = right?.background === cell.background;
        const joinBelow = below?.background === cell.background;
        const w = font.glyphWidth + (joinRight ? font.spacingX : 0);
        const h = font.glyphHeight + (joinBelow ? font.spacingY : 0);
        ops.push({ kind: "rect", x, y, w, h, color: cell.background });
      }
      drawLedGlyph(ops, cell.glyph, x, y, font, cell.color, options);
      line += glyphText(cell.glyph, font, options.glyphs);
    }
    lines.push(line);
  }
  return {
    width: grid.width,
    height: grid.height,
    grid,
    cells,
    options,
    ops,
    text: lines.join(" ").replace(/\s+/g, " ").trim(),
  };
}

/** Shared blank cell source for grid padding. */
const BLANK_TOKEN: BoardToken = Object.freeze({ type: "char", value: " " });

/**
 * Lay a board message out on the matrix's character grid.
 *
 * Text is set one glyph per cell in `textColor`, or in its colour span's
 * colour (`{red:HOT}`), over its block span's background (`{black/white:OPEN}`),
 * or — on a `monochrome` panel — in the panel's colour. Lines are split on
 * `\n`, and text past the grid is clipped, the same as on a split-flap board.
 * Characters keep their identity: `°` is a degree sign and `♥` a heart. See
 * {@link drawLedGlyph} for how tiles, icons and the heart draw.
 */
export function layoutLedMessage(message: string, spec: LedMatrixSpec, options: LedLayoutOptions = {}): LedLayout {
  const grid = ledGridLayout(spec);
  const { textColor, monochrome, custom, resolved } = resolveLayoutOptions(options);
  if (grid.rows === 0 || grid.cols === 0) return layoutLedCells(grid, [], resolved);

  const lines = message.split("\n");
  const parseOptions = { extendedMarkup: true, preserveCase: options.letterCase === "mixed" };
  const cells: LedCell[] = [];
  for (let row = 0; row < grid.rows; row++) {
    // Only the first `cols` tokens fit, so parsing stops there.
    const tokens = parseLine(lines[row] || "", grid.cols, parseOptions);
    for (let col = 0; col < grid.cols; col++) {
      cells.push(ledCellForToken(tokens[col] ?? BLANK_TOKEN, textColor, monochrome, custom));
    }
  }
  return layoutLedCells(grid, cells, resolved);
}

/** A grid of parsed cells, row-major: what FiestaBoard core hands a preview. */
export type BoardCellGrid = readonly (readonly BoardToken[])[];

/**
 * Lay a grid of already-parsed cells out on the matrix — the alternative to
 * {@link layoutLedMessage} for a caller that has parsed the markup once
 * itself (FiestaBoard core parses a message into rich cells and hands every
 * output the same grid). The two paths are byte-identical for the same
 * content: a message laid out here as the cells `parseLine` makes of it
 * (extended markup on, case per `letterCase`) draws the same ops, text and
 * frame as the message itself (golden-tested).
 *
 * Cells are drawn **as given**. Nothing is re-parsed and no case is applied:
 * `letterCase` is a parsing option and a parsed grid has already been cased,
 * so a lowercase cell draws lowercase whatever `letterCase` says. A tile
 * token may spell its colour either way (`"red"` or `"63"`); both are one
 * glyph. A grid that does not match the device grid is **clipped** (rows and
 * cells past the grid are dropped) and **padded** (missing cells are blank),
 * exactly as a long or short message is; {@link ledCellGridMismatch} says
 * whether that happened, for a caller that wants to fail loudly instead.
 */
export function layoutLedCellGrid(
  cells: BoardCellGrid,
  spec: LedMatrixSpec,
  options: LedLayoutOptions = {},
): LedLayout {
  const grid = ledGridLayout(spec);
  const { textColor, monochrome, custom, resolved } = resolveLayoutOptions(options);
  if (grid.rows === 0 || grid.cols === 0) return layoutLedCells(grid, [], resolved);
  const resolvedCells: LedCell[] = [];
  for (let row = 0; row < grid.rows; row++) {
    const line = cells[row];
    for (let col = 0; col < grid.cols; col++) {
      resolvedCells.push(ledCellForToken(line?.[col] ?? BLANK_TOKEN, textColor, monochrome, custom));
    }
  }
  return layoutLedCells(grid, resolvedCells, resolved);
}

/**
 * @internal Whether a cell grid is the device grid's size: `null` when it is,
 * else a one-line description (`"3×20 cells on a 4×10 grid"`) for the
 * console and a data attribute. The cells' width is their widest row.
 */
export function ledCellGridMismatch(cells: BoardCellGrid, grid: LedGridLayout): string | null {
  const rows = cells.length;
  let cols = 0;
  for (const row of cells) if (row.length > cols) cols = row.length;
  if (rows === grid.rows && cells.every((row) => row.length === grid.cols)) return null;
  return `${rows}×${cols} cells on a ${grid.rows}×${grid.cols} grid`;
}

/**
 * The colours a layout draws with and the options it carries, from the
 * caller's. An unparseable colour (a colour picker's `rgba(…)`, a typo)
 * falls back to the default rather than rasterizing to black — invisible
 * text on an LED.
 */
function resolveLayoutOptions(options: LedLayoutOptions): {
  textColor: string;
  monochrome: string | undefined;
  custom: CharacterSet["glyphs"] | undefined;
  resolved: LedLayout["options"];
} {
  const monochrome = resolveHexOption(options.monochrome, undefined);
  const textColor = monochrome ?? resolveHexOption(options.textColor, DEFAULT_LED_TEXT_COLOR)!;
  const custom = options.charset?.glyphs;
  const resolved: LedLayout["options"] = {
    monochrome,
    ...(custom ? { glyphs: custom } : {}),
    ...(options.charset ? { charset: options.charset } : {}),
  };
  return { textColor, monochrome, custom, resolved };
}

/**
 * @internal Resolve one parsed token to a cell: its glyph and the
 * colours it draws in. `textColor` and `monochrome` are already validated hex.
 *
 * A span's `color` / `background` are read off the token whatever its type:
 * a parsed tile never carries them, but an icon whose split-flap fallback is
 * a tile does (`{black/white:{icon:sun}}` parses to a tile token tagged
 * `icon`, colours kept), and that cell is a block cell like any other — its
 * field lights, and the icon's glyph or its tile draws over it.
 */
export function ledCellForToken(
  token: BoardToken,
  textColor: string,
  monochrome: string | undefined,
  custom?: CharacterSet["glyphs"],
): LedCell {
  const spanned = token.color !== undefined;
  const span = spanned ? colorCodeToHex(token.color!) : null;
  const background = token.background ? colorCodeToHex(token.background) : null;
  // A span in an "off" colour (`{black:X}`) draws unlit letters: black
  // means off on an emissive display, and the author asked for it. A
  // block span on a monochrome panel is always inverse video — lit
  // background, unlit glyph — since one colour cannot show two.
  const color = background && monochrome ? "#000000" : (monochrome ?? span ?? (spanned ? "#000000" : textColor));
  const cell: LedCell = { glyph: ledGlyphKey(token, custom), color };
  if (background) cell.background = monochrome ?? background;
  return cell;
}

/**
 * @internal A layout colour option normalised to lowercase `#rrggbb`, or the
 * fallback. Whitespace is trimmed and a missing `#` supplied, so a settings
 * screen's `FFB000` and a picker's `#ffb000` are one colour in the layout's
 * cells and options; anything that is not six hex digits (`#fff`, `rgba(…)`,
 * a name) is the fallback.
 */
export function resolveHexOption(value: string | undefined, fallback: string | undefined): string | undefined {
  if (value === undefined) return fallback;
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  return m ? `#${m[1].toLowerCase()}` : fallback;
}

/**
 * One token on its own: a frame the size of a glyph box (`glyphWidth ×
 * glyphHeight` of `font`) holding exactly what a panel would draw in that
 * cell — the glyph, a tile, an icon, a block span's field. For pickers,
 * specimens and icon previews; the same bytes the panel gets.
 */
export function renderLedGlyph(
  token: BoardToken,
  font: LedFontId,
  options: Pick<LedLayoutOptions, "textColor" | "monochrome" | "charset"> = {},
): LedFrame {
  const face = LED_FONTS[font];
  const monochrome = resolveHexOption(options.monochrome, undefined);
  const textColor = monochrome ?? resolveHexOption(options.textColor, DEFAULT_LED_TEXT_COLOR)!;
  const grid: LedGridLayout = {
    width: face.glyphWidth,
    height: face.glyphHeight,
    font,
    rows: 1,
    cols: 1,
    originX: 0,
    originY: 0,
  };
  const custom = options.charset?.glyphs;
  const layout = layoutLedCells(grid, [ledCellForToken(token, textColor, monochrome, custom)], {
    monochrome,
    ...(custom ? { glyphs: custom } : {}),
  });
  return rasterizeLedLayout(layout);
}

/** @internal Paint ops into a frame in order. Off-matrix pixels are dropped. */
export function rasterizeLedOps(frame: LedFrame, ops: readonly LedDrawOp[]): void {
  const { width, height, pixels } = frame;
  const set = (x: number, y: number, rgb: readonly [number, number, number]) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const i = (y * width + x) * 3;
    pixels[i] = rgb[0];
    pixels[i + 1] = rgb[1];
    pixels[i + 2] = rgb[2];
  };
  for (const op of ops) {
    const rgb = parseHexColor(op.color) ?? [0, 0, 0];
    if (op.kind === "rect") {
      for (let dy = 0; dy < op.h; dy++) for (let dx = 0; dx < op.w; dx++) set(op.x + dx, op.y + dy, rgb);
      continue;
    }
    for (let dy = 0; dy < op.rows.length; dy++) {
      const line = op.rows[dy];
      for (let dx = 0; dx < line.length; dx++) {
        if (line.charCodeAt(dx) === 35 /* # */) set(op.x + dx, op.y + dy, rgb);
      }
    }
  }
}

/** Rasterize a layout into a frame. Ops paint in order; off-matrix pixels are dropped. */
export function rasterizeLedLayout(layout: LedLayout): LedFrame {
  const { width, height } = layout;
  const frame = { width, height, pixels: new Uint8ClampedArray(width * height * 3) };
  rasterizeLedOps(frame, layout.ops);
  return frame;
}

/** {@link layoutLedMessage} then {@link rasterizeLedLayout}: message → device bytes. */
export function renderLedFrame(message: string, spec: LedMatrixSpec, options: LedLayoutOptions = {}): LedFrame {
  return rasterizeLedLayout(layoutLedMessage(message, spec, options));
}

/**
 * A frame as text — `#` lit, `.` off, one line per pixel row. For snapshot
 * tests and debugging: readable in a diff, and needs no canvas.
 */
export function frameToAscii(frame: LedFrame): string {
  const out: string[] = [];
  for (let y = 0; y < frame.height; y++) {
    let line = "";
    for (let x = 0; x < frame.width; x++) {
      const i = (y * frame.width + x) * 3;
      line += frame.pixels[i] || frame.pixels[i + 1] || frame.pixels[i + 2] ? "#" : ".";
    }
    out.push(line);
  }
  return out.join("\n");
}

/**
 * A frame thresholded to one bit per pixel, row-major, `1` where any channel
 * is lit — the rule single-colour drivers (luma.led_matrix, MD_MAX72xx) apply
 * to a colour frame. A 1-bit adapter (MAX7219, P10) packs this; the preview
 * of a `monochrome` layout shows exactly these pixels in the panel's colour.
 */
export function frameToBits(frame: LedFrame): Uint8Array {
  const bits = new Uint8Array(frame.width * frame.height);
  for (let p = 0, i = 0; p < bits.length; p++, i += 3) {
    bits[p] = frame.pixels[i] || frame.pixels[i + 1] || frame.pixels[i + 2] ? 1 : 0;
  }
  return bits;
}

/**
 * Which pixels of a layout are lit *as background* — the block-span slabs
 * behind inverse text — one byte per pixel, `1` for background. `null` when
 * the layout has none. The preview uses it to keep the bloom off a block's
 * field, so an unlit glyph pixel inside it stays a crisp dark dot instead of
 * being greyed by its neighbours' glow. Tiles are not backgrounds: they are
 * lit as themselves and glow like any lit LED.
 */
export function ledBackgroundMask(layout: LedLayout): Uint8Array | null {
  const { grid, cells, width, height } = layout;
  if (!cells.some((c) => c.background)) return null;
  const font = LED_FONTS[grid.font];
  const cellW = font.glyphWidth + font.spacingX;
  const cellH = font.glyphHeight + font.spacingY;
  const mask = new Uint8Array(width * height);
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const cell = cells[row * grid.cols + col];
      if (!cell.background) continue;
      const right = col + 1 < grid.cols ? cells[row * grid.cols + col + 1] : undefined;
      const below = row + 1 < grid.rows ? cells[(row + 1) * grid.cols + col] : undefined;
      const w = font.glyphWidth + (right?.background === cell.background ? font.spacingX : 0);
      const h = font.glyphHeight + (below?.background === cell.background ? font.spacingY : 0);
      const x0 = grid.originX + col * cellW;
      const y0 = grid.originY + row * cellH;
      for (let y = y0; y < Math.min(height, y0 + h); y++) {
        for (let x = x0; x < Math.min(width, x0 + w); x++) mask[y * width + x] = 1;
      }
    }
  }
  return mask;
}
