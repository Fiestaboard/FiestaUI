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
 * Parsing (uppercasing, colour tiles, end tags, code 62, colour spans, icons)
 * is not repeated here: it is `messageToGrid` from ./board-characters, the
 * function every split-flap renderer uses, so one message reads the same on
 * either kind of board.
 *
 * Between the tokens and the pixels sits the glyph table: every glyph an LED
 * cell can show has an index in {@link LED_GLYPHS} (membership only; the
 * order means nothing). A layout remembers each cell's glyph, which is what
 * lets ./led-transitions turn one layout into another — FiestaBoard's own
 * flip scrambles each changing cell through its device's character set
 * and lands it on its target.
 */

import { type BoardToken, type Code62Glyph, messageToGrid } from "./board-characters";
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
 * Common consumer and hobbyist matrices. The font is the one that gives the
 * device a usable grid — a 5×7 face on an 8-pixel-tall clock fits five
 * characters, so the clocks default to 3×5 the way their own firmware does.
 *
 * LaMetric (37×8) is deliberately absent: its API takes icon + text frames,
 * never a framebuffer, so a preset would promise a preview of bytes the
 * device can never be sent.
 */
export interface LedMatrixPreset extends LedMatrixSpec {
  label: string;
  /** How the LEDs look: diffused faces (TC001, Pixoo) read as square pixels. */
  pixelShape: "round" | "square";
  /** Set on single-colour hardware: every lit LED is this colour. */
  monochrome?: string;
}

export const LED_MATRIX_PRESETS: Readonly<Record<LedMatrixPresetId, LedMatrixPreset>> = {
  awtrix: { label: "AWTRIX / Ulanzi TC001 (32×8)", width: 32, height: 8, font: "3x5", pixelShape: "square" },
  wled_32x32: { label: "WLED 32×32", width: 32, height: 32, font: "3x5", pixelShape: "round" },
  hub75_64x32: { label: "HUB75 64×32", width: 64, height: 32, font: "5x7", pixelShape: "round" },
  hub75_64x64: { label: "HUB75 64×64", width: 64, height: 64, font: "5x7", pixelShape: "round" },
  hub75_128x64: { label: "HUB75 128×64", width: 128, height: 64, font: "5x7", pixelShape: "round" },
  // 3×5 by default: a 10 × 16 character grid clears FiestaBoard's 3 × 15
  // platform floor for page content; the 5×7 face (8 × 10) is an override.
  pixoo64: { label: "Divoom Pixoo 64", width: 64, height: 64, font: "3x5", pixelShape: "square" },
  // Four chained 8×8 modules: the classic red 1-bit ticker.
  max7219: {
    label: "MAX7219 4-in-1 (32×8, red)",
    width: 32,
    height: 8,
    font: "3x5",
    pixelShape: "round",
    monochrome: LED_MONO_COLORS.red,
  },
  // Tidbyt hardware / the Tronbyt server: a diffused 64×32 that takes a WebP.
  tronbyt: { label: "Tidbyt / Tronbyt (64×32)", width: 64, height: 32, font: "5x7", pixelShape: "square" },
  // One P10 HUB12 DMD module: single-colour signage.
  p10_32x16: {
    label: "P10 DMD (32×16, red)",
    width: 32,
    height: 16,
    font: "5x7",
    pixelShape: "round",
    monochrome: LED_MONO_COLORS.red,
  },
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
  /** How code 62 draws (`°` or `♥`); see `Code62Glyph`. Defaults to `"degree"`. */
  code62Glyph?: Code62Glyph;
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
   * face has none. The built-in sets add nothing beyond the face.
   */
  charset?: CharacterSet;
}

/** One thing to draw: a bitmap glyph or a solid rectangle, in matrix pixels. */
export type LedDrawOp =
  | { kind: "glyph"; x: number; y: number; rows: readonly string[]; color: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string };

/**
 * @internal Renderer plumbing — the public surface is `layoutLedMessage`,
 * `rasterizeLedLayout`, `renderLedFrame`, the presets and the frame helpers.
 *
 * Every glyph an LED cell can show, as an **identity table**: a cell stores
 * the index of its glyph, and nothing reads meaning into the order. (Until
 * revision 7 this was a "drum" in Vestaboard's character order and the flip
 * walked it; FiestaBoard's LED flip is its own thing now — see
 * ./led-transitions — so the table is just membership. Blank is 0 so an
 * unknown character resolves to it, as it does on a flap.)
 */
