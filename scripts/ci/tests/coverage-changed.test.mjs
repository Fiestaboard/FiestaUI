import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  BRANCH_THRESHOLD,
  checkCoverage,
  isCoverageCandidate,
  LINE_THRESHOLD,
  renderSummary,
} from "../coverage-changed.mjs";

// Guard: the changed-file coverage rule (MASTER-PLAN §1 principle 3, §4.4.1
// step 8). A file a PR adds or changes under src/ must reach ≥90% lines and
// ≥85% branches. Files the PR does not touch are never checked — no back-fill.
//
// The rule fails silently in three ways, each pinned below:
//   - the thresholds drift down, or the comparison flips;
//   - a changed file that no test loads is missing from the summary and is
//     skipped instead of failing (vitest only reports it when
//     `coverage.include` names it);
//   - the CI wiring drops the step, or runs vitest without coverage.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const SCRIPT = path.join(ROOT, "scripts", "ci", "coverage-changed.mjs");

/** An istanbul json-summary entry. */
function entry(lines, branches, totals = { lines: 100, branches: 20 }) {
  const metric = (pct, total) => ({ total, covered: Math.round((pct / 100) * total), skipped: 0, pct });
  return {
    lines: metric(lines, totals.lines),
    statements: metric(lines, totals.lines),
    functions: metric(100, 1),
    branches: metric(branches, totals.branches),
  };
}

const BUTTON = "src/components/forms/button.tsx";
const CARD = "src/components/containment/card.tsx";

function summary(files) {
  const out = { total: entry(50, 50) };
  for (const [file, value] of Object.entries(files)) out[path.join(ROOT, file)] = value;
  return out;
}

test("thresholds are the plan's: 90% lines, 85% branches", () => {
  assert.equal(LINE_THRESHOLD, 90);
  assert.equal(BRANCH_THRESHOLD, 85);
});

test("only shipped source counts — tests, stories, Code Connect and types do not", () => {
  assert.equal(isCoverageCandidate(BUTTON), true);
  assert.equal(isCoverageCandidate("src/lib/utils.ts"), true);
  for (const file of [
    "src/components/forms/button.test.tsx",
    "src/components/board/board-animation.perf.test.tsx",
    "src/components/forms/button.stories.tsx",
    "src/components/forms/button.figma.tsx",
    "src/types/global.d.ts",
    "src/test/setup.ts",
    "scripts/ci/coverage-changed.mjs",
    "docs/README.md",
    "src/styles/theme.css",
  ]) {
    assert.equal(isCoverageCandidate(file), false, file);
  }
});

test("a changed file at or above both thresholds passes", () => {
  const result = checkCoverage({ changedFiles: [BUTTON], summary: summary({ [BUTTON]: entry(90, 85) }), root: ROOT });
  assert.equal(result.ok, true);
  assert.equal(result.results[0].ok, true);
});

test("lines below 90% fails", () => {
  const result = checkCoverage({
    changedFiles: [BUTTON],
    summary: summary({ [BUTTON]: entry(89.9, 100) }),
    root: ROOT,
  });
  assert.equal(result.ok, false);
  assert.match(result.results[0].reason, /lines 89\.9% < 90%/);
});

test("branches below 85% fails", () => {
  const result = checkCoverage({
    changedFiles: [BUTTON],
    summary: summary({ [BUTTON]: entry(100, 84.9) }),
    root: ROOT,
  });
  assert.equal(result.ok, false);
  assert.match(result.results[0].reason, /branches 84\.9% < 85%/);
});

test("no back-fill: an untouched file below threshold is never checked", () => {
  const result = checkCoverage({
    changedFiles: [BUTTON],
    summary: summary({ [BUTTON]: entry(95, 90), [CARD]: entry(10, 0) }),
    root: ROOT,
  });
  assert.equal(result.ok, true);
  assert.deepEqual(
    result.results.map((r) => r.file),
    [BUTTON],
  );
});

test("a changed source file missing from the summary fails rather than skips", () => {
  // vitest omits a file no test imports unless coverage.include names it. A
  // skip here would let a brand-new, untested component through.
  const result = checkCoverage({ changedFiles: [CARD], summary: summary({}), root: ROOT });
  assert.equal(result.ok, false);
  assert.match(result.results[0].reason, /no coverage data/);
});

test("a file with nothing to cover (type-only module) passes", () => {
  const empty = entry(100, 100, { lines: 0, branches: 0 });
  empty.lines.pct = "Unknown";
  empty.branches.pct = "Unknown";
  const file = "src/lib/types.ts";
  const result = checkCoverage({ changedFiles: [file], summary: summary({ [file]: empty }), root: ROOT });
  assert.equal(result.ok, true);
});

test("a PR with no changed source passes and says so", () => {
  const result = checkCoverage({ changedFiles: ["docs/x.md", ".github/workflows/ci.yml"], summary: {}, root: ROOT });
  assert.equal(result.ok, true);
  assert.equal(result.results.length, 0);
  assert.match(result.reason, /No changed source files/);
});

test("summary keys may be repo-relative as well as absolute", () => {
  const result = checkCoverage({ changedFiles: [BUTTON], summary: { [BUTTON]: entry(91, 86) }, root: ROOT });
  assert.equal(result.ok, true);
});

test("the markdown summary lists every checked file with its verdict", () => {
  const result = checkCoverage({
    changedFiles: [BUTTON, CARD],
    summary: summary({ [BUTTON]: entry(95, 90), [CARD]: entry(50, 50) }),
    root: ROOT,
  });
  const md = renderSummary(result);
  assert.match(md, /\| `src\/components\/forms\/button\.tsx` \| 95% \| 90% \| pass \|/);
  assert.match(md, /\| `src\/components\/containment\/card\.tsx` \| 50% \| 50% \| FAIL/);
});

