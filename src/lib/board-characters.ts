/**
 * The Vestaboard split-flap character set and message parsing.
 *
 * Extracted verbatim from FiestaBoard's board-display.tsx — the values and
 * parsing behavior are a parity contract with the app (and, transitively,
 * with the physical board hardware). Do not "improve" them here.
 *
 * The board addresses characters by numeric code 0–71:
 *   0      blank
 *   1–26   A–Z
 *   27–36  1–9, 0
 *   37–62  punctuation (some codes undefined on hardware)
 *   63–71  color tiles (red, orange, yellow, green, blue, violet, white,
 *          black, filled)
 */

import { ALL_COLOR_CODES } from "./board-colors";
import { BOARD_ICONS, type BoardIconName, resolveBoardIconName } from "./board-icons";

/**
 * All displayable board characters indexed by character code (0-71).
 * Undefined codes (43, 45, 51, 57, 58, 61) use ' ' as placeholder so
 * array indices stay aligned with Vestaboard character codes.
 */
export const BOARD_CHARS = [
  " ", // 0  - Blank
  // A-Z (1-26)
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  // Numbers 1-9 (27-35), 0 (36)
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
  // Special characters (37-62), with placeholders for undefined codes
  "!", // 37
  "@", // 38
  "#", // 39
  "$", // 40
  "(", // 41
  ")", // 42
  " ", // 43 - undefined
  "-", // 44
  " ", // 45 - undefined
  "+", // 46
  "&", // 47
  "=", // 48
  ";", // 49
  ":", // 50
  " ", // 51 - undefined
  "'", // 52
  '"', // 53
  "%", // 54
  ",", // 55
  ".", // 56
  " ", // 57 - undefined
  " ", // 58 - undefined
  "/", // 59
  "?", // 60
  " ", // 61 - undefined
  "°", // 62 - Degree on Flagship, Heart on Note
  // Color tiles (63-71)
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "70",
  "71",
];

/** Extended characters that are not in BOARD_CHARS but can appear from device substitutions.
 * Null-prototype object so inherited keys (`toString`, `constructor`, …) cannot pass the
 * `EXTRA_CHARS[token.value]` truthiness guard in board-display and be treated as printable. */
export const EXTRA_CHARS: Record<string, boolean> = Object.assign(Object.create(null), {
  "♥": true,
});

/**
 * A parsed board cell: either a printable character or a color-tile code.
 *
 * Two optional fields carry markup a split-flap board cannot draw and
 * therefore ignores — every flap renderer reads only `value` / `code`:
 *
 * - `color`: the character sits inside a **colour span**, `{red:HOT}`, and an
 *   RGB LED matrix draws it in that colour. Held as the span's colour code
 *   (`"red"`, `"63"`) or a `#rrggbb` hex, exactly as written.
 * - `background`: the span is a **block span**, `{black/white:OPEN}` — the
 *   cell's background lights in this colour and the glyph draws in `color`
 *   over it (black glyph pixels stay unlit, so black-on-white is inverse
 *   video). Same encoding as `color`.
 * - `icon`: the cell is a named **icon**, `{icon:sun}`. The token itself is
 *   already the icon's split-flap fallback (a colour tile, a character or a
 *   blank — see ./board-icons), so a flap board needs no special case; an LED
 *   matrix draws the icon's glyph instead.
 */
export type BoardToken =
  | { type: "char"; value: string; color?: string; background?: string; icon?: BoardIconName }
  | { type: "color"; code: string; icon?: BoardIconName };

/** Options for {@link parseLine} and {@link messageToGrid}. */
export interface ParseLineOptions {
  /**
   * Keep letter case. The split-flap character set is uppercase only, so the
   * default uppercases everything; an LED matrix with lowercase glyphs can ask
   * for the text as written.
   */
  preserveCase?: boolean;
  /**
   * Parse the extended markup — colour spans `{red:HOT}` and icons
   * `{icon:sun}`. Off by default: this parser is a parity contract with
   * FiestaBoard's Python renderer, which does not know the extended grammar
   * yet, and a split-flap preview must show what the hardware will draw today
   * (`{RED:HOT}` as literal characters, braces as blanks). The LED renderer
   * turns it on. Split-flap boards get it in one commit, with a fixture, once
   * the Python side has parity.
   */
  extendedMarkup?: boolean;
}

/** Shared blank cell reused for grid padding. Tokens are read-only in the
 * render path (compared via {@link tokensEqual}, never mutated), so one frozen
 * instance can back every pad cell instead of allocating a fresh object each. */
const BLANK_TOKEN: BoardToken = Object.freeze({ type: "char", value: " " });

