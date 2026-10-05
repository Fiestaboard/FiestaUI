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
 * Three optional fields carry markup a split-flap board cannot draw and
 * therefore ignores — every flap renderer reads only `value` / `code`. They
 * are only ever set under {@link ParseLineOptions.extendedMarkup}:
 *
 * - `color`: the cell sits inside a **colour span**, `{red:HOT}`, and an RGB
 *   LED matrix draws it in that colour. Held as the span's colour code
 *   (`"red"`, `"63"`) or a `#rrggbb` hex, exactly as written.
 * - `background`: the span is a **block span**, `{black/white:OPEN}` — the
 *   cell's background lights in this colour and the glyph draws in `color`
 *   over it (black glyph pixels stay unlit, so black-on-white is inverse
 *   video). Same encoding as `color`.
 * - `icon`: the cell is a named **icon**, `{icon:sun}`. The token itself is
 *   already the icon's split-flap fallback (a colour tile, a character or a
 *   blank — see ./board-icons), so a flap board needs no special case; an LED
 *   matrix draws the icon's glyph instead. A tile fallback keeps the span's
 *   `color` / `background` too (FiestaBoard B1 finding 5), so whoever projects
 *   the token per output still knows what the author asked for.
 */
export type BoardToken =
  | { type: "char"; value: string; color?: string; background?: string; icon?: BoardIconName }
  | { type: "color"; code: string; color?: string; background?: string; icon?: BoardIconName };

/** Options for {@link parseLine}, {@link messageToGrid} and {@link messageToText}. */
export interface ParseLineOptions {
  /**
   * Keep letter case. The split-flap character set is uppercase only, so the
   * default uppercases everything; an LED matrix with lowercase glyphs can ask
   * for the text as written.
   */
  preserveCase?: boolean;
  /**
   * Parse the extended markup — colour spans `{red:HOT}`, block spans
   * `{black/white:OPEN}` and icons `{icon:sun}`. Off by default: this parser
   * is a parity contract with FiestaBoard's Python renderer, which does not
   * know the extended grammar yet, and a split-flap preview must show what the
   * hardware will draw today (`{RED:HOT}` as literal characters, braces as
   * blanks). The LED renderer turns it on. Split-flap boards get it in one
   * coordinated release, once the Python side has parity.
   *
   * It changes nothing else: case, code points, end tags and a typed heart
   * all parse the same with or without it.
   */
  extendedMarkup?: boolean;
}

/** Shared blank cell reused for grid padding. Tokens are read-only in the
 * render path (compared via {@link tokensEqual}, never mutated), so one frozen
 * instance can back every pad cell instead of allocating a fresh object each. */
const BLANK_TOKEN: BoardToken = Object.freeze({ type: "char", value: " " });

/**
 * Structural equality for tokens (used by the memoized tile comparators).
 * Deliberately ignores `color`, `background` and `icon`: a flap tile draws
 * only `value` / `code`, so a change in any of them is not a change to the
 * tile, and a comparator that noticed them would re-flip a flap that did not
 * move. {@link richTokensEqual} is the colour-aware equality for LED dedupe.
 */
export function tokensEqual(a: BoardToken, b: BoardToken): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "char" && b.type === "char") return a.value === b.value;
  if (a.type === "color" && b.type === "color") return a.code === b.code;
  return false;
}

/**
 * Colour-aware token equality: true only when the type, the value / code,
 * `color`, `background` and `icon` all match. An absent field equals an
 * absent field, and an absent field never equals a default colour — a token
 * that says `white` is not the token that says nothing, even where the
 * renderer would draw both the same, because an LED dedupe keyed on this
 * must not conflate "unstyled" with "styled to the default".
 */
