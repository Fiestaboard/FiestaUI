import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";

import {
  BLOB_CSS_PX,
  boardProbe,
  clampClip,
  colorProbe,
  deltaE2000,
  evaluateEntry,
  geometryProbe,
  joinRefs,
  loadManifest,
  loadRefs,
  pixelDiff,
  resolveRefsDir,
  sizeClassOf,
  textProbe,
  tokenProbe,
} from "../../vrt/parity.mjs";

// Guard: the Figma parity harness (MASTER-PLAN §3.3, §4.4.1 step 9).
//
//   node scripts/vrt/vrt.mjs parity --refs <local dir> --out <dir>
//
// joins the refs checkout's refs.json with vrt/figma-refs.json, shoots each
// target, runs probes 1–5 and the pixel diff, and writes report.{json,md}.
// It is REPORT-ONLY until slice 1.1 (after K2 calibration): findings never
// change the exit code. What this file pins:
//   - `--refs` is a local directory, never a URL (C3: not blocked on O4);
//   - each probe's tolerance: geometry ±1 CSS px, colour ΔE2000 ≤ 2, board
//     zero tolerance, pixel diff threshold 0.1 with the 24×24 blob flag;
//   - the CLI exits 0 with failing findings, and 2 only on bad input.
//
// The fixture under fixtures/parity/ is two real Figma refs (Button default
// and outline, light) with their metadata, standing in for the refs repo.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const FIXTURE = path.join(ROOT, "scripts", "ci", "tests", "fixtures", "parity");
const VRT = path.join(ROOT, "scripts", "vrt", "vrt.mjs");
const MANIFEST = path.join(ROOT, "vrt", "figma-refs.json");

function readPng(file) {
  return PNG.sync.read(readFileSync(file));
}

function solid(width, height, rgba) {
  const png = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) png.data.set(rgba, i * 4);
  return png;
}

function paint(png, x0, y0, w, h, rgba) {
  const out = new PNG({ width: png.width, height: png.height });
  png.data.copy(out.data);
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) out.data.set(rgba, (y * png.width + x) * 4);
  return out;
}

// --- refs: local path only (C3) --------------------------------------------

test("--refs accepts a local directory holding refs.json", () => {
  assert.equal(resolveRefsDir(FIXTURE), FIXTURE);
});

test("--refs rejects URLs and remotes — the refs are read from a local checkout", () => {
  for (const bad of [
    "https://github.com/Fiestaboard/fiestaboard-design-refs",
    "git@github.com:Fiestaboard/fiestaboard-design-refs.git",
    "s3://bucket/refs",
    "file:///tmp/refs",
  ]) {
    assert.throws(() => resolveRefsDir(bad), /local path/, bad);
  }
});

test("--refs rejects a directory without refs.json", () => {
  assert.throws(() => resolveRefsDir(path.join(ROOT, "docs")), /refs\.json/);
});

test("the fixture refs load, with PNGs whose size matches slot × scale plus the render bleed", () => {
  const refs = loadRefs(FIXTURE);
  assert.deepEqual(
    refs.map((r) => r.id),
    ["forms-button-default", "forms-button-outline"],
  );
  for (const ref of refs) {
    const png = readPng(ref.pngPath);
    assert.equal(png.width, (ref.slotWidth + 2 * ref.renderOffset.x) * ref.scale, ref.id);
    assert.ok(png.height >= ref.slotHeight * ref.scale, ref.id);
  }
});

test("a ref entry missing a required field is rejected", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "parity-refs-"));
  writeFileSync(path.join(dir, "refs.json"), JSON.stringify({ refs: [{ id: "x", mode: "light" }] }));
  assert.throws(() => loadRefs(dir), /figmaNode/);
});

test("joinRefs pairs by id and reports both kinds of orphan", () => {
  const refs = [{ id: "a" }, { id: "b" }];
  const manifest = { entries: [{ id: "a" }, { id: "c" }] };
  const { pairs, missingRefs, unmanifested } = joinRefs(refs, manifest);
  assert.deepEqual(
    pairs.map((p) => p.ref.id),
    ["a"],
  );
  assert.deepEqual(missingRefs, ["c"]);
  assert.deepEqual(unmanifested, ["b"]);
});

test("vrt/figma-refs.json targets every fixture ref", () => {
  const manifest = loadManifest(MANIFEST);
  const { missingRefs, unmanifested } = joinRefs(loadRefs(FIXTURE), manifest);
  assert.deepEqual(missingRefs, []);
  assert.deepEqual(unmanifested, []);
  for (const entry of manifest.entries) {
    assert.match(entry.target.story, /^[a-z0-9-]+--[a-z0-9-]+$/, entry.id);
    assert.ok(["component", "screen"].includes(entry.kind), entry.id);
  }
});

