/**
 * Prototype-safety tests for the board lookup tables (issue #91).
 *
 * The color/char tables and the device-dimension guard treat plain objects as
 * sets of valid keys. These tests pin that inherited `Object.prototype` keys
 * (`toString`, `constructor`, `valueOf`, …) are never treated as legitimate
 * colors, extra characters, or device types — and that every legitimate key
 * still resolves exactly as before.
 *
 * The TS sources are bundled with esbuild (same dependency the perf harness
 * uses in scripts/perf/bundle.mjs) and imported via a data: URL, so the tests
 * exercise the real modules without a build step.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

const bundle = await build({
  stdin: {
    contents: [
      'export * from "./src/lib/board-colors";',
      'export * from "./src/lib/board-characters";',
      'export * from "./src/lib/board-dimensions";',
    ].join("\n"),
    resolveDir: repoRoot,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "neutral",
  write: false,
});

const {
  ALL_COLOR_CODES,
  BOARD_COLORS,
  EXTRA_CHARS,
  isValidBoardColor,
  parseLine,
  resolveColorCode,
  resolveDimensions,
} = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const PROTO_KEYS = ["toString", "constructor", "valueOf", "hasOwnProperty", "__proto__"];

// ── parseLine ─────────────────────────────────────────────────────────────────

test("parseLine does not treat prototype keys as color tokens", () => {
  for (const key of PROTO_KEYS) {
    const tokens = parseLine(`{${key}}`);
    assert.ok(
      tokens.every((t) => t.type === "char"),
      `{${key}} must fall through as literal characters, got ${JSON.stringify(tokens)}`,
    );
    // The literal text is preserved (uppercased), starting with the "{".
    assert.equal(tokens[0].value, "{");
  }
});

test("parseLine still recognizes legitimate color tokens", () => {
  assert.deepEqual(parseLine("{66}"), [{ type: "color", code: "66" }]);
  assert.deepEqual(parseLine("{red}"), [{ type: "color", code: "red" }]);
  // Named colors match case-insensitively via the lowercase fallback.
  assert.deepEqual(parseLine("{PURPLE}"), [{ type: "color", code: "purple" }]);
});

// ── EXTRA_CHARS ───────────────────────────────────────────────────────────────

test("EXTRA_CHARS does not expose prototype keys", () => {
  for (const key of PROTO_KEYS) {
    assert.ok(!EXTRA_CHARS[key], `EXTRA_CHARS[${JSON.stringify(key)}] must be falsy`);
  }
});

test("EXTRA_CHARS still contains its legitimate entries", () => {
  assert.equal(EXTRA_CHARS["♥"], true);
});

// ── isValidBoardColor ─────────────────────────────────────────────────────────

test("isValidBoardColor rejects prototype keys", () => {
  for (const key of PROTO_KEYS) {
    assert.equal(isValidBoardColor(key), false, `isValidBoardColor(${JSON.stringify(key)})`);
  }
});

test("isValidBoardColor accepts legitimate codes and names", () => {
  for (const key of ["63", "66", "71", "red", "violet", "purple", "PURPLE", "White", "black"]) {
    assert.equal(isValidBoardColor(key), true, `isValidBoardColor(${JSON.stringify(key)})`);
  }
});

// ── resolveColorCode ──────────────────────────────────────────────────────────

test("resolveColorCode returns unchanged hex values for legitimate keys", () => {
  assert.equal(resolveColorCode("red", false), BOARD_COLORS.red);
  assert.equal(resolveColorCode("66", false), BOARD_COLORS.green);
  assert.equal(resolveColorCode("purple", false), BOARD_COLORS.violet);
  // White-board inversion: white and black swap.
  assert.equal(resolveColorCode("white", true), BOARD_COLORS.black);
  assert.equal(resolveColorCode("70", true), BOARD_COLORS.white);
});

test("resolveColorCode falls back to black for prototype keys, never a Function", () => {
  for (const key of PROTO_KEYS) {
    const resolved = resolveColorCode(key, false);
    assert.equal(typeof resolved, "string", `resolveColorCode(${JSON.stringify(key)})`);
    assert.equal(resolved, BOARD_COLORS.black);
    assert.equal(typeof ALL_COLOR_CODES[key], "undefined");
  }
});

// ── resolveDimensions ─────────────────────────────────────────────────────────

test("resolveDimensions falls back to flagship for prototype keys", () => {
  for (const key of PROTO_KEYS) {
    const dims = resolveDimensions(key);
    assert.equal(typeof dims, "object", `resolveDimensions(${JSON.stringify(key)})`);
    assert.equal(dims.rows, 6, `resolveDimensions(${JSON.stringify(key)}).rows`);
    assert.equal(dims.cols, 22, `resolveDimensions(${JSON.stringify(key)}).cols`);
  }
});

test("resolveDimensions resolves legitimate device types unchanged", () => {
  assert.deepEqual({ ...resolveDimensions("flagship") }, { rows: 6, cols: 22 });
  assert.deepEqual({ ...resolveDimensions("note") }, { rows: 3, cols: 15 });
  assert.deepEqual({ ...resolveDimensions("note_array", 2, 2) }, { rows: 6, cols: 30 });
  assert.deepEqual({ ...resolveDimensions("unknown_device") }, { rows: 6, cols: 22 });
});
