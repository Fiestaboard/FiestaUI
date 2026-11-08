import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkSmoke, PROBES } from "../../vrt/parity-smoke.mjs";

// Guard: the CI smoke test of the parity harness's BROWSER half (slice 1.0c).
//
// vrt-parity.test.mjs exercises the harness through `--shots`, which skips
// capture, and the `automation` job has no browser. A broken import in the
// capture path (1.0b's `clampClip is not defined`) therefore passed every
// test. The `parity-smoke` CI job now runs the real harness, with Playwright,
// against the Button stories and the fixture refs. Then
// scripts/vrt/parity-smoke.mjs asserts that the HARNESS worked:
//   - every ref got a report entry, without an error;
//   - probes 1–5 and the pixel diff are all present;
//   - the DOM was actually measured (no null values, sentinel bindings read);
//   - the shot and diff PNGs exist.
// It never reads `pass` or `wouldPass`. Parity stays report-only until K2.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SMOKE = path.join(ROOT, "scripts", "vrt", "parity-smoke.mjs");

const ID = "forms-button-default";

function check(checked = 1) {
  return { pass: false, checked, items: [] };
}

/** A report in which the harness WORKED but every parity check would fail. */
function workingButFailing() {
  const report = {
    gating: false,
    missingRefs: [],
    unmanifested: [],
    entries: [
      {
        id: ID,
        wouldPass: false,
        checks: {
          token: check(),
          geometry: check(),
          text: check(),
          color: check(),
          board: check(0),
          pixel: { pass: false, ratio: 0.5, limit: 0.01, sizeMatch: false, flaggedBlobs: [{}] },
        },
      },
    ],
  };
  const artifacts = {
    [ID]: {
      png: true,
      diff: true,
      dom: {
        root: { x: 0, y: 0, width: 75, height: 36 },
        tokens: [
          {
            variable: "var(--primary)",
            property: "background-color",
            value: "rgba(1, 2, 3, 1)",
            binding: { vars: ["--primary"], follows: false },
          },
        ],
        geometry: [{ node: "Label", rect: { x: 0, y: 0, width: 1, height: 1 } }],
        text: [{ node: "Label", text: "Nope" }],
        board: null,
      },
    },
  };
  return { report, expectedIds: [ID], artifacts };
}

test("PROBES names checks 1–5 in §3.3 order", () => {
  assert.deepEqual(PROBES, ["token", "geometry", "text", "color", "board"]);
});

test("a working harness passes the smoke check even when every parity check fails", () => {
  const result = checkSmoke(workingButFailing());
  assert.deepEqual(result.problems, []);
  assert.equal(result.ok, true);
});

test("a report that claims to gate is a smoke failure: parity is report-only", () => {
  const input = workingButFailing();
  input.report.gating = true;
  assert.match(checkSmoke(input).problems.join("\n"), /gating/);
});

test("a ref with no report entry, or an entry with an error, fails the smoke check", () => {
  const missing = workingButFailing();
  missing.expectedIds.push("forms-button-outline");
  assert.match(checkSmoke(missing).problems.join("\n"), /forms-button-outline.*no report entry/);

  const errored = workingButFailing();
  errored.report.entries[0].error = "clampClip is not defined";
  assert.match(checkSmoke(errored).problems.join("\n"), /clampClip is not defined/);
});

for (const probe of [...PROBES, "pixel"]) {
  test(`an entry without the ${probe} check fails the smoke check`, () => {
    const input = workingButFailing();
    delete input.report.entries[0].checks[probe];
    assert.match(checkSmoke(input).problems.join("\n"), new RegExp(`${probe}`));
  });
}

test("probes 1–4 must have measured something; the board probe may be empty", () => {
  for (const probe of ["token", "geometry", "text", "color"]) {
    const input = workingButFailing();
    input.report.entries[0].checks[probe].checked = 0;
    assert.match(checkSmoke(input).problems.join("\n"), new RegExp(`${probe}.*nothing`), probe);
  }
});

test("unmeasured DOM values fail the smoke check: the browser half did not run", () => {
  const nullToken = workingButFailing();
  nullToken.artifacts[ID].dom.tokens[0].value = null;
  assert.match(checkSmoke(nullToken).problems.join("\n"), /token.*not measured/);

  const noBinding = workingButFailing();
  delete noBinding.artifacts[ID].dom.tokens[0].binding;
  assert.match(checkSmoke(noBinding).problems.join("\n"), /sentinel/);

  const nullRect = workingButFailing();
  nullRect.artifacts[ID].dom.geometry[0].rect = null;
  assert.match(checkSmoke(nullRect).problems.join("\n"), /geometry.*not measured/);

  const nullText = workingButFailing();
  nullText.artifacts[ID].dom.text[0].text = null;
  assert.match(checkSmoke(nullText).problems.join("\n"), /text.*not measured/);

  const noRoot = workingButFailing();
  noRoot.artifacts[ID].dom.root = null;
  assert.match(checkSmoke(noRoot).problems.join("\n"), /root/);
});

