import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Guard: the visual gate covers the `alpha` channel, not just `main`.
//
// fiestaboard/visual-regression-action keeps baselines as build artifacts and
// finds one by the branch that produced it (`workflow_run.head_branch`). A PR
// compares against its BASE branch's newest `vrt-baseline`. So for a PR into
// alpha to be gated, three things must all hold, and each one fails silently
// (every shot reads as "new", the check passes, the gate is off):
//
//   1. ci.yml runs on pushes to alpha, so alpha ever produces a baseline.
//   2. Those pushes run the action in `baseline` mode. `auto` publishes only on
//      the DEFAULT branch and throws on any other push (the action's
//      src/mode.ts) — that would turn every alpha merge red instead.
//   3. Neither VRT job skips PRs into alpha, and the compare is not pinned to
//      main's baseline (`baseline-branch`) or split off by a `key`.
//
// Artifacts expire after 14 days, and a `schedule` trigger only ever fires on
// the default branch, so the alpha reseed lever is a manual dispatch on alpha.
// It lives in docs/VISUAL_REGRESSION.md, and that is pinned here too.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const CI_YML = readFileSync(path.join(ROOT, ".github", "workflows", "ci.yml"), "utf8");
const VRT_DOC = readFileSync(path.join(ROOT, "docs", "VISUAL_REGRESSION.md"), "utf8");
const RELEASING_DOC = readFileSync(path.join(ROOT, "docs", "releasing.md"), "utf8");