export const LED_GLYPHS: readonly string[] = [
  " ",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  ..."!@#$()-+&=;:'\"%,./?°",
  ..."abcdefghijklmnopqrstuvwxyz",
  // A literal heart (a device substitution, see EXTRA_CHARS) is its own entry:
  // code 62 is the degree-or-heart flap, decided by `code62Glyph`, and a
  // message that says ♥ outright must draw one whatever that setting is.
  "♥",
  ...["63", "64", "65", "66", "67", "68", "69", "70", "71"].map((code) => `tile:${code}`),
  ...BOARD_ICON_NAMES.map((name) => `icon:${name}`),
];
const GLYPH_INDEX = new Map<string, number>();
LED_GLYPHS.forEach((key, i) => GLYPH_INDEX.set(key, i));
// Characters a plugin's set adds (with bitmaps in `CharacterSet.glyphs`) are
// appended here on first sight. The index is a process-local handle; what
// crosses to a device is the frame's bytes, never an index.
const EXTRA_GLYPHS: string[] = [];
function glyphIndexOf(key: string, register: boolean): number {
  const known = GLYPH_INDEX.get(key);
  if (known !== undefined) return known;
  if (!register) return 0;
  const index = LED_GLYPHS.length + EXTRA_GLYPHS.length;
  EXTRA_GLYPHS.push(key);
  GLYPH_INDEX.set(key, index);
  return index;
}

/** Numeric tile code for a colour's hex, so `{red}` and `{63}` share one glyph. */
const TILE_CODE_BY_HEX = new Map<string, string>();
for (const [code, hex] of Object.entries(COLOR_CODE_MAP))
  if (!TILE_CODE_BY_HEX.has(hex)) TILE_CODE_BY_HEX.set(hex, code);

/**
 * @internal Glyph index of a parsed cell. Unknown characters sit at 0
 * (blank), as on a flap — unless `custom` (a set's own bitmaps) has the
 * character, which registers it.
 */
export function ledGlyphIndex(token: BoardToken, custom?: Readonly<Record<string, readonly string[]>>): number {
  if (token.icon) return GLYPH_INDEX.get(`icon:${token.icon}`) ?? 0;
  if (token.type === "color") {
    const code = TILE_CODE_BY_HEX.get(resolveColorCode(token.code, false));
    return code ? (GLYPH_INDEX.get(`tile:${code}`) ?? 0) : 0;
  }
  return glyphIndexOf(token.value, custom !== undefined && Object.hasOwn(custom, token.value));
}

/** @internal What a glyph index is. */
export function ledGlyphEntry(
  glyph: number,
):
  | { kind: "blank" }
  | { kind: "char"; char: string }
  | { kind: "tile"; code: string }
  | { kind: "icon"; name: BoardIconName } {
  const entry = glyph < LED_GLYPHS.length ? LED_GLYPHS[glyph] : EXTRA_GLYPHS[glyph - LED_GLYPHS.length];
  if (entry === undefined || entry === " ") return { kind: "blank" };
  if (entry.startsWith("icon:")) return { kind: "icon", name: entry.slice(5) as BoardIconName };
  if (entry.startsWith("tile:")) return { kind: "tile", code: entry.slice(5) };
  return { kind: "char", char: entry };
}

/** One cell of a layout: what it shows and the colour its text draws in. */
export interface LedCell {
  /** Index into {@link LED_GLYPHS}. */
  glyph: number;
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
   *  glyph into the same cells, which is what a transition does. */
  options: Readonly<
    Required<Pick<LedLayoutOptions, "code62Glyph">> &
      Pick<LedLayoutOptions, "monochrome"> & { glyphs?: CharacterSet["glyphs"] }
  >;
  ops: LedDrawOp[];
  /**
   * The text the matrix shows, for its accessible name: rows joined with a
   * space, colour tiles and undrawable characters as blanks, icons as their
   * label ("sun"), whitespace collapsed. It is the *clipped* grid, not the whole message — on a 32×8
   * clock clipping is the normal case, and naming text nobody can see would
   * tell a screen-reader user more than the board tells a sighted one.
   */
  text: string;
}

/** The glyph rows an entry draws in a font, or `null` for nothing. */
function glyphRows(
  entry: ReturnType<typeof ledGlyphEntry>,
  font: LedFont,
  code62Glyph: Code62Glyph,
  custom?: CharacterSet["glyphs"],
): readonly string[] | null {
  if (entry.kind === "char") {
    const char = entry.char === "°" && code62Glyph === "heart" ? "♥" : entry.char;
    return font.glyphs[char] ?? custom?.[char] ?? null;
  }
  if (entry.kind === "icon") return font.icons[entry.name] ?? null;
  return null;
}

/**
 * @internal Draw one glyph into a cell. Exported for ./led-transitions, which draws
 * the glyphs a cell passes through on its way to its target.
 *
 * Text is set in `color` (the heart is always red, as on the flap). A colour
 * tile fills its cell's glyph box — not the gutter, so a run of tiles still
 * reads as cells. An icon draws in its own colour; a font without the icon's
 * glyph draws the icon's split-flap fallback. On a monochrome panel every one
 * of these is the panel's colour. An entry the font cannot draw draws blank,
 * the way an unknown character becomes code 0 on a flap.
 */
