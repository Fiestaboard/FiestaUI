#!/usr/bin/env node
/**
 * Smoke check for the Figma parity harness (slice 1.0c). It reads the output
 * of a REAL browser run of `vrt.mjs parity`, not a `--shots` replay, and
 * asserts that the harness WORKED:
 *   - every ref the manifest targets has a report entry, and no entry errored;
 *   - each entry carries probes 1–5 (token, geometry, text, colour, board)
 *     and the pixel diff, and probes 1–4 measured at least one item;
 *   - the DOM capture has a root, and no probed value came back unmeasured;
 *   - every token carries a sentinel binding result (P2);
 *   - the shot and diff PNGs were written;
 *   - the report still says `gating: false`.
 *
 * It NEVER reads `pass` or `wouldPass`. Parity findings stay report-only until
 * K2 calibration, so this job turns red when the harness is broken, never
 * because the implementation differs from Figma.
 *
 *   node scripts/vrt/parity-smoke.mjs <out dir> [--refs <dir>] [--manifest <file>]
 *
 * --refs defaults to the fixture CI runs against. Exit 0 when the harness
 * worked, 1 when it did not, and 2 on bad input. The markdown goes to stdout,
 * for $GITHUB_STEP_SUMMARY.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { joinRefs, loadManifest, loadRefs, resolveRefsDir } from "./parity.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_REFS = path.join(ROOT, "scripts", "ci", "tests", "fixtures", "parity");
const DEFAULT_MANIFEST = path.join(ROOT, "vrt", "figma-refs.json");

/** §3.3 checks 1–5, in order. Check 6, the pixel diff, is required as well. */
export const PROBES = ["token", "geometry", "text", "color", "board"];
/** The probes that must have measured something. A ref without tiles has no board. */
const MUST_MEASURE = ["token", "geometry", "text", "color"];

/**
 * @param {{
 *   report: object,
 *   expectedIds: string[],
 *   artifacts: Record<string, {png: boolean, diff: boolean, dom: object|null}>,
 * }} input
 * @returns {{ok: boolean, problems: string[]}}
 */
export function checkSmoke({ report, expectedIds, artifacts }) {
  const problems = [];
  if (report.gating !== false) problems.push(`report.gating is ${JSON.stringify(report.gating)}, expected false`);
  const byId = new Map((report.entries ?? []).map((e) => [e.id, e]));
  for (const id of expectedIds) {
    const entry = byId.get(id);
    if (!entry) {
      problems.push(`${id}: no report entry`);
      continue;
    }
    if (entry.error) {
      problems.push(`${id}: the harness errored: ${entry.error}`);
      continue;
    }
    for (const probe of [...PROBES, "pixel"]) {
      if (!entry.checks?.[probe]) problems.push(`${id}: no ${probe} check in the report`);
    }
    for (const probe of MUST_MEASURE) {
      const c = entry.checks?.[probe];
      if (c && !(c.checked > 0)) problems.push(`${id}: the ${probe} probe checked nothing`);
    }
    if (entry.checks?.pixel && typeof entry.checks.pixel.ratio !== "number") {
      problems.push(`${id}: the pixel diff has no ratio`);
    }
    const a = artifacts[id] ?? {};
    if (!a.png) problems.push(`${id}: no shot (${id}.png)`);
    if (!a.diff) problems.push(`${id}: no diff (${id}.diff.png)`);
    const dom = a.dom;
    if (!dom) {
      problems.push(`${id}: no DOM capture (${id}.dom.json)`);
      continue;
    }
    if (!dom.root) problems.push(`${id}: the DOM capture has no root`);
    for (const t of dom.tokens ?? []) {
      if (t.value === null || t.value === undefined) problems.push(`${id}: token ${t.property} not measured`);
      if (!t.binding || typeof t.binding.follows !== "boolean") {
        problems.push(`${id}: token ${t.property} has no sentinel binding result`);
      }
    }
    for (const g of dom.geometry ?? []) if (!g.rect) problems.push(`${id}: geometry ${g.node} not measured`);
    for (const t of dom.text ?? []) if (typeof t.text !== "string") problems.push(`${id}: text ${t.node} not measured`);
  }
  return { ok: problems.length === 0, problems };
}

function readArtifacts(outDir, ids) {
  const artifacts = {};
  for (const id of ids) {
    const domFile = path.join(outDir, `${id}.dom.json`);
    artifacts[id] = {
      png: existsSync(path.join(outDir, `${id}.png`)),
      diff: existsSync(path.join(outDir, `${id}.diff.png`)),
      dom: existsSync(domFile) ? JSON.parse(readFileSync(domFile, "utf8")) : null,
    };
  }
  return artifacts;
}

function main(argv) {
  let outDir = null;
  let refsArg = DEFAULT_REFS;
  let manifestFile = DEFAULT_MANIFEST;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--refs") refsArg = argv[++i];
    else if (argv[i] === "--manifest") manifestFile = argv[++i];
    else if (!outDir && !argv[i].startsWith("--")) outDir = argv[i];
    else {
      console.error(`Unknown argument: ${argv[i]}`);
      return 2;
    }
  }
  let report;
  let expectedIds;
  try {
    if (!outDir) throw new Error("usage: parity-smoke.mjs <out dir> [--refs <dir>] [--manifest <file>]");
    const reportFile = path.join(outDir, "report.json");
    if (!existsSync(reportFile)) throw new Error(`no report.json in ${outDir}: the harness did not finish`);
    report = JSON.parse(readFileSync(reportFile, "utf8"));
    const { pairs } = joinRefs(loadRefs(resolveRefsDir(refsArg)), loadManifest(manifestFile));
    expectedIds = pairs.map((p) => p.ref.id);
    if (expectedIds.length === 0) throw new Error("the refs and the manifest share no id: nothing to smoke-test");
  } catch (err) {
    console.error(`parity-smoke: ${err.message}`);
    return 2;
  }
  const { ok, problems } = checkSmoke({ report, expectedIds, artifacts: readArtifacts(outDir, expectedIds) });
  const lines = [
    "## Parity harness smoke test",
    "",
    "This checks that the harness ran, not what it found. Parity findings are report-only (see report.md).",
    "",
    `Refs checked: ${expectedIds.map((id) => `\`${id}\``).join(", ")}`,
    "",
    ok
      ? "**Harness OK:** every ref was shot and measured, and probes 1–5 and the pixel diff were reported."
      : "**Harness BROKEN:**",
    ...problems.map((p) => `- ${p}`),
    "",
  ];
  process.stdout.write(lines.join("\n"));
  return ok ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