test("missing shot, diff or DOM capture files fail the smoke check", () => {
  for (const key of ["png", "diff", "dom"]) {
    const input = workingButFailing();
    input.artifacts[ID][key] = key === "dom" ? null : false;
    assert.equal(checkSmoke(input).ok, false, key);
  }
});

// --- CLI ---------------------------------------------------------------------

function writeOut({ report, artifacts }) {
  const dir = mkdtempSync(path.join(tmpdir(), "parity-smoke-"));
  writeFileSync(path.join(dir, "report.json"), JSON.stringify(report));
  for (const [id, a] of Object.entries(artifacts)) {
    if (a.png) writeFileSync(path.join(dir, `${id}.png`), "x");
    if (a.diff) writeFileSync(path.join(dir, `${id}.diff.png`), "x");
    if (a.dom) writeFileSync(path.join(dir, `${id}.dom.json`), JSON.stringify(a.dom));
  }
  return dir;
}

/** A refs dir holding only the one ref the fake report covers. */
function oneRefDir() {
  const dir = mkdtempSync(path.join(tmpdir(), "parity-smoke-refs-"));
  const fixture = JSON.parse(
    readFileSync(path.join(ROOT, "scripts", "ci", "tests", "fixtures", "parity", "refs.json"), "utf8"),
  );
  writeFileSync(path.join(dir, "refs.json"), JSON.stringify({ ...fixture, refs: [fixture.refs[0]] }));
  return dir;
}

const run = (args) => spawnSync(process.execPath, [SMOKE, ...args], { cwd: ROOT, encoding: "utf8" });

test("CLI: exits 0 on a working harness whose findings all fail, and 1 when the harness broke", () => {
  const input = workingButFailing();
  const ok = run([writeOut(input), "--refs", oneRefDir()]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);

  input.report.entries[0].error = "target root not found";
  const broken = run([writeOut(input), "--refs", oneRefDir()]);
  assert.equal(broken.status, 1, broken.stdout + broken.stderr);
  assert.match(broken.stdout, /target root not found/);
});

test("CLI: no report.json, or no out dir at all, is exit 2", () => {
  assert.equal(run([mkdtempSync(path.join(tmpdir(), "parity-smoke-empty-"))]).status, 2);
  assert.equal(run([]).status, 2);
});

test("CLI: by default it expects every ref in the fixture that vrt/figma-refs.json targets", () => {
  // The fake output covers one of the fixture's two refs, so the default
  // (the full fixture) must report the other one as missing.
  const result = run([writeOut(workingButFailing())]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /forms-button-outline.*no report entry/);
});

// --- CI wiring -----------------------------------------------------------------

const CI_YML = readFileSync(path.join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
const stripped = CI_YML.split("\n")
  .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
  .join("\n");

function job(id) {
  const start = stripped.search(new RegExp(`\\n {2}${id}:\\n`));
  assert.notEqual(start, -1, `ci.yml has no job "${id}"`);
  const rest = stripped.slice(start + 1);
  const end = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

test("CI: parity-smoke serves Storybook and runs the real harness (no --shots) on the fixture", () => {
  const body = job("parity-smoke");
  assert.match(body, /uses: \.\/\.github\/actions\/storybook-browser/);
  assert.match(body, /node scripts\/vrt\/vrt\.mjs parity --refs scripts\/ci\/tests\/fixtures\/parity --out/);
  assert.doesNotMatch(body, /--shots/, "--shots skips the browser half, which is what this job exists to test");
});

test("CI: parity-smoke asserts the harness worked and runs the in-browser measure tests", () => {
  const body = job("parity-smoke");
  assert.match(body, /node scripts\/vrt\/parity-smoke\.mjs /);
  assert.match(body, /node --test scripts\/vrt\/tests\/\*\.test\.mjs/);
});

test("CI: parity-smoke is hard on the harness and report-only on parity", () => {
  const body = job("parity-smoke");
  assert.doesNotMatch(body, /continue-on-error:\s*true/);
  assert.doesNotMatch(body, /\|\|\s*true/);
  assert.doesNotMatch(body, /--gate/);
});

test("CI: CI Success needs parity-smoke, so a broken harness turns the merge gate red", () => {
  const needs = job("ci-success").match(/needs:\s*\[([^\]]*)\]/);
  assert.ok(needs, "ci-success has a needs list");
  assert.ok(
    needs[1]
      .split(",")
      .map((s) => s.trim())
      .includes("parity-smoke"),
    needs[1],
  );
});