export function drawLedGlyph(
  ops: LedDrawOp[],
  glyph: number,
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
  const rows = glyphRows(entry, font, options.code62Glyph, options.glyphs);
  if (entry.kind === "icon") {
    if (!rows) {
      const { fallback } = BOARD_ICONS[entry.name];
      if (fallback !== null) drawLedGlyph(ops, ledGlyphIndex(fallbackToken(fallback)), x, y, font, color, options);
      return;
    }
    // On a monochrome panel every glyph is `color` — the panel colour, or
    // black inside a block span (inverse video); elsewhere an icon brings its own.
    ops.push({ kind: "glyph", x, y, rows, color: mono ? color : BOARD_ICONS[entry.name].color });
    return;
  }
  if (!rows) return;
  const isHeart = entry.char === "♥" || (entry.char === "°" && options.code62Glyph === "heart");
  ops.push({ kind: "glyph", x, y, rows, color: mono ? color : isHeart ? BOARD_COLORS.red : color });
}

/**
 * What a glyph contributes to the accessible text: the character it draws,
 * an icon's label (an icon is content, where a tile is decoration), or a
 * blank. Padded with spaces so a label never fuses with its neighbours.
 */
/** An icon's registered fallback as a token: a tile code or a character. */
function fallbackToken(fallback: string): BoardToken {
  return /^\d\d$/.test(fallback) ? { type: "color", code: fallback } : { type: "char", value: fallback };
}

function glyphText(glyph: number, font: LedFont, code62Glyph: Code62Glyph, custom?: CharacterSet["glyphs"]): string {
  const entry = ledGlyphEntry(glyph);
  if (entry.kind === "icon") return ` ${BOARD_ICONS[entry.name].label} `;
  if (entry.kind !== "char") return " ";
  const char = entry.char === "°" && code62Glyph === "heart" ? "♥" : entry.char;
  return font.glyphs[char] || custom?.[char] ? char : " ";
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
      line += glyphText(cell.glyph, font, options.code62Glyph, options.glyphs);
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

/**
 * Lay a board message out on the matrix's character grid.
 *
 * Text is set one glyph per cell in `textColor`, or in its colour span's
 * colour (`{red:HOT}`), over its block span's background (`{black/white:OPEN}`),
 * or — on a `monochrome` panel — in the panel's colour.
 * Text past the grid is clipped, the same as on a split-flap board. See
 * {@link drawLedGlyph} for how tiles, icons and the heart draw.
 */
export function layoutLedMessage(message: string, spec: LedMatrixSpec, options: LedLayoutOptions = {}): LedLayout {
  const grid = ledGridLayout(spec);
  // An unparseable colour (a colour picker's `rgba(…)`, a typo) falls back to
  // the default rather than rasterizing to black — invisible text on an LED.
  const monochrome = resolveHexOption(options.monochrome, undefined);
  const textColor = monochrome ?? resolveHexOption(options.textColor, DEFAULT_LED_TEXT_COLOR)!;
  const resolved: LedLayout["options"] = {
    code62Glyph: options.code62Glyph ?? "degree",
    monochrome,
    ...(options.charset?.glyphs ? { glyphs: options.charset.glyphs } : {}),
  };
  if (grid.rows === 0 || grid.cols === 0) return layoutLedCells(grid, [], resolved);

  // The `"flagship"` code-62 rule: follow `code62Glyph`, default degree. Note
  // hardware forces a heart because its flap is a heart; an LED can draw either.
  const tokens = messageToGrid(message, grid.rows, grid.cols, "flagship", options.code62Glyph, {
    extendedMarkup: true,
    preserveCase: options.letterCase === "mixed",
  });
  const cells: LedCell[] = [];
  for (const row of tokens) {
    for (const token of row) cells.push(ledCellForToken(token, textColor, monochrome, options.charset?.glyphs));
  }
  return layoutLedCells(grid, cells, resolved);
}

/**
 * @internal Resolve one parsed token to a cell: its glyph and the
 * colours it draws in. `textColor` and `monochrome` are already validated hex.
 */
export function ledCellForToken(
  token: BoardToken,
  textColor: string,
  monochrome: string | undefined,
  custom?: CharacterSet["glyphs"],
): LedCell {
  const spanned = token.type === "char" && token.color !== undefined;
  const span = spanned ? colorCodeToHex(token.color!) : null;
  const background = token.type === "char" && token.background ? colorCodeToHex(token.background) : null;
  // A span in an "off" colour (`{black:X}`) draws unlit letters: black
  // means off on an emissive display, and the author asked for it. A
  // block span on a monochrome panel is always inverse video — lit
  // background, unlit glyph — since one colour cannot show two.
  const color = background && monochrome ? "#000000" : (monochrome ?? span ?? (spanned ? "#000000" : textColor));
  const cell: LedCell = { glyph: ledGlyphIndex(token, custom), color };
  if (background) cell.background = monochrome ?? background;
  return cell;
}

/** Validated lowercase hex for a layout option, or the fallback. */
function resolveHexOption(value: string | undefined, fallback: string | undefined): string | undefined {
  return value !== undefined && parseHexColor(value) ? value.toLowerCase() : fallback;
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
  options: Pick<LedLayoutOptions, "textColor" | "code62Glyph" | "monochrome" | "charset"> = {},
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
    code62Glyph: options.code62Glyph ?? "degree",
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
