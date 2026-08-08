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

await build({
  entryPoints: [join(repoRoot, "src/lib/board-characters.ts")],
  bundle: true,
  format: "esm",
  platform: "neutral",
  outfile,
});

const { BOARD_CHARS, getCharIndex, isColorTile, parseLine, messageToGrid, tokensEqual } = await import(
  pathToFileURL(outfile).href
);

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
  assert.equal(getCharIndex("♥"), 0); // EXTRA_CHARS are displayable but have no code
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

test("messageToGrid: degree symbol becomes a heart on the note device only", () => {
  const note = messageToGrid("°F", 1, 3, "note");
  assert.deepEqual(note[0][0], char("♥"));
  assert.deepEqual(note[0][1], char("F"));
  const flagship = messageToGrid("°F", 1, 3, "flagship");
  assert.deepEqual(flagship[0][0], char("°"));
});

// --- tokensEqual ------------------------------------------------------------

test("tokensEqual: structural equality across token kinds", () => {
  assert.equal(tokensEqual(char("A"), char("A")), true);
  assert.equal(tokensEqual(char("A"), char("B")), false);
  assert.equal(tokensEqual(color("63"), color("63")), true);
  assert.equal(tokensEqual(color("63"), color("64")), false);
  assert.equal(tokensEqual(char("63"), color("63")), false);
});