// --- probe 1: tokens ---------------------------------------------------------

/** What measureInPage records when the element followed the sentinel override. */
const FOLLOWS = { vars: ["--x"], follows: true };

test("token probe: a colour resolves to the Figma variable (8-bit rounding allowed)", () => {
  const variables = { "var(--primary)": "#f5a623", "var(--radius-md)": "8" };
  const ok = tokenProbe(variables, [
    { variable: "var(--primary)", property: "background-color", value: "rgb(245, 166, 36)", binding: FOLLOWS },
    { variable: "var(--radius-md)", property: "border-top-left-radius", value: "8px", binding: FOLLOWS },
  ]);
  assert.equal(ok.pass, true);
  const bad = tokenProbe(variables, [
    { variable: "var(--primary)", property: "background-color", value: "rgb(240, 160, 30)", binding: FOLLOWS },
    { variable: "var(--radius-md)", property: "border-top-left-radius", value: "6px", binding: FOLLOWS },
  ]);
  assert.equal(bad.pass, false);
  assert.equal(bad.items.filter((i) => !i.pass).length, 2);
});

test("token probe: a variable the ref does not define is a failure, not a skip", () => {
  const result = tokenProbe({}, [{ variable: "var(--nope)", property: "color", value: "rgb(0, 0, 0)" }]);
  assert.equal(result.pass, false);
  assert.match(result.items[0].note, /not in the ref/);
});

// P2 (review of #378), MASTER-PLAN §3.3 probe 1: the value check alone lets a
// hard-coded hex through when it happens to equal the token. measureInPage
// overrides each mapped custom property with a sentinel, re-reads the
// computed style and records whether it followed; the probe requires it.

test("token probe: a matching value that does NOT follow the sentinel fails (hard-coded hex)", () => {
  const result = tokenProbe({ "var(--primary)": "#f5a623" }, [
    {
      variable: "var(--primary)",
      property: "background-color",
      value: "rgba(245, 166, 35, 1)",
      binding: { vars: ["--primary"], follows: false, after: "rgba(245, 166, 35, 1)", expected: "rgba(1, 2, 3, 1)" },
    },
  ]);
  assert.equal(result.pass, false);
  assert.match(result.items[0].note, /sentinel/);
  assert.equal(result.items[0].bound, false);
});

test("token probe: a value with no sentinel binding check fails — value equality is not a binding", () => {
  for (const binding of [undefined, null]) {
    const result = tokenProbe({ "var(--primary)": "#f5a623" }, [
      { variable: "var(--primary)", property: "background-color", value: "rgba(245, 166, 35, 1)", binding },
    ]);
    assert.equal(result.pass, false, String(binding));
    assert.match(result.items[0].note, /binding/);
  }
});

test("token probe: a binding that could not be checked fails with the reason", () => {
  const result = tokenProbe({ "component/button/outline-bg": "#f1ece6" }, [
    {
      variable: "component/button/outline-bg",
      property: "background-color",
      value: "rgba(241, 236, 230, 1)",
      binding: { vars: [], follows: false, note: "no cssVar mapping to override" },
    },
  ]);
  assert.equal(result.pass, false);
  assert.match(result.items[0].note, /no cssVar mapping/);
});

test("token probe: a wrong value still fails even when the binding follows", () => {
  const result = tokenProbe({ "var(--primary)": "#f5a623" }, [
    { variable: "var(--primary)", property: "background-color", value: "rgb(0, 0, 0)", binding: FOLLOWS },
  ]);
  assert.equal(result.pass, false);
  assert.match(result.items[0].note, /colour differs/);
});