/**
 * Structural equality for tokens (used by the memoized tile comparators).
 * Deliberately ignores `color` and `icon`: a flap tile draws only `value` /
 * `code`, so a change in either is not a change to the tile. An LED renderer
 * compares cells by drum index and colour itself (see led-transitions).
 */
export function tokensEqual(a: BoardToken, b: BoardToken): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "char" && b.type === "char") return a.value === b.value;
  if (a.type === "color" && b.type === "color") return a.code === b.code;
  return false;
}

/** Color-tile codes (63–71) as strings, held in a Set so the per-tile
 * `isColorTile` check is O(1) instead of a linear `includes` scan on every
 * call in the board render path. */
const COLOR_TILE_CODE_SET = new Set(["63", "64", "65", "66", "67", "68", "69", "70", "71"]);

/** Check if a character is a color tile (codes 63–71 rendered as strings). */
export const isColorTile = (char: string) => {
  return COLOR_TILE_CODE_SET.has(char);
};

/** Character → BOARD_CHARS index, so `getCharIndex` is O(1) instead of a linear
 * `indexOf` scan run per tile (including inside the flap-animation path). Built
 * first-occurrence-wins to match `indexOf`: the duplicate ' ' placeholders
 * (codes 43, 45, 51, 57, 58, 61) must not override blank at index 0. */
const CHAR_INDEX = new Map<string, number>();
for (let i = 0; i < BOARD_CHARS.length; i++) {
  const char = BOARD_CHARS[i];
  if (!CHAR_INDEX.has(char)) CHAR_INDEX.set(char, i);
}

/** Find a character's index in BOARD_CHARS; unknown characters map to blank (0). */
export function getCharIndex(char: string): number {
  const index = CHAR_INDEX.get(char);
  return index !== undefined ? index : 0; // Default to space if not found
}

/** Get the display character from a token (color tiles are represented by their code). */
export function getCharFromToken(token: BoardToken): string {
  if (token.type === "color") {
    return token.code; // Color tiles are represented by their code
  }
  return token.value;
}