test("CLI: exits 1 on a failing changed file, 0 when it passes", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "coverage-changed-"));
  const listFile = path.join(dir, "changed.txt");
  writeFileSync(listFile, `${BUTTON}\ndocs/x.md\n`);
  const summaryFile = path.join(dir, "coverage-summary.json");

  writeFileSync(summaryFile, JSON.stringify(summary({ [BUTTON]: entry(50, 50) })));
  let run = spawnSync(process.execPath, [SCRIPT, "--files", listFile, "--summary", summaryFile], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 1, run.stderr);
  assert.match(run.stdout, /FAIL/);

  writeFileSync(summaryFile, JSON.stringify(summary({ [BUTTON]: entry(100, 100) })));
  run = spawnSync(process.execPath, [SCRIPT, "--files", listFile, "--summary", summaryFile], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 0, run.stderr);
});

test("CLI: a missing summary file is an error, not a pass", () => {
  const run = spawnSync(process.execPath, [SCRIPT, "--files", "/dev/null", "--summary", "/nonexistent/summary.json"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(run.status, 2);
});

// --- wiring -----------------------------------------------------------------

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

test("unit-tests runs vitest WITH coverage", () => {
  const body = job("unit-tests");
  assert.match(body, /run:\s*npm run test:coverage/, "unit-tests must collect coverage");
  const pkg = JSON.parse(readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.match(pkg.scripts["test:coverage"], /vitest run --coverage/);
  assert.ok(pkg.devDependencies["@vitest/coverage-v8"], "@vitest/coverage-v8 must be a devDependency");
});

test("unit-tests enforces the changed-file rule on pull requests, against the PR base", () => {
  const body = job("unit-tests");
  assert.match(body, /node scripts\/ci\/coverage-changed\.mjs/);
  assert.match(body, /fetch-depth:\s*0/, "the three-dot diff needs the base commit");
  assert.match(body, /github\.event\.pull_request\.base\.sha/);
  // The step must not be soft: a continue-on-error would make the rule advisory.
  assert.doesNotMatch(body, /continue-on-error:\s*true/);
});

test("vitest coverage is v8, emits json-summary, and includes every source file", () => {
  const config = readFileSync(path.join(ROOT, "vitest.config.ts"), "utf8");
  assert.match(config, /provider:\s*"v8"/);
  assert.match(config, /"json-summary"/);
  // Without `include`, a source file no test imports is absent from the
  // summary — the checker fails it, but only because of the rule above.
  assert.match(config, /include:\s*\["src\/\*\*\/\*\.\{ts,tsx\}"\]/);
});

// --- sync PRs (review S1) ------------------------------------------------------
//
// A main→alpha sync arrives as a PR into alpha whose head ref is `main`, and a
// Version PR's head is `changeset-release/*`. Neither authored the src/ changes
// it carries: a fix on main to one of the many below-bar legacy files would
// otherwise turn the sync red with no way to clear it. Same exemption, same two
// refs, as scripts/release/changeset-check.mjs.

test("sync and Version PRs are exempt: head ref main or changeset-release/*", () => {
  const failing = summary({ [BUTTON]: entry(10, 10) });
  for (const headRef of ["main", "changeset-release/alpha", "changeset-release/main"]) {
    const result = checkCoverage({ changedFiles: [BUTTON], summary: failing, root: ROOT, headRef });
    assert.equal(result.ok, true, headRef);
    assert.match(result.reason, /exempt/, headRef);
  }
});

test("the exemption is those two refs only — look-alikes are still checked", () => {
  const failing = summary({ [BUTTON]: entry(10, 10) });
  for (const headRef of [
    "",
    "alpha",
    "feat/main",
    "main-fix",
    "mainline",
    "changeset-release",
    "x/changeset-release/y",
  ]) {
    const result = checkCoverage({ changedFiles: [BUTTON], summary: failing, root: ROOT, headRef });
    assert.equal(result.ok, false, JSON.stringify(headRef));
  }
});

test("the exempt refs match changeset-check.mjs's", async () => {
  const { checkChangeset } = await import("../../release/changeset-check.mjs");
  const shipped = { files: [BUTTON], addedFiles: [], labels: [] };
  for (const headRef of ["main", "changeset-release/alpha", "feat/main", "alpha"]) {
    const changeset = checkChangeset({ ...shipped, headRef }).ok;
    const coverage = checkCoverage({
      changedFiles: [BUTTON],
      summary: summary({ [BUTTON]: entry(10, 10) }),
      root: ROOT,
      headRef,
    }).ok;
    assert.equal(coverage, changeset, `${headRef}: coverage and changeset exemptions disagree`);
  }
});

test("CLI: HEAD_REF=main exempts the run", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "coverage-changed-"));
  const listFile = path.join(dir, "changed.txt");
  writeFileSync(listFile, `${BUTTON}\n`);
  const summaryFile = path.join(dir, "coverage-summary.json");
  writeFileSync(summaryFile, JSON.stringify(summary({ [BUTTON]: entry(10, 10) })));
  const args = [SCRIPT, "--files", listFile, "--summary", summaryFile];
  const exempt = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, HEAD_REF: "main" },
  });
  assert.equal(exempt.status, 0, exempt.stderr);
  const normal = spawnSync(process.execPath, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, HEAD_REF: "feat/x" },
  });
  assert.equal(normal.status, 1);
});

test("unit-tests passes the PR head ref to the checker", () => {
  assert.match(job("unit-tests"), /HEAD_REF:\s*\$\{\{\s*github\.head_ref\s*\}\}/);
});