test("vrt/figma-refs.json: every token probe names a CSS custom property the sentinel can override", () => {
  const manifest = loadManifest(MANIFEST);
  for (const entry of manifest.entries) {
    for (const probe of entry.probes?.tokens ?? []) {
      const expr = probe.cssVar ?? probe.variable;
      assert.match(expr, /var\(--[\w-]+/, `${entry.id} ${probe.property}: ${probe.variable} needs a cssVar`);
    }
  }
});

// --- probe 2: geometry ±1 CSS px ---------------------------------------------

test("geometry probe: within ±1 CSS px passes, beyond fails", () => {
  const nodes = [{ name: "Label", x: 16, y: 8, width: 43, height: 20 }];
  assert.equal(geometryProbe(nodes, [{ node: "Label", rect: { x: 17, y: 7, width: 42, height: 21 } }]).pass, true);
  const bad = geometryProbe(nodes, [{ node: "Label", rect: { x: 16, y: 8, width: 43, height: 21.5 } }]);
  assert.equal(bad.pass, false);
  assert.match(bad.items[0].note, /height/);
});

test("geometry probe: an unmatched Figma node name fails", () => {
  const result = geometryProbe([], [{ node: "Label", rect: { x: 0, y: 0, width: 1, height: 1 } }]);
  assert.equal(result.pass, false);
});

// --- probe 3: text equality --------------------------------------------------

test("text probe: equal after whitespace collapse; any other difference fails", () => {
  const nodes = [{ name: "Label", type: "TEXT", characters: "Button" }];
  assert.equal(textProbe(nodes, [{ node: "Label", text: "  Button\n" }]).pass, true);
  assert.equal(textProbe(nodes, [{ node: "Label", text: "button" }]).pass, false);
});

test("text probe: checks COPY-CANON when one is supplied", () => {
  const nodes = [{ name: "Label", type: "TEXT", characters: "Button" }];
  const result = textProbe(nodes, [{ node: "Label", text: "Button", canonKey: "button.label" }], {
    "button.label": "Press",
  });
  assert.equal(result.pass, false);
  assert.match(result.items[0].note, /CANON/);
});

// --- probe 4: colour sampling, ΔE2000 ≤ 2 -----------------------------------

test("ΔE2000 matches Sharma, Wu & Dalal's published test data", () => {
  const cases = [
    [[50, 2.6772, -79.7751], [50, 0, -82.7485], 2.0425],
    [[50, 3.1571, -77.2803], [50, 0, -82.7485], 2.8615],
    [[50, 0, 0], [50, -1, 2], 2.3669],
    [[50, 2.5, 0], [73, 25, -18], 27.1492],
    [[60.2574, -34.0099, 36.2677], [60.4626, -34.1751, 39.4387], 1.2644],
  ];
  for (const [a, b, expected] of cases) assert.ok(Math.abs(deltaE2000(a, b) - expected) < 1e-4, `${a} vs ${b}`);
});

test("colour probe: identical pixels pass; a shifted fill fails at ΔE2000 > 2", () => {
  const [ref] = loadRefs(FIXTURE);
  const refPng = readPng(ref.pngPath);
  const points = [{ x: 6, y: 18, label: "fill" }];
  assert.equal(colorProbe({ ref, refPng, shotPng: refPng, points }).pass, true);
  const shifted = paint(refPng, 0, 0, refPng.width, refPng.height, [200, 120, 20, 255]);
  const result = colorProbe({ ref, refPng, shotPng: shifted, points });
  assert.equal(result.pass, false);
  assert.ok(result.items[0].deltaE > 2);
});

test("colour probe: a sample within 4 px of a text node is rejected as invalid", () => {
  const [ref] = loadRefs(FIXTURE);
  const refPng = readPng(ref.pngPath);
  // Label spans x 16–59; x = 13 is 3 px from its edge.
  const result = colorProbe({ ref, refPng, shotPng: refPng, points: [{ x: 13, y: 18 }] });
  assert.equal(result.pass, false);
  assert.match(result.items[0].note, /within 4 px of text/);
});

// --- probe 5: structural board, zero tolerance ------------------------------

test("size class follows the tile sizes: sm 13×18, md 28×40, lg 32×46", () => {
  assert.equal(sizeClassOf({ width: 13, height: 18 }), "sm");
  assert.equal(sizeClassOf({ width: 28, height: 40 }), "md");
  assert.equal(sizeClassOf({ width: 32, height: 46 }), "lg");
  assert.equal(sizeClassOf({ width: 20, height: 30 }), null);
});

test("board probe: count, size class and colour code must match exactly", () => {
  const tiles = [
    { width: 28, height: 40, color: 63 },
    { width: 28, height: 40, color: 0 },
  ];
  assert.equal(boardProbe(tiles, tiles).pass, true);
  assert.equal(boardProbe(tiles, tiles.slice(0, 1)).pass, false, "count");
  assert.equal(boardProbe(tiles, [tiles[0], { ...tiles[1], color: 64 }]).pass, false, "colour");
  assert.equal(boardProbe(tiles, [tiles[0], { width: 32, height: 46, color: 0 }]).pass, false, "size class");
});

// --- check 6: pixel diff + 24×24 blob flag ----------------------------------

test("pixel diff: identical images have zero differing pixels", () => {
  const [ref] = loadRefs(FIXTURE);
  const png = readPng(ref.pngPath);
  const result = pixelDiff(png, png, { scale: 1 });
  assert.equal(result.diffPixels, 0);
  assert.equal(result.flaggedBlobs.length, 0);
});

test("pixel diff: a blob larger than 24×24 CSS px is flagged even under the % limit", () => {
  assert.equal(BLOB_CSS_PX, 24);
  const base = solid(400, 400, [255, 255, 255, 255]);
  const blob = paint(base, 100, 100, 26, 26, [0, 0, 0, 255]); // 676 px = 0.42%
  const result = pixelDiff(base, blob, { scale: 1 });
  assert.ok(result.ratio < 0.01, "under the 1% component limit");
  assert.equal(result.flaggedBlobs.length, 1);
  assert.deepEqual(result.flaggedBlobs[0], { x: 100, y: 100, width: 26, height: 26, pixels: 676 });
});

test("pixel diff: a 24×24 blob is not flagged, and the size scales with deviceScaleFactor", () => {
  const base = solid(400, 400, [255, 255, 255, 255]);
  assert.equal(pixelDiff(base, paint(base, 10, 10, 24, 24, [0, 0, 0, 255]), { scale: 1 }).flaggedBlobs.length, 0);
  // At @2x, 26 image px is 13 CSS px — not a blob worth flagging.
  assert.equal(pixelDiff(base, paint(base, 10, 10, 26, 26, [0, 0, 0, 255]), { scale: 2 }).flaggedBlobs.length, 0);
  assert.equal(pixelDiff(base, paint(base, 10, 10, 50, 50, [0, 0, 0, 255]), { scale: 2 }).flaggedBlobs.length, 1);
});

test("pixel diff: a blob must exceed 24×24 in BOTH axes — a long thin line is not a blob", () => {
  // 200×5 = 1000 px, more than 24×24's 576, but it is a hairline (a border
  // shifted by a pixel), not a missing or extra element.
  const base = solid(300, 300, [255, 255, 255, 255]);
  const line = pixelDiff(base, paint(base, 10, 10, 200, 5, [0, 0, 0, 255]), { scale: 1 });
  assert.equal(line.flaggedBlobs.length, 0);
});

test("pixel diff: two separate small blobs are not merged into one", () => {
  const base = solid(200, 200, [255, 255, 255, 255]);
  let img = paint(base, 10, 10, 20, 20, [0, 0, 0, 255]);
  img = paint(img, 40, 10, 20, 20, [0, 0, 0, 255]);
  const result = pixelDiff(base, img, { scale: 1 });
  assert.equal(result.blobs.length, 2);
  assert.equal(result.flaggedBlobs.length, 0);
});

test("pixel diff: a size mismatch is reported, and the overlap still compared", () => {
  const result = pixelDiff(solid(10, 10, [255, 255, 255, 255]), solid(12, 10, [255, 255, 255, 255]), { scale: 1 });
  assert.equal(result.sizeMatch, false);
  assert.equal(result.width, 12);
});

test("evaluateEntry: would-fail verdict uses the provisional limits (1.0% component, 2.5% screen)", () => {
  const [ref] = loadRefs(FIXTURE);
  const refPng = readPng(ref.pngPath);
  const entry = { id: ref.id, kind: "component", probes: {} };
  const dom = { geometry: [], text: [], tokens: [], board: null };
  assert.equal(evaluateEntry({ ref, entry, refPng, shotPng: refPng, dom }).wouldPass, true);
  const smudged = paint(refPng, 30, 12, 10, 10, [0, 0, 255, 255]); // 100 px of 3402 ≈ 2.9%
  const result = evaluateEntry({ ref, entry, refPng, shotPng: smudged, dom });
  assert.equal(result.checks.pixel.limit, 0.01);
  assert.equal(result.wouldPass, false);
  const screen = evaluateEntry({ ref, entry: { ...entry, kind: "screen" }, refPng, shotPng: smudged, dom });
  assert.equal(screen.checks.pixel.limit, 0.025);
});

test("evaluateEntry: the report always carries probes 1–5 and the pixel diff, in §3.3 order", () => {
  // A stable shape lets the CI smoke test require every probe. The board
  // probe has nothing to compare for a ref without tiles, so it is present,
  // marked not applicable, and checks nothing.
  const [ref] = loadRefs(FIXTURE);
  const refPng = readPng(ref.pngPath);
  const entry = { id: ref.id, kind: "component", probes: {} };
  const result = evaluateEntry({ ref, entry, refPng, shotPng: refPng, dom: { tokens: [], board: null } });
  assert.deepEqual(Object.keys(result.checks), ["token", "geometry", "text", "color", "board", "pixel"]);
  assert.deepEqual(result.checks.board, { pass: true, checked: 0, items: [], applicable: false });
  const tiled = evaluateEntry({
    ref: { ...ref, tiles: [{ width: 13, height: 18, color: 1 }] },
    entry,
    refPng,
    shotPng: refPng,
    dom: { tokens: [], board: { tiles: [] } },
  });
  assert.equal(tiled.checks.board.pass, false);
  assert.notEqual(tiled.checks.board.applicable, false);
});

// --- CLI: report-only --------------------------------------------------------

function runParity(shotsDir, outDir, extra = []) {
  return spawnSync(
    process.execPath,
    [VRT, "parity", "--refs", FIXTURE, "--shots", shotsDir, "--out", outDir, ...extra],
    {
      cwd: ROOT,
      encoding: "utf8",
    },
  );
}

function fakeShots({ broken }) {
  const dir = mkdtempSync(path.join(tmpdir(), "parity-shots-"));
  for (const ref of loadRefs(FIXTURE)) {
    const shot = path.join(dir, `${ref.id}.png`);
    if (broken) writeFileSync(shot, PNG.sync.write(solid(10, 10, [0, 0, 0, 255])));
    else copyFileSync(ref.pngPath, shot);
    const label = ref.nodes[0];
    writeFileSync(
      path.join(dir, `${ref.id}.dom.json`),
      JSON.stringify({
        geometry: [{ node: "Label", rect: broken ? { x: 0, y: 0, width: 1, height: 1 } : label }],
        text: [{ node: "Label", text: broken ? "Nope" : label.characters }],
        tokens: [],
        board: null,
      }),
    );
  }
  return dir;
}

test("CLI: a clean run writes report.json and report.md and exits 0", () => {
  const out = mkdtempSync(path.join(tmpdir(), "parity-out-"));
  const run = runParity(fakeShots({ broken: false }), out);
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(readFileSync(path.join(out, "report.json"), "utf8"));
  assert.equal(report.gating, false);
  assert.equal(report.entries.length, 2);
  assert.ok(
    report.entries.every((e) => e.wouldPass),
    JSON.stringify(report.entries, null, 1),
  );
  assert.match(readFileSync(path.join(out, "report.md"), "utf8"), /report-only/i);
});

test("CLI: failing probes are REPORTED, and the exit code is still 0", () => {
  const out = mkdtempSync(path.join(tmpdir(), "parity-out-"));
  const run = runParity(fakeShots({ broken: true }), out);
  assert.equal(run.status, 0, `report-only until slice 1.1 — got ${run.status}: ${run.stderr}`);
  const report = JSON.parse(readFileSync(path.join(out, "report.json"), "utf8"));
  assert.ok(report.entries.every((e) => !e.wouldPass));
  assert.match(readFileSync(path.join(out, "report.md"), "utf8"), /would fail/i);
});

test("CLI: a missing shot is a reported finding, not a crash", () => {
  const out = mkdtempSync(path.join(tmpdir(), "parity-out-"));
  const empty = mkdtempSync(path.join(tmpdir(), "parity-shots-"));
  mkdirSync(path.join(empty, "x"), { recursive: true });
  const run = runParity(empty, out);
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(readFileSync(path.join(out, "report.json"), "utf8"));
  assert.ok(report.entries.every((e) => e.error && !e.wouldPass));
});

test("CLI: a URL for --refs, or no --refs at all, is a usage error (exit 2)", () => {
  const out = mkdtempSync(path.join(tmpdir(), "parity-out-"));
  let run = spawnSync(process.execPath, [VRT, "parity", "--refs", "https://example.com/refs", "--out", out], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /local path/);
  run = spawnSync(process.execPath, [VRT, "parity", "--out", out], { cwd: ROOT, encoding: "utf8" });
  assert.equal(run.status, 2);
});

test("CLI: there is no flag that turns the parity report into a gate", () => {
  const out = mkdtempSync(path.join(tmpdir(), "parity-out-"));
  const run = runParity(fakeShots({ broken: true }), out, ["--gate"]);
  assert.equal(run.status, 2, "unknown flags are rejected; gating arrives in slice 1.1 by a deliberate change");
});

test("clampClip keeps a negative clip on the page by trimming it, never shifting it", () => {
  assert.deepEqual(clampClip({ x: 5, y: 6, width: 81, height: 42 }), { x: 5, y: 6, width: 81, height: 42 });
  // Root at the canvas origin with a 3,2 bleed: the bleed is trimmed off, so
  // the shot is smaller than the ref and the pixel check reports the size.
  assert.deepEqual(clampClip({ x: -3, y: -2, width: 81, height: 42 }), { x: 0, y: 0, width: 78, height: 40 });
});