/** `{red}` / `{63}` → the colour code a tile token carries, or `null`. */
function lookupColorCode(content: string): string | null {
  // Exact match first (numeric codes like "66"), then lowercase (named colours).
  if (ALL_COLOR_CODES[content]) return content;
  const lower = content.toLowerCase();
  return ALL_COLOR_CODES[lower] ? lower : null;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/**
 * The colour a span marker `{…:` opens with: a board colour (as its code) or
 * an arbitrary `#rrggbb`, which only an RGB LED can honour. `null` when the
 * head is not a colour, so `{icon:sun}` and `{foo:bar}` are not spans.
 */
function spanColor(head: string): string | null {
  return lookupColorCode(head) ?? (HEX_COLOR.test(head) ? head.toLowerCase() : null);
}

/** Index of the `}` matching the `{` at `open`, counting nested braces; -1 if unbalanced. */
function matchingBrace(line: string, open: number): number {
  let depth = 0;
  for (let i = open; i < line.length; i++) {
    if (line[i] === "{") depth++;
    else if (line[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

/** The colours a span opens with: `red` → fg only, `black/white` → fg on bg. */
interface SpanColors {
  color: string;
  background?: string;
}

/** `{red:` or `{black/white:` → the span's colours, or `null` when the head is not one. */
function spanHead(head: string): SpanColors | null {
  const slash = head.indexOf("/");
  if (slash === -1) {
    const color = spanColor(head);
    return color ? { color } : null;
  }
  const color = spanColor(head.substring(0, slash));
  const background = spanColor(head.substring(slash + 1));
  return color && background ? { color, background } : null;
}

/** The token an icon degrades to on a board that has no glyph for it. */
function iconToken(name: BoardIconName, span: SpanColors | undefined): BoardToken {
  const { fallback } = BOARD_ICONS[name];
  if (fallback !== null && ALL_COLOR_CODES[fallback]) return { type: "color", code: fallback, icon: name };
  const token: BoardToken = { type: "char", value: fallback ?? " ", icon: name };
  if (span) {
    token.color = span.color;
    if (span.background !== undefined) token.background = span.background;
  }
  return token;
}

/**
 * Parse a line into tokens (characters and color codes).
 *
 * Color markers use single brackets — `{63}`, `{red}` — because by the time
 * a message reaches the preview, template rendering has normalized colors to
 * single brackets. End tags (`{/red}`, `{/}`) render nothing.
 *
 * Two further markers exist, behind `options.extendedMarkup`, for boards that
 * can draw more than a flap can. Both are one cell wide, so a line's width
 * never depends on who renders it, and both are *additive*: every message
 * that parsed before parses to the same tokens now, and without the flag
 * every message parses exactly as before — the new markers are literal text,
 * which is what the Python renderer draws today.
 *
 * - **Colour span** `{red:HOT}`, `{63:HOT}`, `{#ff8800:HOT}`: the characters
 *   inside carry `color`. A renderer that cannot colour letters draws them
 *   plain — the letters survive, only the colour is lost. This is distinct
 *   from `{red}HOT`, which is a red *tile* followed by HOT. Braces nest, so a
 *   tile inside a span (`{red:HOT {63}}`) is fine. Anything not a colour
 *   before the colon (`{foo:bar}`) is literal text, like any other unknown
 *   marker.
 * - **Block span** `{black/white:OPEN}`, `{white/red:LATE}`: `fg/bg` before
 *   the colon. The characters carry `color` *and* `background`: an LED lights
 *   the cell background and draws the glyph over it, so `black/white` is
 *   inverse video. A split-flap board draws the letters plain, as for a
 *   colour span. `{/red}` is still an end tag, because the head would be
 *   empty; a block span always names both colours.
 * - **Icon** `{icon:sun}`: one cell. It parses straight to its split-flap
 *   fallback (see ./board-icons) tagged with `icon`, so a renderer with no
 *   icon glyphs draws the fallback without knowing icons exist and an LED
 *   renderer draws the glyph. An unknown name is literal text.
 */
export function parseLine(line: string, maxTokens: number = Infinity, options: ParseLineOptions = {}): BoardToken[] {
  const tokens: BoardToken[] = [];
  const { preserveCase = false, extendedMarkup = false } = options;

  const walk = (text: string, span: SpanColors | undefined) => {
    let i = 0;
    while (i < text.length && tokens.length < maxTokens) {
      // Check for single-bracket markers: {63}, {red}, {/red}, {/}, {red:…}, {icon:…}
      if (text[i] === "{") {
        const closingBrace = text.indexOf("}", i);
        if (closingBrace !== -1) {
          const content = text.substring(i + 1, closingBrace);

          // End tags {/...} or {/} render nothing.
          if (content.startsWith("/")) {
            i = closingBrace + 1;
            continue;
          }

          const colorCode = lookupColorCode(content);
          if (colorCode) {
            tokens.push({ type: "color", code: colorCode });
            i = closingBrace + 1;
            continue;
          }

          const colon = extendedMarkup ? content.indexOf(":") : -1;
          if (colon > 0) {
            const head = content.substring(0, colon);
            if (head.toLowerCase() === "icon") {
              const raw = content.substring(colon + 1).toLowerCase();
              // `{icon:heart}` is the heart character, not an icon: ♥ is a
              // flap on Note hardware and code 62 everywhere.
              if (raw === "heart") {
                const heart: BoardToken = { type: "char", value: "♥" };
                if (span) {
                  heart.color = span.color;
                  if (span.background !== undefined) heart.background = span.background;
                }
                tokens.push(heart);
                i = closingBrace + 1;
                continue;
              }
              const name = resolveBoardIconName(raw);
              if (name) {
                tokens.push(iconToken(name, span));
                i = closingBrace + 1;
                continue;
              }
            } else {
              const opened = spanHead(head);
              // The first `}` may belong to a tile inside the span; the span
              // itself ends at the brace that balances its own `{`.
              const end = opened ? matchingBrace(text, i) : -1;
              if (opened && end !== -1) {
                walk(text.substring(i + 1 + head.length + 1, end), opened);
                i = end + 1;
                continue;
              }
            }
          }
          // Not a marker: fall through and treat `{` as a regular character.
        }
      }

      // The board only supports uppercase letters, unless the caller can draw more.
      const token: BoardToken = { type: "char", value: preserveCase ? text[i] : text[i].toUpperCase() };
      if (span) {
        token.color = span.color;
        if (span.background !== undefined) token.background = span.background;
      }
      tokens.push(token);
      i++;
    }
  };

  walk(line, undefined);
  return tokens;
}

/**
 * Which glyph a board's code-62 flap physically carries.
 *
 * Code 62 is one character code with two possible flaps. Vestaboard shipped
 * every Flagship with a degree flap until 2026, when they replaced it with a
 * heart on newly-manufactured units ("Every new Vestaboard purchased will ship
 * with the heart in place of the degree symbol"). Note has always carried the
 * heart. So `deviceType` alone no longer says what a board draws, and nothing
 * queryable distinguishes a degree-era Flagship from a heart-era one — only the
 * owner knows. See FiestaBoard#1657.
 *
 * This is display-only. Both glyphs encode to code 62 on the wire; nothing here
 * changes what is sent to a board.
 */
export type Code62Glyph = "degree" | "heart";

/**
 * Decide which glyph a board draws for code 62.
 *
 * Note and note-array hardware only ever shipped the heart flap, so their glyph
 * is a property of the device and `code62Glyph` is ignored for them. A panel (a
 * virtual board of any rows × cols) imitates Note hardware, so it draws the
 * heart too — FiestaBoard's Python renderer makes the same call. Flagship is
 * the ambiguous one, and the caller has to say: unset means `"degree"`, the
 * glyph every Flagship carried before the hardware change, so a caller that has
 * not been taught about the new flap keeps rendering exactly as it did.
 */
export function resolveCode62Glyph(deviceType: string, code62Glyph?: Code62Glyph): Code62Glyph {
  if (deviceType === "note" || deviceType === "note_array" || deviceType === "panel") return "heart";
  return code62Glyph ?? "degree";
}

/**
 * Draw code 62 as the glyph this board's flap actually carries.
 *
 * Shared by {@link messageToGrid} and {@link messageToText} rather than written
 * out twice: the tiles and the accessible name have to agree about what the
 * board draws, or a board shows ♥ while announcing "degree" (WCAG 1.1.1).
 *
 * Exported for `BoardTeaser`, which tokenizes with {@link parseLine} directly
 * rather than through {@link messageToGrid} — a one-row strip pads to a tile
 * count instead of filling a grid — and would otherwise need its own copy of
 * this substitution (FiestaBoard#1666).
 */
export function applyCode62Glyph(token: BoardToken, glyph: Code62Glyph): BoardToken {
  if (glyph === "heart" && token.type === "char" && token.value === "°") return { ...token, value: "♥" };
  return token;
}

/**
 * Convert a message string to a rows×cols grid of tokens.
 * Lines are split on `\n`, truncated/padded to the grid, and code 62 draws as
 * the glyph {@link resolveCode62Glyph} picks for this board.
 */
export function messageToGrid(
  message: string,
  rows: number,
  cols: number,
  deviceType: string = "flagship",
  code62Glyph?: Code62Glyph,
  options?: ParseLineOptions,
): BoardToken[][] {
  const lines = message.split("\n");
  const grid: BoardToken[][] = [];
  const glyph = resolveCode62Glyph(deviceType, code62Glyph);

  for (let row = 0; row < rows; row++) {
    const line = lines[row] || "";
    // Only the first `cols` tokens survive the fill below, so stop parsing there
    // instead of tokenizing the whole line and discarding the overflow.
    const tokens = parseLine(line, cols, options);
    const rowTokens: BoardToken[] = [];

    // Fill to cols width
    for (let col = 0; col < cols; col++) {
      if (col < tokens.length) {
        rowTokens.push(applyCode62Glyph(tokens[col], glyph));
      } else {
        rowTokens.push(BLANK_TOKEN);
      }
    }
    grid.push(rowTokens);
  }

  return grid;
}

/**
 * The plain text a board draws, for accessible names (issue #205).
 *
 * Every board renderer hides its tiles from assistive tech — they are a grid of
 * decorative divs — so the `role="img"` name is the only thing a screen reader
 * gets, and it has to carry the message. This is the one derivation all three
 * renderers share, so a board, a preview and a teaser cannot describe the same
 * string differently.
 *
 * It reads the message the way the tiles do rather than by regex: `parseLine`
 * already decides what is a color marker, what is an end tag, and what is a
 * literal brace, so the name says exactly what is on the board — including the
 * uppercasing, which is the board's only case. Color tiles become a space
 * (they occupy a cell but say nothing), lines join with a space, and runs of
 * whitespace collapse so a half-empty board does not announce a long silence.
 *
 * `deviceType` and `code62Glyph` are taken for the same reason
 * {@link messageToGrid} takes them: they decide whether `°` draws as a heart,
 * and a name that said "degree" would describe something the board is not
 * showing.
 *
 * Returns `""` for a message that draws no text at all — a color-only board —
 * so callers can fall back to a generic name instead of a dangling prefix.
 */
export function messageToText(
  message: string,
  deviceType: string = "flagship",
  code62Glyph?: Code62Glyph,
  options?: ParseLineOptions,
): string {
  const glyph = resolveCode62Glyph(deviceType, code62Glyph);
  return message
    .split("\n")
    .map((line) =>
      parseLine(line, Infinity, options)
        .map((token) => {
          const drawn = applyCode62Glyph(token, glyph);
          return drawn.type === "char" ? drawn.value : " ";
        })
        .join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
