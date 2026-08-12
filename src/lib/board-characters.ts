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

/** A parsed board cell: either a printable character or a color-tile code. */
export type BoardToken = { type: "char"; value: string } | { type: "color"; code: string };

/** Shared blank cell reused for grid padding. Tokens are read-only in the
 * render path (compared via {@link tokensEqual}, never mutated), so one frozen
 * instance can back every pad cell instead of allocating a fresh object each. */
const BLANK_TOKEN: BoardToken = Object.freeze({ type: "char", value: " " });

/** Structural equality for tokens (used by the memoized tile comparators). */
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

/**
 * Parse a line into tokens (characters and color codes).
 *
 * Color markers use single brackets — `{63}`, `{red}` — because by the time
 * a message reaches the preview, template rendering has normalized colors to
 * single brackets. End tags (`{/red}`, `{/}`) render nothing.
 */
export function parseLine(line: string, maxTokens: number = Infinity): BoardToken[] {
  const tokens: BoardToken[] = [];
  let i = 0;

  while (i < line.length && tokens.length < maxTokens) {
    // Check for single-bracket color markers: {63}, {red}, {/red}, {/}
    // (After template rendering, colors are normalized to single brackets)
    if (line[i] === "{") {
      const closingBrace = line.indexOf("}", i);
      if (closingBrace !== -1) {
        const content = line.substring(i + 1, closingBrace);

        // Check if it's an end tag {/...} or {/}
        if (content.startsWith("/")) {
          // Skip end tags - they don't render anything
          i = closingBrace + 1;
          continue;
        }

        // Check if it's a valid color code (numeric or named) - case insensitive
        const contentLower = content.toLowerCase();
        // Try exact match first (for numeric codes like "66"), then lowercase (for named colors)
        let colorCode: string | null = null;
        if (ALL_COLOR_CODES[content]) {
          colorCode = content;
        } else if (ALL_COLOR_CODES[contentLower]) {
          colorCode = contentLower;
        }

        if (colorCode) {
          tokens.push({ type: "color", code: colorCode });
          i = closingBrace + 1;
          continue;
        }
        // If not a valid color, fall through to treat { as regular character
      }
    }

    // Convert to uppercase since board only supports uppercase letters
    tokens.push({ type: "char", value: line[i].toUpperCase() });
    i++;
  }

  return tokens;
}

/**
 * Convert a message string to a rows×cols grid of tokens.
 * Lines are split on `\n`, truncated/padded to the grid, and on the Note
 * device the degree symbol (code 62) displays as a heart.
 */
export function messageToGrid(
  message: string,
  rows: number,
  cols: number,
  deviceType: string = "flagship",
): BoardToken[][] {
  const lines = message.split("\n");
  const grid: BoardToken[][] = [];
  const isNote = deviceType === "note";

  for (let row = 0; row < rows; row++) {
    const line = lines[row] || "";
    // Only the first `cols` tokens survive the fill below, so stop parsing there
    // instead of tokenizing the whole line and discarding the overflow.
    const tokens = parseLine(line, cols);
    const rowTokens: BoardToken[] = [];

    // Fill to cols width
    for (let col = 0; col < cols; col++) {
      if (col < tokens.length) {
        const token = tokens[col];
        // On Note, degree symbol (code 62) displays as heart
        if (isNote && token.type === "char" && token.value === "°") {
          rowTokens.push({ type: "char", value: "♥" });
        } else {
          rowTokens.push(token);
        }
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
 * Returns `""` for a message that draws no text at all — a color-only board —
 * so callers can fall back to a generic name instead of a dangling prefix.
 */
export function messageToText(message: string): string {
  return message
    .split("\n")
    .map((line) =>
      parseLine(line)
        .map((token) => (token.type === "char" ? token.value : " "))
        .join(""),
    )
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
