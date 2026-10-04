/**
 * Unit tests for src/lib/board-characters.ts (issue #86 / PR #107).
 *
 * The module is TypeScript, which `node --test` cannot import directly, so it
 * is bundled on the fly with esbuild (a devDependency, same tool the perf
 * bundle script uses) and dynamic-imported from a temp file.
 *
 * These tests pin the parity contract of the O(1)-lookup rewrite:
 *  - getCharIndex matches the old `BOARD_CHARS.indexOf` semantics exactly,
 *    including first-occurrence-wins for the duplicate ' ' placeholder codes.
 *  - isColorTile matches the old array-includes semantics on the 63–71 range.
 *  - parseLine's maxTokens cap equals full-parse-then-slice, and never
 *    half-parses a color marker that spans the cutoff boundary.
 *  - messageToGrid still pads/substitutes correctly, and its pad cells are
 *    the new shared frozen blank token (the perf contract itself).
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const outDir = mkdtempSync(join(tmpdir(), "board-characters-test-"));
const outfile = join(outDir, "board-characters.mjs");

// The parser and the icon registry it reads `{icon:…}` from, bundled together
// so the icon tests can sweep the registry the parser actually resolves.
await build({
  stdin: {
    contents: ['export * from "./src/lib/board-characters";', 'export * from "./src/lib/board-icons";'].join("\n"),
    resolveDir: repoRoot,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile,
});

const {
  BOARD_CHARS,
  BOARD_ICON_ALIASES,
  BOARD_ICON_NAMES,
  BOARD_ICONS,
  getCharIndex,
  isColorTile,
  parseLine,
  messageToGrid,
  messageToText,
  resolveBoardIconName,
  resolveCode62Glyph,
  richTokensEqual,
  tokensEqual,
} = await import(pathToFileURL(outfile).href);

after(() => {
  rmSync(outDir, { recursive: true, force: true });
});

const char = (value) => ({ type: "char", value });
const color = (code) => ({ type: "color", code });

// --- getCharIndex -----------------------------------------------------------

test("getCharIndex: known characters map to their board codes", () => {
  assert.equal(getCharIndex(" "), 0);
  assert.equal(getCharIndex("A"), 1);
  assert.equal(getCharIndex("Z"), 26);
  assert.equal(getCharIndex("1"), 27);
  assert.equal(getCharIndex("9"), 35);
  assert.equal(getCharIndex("0"), 36);
  assert.equal(getCharIndex("!"), 37);
  assert.equal(getCharIndex("°"), 62);
  assert.equal(getCharIndex("63"), 63);
  assert.equal(getCharIndex("71"), 71);
});

test("getCharIndex: unknown characters default to blank (0)", () => {
  assert.equal(getCharIndex("~"), 0);
  assert.equal(getCharIndex("a"), 0); // board is uppercase-only
  // A typed heart is NOT unknown: like `°` it is code 62, the flap the board
  // turns to (FiestaBoard board_chars); see the parity tests below.
  assert.equal(getCharIndex(""), 0);
});

test("getCharIndex: duplicate entries resolve to first occurrence, matching indexOf", () => {
  // ' ' appears at 0 and again as the undefined-code placeholders
  // (43, 45, 51, 57, 58, 61). The Map must be built first-occurrence-wins.
  assert.equal(getCharIndex(" "), BOARD_CHARS.indexOf(" "));
  // Full parity sweep: every entry resolves exactly as the old linear scan did.
  for (let i = 0; i < BOARD_CHARS.length; i++) {
    assert.equal(getCharIndex(BOARD_CHARS[i]), BOARD_CHARS.indexOf(BOARD_CHARS[i]), `code ${i} ("${BOARD_CHARS[i]}")`);
  }
});

// --- isColorTile ------------------------------------------------------------

test("isColorTile: exactly the 63-71 code strings are color tiles", () => {
  for (let code = 63; code <= 71; code++) {
    assert.equal(isColorTile(String(code)), true, `code ${code}`);
  }
  assert.equal(isColorTile("62"), false);
  assert.equal(isColorTile("72"), false);
  assert.equal(isColorTile("A"), false);
  assert.equal(isColorTile("6"), false);
  assert.equal(isColorTile("red"), false);
  assert.equal(isColorTile(""), false);
});

// --- parseLine --------------------------------------------------------------

test("parseLine: uppercases characters and tokenizes color markers", () => {
  assert.deepEqual(parseLine("hi {66}!"), [char("H"), char("I"), char(" "), color("66"), char("!")]);
  // Named colors are case-insensitive; end tags render nothing.
  assert.deepEqual(parseLine("{Red}a{/red}{/}"), [color("red"), char("A")]);
  // Invalid markers fall through as literal characters.
  assert.deepEqual(parseLine("{zz}"), [char("{"), char("Z"), char("Z"), char("}")]);
});

test("parseLine: maxTokens keeps a color marker spanning the cutoff atomic", () => {
  // 21 chars then a marker: the 22nd token IS the marker. It must be parsed
  // whole (one color token), never half-consumed as literal '{' etc.
  const line = "A".repeat(21) + "{red}XYZ";
  const tokens = parseLine(line, 22);
  assert.equal(tokens.length, 22);
  assert.deepEqual(tokens[21], color("red"));
  // And a marker that starts past the cap simply never appears.
  const past = parseLine("B".repeat(22) + "{63}", 22);
  assert.equal(past.length, 22);
  assert.ok(past.every((t) => t.type === "char" && t.value === "B"));
});

test("parseLine: maxTokens equals old full-parse-then-slice semantics", () => {
  const lines = [
    "hello world this is a long line of text!!",
    "A".repeat(21) + "{red}XYZ",
    "{63}{64}{65}{66}{67}{68}{69}{70}{71}" + "Q".repeat(30),
    "text {/end} tags {green} vanish " + "z".repeat(20),
    "{not-a-color} literal braces " + "x".repeat(20),
  ];
  for (const line of lines) {
    for (const cap of [0, 1, 5, 22, 100]) {
      assert.deepEqual(parseLine(line, cap), parseLine(line).slice(0, cap), `line "${line}" cap ${cap}`);
    }
  }
  // Hand-computed expectation, not just self-consistency:
  assert.deepEqual(parseLine("ab{blue}cd{/blue}efgh", 6), [
    char("A"),
    char("B"),
    color("blue"),
    char("C"),
    char("D"),
    char("E"),
  ]);
});

// --- messageToGrid ----------------------------------------------------------

test("messageToGrid: empty message yields an all-blank 6x22 grid", () => {
  const grid = messageToGrid("", 6, 22);
  assert.equal(grid.length, 6);
  for (const row of grid) {
    assert.equal(row.length, 22);
    for (const cell of row) {
      assert.deepEqual(cell, char(" "));
    }
  }
});

test("messageToGrid: pad cells are the shared frozen blank token", () => {
  // The perf contract from PR #107: padding must not allocate a fresh object
  // per cell. All pad cells are one frozen shared instance.
  const grid = messageToGrid("HI", 6, 22);
  const pad = grid[0][2];
  assert.ok(Object.isFrozen(pad), "pad token must be frozen");
  assert.ok(grid[0][3] === pad, "pad tokens within a row must be shared");
  assert.ok(grid[5][21] === pad, "pad tokens across rows must be shared");
  // Real content cells are still ordinary tokens.
  assert.deepEqual(grid[0][0], char("H"));
  assert.deepEqual(grid[0][1], char("I"));
});

test("messageToGrid: fills content, truncates long lines, pads short ones", () => {
  const grid = messageToGrid("HI\n{63}OK\n" + "W".repeat(30), 3, 4);
  assert.deepEqual(grid[0], [char("H"), char("I"), char(" "), char(" ")]);
  assert.deepEqual(grid[1], [color("63"), char("O"), char("K"), char(" ")]);
  assert.deepEqual(grid[2], [char("W"), char("W"), char("W"), char("W")]);
});

test("messageToGrid: code 62 draws a degree on a flagship that was not told otherwise", () => {
  // The pre-2026 Flagship flap, and the default every existing caller gets.
  const flagship = messageToGrid("°F", 1, 3, "flagship");
  assert.deepEqual(flagship[0][0], char("°"));
  assert.deepEqual(flagship[0][1], char("F"));
});

test("messageToGrid: code 62 draws a heart on a flagship whose flap carries one", () => {
  // FiestaBoard#1657: Vestaboard swapped the degree flap for a heart on units
  // built from 2026, and only the owner can tell us which board this is.
  const grid = messageToGrid("°F", 1, 3, "flagship", "heart");
  assert.deepEqual(grid[0][0], char("♥"));
  assert.deepEqual(grid[0][1], char("F"));
});

test("messageToGrid: note hardware draws a heart whatever the caller asks for", () => {
  // Note only ever shipped the heart flap, so the setting is not the device's
  // to take. A caller passing a stale flagship preference must not make a Note
  // draw a degree it does not have.
  for (const deviceType of ["note", "note_array"]) {
    assert.deepEqual(messageToGrid("°F", 1, 3, deviceType)[0][0], char("♥"), deviceType);
    assert.deepEqual(messageToGrid("°F", 1, 3, deviceType, "degree")[0][0], char("♥"), `${deviceType} + "degree"`);
  }
});

// --- resolveCode62Glyph -----------------------------------------------------

test("resolveCode62Glyph: an unset flagship preference means degree", () => {
  assert.equal(resolveCode62Glyph("flagship"), "degree");
  assert.equal(resolveCode62Glyph("flagship", undefined), "degree");
});

test("resolveCode62Glyph: a flagship draws whichever flap its owner reports", () => {
  assert.equal(resolveCode62Glyph("flagship", "heart"), "heart");
  assert.equal(resolveCode62Glyph("flagship", "degree"), "degree");
});

test("resolveCode62Glyph: note hardware is always a heart", () => {
  assert.equal(resolveCode62Glyph("note"), "heart");
  assert.equal(resolveCode62Glyph("note_array"), "heart");
  assert.equal(resolveCode62Glyph("note", "degree"), "heart");
  assert.equal(resolveCode62Glyph("note_array", "degree"), "heart");
});

test("resolveCode62Glyph: a panel imitates Note hardware and always draws a heart", () => {
  assert.equal(resolveCode62Glyph("panel"), "heart");
  assert.equal(resolveCode62Glyph("panel", "degree"), "heart");
});

// --- messageToGrid / messageToText agreement --------------------------------

test("the grid and the accessible text never disagree about code 62", () => {
  // The whole reason one substitution backs both: a board drawing ♥ while its
  // role="img" name says "degree" is a text alternative for a different image
  // (WCAG 1.1.1). Sweep every device/preference pair rather than trusting that
  // two call sites were kept in step by hand.
  for (const deviceType of ["flagship", "note", "note_array"]) {
    for (const pref of [undefined, "degree", "heart"]) {
      const drawn = messageToGrid("°", 1, 1, deviceType, pref)[0][0].value;
      const announced = messageToText("°", deviceType, pref);
      assert.equal(announced, drawn, `${deviceType} / ${pref}: tiles drew ${drawn} but the name said ${announced}`);
    }
  }
});

// --- tokensEqual ------------------------------------------------------------

test("tokensEqual: structural equality across token kinds", () => {
  assert.equal(tokensEqual(char("A"), char("A")), true);
  assert.equal(tokensEqual(char("A"), char("B")), false);
  assert.equal(tokensEqual(color("63"), color("63")), true);
  assert.equal(tokensEqual(color("63"), color("64")), false);
  assert.equal(tokensEqual(char("63"), color("63")), false);
});

// --- Parity with the board (FiestaBoard B1, PR #2126) -----------------------
//
// FiestaBoard's Python renderer (src/text_to_board.py, src/board_chars.py) is
// what the hardware is actually sent. Its parity run against this parser found
// four places where the preview drew something the board does not. Each test
// below states what the board draws and mirrors a case FiestaBoard pins.

test("parity: {filled} is the filled tile (code 71), like {71}", () => {
  assert.deepEqual(parseLine("{filled}"), [color("filled")]);
  assert.deepEqual(parseLine("{FILLED}"), [color("filled")]);
  assert.equal(isColorTile("71"), true);
});

test("parity: only {/} and {/<colour name>} are end tags", () => {
  for (const tag of ["{/}", "{/red}", "{/RED}", "{/purple}", "{/filled}"]) {
    assert.deepEqual(parseLine(`A${tag}B`), [char("A"), char("B")], `${tag} is an end tag`);
  }
});

test("parity: any other {/…} is drawn literally, brace by brace", () => {
  assert.deepEqual(
    parseLine("{/63}"),
    [..."{/63}"].map((c) => char(c)),
  );
  assert.deepEqual(
    parseLine("{/foo}"),
    [..."{/FOO}"].map((c) => char(c)),
  );
  assert.deepEqual(
    parseLine("{/white:A}"),
    [..."{/WHITE:A}"].map((c) => char(c)),
  );
});

test("parity: an astral character (emoji) is one cell, not two", () => {
  const tokens = parseLine("A😀B");
  assert.equal(tokens.length, 3);
  assert.deepEqual(tokens[1], char("😀"));
  const grid = messageToGrid("😀😀😀", 1, 3);
  assert.deepEqual(
    grid[0].map((t) => t.value),
    ["😀", "😀", "😀"],
  );
});

test("parity: a typed ♥ or ❤ is code 62, drawn by the board's own flap", () => {
  // The token keeps the heart (Unicode identity; ❤ normalises to ♥) …
  assert.deepEqual(parseLine("♥"), [char("♥")]);
  assert.deepEqual(parseLine("❤"), [char("♥")]);
  // … the flap projection is code 62, like a typed °.
  assert.equal(getCharIndex("♥"), 62);
  assert.equal(getCharIndex("°"), 62);
  // A degree-flap Flagship draws a degree for it; a heart-flap board a heart.
  assert.equal(messageToGrid("I♥NY", 1, 4, "flagship")[0][1].value, "°");
  assert.equal(messageToGrid("I♥NY", 1, 4, "flagship", "heart")[0][1].value, "♥");
  assert.equal(messageToGrid("I❤NY", 1, 4, "note")[0][1].value, "♥");
  // … and the accessible name says what the board draws.
  assert.equal(messageToText("I♥NY", "flagship"), "I°NY");
  assert.equal(messageToText("I♥NY", "note"), "I♥NY");
});

// --- Extended markup: colour spans, block spans and icons (behind a flag) ----
//
// `extendedMarkup` is off by default because the Python renderer has no span,
// block or icon grammar yet: a split-flap preview must draw what the hardware
// draws today. The LED layout turns it on. Every message without the new
// markers parses identically either way.

const EXT = { extendedMarkup: true };
const literal = (text) => [...text].map(char);

test("extended: without extendedMarkup the new markers are literal text, as the Python renderer draws them", () => {
  assert.deepEqual(parseLine("{red:HO}"), literal("{RED:HO}"));
  assert.deepEqual(parseLine("{icon:sun}"), literal("{ICON:SUN}"));
  assert.deepEqual(parseLine("{black/white:ON}"), literal("{BLACK/WHITE:ON}"));
  assert.deepEqual(parseLine("{#ff8800:HOT}"), literal("{#FF8800:HOT}"));
  assert.equal(messageToText("{red:HOT}"), "{RED:HOT}");
  // …and no token ever carries the extended fields without the flag.
  for (const line of ["{red:A{66}B}", "{icon:sun}{icon:up}", "{black/white:{icon:rain}}", "♥{icon:heart}"]) {
    for (const token of parseLine(line)) {
      assert.ok(
        !("color" in token) && !("background" in token) && !("icon" in token),
        `${line}: ${JSON.stringify(token)}`,
      );
    }
  }
});

test("extended: a colour span colours its letters and a flap board still gets the letters", () => {
  const red = (value) => ({ type: "char", value, color: "red" });
  assert.deepEqual(parseLine("{red:HOT}!", Infinity, EXT), [red("H"), red("O"), red("T"), char("!")]);
  // Numeric and hex colours; names are case-insensitive and normalised.
  assert.deepEqual(parseLine("{63:A}", Infinity, EXT), [{ type: "char", value: "A", color: "63" }]);
  assert.deepEqual(parseLine("{#FF8800:a}", Infinity, EXT), [{ type: "char", value: "A", color: "#ff8800" }]);
  assert.deepEqual(parseLine("{Red:a}", Infinity, EXT), [red("A")]);
  assert.deepEqual(parseLine("{purple:a}", Infinity, EXT), [{ type: "char", value: "A", color: "purple" }]);
  assert.deepEqual(parseLine("{70:a}", Infinity, EXT), [{ type: "char", value: "A", color: "70" }]);
  // Braces nest: a tile inside a span is still a tile, and the span ends at
  // the brace that balances its own.
  assert.deepEqual(parseLine("{red:A{66}B}C", Infinity, EXT), [red("A"), color("66"), red("B"), char("C")]);
  // Spans nest too; the innermost colour wins.
  assert.deepEqual(parseLine("{red:A{blue:B}C}", Infinity, EXT), [
    red("A"),
    { type: "char", value: "B", color: "blue" },
    red("C"),
  ]);
  // Not a colour before the colon → literal text, like any unknown marker.
  assert.deepEqual(parseLine("{foo:x}", Infinity, EXT), literal("{FOO:X}"));
  assert.deepEqual(parseLine("{:x}", Infinity, EXT), literal("{:X}"));
  // Unbalanced → literal, as an unclosed marker always was.
  assert.deepEqual(parseLine("{red:A{66}", Infinity, EXT), [...literal("{RED:A"), color("66")]);
  // The existing tile-then-text form is untouched.
  assert.deepEqual(parseLine("{red}HOT{/red}", Infinity, EXT), [color("red"), char("H"), char("O"), char("T")]);
  // Letters in a span are still uppercased unless asked otherwise.
  assert.deepEqual(parseLine("{red:Hi}", Infinity, { ...EXT, preserveCase: true }), [red("H"), red("i")]);
});

test("extended: a block span carries both colours; a flap board still gets the letters", () => {
  const inv = (value) => ({ type: "char", value, color: "black", background: "white" });
  assert.deepEqual(parseLine("{black/white:ON}", Infinity, EXT), [inv("O"), inv("N")]);
  assert.deepEqual(parseLine("{#ffffff/63:a}", Infinity, EXT), [
    { type: "char", value: "A", color: "#ffffff", background: "63" },
  ]);
  // Half a head is not a block span: literal, like any unknown marker.
  assert.deepEqual(parseLine("{red/:A}", Infinity, EXT), literal("{RED/:A}"));
  assert.deepEqual(parseLine("{/red:A}", Infinity, EXT), literal("{/RED:A}"));
  // `{/white:A}` is neither an end tag (Task 0: only `{/}` and `{/<colour>}`
  // are) nor a block span (no foreground), so it is literal in both modes.
  assert.deepEqual(parseLine("{/white:A}", Infinity, EXT), literal("{/WHITE:A}"));
  assert.deepEqual(parseLine("{/white:A}"), literal("{/WHITE:A}"));
  // An icon inside a block span keeps the span's colours.
  assert.deepEqual(parseLine("{black/white:{icon:up}}", Infinity, EXT), [
    { type: "char", value: "+", icon: "up", color: "black", background: "white" },
  ]);
});

test("extended: filled is a tile name, never a span or block colour", () => {
  // `{filled}` / `{71}` is a flap, not a hue a glyph could be drawn in, so as
  // a span head it is literal text — as a foreground and as a background.
  assert.deepEqual(parseLine("{filled}", Infinity, EXT), [color("filled")]);
  assert.deepEqual(parseLine("{71}", Infinity, EXT), [color("71")]);
  for (const line of ["{filled:x}", "{FILLED:x}", "{71:x}", "{filled/red:x}", "{red/filled:x}", "{white/71:x}"]) {
    assert.deepEqual(parseLine(line, Infinity, EXT), literal(line.toUpperCase()), line);
  }
  // Every other board colour, by name or code, opens a span.
  for (const head of ["red", "orange", "yellow", "green", "blue", "violet", "purple", "white", "black"]) {
    assert.deepEqual(parseLine(`{${head}:x}`, Infinity, EXT), [{ type: "char", value: "X", color: head }], head);
  }
  for (let code = 63; code <= 70; code++) {
    const c = String(code);
    assert.deepEqual(parseLine(`{${c}:x}`, Infinity, EXT), [{ type: "char", value: "X", color: c }], c);
    assert.deepEqual(parseLine(`{black/${c}:x}`, Infinity, EXT), [
      { type: "char", value: "X", color: "black", background: c },
    ]);
  }
});

test("extended: an icon is one cell, parsed to its split-flap fallback", () => {
  assert.deepEqual(parseLine("{icon:sun}", Infinity, EXT), [{ type: "color", code: "65", icon: "sun" }]);
  assert.deepEqual(parseLine("{icon:UP}", Infinity, EXT), [{ type: "char", value: "+", icon: "up" }]);
  assert.deepEqual(parseLine("{icon:bus}", Infinity, EXT), [{ type: "char", value: " ", icon: "bus" }]);
  assert.deepEqual(parseLine("{icon:nope}", Infinity, EXT), literal("{ICON:NOPE}"));
  assert.deepEqual(parseLine("{icon:constructor}", Infinity, EXT), literal("{ICON:CONSTRUCTOR}"));
  assert.deepEqual(parseLine("{icon:}", Infinity, EXT), literal("{ICON:}"));
  // Fallback text draws as text on a flap board, and is what messageToText says.
  assert.equal(messageToText("AQI {icon:up} 3 {icon:sun}", "flagship", undefined, EXT), "AQI + 3");
  // Every registered icon parses, to a tile, a character or a blank.
  for (const name of BOARD_ICON_NAMES) {
    const [token, ...rest] = parseLine(`{icon:${name}}`, Infinity, EXT);
    assert.equal(rest.length, 0, name);
    assert.equal(token.icon, name);
    if (token.type === "color") assert.ok(isColorTile(token.code), `${name} → tile ${token.code}`);
    else assert.equal(token.value.length, 1, `${name} → one character`);
  }
});

test("extended: icon aliases from FiestaBoard's legacy shortcuts, and {icon:heart} is the heart character", () => {
  assert.deepEqual(parseLine("{icon:storm}", Infinity, EXT), [{ type: "color", code: "64", icon: "bolt" }]);
  assert.deepEqual(parseLine("{icon:x}", Infinity, EXT), [{ type: "color", code: "63", icon: "cross" }]);
  // `{icon:heart}` is exactly a typed ♥: the same token, drawn as code 62 by
  // the split-flap projection like any typed heart.
  assert.deepEqual(parseLine("{icon:heart}", Infinity, EXT), parseLine("♥"));
  assert.deepEqual(parseLine("{icon:heart}", Infinity, EXT), [char("♥")]);
  assert.deepEqual(parseLine("{icon:HEART}", Infinity, EXT), [char("♥")]);
  assert.deepEqual(parseLine("{red:{icon:heart}}", Infinity, EXT), [{ type: "char", value: "♥", color: "red" }]);
  assert.equal(messageToGrid("{icon:heart}", 1, 1, "flagship", undefined, EXT)[0][0].value, "°");
  assert.equal(messageToGrid("{icon:heart}", 1, 1, "note", undefined, EXT)[0][0].value, "♥");
  assert.equal(resolveBoardIconName("heart"), null, "heart is not an icon in the registry");
  assert.deepEqual(parseLine("{icon:fog}", Infinity, EXT), [{ type: "char", value: "-", icon: "fog" }]);
  assert.deepEqual(parseLine("{icon:partly}", Infinity, EXT), [{ type: "color", code: "69", icon: "partly" }]);
});

test("extended (B1 finding 5): an icon whose fallback is a tile keeps the surrounding span's colours", () => {
  assert.deepEqual(parseLine("{red:{icon:sun}}", Infinity, EXT), [
    { type: "color", code: "65", icon: "sun", color: "red" },
  ]);
  assert.deepEqual(parseLine("{black/white:{icon:rain}}", Infinity, EXT), [
    { type: "color", code: "67", icon: "rain", color: "black", background: "white" },
  ]);
  assert.deepEqual(parseLine("{blue:A{icon:x}B}", Infinity, EXT), [
    { type: "char", value: "A", color: "blue" },
    { type: "color", code: "63", icon: "cross", color: "blue" },
    { type: "char", value: "B", color: "blue" },
  ]);
  // Outside a span the tile carries no colour fields at all.
  assert.deepEqual(parseLine("{icon:sun}", Infinity, EXT), [{ type: "color", code: "65", icon: "sun" }]);
  // A plain tile inside a span is just a tile: it is not an icon and draws
  // its own colour, so the span does not touch it.
  assert.deepEqual(parseLine("{red:{66}}", Infinity, EXT), [color("66")]);
});

test("extended: spans nest to depth 8; a ninth level is literal text (the span depth cap)", () => {
  // A span opened at the top level is depth 1; a span inside it is depth 2.
  // MAX_SPAN_DEPTH is 8: an opener that would open depth 9 is not a marker —
  // its `{`, head and `:` are ordinary characters in the enclosing span, and
  // its `}` is an ordinary `}` when the walk reaches it. Tiles, icons and end
  // tags are not spans: they parse at every depth. The extent of a span is
  // still the brace that balances its own `{`, counting every brace inside.
  const nest = (depth, inner) => "{red:".repeat(depth) + inner + "}".repeat(depth);
  const red = (value) => ({ type: "char", value, color: "red" });
  const blue = (value) => ({ type: "char", value, color: "blue" });

  // Seven red spans around a blue one: the blue span is depth 8, and parses.
  assert.deepEqual(parseLine(nest(7, "{blue:X}"), Infinity, EXT), [blue("X")]);
  // Eight red spans around a blue one: the blue opener would be depth 9, so it
  // is literal text in the depth-8 red span — braces, head, colon and all.
  assert.deepEqual(parseLine(nest(8, "{blue:X}"), Infinity, EXT), [..."{BLUE:X}"].map(red));
  // Nothing inside the literal opener counts as a deeper span either: a
  // tenth-level opener is literal in the same way, and the trailing braces are
  // ordinary characters up to the one that closes the depth-8 span.
  assert.deepEqual(parseLine(nest(8, "{blue:{green:X}}"), Infinity, EXT), [..."{BLUE:{GREEN:X}}"].map(red));
  // Tiles and icons are not spans; they still parse at depth 8, and inside a
  // literal ninth-level opener.
  assert.deepEqual(parseLine(nest(8, "{66}{icon:up}"), Infinity, EXT), [
    color("66"),
    { type: "char", value: "+", icon: "up", color: "red" },
  ]);
  assert.deepEqual(parseLine(nest(8, "{blue:{66}{icon:up}}"), Infinity, EXT), [
    ...[..."{BLUE:"].map(red),
    color("66"),
    { type: "char", value: "+", icon: "up", color: "red" },
    red("}"),
  ]);
  // Only parsed spans count toward the depth: a literal `{foo:…}` wrapper does
  // not use a level, and a block span uses one like a colour span.
  assert.deepEqual(parseLine("{foo:" + nest(7, "{blue:X}") + "}", Infinity, EXT), [
    ...[..."{FOO:"].map(char),
    blue("X"),
    char("}"),
  ]);
  assert.deepEqual(parseLine("{black/white:" + nest(7, "{blue:X}") + "}", Infinity, EXT), [
    ...[..."{BLUE:X}"].map((value) => ({ type: "char", value, color: "red" })),
  ]);
  // The depth-8 span still ends at its balancing brace, so text after it is
  // outside every span.
  assert.deepEqual(parseLine(nest(8, "{blue:X}") + "Z", Infinity, EXT), [...[..."{BLUE:X}"].map(red), char("Z")]);
});

test("parseLine: pathological brace runs parse in linear time, with and without maxTokens", () => {
  // Every `{` used to scan forward for its `}` and its balancing brace, and a
  // span recursed into a copy of its body, so a run of openers was quadratic
  // (and deep nesting recursed once per level). Brace matches are now found in
  // one pass per call and spans are capped at depth 8, so these finish fast
  // and never throw.
  const deep = "{red:".repeat(10000) + "X" + "}".repeat(10000);
  const openers = "{red:".repeat(100000);
  const bareOpeners = "{".repeat(100000);
  const siblings = "{red:X}".repeat(50000);
  const closers = "{red:".repeat(100000) + "}";
  const icons = "{icon:".repeat(100000) + "}";
  parseLine(siblings, Infinity, EXT); // warm the JIT before timing anything
  for (const [name, line] of Object.entries({ deep, openers, bareOpeners, siblings, closers, icons })) {
    for (const options of [EXT, {}]) {
      for (const cap of [Infinity, 132]) {
        const started = performance.now();
        const tokens = parseLine(line, cap, options);
        const elapsed = performance.now() - started;
        // Under a board-sized cap the parse must be quick outright. Without
        // one it still has to allocate up to half a million tokens, which is
        // the floor of any parser; the bound is loose enough for a loaded CI
        // box and still an order of magnitude under what the quadratic scan
        // took (seconds, or a stack overflow).
        const budget = cap === Infinity ? 1000 : 200;
        assert.ok(elapsed < budget, `${name} (${JSON.stringify(options)}, cap ${cap}) took ${elapsed.toFixed(0)}ms`);
        assert.ok(tokens.length <= Math.min(cap, line.length), name);
      }
    }
  }
  // And the capped parse of the deep run is the eight-span prefix: every
  // opener past the eighth is literal, coloured by the eighth span.
  const tokens = parseLine(deep, Infinity, EXT);
  assert.equal(tokens.length, deep.length - 8 * "{red:".length - 8);
  assert.deepEqual(
    tokens.slice(0, 5),
    [..."{RED:"].map((value) => ({ type: "char", value, color: "red" })),
  );
  assert.deepEqual(tokens.at(-1), { type: "char", value: "}", color: "red" });
});

test("board icons: the registry and its aliases are frozen, null-prototype tables", () => {
  for (const [name, table] of [
    ["BOARD_ICONS", BOARD_ICONS],
    ["BOARD_ICON_ALIASES", BOARD_ICON_ALIASES],
  ]) {
    assert.ok(Object.isFrozen(table), `${name} must be frozen`);
    assert.equal(Object.getPrototypeOf(table), null, `${name} must keep its null prototype`);
  }
  for (const spec of Object.values(BOARD_ICONS)) assert.ok(Object.isFrozen(spec), "each icon spec must be frozen");
  assert.throws(() => {
    "use strict";
    BOARD_ICON_ALIASES.constructor = "sun";
  });
  assert.equal(resolveBoardIconName("constructor"), null);
});

test("extended: preserveCase keeps the message's case; the default uppercases", () => {
  assert.deepEqual(parseLine("Hi", Infinity, { preserveCase: true }), [char("H"), char("i")]);
  assert.deepEqual(parseLine("Hi"), [char("H"), char("I")]);
  assert.deepEqual(messageToGrid("ab", 1, 3, "flagship", undefined, { preserveCase: true })[0], [
    char("a"),
    char("b"),
    char(" "),
  ]);
  assert.equal(messageToText("Hi there", "flagship", undefined, { preserveCase: true }), "Hi there");
});

test("extended: maxTokens equals full-parse-then-slice across spans and icons too", () => {
  const lines = [
    "{red:HOT {66} TODAY} and {icon:sun}{icon:bus} more text",
    "x{blue:" + "y".repeat(30) + "}z",
    "{black/white:{icon:up}{red:A{66}B}}" + "q".repeat(20),
  ];
  for (const line of lines) {
    for (const cap of [0, 1, 3, 7, 22, 100]) {
      assert.deepEqual(
        parseLine(line, cap, EXT),
        parseLine(line, Infinity, EXT).slice(0, cap),
        `line "${line}" cap ${cap}`,
      );
    }
  }
  // A span opening at the cut-off boundary is parsed whole, never half.
  const atCap = parseLine("A".repeat(21) + "{red:XYZ}", 22, EXT);
  assert.equal(atCap.length, 22);
  assert.deepEqual(atCap[21], { type: "char", value: "X", color: "red" });
});

test("extended: the Task 0 parity rules hold inside the extended grammar too", () => {
  // {filled} is tile 71's name, as a tile and as a span colour.
  assert.deepEqual(parseLine("{filled}", Infinity, EXT), [color("filled")]);
  // Only `{/}` and `{/<colour>}` end a run; `{/63}` and `{/foo}` are literal.
  assert.deepEqual(parseLine("{red:A{/red}B}", Infinity, EXT), [
    { type: "char", value: "A", color: "red" },
    { type: "char", value: "B", color: "red" },
  ]);
  assert.deepEqual(parseLine("{/63}", Infinity, EXT), literal("{/63}"));
  // An emoji is one cell, inside a span as well.
  assert.deepEqual(parseLine("{red:A😀B}", Infinity, EXT), [
    { type: "char", value: "A", color: "red" },
    { type: "char", value: "😀", color: "red" },
    { type: "char", value: "B", color: "red" },
  ]);
});

test("typed heart: extendedMarkup changes nothing about ♥, ❤ or ° — the flap projection owns code 62", () => {
  // What a typed heart *is* belongs to the parity rule (Task 0) and the
  // code-62 projection (messageToGrid / messageToText / applyCode62Glyph),
  // never to the extended grammar: the token is identical with and without
  // the flag, and the boards draw it identically.
  for (const text of ["♥", "❤", "°", "I♥NY"]) {
    assert.deepEqual(parseLine(text, Infinity, EXT), parseLine(text), text);
    for (const deviceType of ["flagship", "note", "panel"]) {
      for (const pref of [undefined, "degree", "heart"]) {
        const label = `${text} / ${deviceType} / ${pref}`;
        assert.deepEqual(
          messageToGrid(text, 1, 4, deviceType, pref, EXT),
          messageToGrid(text, 1, 4, deviceType, pref),
          label,
        );
        assert.equal(messageToText(text, deviceType, pref, EXT), messageToText(text, deviceType, pref), label);
      }
    }
  }
  // A span's colour rides on the heart token.
  assert.deepEqual(parseLine("{red:I♥U}", Infinity, EXT), [
    { type: "char", value: "I", color: "red" },
    { type: "char", value: "♥", color: "red" },
    { type: "char", value: "U", color: "red" },
  ]);
});

test("applyCode62Glyph: keeps a span's colour on the glyph it substitutes, in both directions", () => {
  // ° on a heart board draws ♥ …
  assert.deepEqual(messageToGrid("{red:°}", 1, 1, "note", undefined, EXT)[0][0], {
    type: "char",
    value: "♥",
    color: "red",
  });
  // … and ♥ on a degree board draws °, the span's colour intact either way.
  assert.deepEqual(messageToGrid("{red:♥}", 1, 1, "flagship", undefined, EXT)[0][0], {
    type: "char",
    value: "°",
    color: "red",
  });
  assert.deepEqual(messageToGrid("{red:♥}", 1, 1, "flagship", "heart", EXT)[0][0], {
    type: "char",
    value: "♥",
    color: "red",
  });
});

// --- richTokensEqual ---------------------------------------------------------
//
// `tokensEqual` is colour-blind on purpose: a flap tile draws only `value` /
// `code`, and its memo comparators must not re-render a tile whose flap did
// not change. An LED dedupe needs the colour-aware equality (spec §8.1).

test("richTokensEqual: true only when type, value/code, color, background and icon all match", () => {
  const red = { type: "char", value: "A", color: "red" };
  assert.equal(richTokensEqual(char("A"), char("A")), true);
  assert.equal(richTokensEqual(red, { ...red }), true);
  assert.equal(richTokensEqual(color("63"), color("63")), true);
  assert.equal(
    richTokensEqual({ type: "color", code: "65", icon: "sun" }, { type: "color", code: "65", icon: "sun" }),
    true,
  );
  assert.equal(
    richTokensEqual(
      { type: "char", value: "+", icon: "up", color: "black", background: "white" },
      { type: "char", value: "+", icon: "up", color: "black", background: "white" },
    ),
    true,
  );

  assert.equal(richTokensEqual(char("A"), char("B")), false, "value");
  assert.equal(richTokensEqual(char("63"), color("63")), false, "type");
  assert.equal(richTokensEqual(color("63"), color("64")), false, "code");
  assert.equal(richTokensEqual(red, { ...red, color: "blue" }), false, "color");
  assert.equal(richTokensEqual(red, char("A")), false, "color vs absent");
  assert.equal(richTokensEqual(red, { ...red, background: "white" }), false, "background vs absent");
  assert.equal(richTokensEqual({ ...red, background: "white" }, { ...red, background: "black" }), false, "background");
  assert.equal(richTokensEqual({ type: "char", value: "+", icon: "up" }, char("+")), false, "icon vs absent");
  assert.equal(
    richTokensEqual({ type: "color", code: "65", icon: "sun" }, { type: "color", code: "65", icon: "star" }),
    false,
    "icon",
  );
  assert.equal(
    richTokensEqual(
      { type: "color", code: "65", icon: "sun", color: "red" },
      { type: "color", code: "65", icon: "sun" },
    ),
    false,
    "a tile's span colour",
  );
});

test("richTokensEqual: an absent field never equals a default colour", () => {
  // The LED text colour defaults to white and a block has no background by
  // default, but a token that *says* white is not the same token as one that
  // says nothing: the dedupe must not conflate "unstyled" with "styled white".
  assert.equal(richTokensEqual(char("A"), { type: "char", value: "A", color: "white" }), false);
  assert.equal(richTokensEqual(char("A"), { type: "char", value: "A", color: "#ffffff" }), false);
  assert.equal(richTokensEqual(char("A"), { type: "char", value: "A", background: "black" }), false);
  assert.equal(richTokensEqual(color("63"), { type: "color", code: "63", color: "white" }), false);
});

test("tokensEqual stays colour-blind for the flap memo comparators", () => {
  assert.equal(tokensEqual({ type: "char", value: "A", color: "red" }, char("A")), true);
  assert.equal(tokensEqual({ type: "color", code: "65", icon: "sun" }, color("65")), true);
  assert.equal(tokensEqual({ type: "char", value: "+", icon: "up", background: "white" }, char("+")), true);
});
