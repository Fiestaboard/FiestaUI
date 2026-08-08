/**
 * Behavior tests for src/lib/board-dimensions.ts resolveDimensions:
 *
 * 1. Stable object identity — repeat calls with the same (deviceType, wide,
 *    tall) return the same reference, so the result is safe in React
 *    dependency arrays.
 * 2. Bounded cache — inputs are clamped to integers in
 *    [1, MAX_NOTES_PER_AXIS] before deriving the cache key, so arbitrary
 *    caller inputs (floats, negatives, huge/transient values) cannot grow the
 *    identity cache beyond MAX_NOTES_PER_AXIS² entries. We assert this
 *    through clamping behavior: every out-of-range input must return the very
 *    same reference as its in-range clamp target.
 *
 * The module is TypeScript, so we bundle it with esbuild's JS API to a temp
 * file and dynamic-import the result (same esbuild the perf harness uses).
 */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(here, "../../../src/lib/board-dimensions.ts");

let tmp;
let mod;

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "board-dimensions-test-"));
  const outfile = path.join(tmp, "board-dimensions.mjs");
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "neutral",
    logLevel: "silent",
  });
  mod = await import(pathToFileURL(outfile).href);
});

after(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

// ── Identity contract ─────────────────────────────────────────────────────────

test("note_array repeat calls return the same reference", () => {
  const a = mod.resolveDimensions("note_array", 2, 3);
  const b = mod.resolveDimensions("note_array", 2, 3);
  assert.equal(a, b);
  assert.deepEqual(a, { rows: 3 * mod.NOTE_ROWS, cols: 2 * mod.NOTE_COLS });
});

test("distinct note_array sizes get distinct (but individually stable) refs", () => {
  const a = mod.resolveDimensions("note_array", 1, 2);
  const b = mod.resolveDimensions("note_array", 2, 1);
  assert.notEqual(a, b);
  assert.equal(a, mod.resolveDimensions("note_array", 1, 2));
  assert.equal(b, mod.resolveDimensions("note_array", 2, 1));
});

test("flagship and note return stable shared references", () => {
  assert.equal(mod.resolveDimensions("flagship"), mod.resolveDimensions("flagship"));
  assert.equal(mod.resolveDimensions("note"), mod.resolveDimensions("note"));
  assert.equal(mod.resolveDimensions("flagship"), mod.DEVICE_DIMENSIONS.flagship);
  assert.equal(mod.resolveDimensions("note"), mod.DEVICE_DIMENSIONS.note);
});

test("unknown device types fall back to the flagship reference", () => {
  assert.equal(mod.resolveDimensions("mystery_board"), mod.DEVICE_DIMENSIONS.flagship);
});

// ── Clamping correctness ──────────────────────────────────────────────────────

test("values above MAX_NOTES_PER_AXIS clamp to the max", () => {
  const max = mod.MAX_NOTES_PER_AXIS;
  const atMax = mod.resolveDimensions("note_array", max, max);
  assert.equal(mod.resolveDimensions("note_array", 999, 999), atMax);
  assert.equal(mod.resolveDimensions("note_array", Infinity, Infinity), atMax);
  assert.deepEqual(atMax, { rows: max * mod.NOTE_ROWS, cols: max * mod.NOTE_COLS });
});

test("zero, negative, and NaN inputs clamp to 1", () => {
  const one = mod.resolveDimensions("note_array", 1, 1);
  assert.equal(mod.resolveDimensions("note_array", 0, 0), one);
  assert.equal(mod.resolveDimensions("note_array", -5, -1e9), one);
  assert.equal(mod.resolveDimensions("note_array", NaN, NaN), one);
  assert.equal(mod.resolveDimensions("note_array", -Infinity, NaN), one);
  assert.deepEqual(one, { rows: mod.NOTE_ROWS, cols: mod.NOTE_COLS });
});

test("fractional inputs clamp to integers (floor)", () => {
  assert.equal(mod.resolveDimensions("note_array", 2.9, 3.7), mod.resolveDimensions("note_array", 2, 3));
  assert.equal(mod.resolveDimensions("note_array", 1.0001, 1.9999), mod.resolveDimensions("note_array", 1, 1));
});

// ── Cache bounding ────────────────────────────────────────────────────────────

test("1000 distinct invalid pairs do not grow the cache unboundedly", () => {
  const max = mod.MAX_NOTES_PER_AXIS;
  // Canonical references for the full bounded key space (max² entries).
  const canonical = new Map();
  for (let w = 1; w <= max; w++) {
    for (let t = 1; t <= max; t++) {
      canonical.set(`${w}×${t}`, mod.resolveDimensions("note_array", w, t));
    }
  }
  // Hammer the cache with distinct floats, negatives, and huge values. Every
  // result must be reference-identical to one of the max² canonical entries —
  // proving no new cache entries (and no new allocations) are created.
  for (let i = 0; i < 1000; i++) {
    const wide = i % 3 === 0 ? i + 0.5 : i % 3 === 1 ? -i : 1e6 + i;
    const tall = i % 2 === 0 ? i / 7 : Number.MAX_SAFE_INTEGER - i;
    const dims = mod.resolveDimensions("note_array", wide, tall);
    const match = [...canonical.values()].some((ref) => ref === dims);
    assert.ok(match, `unclamped input (${wide}, ${tall}) produced a reference outside the bounded key space`);
  }
});