/** Strip `#` comments so prose about the old shape never trips the scan. */
const stripped = CI_YML.split("\n")
  .map((line) => line.replace(/(^|\s)#.*$/, "$1"))
  .join("\n");

/** The text of one top-level job, from `  <id>:` to the next job. */
function job(id) {
  const start = stripped.search(new RegExp(`\\n {2}${id}:\\n`));
  assert.notEqual(start, -1, `ci.yml has no job "${id}" — update this guard with it`);
  const rest = stripped.slice(start + 1);
  const end = rest.slice(1).search(/\n {2}[a-z][a-z0-9-]*:\n/);
  return end === -1 ? rest : rest.slice(0, end + 1);
}

/** A job's `if:` expression (single line in this file). */
function jobIf(id) {
  const m = job(id).match(/\n {4}if:\s*(.+)\n/);
  assert.ok(m, `job "${id}" has no if:`);
  return m[1];
}

/** The `with:` block of the visual-regression-action step in vrt-report. */
function actionStep() {
  const body = job("vrt-report");
  const start = body.search(/uses:\s*fiestaboard\/visual-regression-action@/);
  assert.notEqual(start, -1, "vrt-report no longer uses fiestaboard/visual-regression-action");
  const rest = body.slice(start);
  const end = rest.search(/\n\s*- (name|uses):/);
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Evaluate the subset of GitHub's expression language a `mode:` input needs:
 * context paths, string literals, ==, !=, &&, || and parentheses. && / ||
 * return operands just as JavaScript's do, which is how the `cond && 'a' || 'b'`
 * ternary idiom works on Actions. String compares are case-insensitive there.
 */
function evaluate(expression, ctx) {
  const tokens = expression.match(/'[^']*'|==|!=|&&|\|\||\(|\)|[A-Za-z_][\w.-]*/g);
  assert.equal(
    tokens.join("").replace(/\s/g, ""),
    expression.replace(/\s/g, ""),
    `unsupported syntax in ${expression}`,
  );
  let i = 0;
  const lookup = (p) => p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);
  const eq = (a, b) => String(a ?? "").toLowerCase() === String(b ?? "").toLowerCase();
  function primary() {
    const t = tokens[i++];
    if (t === "(") {
      const v = or();
      assert.equal(tokens[i++], ")");
      return v;
    }
    if (t.startsWith("'")) return t.slice(1, -1);
    if (t === "true" || t === "false") return t === "true";
    return lookup(t);
  }
  function compare() {
    let v = primary();
    while (tokens[i] === "==" || tokens[i] === "!=") {
      const op = tokens[i++];
      const r = primary();
      v = op === "==" ? eq(v, r) : !eq(v, r);
    }
    return v;
  }
  function and() {
    let v = compare();
    while (tokens[i] === "&&") {
      i++;
      const r = compare();
      v = v && r;
    }
    return v;
  }
  function or() {
    let v = and();
    while (tokens[i] === "||") {
      i++;
      const r = and();
      v = v || r;
    }
    return v;
  }
  const value = or();
  assert.equal(i, tokens.length, `trailing tokens in ${expression}`);
  return value;
}

/** Mirror of fiestaboard/visual-regression-action src/mode.ts (v2). */
function resolveMode(modeInput, eventName, ref, defaultBranch) {
  if (["baseline", "compare", "approve"].includes(modeInput)) return modeInput;
  if (modeInput !== "auto") throw new Error(`Invalid mode "${modeInput}"`);
  if (eventName === "pull_request" || eventName === "pull_request_target") return "compare";
  if (eventName === "push" && ref === `refs/heads/${defaultBranch}`) return "baseline";
  if (eventName === "workflow_dispatch" || eventName === "schedule") return "baseline";
  if (eventName === "issue_comment") return "approve";
  throw new Error(`Cannot auto-detect mode for event "${eventName}" on ref "${ref}"`);
}

/** The context a run sees, for the fields these expressions read. */
function context({ event, branch, base }) {
  return {
    github: {
      event_name: event,
      ref: `refs/heads/${branch}`,
      ref_name: branch,
      base_ref: base ?? "",
      event: { repository: { default_branch: "main" } },
    },
  };
}

/** What mode the action resolves to for a run, given the step's `mode:` input. */
function modeFor(run) {
  const m = actionStep().match(/\n\s*mode:\s*(.+)\n/);
  const raw = m ? m[1].trim() : "auto"; // action.yml default
  const expr = raw.match(/^\$\{\{\s*([\s\S]+?)\s*\}\}$/);
  const input = expr ? evaluate(expr[1], context(run)) : raw.replace(/^["']|["']$/g, "");
  const ctx = context(run).github;
  return resolveMode(String(input), ctx.event_name, ctx.ref, "main");
}

test("ci.yml runs on pushes to main and alpha", () => {
  const m = stripped.match(/\non:\s*\n\s*push:\s*\n\s*branches:\s*\[([^\]]*)\]/);
  assert.ok(m, "ci.yml must declare on.push.branches as a flow list");
  const branches = m[1].split(",").map((b) => b.trim().replace(/^["']|["']$/g, ""));
  assert.ok(branches.includes("main"), "main must keep publishing its baseline");
  assert.ok(
    branches.includes("alpha"),
    "without a push run on alpha, alpha never publishes a baseline to compare against",
  );
});

test("pull_request is not narrowed to a branch list", () => {
  const block = stripped.match(/\n {2}pull_request:\s*\n((?: {4}.*\n)*)/);
  assert.ok(block, "ci.yml must run on pull_request");
  assert.doesNotMatch(block[1], /branches(-ignore)?:/, "PRs into every base (alpha included) must run CI");
});

test("neither VRT job skips PRs into alpha", () => {
  for (const id of ["visual-regression", "vrt-report"]) {
    assert.doesNotMatch(jobIf(id), /base_ref/, `${id} must not be conditioned on the PR base`);
  }
  // The merge-queue skip is deliberate and stays.
  assert.match(jobIf("visual-regression"), /github\.event_name != 'merge_group'/);
});

test("the action resolves a mode for every run that reaches it, and never throws", () => {
  const cases = [
    [{ event: "push", branch: "main" }, "baseline"],
    [{ event: "push", branch: "alpha" }, "baseline"],
    [{ event: "pull_request", branch: "feature", base: "main" }, "compare"],
    [{ event: "pull_request", branch: "feature", base: "alpha" }, "compare"],
    [{ event: "workflow_dispatch", branch: "main" }, "baseline"],
    [{ event: "workflow_dispatch", branch: "alpha" }, "baseline"],
  ];
  for (const [run, expected] of cases) {
    assert.equal(modeFor(run), expected, `${run.event} on ${run.branch}${run.base ? ` → ${run.base}` : ""}`);
  }
});

test("main keeps auto mode", () => {
  // `auto` on main is what the action's own docs and the PR compare path are
  // built around. The override is for non-default pushes only.
  const m = actionStep().match(/\n\s*mode:\s*\$\{\{\s*([\s\S]+?)\s*\}\}\n/);
  if (!m) return; // no override at all is auto everywhere — covered above
  assert.equal(evaluate(m[1], context({ event: "push", branch: "main" })), "auto");
  assert.equal(evaluate(m[1], context({ event: "pull_request", branch: "x", base: "alpha" })), "auto");
});

test("PR compares use the PR base's baseline", () => {
  const step = actionStep();
  // The default is the PR's base branch, which is exactly right for main and
  // alpha alike. Pinning it — or adding a key, which renames the artifact —
  // would point alpha PRs at a baseline alpha never publishes.
  assert.doesNotMatch(step, /\n\s*baseline-branch:/, "leave baseline-branch at its default (the PR base)");
  assert.doesNotMatch(step, /\n\s*key:/, "a key renames the artifact; one baseline name per branch is enough");
  assert.match(step, /\n\s*retention-days:\s*"14"/, "the docs' reseed cadence assumes 14-day baselines");
});

test("docs carry the alpha reseed lever and no longer say alpha skips VRT", () => {
  assert.match(
    VRT_DOC,
    /gh workflow run ci\.yml --ref alpha/,
    "docs/VISUAL_REGRESSION.md must document the alpha reseed",
  );
  for (const [name, doc] of [
    ["docs/VISUAL_REGRESSION.md", VRT_DOC],
    ["docs/releasing.md", RELEASING_DOC],
  ]) {
    assert.doesNotMatch(doc, /skipped on PRs into `alpha`/i, `${name} still says alpha has no VRT`);
  }
});