export function richTokensEqual(a: BoardToken, b: BoardToken): boolean {
  return tokensEqual(a, b) && a.color === b.color && a.background === b.background && a.icon === b.icon;
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
// A typed heart is code 62, the same flap as a typed degree sign:
// FiestaBoard's board_chars maps `°`, `♥` and `❤` all to 62.
CHAR_INDEX.set("♥", 62);

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

/**
 * Parse a line into tokens (characters and color codes).
 *
 * Color markers use single brackets — `{63}`, `{red}` — because by the time
 * a message reaches the preview, template rendering has normalized colors to
 * single brackets. End tags (`{/red}`, `{/}`) render nothing.
 */
/** Colour names an end tag may close — the named colours, not the codes. */
const END_TAG_NAMES = new Set([
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "violet",
  "purple",
  "white",
  "black",
  "filled",
]);

/** `{/}` or `{/<colour name>}` (any case). `{/63}`, `{/foo}` are not end tags. */
function isEndTag(content: string): boolean {
  if (!content.startsWith("/")) return false;
  const name = content.slice(1).toLowerCase();
  return name === "" || END_TAG_NAMES.has(name);
}

/**
 * Characters keep their Unicode identity in a token: a typed heart stays a
 * heart, so a renderer that can draw one (an LED) draws one. Only the
 * split-flap projection collapses it, `♥` and `°` both being code 62
 * ({@link getCharIndex}), drawn as whichever glyph the board's flap carries
 * ({@link applyCode62Glyph}). `❤` (U+2764) is normalised to `♥` (U+2665) so a
 * heart is one character everywhere downstream.
 */
function typedCharToBoard(ch: string): string {
  return ch === "❤" ? "♥" : ch;
}

/** `{red}` / `{63}` → the colour code a tile token carries, or `null`. */
function lookupColorCode(content: string): string | null {
  // Exact match first (numeric codes like "66"), then lowercase (named colours).
  if (ALL_COLOR_CODES[content]) return content;
  const lower = content.toLowerCase();
  return ALL_COLOR_CODES[lower] ? lower : null;
}

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Tile names that are not colours: `filled` (71) is a flap, not a hue. */
const TILE_ONLY_CODES = new Set(["filled", "71"]);

/**
 * The colour a span marker `{…:` opens with: a board colour (as its code) or
 * an arbitrary `#rrggbb`, which only an RGB LED can honour. `null` when the
 * head is not a colour, so `{icon:sun}` and `{foo:bar}` are not spans. The
 * filled tile is a tile only — `{filled:x}` is literal text — because it
 * names a flap, not a colour a glyph could be drawn in.
 */
function spanColor(head: string): string | null {
  const code = lookupColorCode(head);
  if (code) return TILE_ONLY_CODES.has(code) ? null : code;
  return HEX_COLOR.test(head) ? head.toLowerCase() : null;
}

/**
 * How deep spans may nest. A span opened at the top level is depth 1 and a
 * span inside it is depth 2; an opener that would open depth 9 is not a
 * marker but literal text (see {@link parseLine}). Eight is far beyond any
 * message a person writes, and it bounds the parser's recursion so a
 * hostile run of openers cannot overflow the stack. FiestaBoard's Python
 * parser mirrors this cap; change it there too.
 */
export const MAX_SPAN_DEPTH = 8;

/**
 * The longest content a tile or end tag can have (`/orange`), the longest
 * span head (`#rrggbb/#rrggbb`) and the longest icon name. Anything longer is
 * never a marker, so the parser need not copy it out to find that out — which
 * is what keeps a line of 100k openers linear rather than quadratic.
 */
const SHORT_MARKER_MAX = 8;
const SPAN_HEAD_MAX = 16;
const ICON_NAME_MAX = 16;

/**
 * Where every brace in `line` leads, found in one pass each: `close[i]` is the
 * first `}` at or after `i` (-1 when there is none), and `match[i]`, for a `{`
 * at `i`, is the `}` that balances it counting every brace in between (-1
 * when unbalanced). Precomputed once per {@link parseLine} call so no opener
 * ever scans forward on its own.
 */
function braceMap(line: string): { close: Int32Array; match: Int32Array } {
  const n = line.length;
  const close = new Int32Array(n);
  const match = new Int32Array(n).fill(-1);
  let next = -1;
  for (let i = n - 1; i >= 0; i--) {
    if (line[i] === "}") next = i;
    close[i] = next;
  }
  const open: number[] = [];
  for (let i = 0; i < n; i++) {
    if (line[i] === "{") open.push(i);
    else if (line[i] === "}" && open.length > 0) match[open.pop() as number] = i;
  }
  return { close, match };
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

/** Stamp the enclosing span's colours onto a freshly made token. */
function withSpan<T extends BoardToken>(token: T, span: SpanColors | undefined): T {
  if (span) {
    token.color = span.color;
    if (span.background !== undefined) token.background = span.background;
  }
  return token;
}

/**
 * The token `{icon:name}` parses to: the icon's split-flap fallback (a tile,
 * a character or a blank) tagged with `icon`, carrying the enclosing span's
 * colours when given. The editor builds the same token for an icon node (its
 * warnings and its node view), so it lives here rather than being copied.
 */
export function boardIconToken(name: BoardIconName, span?: Pick<BoardToken, "color" | "background">): BoardToken {
  const token = iconToken(name, undefined);
  if (span?.color !== undefined) token.color = span.color;
  if (span?.background !== undefined) token.background = span.background;
  return token;
}

/**
 * The token an icon degrades to on a board that has no glyph for it. The
 * span's colours ride along whether the fallback is a character or a tile
 * (FiestaBoard B1 finding 5): a flap ignores them either way, and a renderer
 * that projects the token per output must not lose what the author asked for.
 */
function iconToken(name: BoardIconName, span: SpanColors | undefined): BoardToken {
  const { fallback } = BOARD_ICONS[name];
  const token: BoardToken =
    fallback !== null && ALL_COLOR_CODES[fallback]
      ? { type: "color", code: fallback, icon: name }
      : { type: "char", value: fallback ?? " ", icon: name };
  return withSpan(token, span);
}

/**
 * Parse a line into tokens (characters and color codes).
 *
 * Color markers use single brackets — `{63}`, `{red}` — because by the time
 * a message reaches the preview, template rendering has normalized colors to
 * single brackets. End tags (`{/red}`, `{/}`) render nothing.
 *
 * Three further markers exist, behind `options.extendedMarkup`, for boards
 * that can draw more than a flap can. All are one cell wide per character, so
 * a line's width never depends on who renders it, and all are *additive*:
 * every message that parsed before parses to the same tokens now, and without
 * the flag every message parses exactly as before — the new markers are
 * literal text, which is what the Python renderer draws today.
 *
 * - **Colour span** `{red:HOT}`, `{63:HOT}`, `{#ff8800:HOT}`: the characters
 *   inside carry `color`. A renderer that cannot colour letters draws them
 *   plain — the letters survive, only the colour is lost. This is distinct
 *   from `{red}HOT`, which is a red *tile* followed by HOT. Braces nest, so a
 *   tile or another span inside a span (`{red:HOT {63}}`) is fine, and the
 *   span ends at the brace that balances its own. Spans nest at most
 *   {@link MAX_SPAN_DEPTH} (8) deep: an opener that would open a ninth level
 *   is literal text, while tiles and icons inside it still parse. A colour is
 *   a board colour
 *   name, a tile code `63`–`70` or `#rrggbb`; `filled` / `71` is a tile, not
 *   a colour, so `{filled:x}` is literal. Anything else before the colon
 *   (`{foo:bar}`) is literal text, like any other unknown marker.
 * - **Block span** `{black/white:OPEN}`, `{white/red:LATE}`: `fg/bg` before
 *   the colon. The characters carry `color` *and* `background`: an LED lights
 *   the cell background and draws the glyph over it, so `black/white` is
 *   inverse video. A split-flap board draws the letters plain, as for a
 *   colour span. A block span always names both colours: `{/red:A}` has no
 *   foreground and is literal, like `{red/:A}`.
 * - **Icon** `{icon:sun}`: one cell. It parses straight to its split-flap
 *   fallback (see ./board-icons) tagged with `icon`, so a renderer with no
 *   icon glyphs draws the fallback without knowing icons exist and an LED
 *   renderer draws the glyph. `{icon:heart}` is the ♥ character, not an icon.
 *   An unknown name is literal text.
 */
export function parseLine(line: string, maxTokens: number = Infinity, options: ParseLineOptions = {}): BoardToken[] {
  const tokens: BoardToken[] = [];
  const { preserveCase = false, extendedMarkup = false } = options;
  // A line with no brace at all has no markers; skip the brace map for it.
  const braces = line.indexOf("{") === -1 ? null : braceMap(line);

  // Parse `line[start, end)` inside `span` (undefined at the top level), at
  // span nesting `depth`. Spans recurse into their own body, bounded by
  // MAX_SPAN_DEPTH; everything else is one forward pass.
  const walk = (start: number, end: number, span: SpanColors | undefined, depth: number) => {
    let i = start;
    while (i < end && tokens.length < maxTokens) {
      // Check for single-bracket markers: {63}, {red}, {/red}, {/}, and under
      // extendedMarkup {red:…}, {black/white:…}, {icon:…}. (After template
      // rendering, colors are normalized to single brackets.)
      if (line[i] === "{" && braces) {
        const closingBrace = braces.close[i];
        if (closingBrace !== -1 && closingBrace < end) {
          // A tile or an end tag is short; a longer content is never one, and
          // is not copied out to find that out.
          if (closingBrace - i - 1 <= SHORT_MARKER_MAX) {
            const content = line.substring(i + 1, closingBrace);

            // End tags render nothing — but only `{/}` and `{/<colour name>}`
            // are end tags. Anything else after a slash (`{/foo}`, `{/63}`) is
            // literal text on the board, so it falls through to be drawn
            // character by character (FiestaBoard's COLOR_MARKER_PATTERN).
            if (isEndTag(content)) {
              i = closingBrace + 1;
              continue;
            }

            const colorCode = lookupColorCode(content);
            if (colorCode) {
              tokens.push({ type: "color", code: colorCode });
              i = closingBrace + 1;
              continue;
            }
          }

          // The head of an extended marker is what sits before the first `:`.
          // A valid head is at most SPAN_HEAD_MAX long, so the colon is only
          // looked for that far: a later one makes the marker literal anyway.
          let colon = -1;
          if (extendedMarkup) {
            const headEnd = Math.min(closingBrace, i + 2 + SPAN_HEAD_MAX);
            for (let k = i + 1; k < headEnd; k++) {
              if (line[k] === ":") {
                colon = k;
                break;
              }
            }
          }
          if (colon > i + 1) {
            const head = line.substring(i + 1, colon);
            if (head.toLowerCase() === "icon") {
              if (closingBrace - colon - 1 <= ICON_NAME_MAX) {
                const raw = line.substring(colon + 1, closingBrace).toLowerCase();
                // `{icon:heart}` is the heart character, not an icon: exactly
                // a typed ♥, which the split-flap projection draws as code 62.
                if (raw === "heart") {
                  tokens.push(withSpan({ type: "char", value: "♥" }, span));
                  i = closingBrace + 1;
                  continue;
                }
                const name = resolveBoardIconName(raw);
                if (name) {
                  tokens.push(iconToken(name, span));
                  i = closingBrace + 1;
                  continue;
                }
              }
            } else if (depth < MAX_SPAN_DEPTH) {
              // Past the depth cap an opener is literal text: it falls through
              // with its head, its colon and, when the walk reaches it, its
              // closing brace. Tiles and icons inside it still parse.
              const opened = spanHead(head);
              // The first `}` may belong to a tile inside the span; the span
              // itself ends at the brace that balances its own `{`.
              const spanEnd = opened ? braces.match[i] : -1;
              if (opened && spanEnd !== -1) {
                walk(colon + 1, spanEnd, opened, depth + 1);
                i = spanEnd + 1;
                continue;
              }
            }
          }
          // Not a marker: fall through and treat `{` as a regular character.
        }
      }

      // One cell per code point, as the board counts them: an emoji is one
      // character to FiestaBoard's renderer, not a UTF-16 surrogate pair.
      const codePoint = line.codePointAt(i) ?? 0;
      const ch = String.fromCodePoint(codePoint);
      // The board only supports uppercase letters, unless the caller can draw more.
      tokens.push(withSpan({ type: "char", value: typedCharToBoard(preserveCase ? ch : ch.toUpperCase()) }, span));
      i += ch.length;
    }
  };

  walk(0, line.length, undefined, 0);
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
  if (token.type !== "char") return token;
  // Spread so a span's colours ride along with the substituted glyph.
  if (glyph === "heart" && token.value === "°") return { ...token, value: "♥" };
  // A typed heart is code 62 too; a degree-flap board draws its flap.
  if (glyph === "degree" && token.value === "♥") return { ...token, value: "°" };
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
 * showing. `options` likewise: a board drawing a span's letters or an icon's
 * fallback must announce those, not the literal braces.
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

/**
 * Fit a grid of already-parsed cells to a board — the cells-in counterpart
 * of {@link messageToGrid}, for a caller that parsed the markup once itself
 * (FiestaBoard core hands every output the same rich `BoardToken[][]`).
 * Rows and cells past the grid are clipped and missing ones padded blank,
 * exactly as a message's lines are; code 62 draws as the glyph
 * {@link resolveCode62Glyph} picks for this board, since which flap a board
 * carries is a property of the board, not of the content. Nothing else is
 * touched: a cell draws as given, colours and icon tag riding along.
 */
export function cellsToGrid(
  cells: readonly (readonly BoardToken[])[],
  rows: number,
  cols: number,
  deviceType: string = "flagship",
  code62Glyph?: Code62Glyph,
): BoardToken[][] {
  const glyph = resolveCode62Glyph(deviceType, code62Glyph);
  const grid: BoardToken[][] = [];
  for (let row = 0; row < rows; row++) {
    const line = cells[row];
    const rowTokens: BoardToken[] = [];
    for (let col = 0; col < cols; col++) {
      const token = line?.[col];
      rowTokens.push(token ? applyCode62Glyph(token, glyph) : BLANK_TOKEN);
    }
    grid.push(rowTokens);
  }
  return grid;
}

/**
 * Whether a grid of parsed cells draws nothing at all — no character, no
 * tile — so a renderer handed one can announce its empty label the way it
 * does for a missing message. A cleared board arrives as a grid of blanks,
 * not as no grid.
 */
export function cellsAreBlank(cells: readonly (readonly BoardToken[])[]): boolean {
  return cells.every((row) => row.every((token) => token.type === "char" && token.value === " "));
}

/**
 * The plain text a board draws for a grid of parsed cells — the cells-in
 * counterpart of {@link messageToText}, so a board handed cells announces
 * exactly what it would announce for the message they were parsed from.
 */
export function cellsToText(
  cells: readonly (readonly BoardToken[])[],
  deviceType: string = "flagship",
  code62Glyph?: Code62Glyph,
): string {
  const glyph = resolveCode62Glyph(deviceType, code62Glyph);
  return cells
    .map((row) =>
      row
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
