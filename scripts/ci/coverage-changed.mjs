// Changed-file coverage rule (MASTER-PLAN §1 principle 3, §4.4.1 step 8).
//
// Every source file a PR adds or changes must reach ≥90% lines and ≥85%
// branches. Files the PR leaves alone are never checked: there is no back-fill,
// so legacy coverage gaps don't block unrelated work. The whole touched file
// is measured, not just the changed lines.
//
// Pure functions over plain data; the CLI below does the git plumbing and
// reads vitest's istanbul `json-summary` output. No dependencies.
//
//   npm run test:coverage   # writes coverage/coverage-summary.json
//   node scripts/ci/coverage-changed.mjs <base-sha> <head-sha> [--summary <file>]
//   node scripts/ci/coverage-changed.mjs --files <list.txt> [--summary <file>]
//
// Exit codes: 0 pass, 1 a changed file is under threshold, 2 usage/input error.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export const LINE_THRESHOLD = 90;
export const BRANCH_THRESHOLD = 85;

const DEFAULT_SUMMARY = "coverage/coverage-summary.json";

/**
 * True for a file the rule applies to: shipped TypeScript under src/. Tests,
 * stories, Code Connect mappings, declaration files and the test harness are
 * not product code. Keep in step with `coverage.exclude` in vitest.config.ts.
 *
 * @param {string} file repo-relative path
 */
export function isCoverageCandidate(file) {
  if (!/^src\/.+\.(ts|tsx)$/.test(file)) return false;
  if (file.startsWith("src/test/")) return false;
  return !/\.(test|stories|figma)\.(ts|tsx)$/.test(file) && !file.endsWith(".d.ts");
}

/**
 * istanbul reports pct "Unknown" (or 100) when a file has nothing to count, as
 * in a type-only module. Nothing to cover is not a failure.
 *
 * @param {{total: number, pct: number|string}} metric
 * @returns {number}
 */
function pctOf(metric) {
  if (!metric || metric.total === 0) return 100;
  return typeof metric.pct === "number" ? metric.pct : Number(metric.pct);
}

/**
 * @param {{changedFiles: string[], summary: Record<string, any>, root: string,
 *   lines?: number, branches?: number}} input
 *   summary: istanbul json-summary, keyed by absolute (or repo-relative) path.
 * @returns {{ok: boolean, reason: string, results: {file: string, lines: number|null,
 *   branches: number|null, ok: boolean, reason: string}[]}}
 */
export function checkCoverage({ changedFiles, summary, root, lines = LINE_THRESHOLD, branches = BRANCH_THRESHOLD }) {
  const byRelative = new Map();
  for (const [key, value] of Object.entries(summary)) {
    if (key === "total") continue;
    const rel = path.isAbsolute(key) ? path.relative(root, key) : key;
    byRelative.set(rel.split(path.sep).join("/"), value);
  }

  const candidates = [...new Set(changedFiles)].filter(isCoverageCandidate).sort();
  const results = candidates.map((file) => {
    const data = byRelative.get(file);
    if (!data) {
      return {
        file,
        lines: null,
        branches: null,
        ok: false,
        reason: "no coverage data — no test loads this file, or coverage.include misses it",
      };
    }
    const l = pctOf(data.lines);
    const b = pctOf(data.branches);
    const misses = [];
    if (!(l >= lines)) misses.push(`lines ${l}% < ${lines}%`);
    if (!(b >= branches)) misses.push(`branches ${b}% < ${branches}%`);
    return { file, lines: l, branches: b, ok: misses.length === 0, reason: misses.join(", ") };
  });

  const failed = results.filter((r) => !r.ok);
  let reason;
  if (results.length === 0) reason = "No changed source files under src/ — nothing to check.";
  else if (failed.length === 0)
    reason = `All ${results.length} changed source file(s) meet ${lines}% lines / ${branches}% branches.`;
  else
    reason = `${failed.length} of ${results.length} changed source file(s) under ${lines}% lines / ${branches}% branches.`;
  return { ok: failed.length === 0, reason, results };
}

/** Markdown for $GITHUB_STEP_SUMMARY. */
export function renderSummary({ reason, results }) {
  const out = ["### Changed-file coverage", "", reason];
  if (results.length > 0) {
    out.push("", "| File | Lines | Branches | Verdict |", "|---|---|---|---|");
    const fmt = (v) => (v === null ? "—" : `${v}%`);
    for (const r of results) {
      out.push(`| \`${r.file}\` | ${fmt(r.lines)} | ${fmt(r.branches)} | ${r.ok ? "pass" : `FAIL: ${r.reason}`} |`);
    }
  }
  return `${out.join("\n")}\n`;
}

function parseArgs(argv) {
  const args = { positional: [], summary: DEFAULT_SUMMARY, files: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--summary") args.summary = argv[++i];
    else if (argv[i] === "--files") args.files = argv[++i];
    else args.positional.push(argv[i]);
  }
  return args;
}

function usage(message) {
  console.error(message);
  console.error(
    "usage: node scripts/ci/coverage-changed.mjs <base-sha> <head-sha> [--summary <file>]\n" +
      "       node scripts/ci/coverage-changed.mjs --files <list.txt> [--summary <file>]",
  );
  process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();

  let changedFiles;
  if (args.files) {
    changedFiles = readFileSync(args.files, "utf8")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  } else {
    const [baseSha, headSha] = args.positional;
    if (!baseSha || !headSha) usage("missing <base-sha> <head-sha>");
    // Three-dot: what the PR introduces relative to where it branched. Deleted
    // files have nothing to measure.
    changedFiles = execFileSync("git", ["diff", "--name-only", "--diff-filter=d", `${baseSha}...${headSha}`], {
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
  }

  if (!existsSync(args.summary)) {
    usage(`coverage summary not found: ${args.summary} (run \`npm run test:coverage\` first)`);
  }
  const summary = JSON.parse(readFileSync(args.summary, "utf8"));
  const result = checkCoverage({ changedFiles, summary, root });

  process.stdout.write(renderSummary(result));
  if (!result.ok) {
    for (const r of result.results.filter((x) => !x.ok)) {
      console.error(`::error file=${r.file},title=Changed-file coverage::${r.reason}`);
    }
    process.exit(1);
  }
}
