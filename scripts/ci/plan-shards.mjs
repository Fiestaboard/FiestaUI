// The single definition of "how many parallel jobs should the visual and
// accessibility suites get?".
//
// Both suites used to be one long job each. VRT shoots every story at two
// viewports x two themes — 1,976 screenshots at the time of writing — and ran
// for ~8 minutes of a ~9 minute job. Splitting that across runners is nearly
// free here: the per-job setup (checkout, npm ci, cached Playwright, Storybook
// build, serve) measures ~65 seconds, so a shard spends most of its life doing
// real work rather than installing.
//
// The count is DERIVED, not hardcoded, so the job count tracks the suite: add
// 200 stories and VRT earns more shards on the next run with no workflow edit.
// The signal is the story exports under src/ — baselines now live as build
// artifacts (see docs/VISUAL_REGRESSION.md), so there is no committed tree to
// count. Story exports predict the workload almost exactly: every CSF export
// is one story, and every story is shot THEMES x VIEWPORTS times (610 exports
// x 4 = 2,440 predicted vs 2,436 actual shots at migration time). Free to
// read — no `npm ci`, no Storybook build, so the planner job costs seconds.
//
// Dependency-free ESM so ci.yml can run it with bare `node`.
//
// Run directly to plan from the real tree and write $GITHUB_OUTPUT keys:
//   node scripts/ci/plan-shards.mjs [--profile ci|update]

import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SRC_DIR = path.join(ROOT, "src");

/**
 * Shots per story: THEMES x VIEWPORTS in scripts/vrt/vrt.mjs (2 x 2). Kept
 * here as a plain number because the planner must stay dependency-free and
 * cheap — importing vrt.mjs would drag in playwright at module scope. If the
 * theme or viewport axes change there, change this with it; the cost of drift
 * is shard sizing, not correctness.
 */
export const SHOTS_PER_STORY = 4;

/**
 * Target workload per shard, and the ceiling on how many shards to ask for.
 *
 * `target` is set from measured runtime, not taste: VRT's ~8 minutes across
 * 1,976 shots is ~0.24s/shot, so 150 shots is ~36 seconds of shooting against
 * ~65 seconds of setup. Going much below this buys seconds of wall clock for a
 * whole extra runner, which is a bad trade even where minutes are free.
 *
 * `max` exists because Fiestaboard is on GitHub Free: 20 concurrent jobs,
 * shared across every repo in the org. Uncapped, a growing suite would
 * eventually request more runners than the org can schedule and the excess
 * would queue — turning "more shards" into strictly negative value. At the cap
 * shards get LARGER rather than more numerous, so coverage never changes; only
 * wall clock does. Raise these together with the org's plan, not alone.
 */
export const VRT_LIMITS = { target: 150, max: 16 };

/**
 * A11y's unit is stories, not shots: the theme axis is already its own matrix
 * dimension (`dark`/`light`), so a shard count of N produces 2N legs. The cap
 * is correspondingly lower for the same 20-slot reason.
 *
 * A11y is the cheaper suite (~110s per theme today), so sharding it wins less
 * than VRT's does. It is wired the same way anyway so the two cannot drift,
 * and so it scales on its own once story count grows past one runner's worth.
 */
export const A11Y_LIMITS = { target: 150, max: 6 };

/**
 * Named limit sets, so a workflow selects a policy by name instead of encoding
 * one in its own YAML. `ci` is the only profile today; it survived its sibling
 * (`update`, retired with vrt-update.yml when baselines moved to build
 * artifacts) because the name-not-numbers contract is what kept that
 * retirement a one-line change.
 */
export const PROFILES = {
  ci: { vrt: VRT_LIMITS, a11y: A11Y_LIMITS },
};

/**
 * Look up a profile by name, throwing on anything unknown.
 *
 * Strict rather than falling back to `ci`, for the same reason `--shard`
 * parsing is strict: a typo that silently resolves to the default plans a
 * perfectly valid fan-out of the wrong width, and nothing anywhere turns red.
 * The cost is a failed planner job, which is loud and takes seconds to fix.
 *
 * @param {string} name
 * @returns {{vrt: {target: number, max: number}, a11y: {target: number, max: number}}}
 */
export function resolveProfile(name) {
  // `Object.hasOwn`, not a truthiness check on `PROFILES[name]`: a plain object
  // inherits from Object.prototype, so `PROFILES.constructor` is `Object` —
  // truthy, and it would sail through to be destructured as a limit set,
  // failing later as an undefined `target` rather than here as a bad name.
  const profile = Object.hasOwn(PROFILES, String(name)) ? PROFILES[name] : undefined;
  if (!profile) {
    throw new Error(`Unknown --profile "${name}": expected one of ${Object.keys(PROFILES).join(", ")}`);
  }
  return profile;
}

/**
 * Shards needed to keep each shard at or under `target`, clamped to `[1, max]`.
 *
 * The floor of 1 is load-bearing. An empty or unseeded baseline tree yields a
 * count of 0, and a 0-length matrix array makes GitHub skip the job entirely —
 * the VRT gate would stop running and report green, which is the exact failure
 * this suite exists to prevent. One shard that finds nothing to do is safe; a
 * job that never runs is not.
 *
 * @param {number} units workload size (shots for VRT, stories for a11y)
 * @param {{target: number, max: number}} limits
 * @returns {number} shard count in [1, limits.max]
 */
export function shardCount(units, { target, max }) {
  return Math.min(max, Math.max(1, Math.ceil(units / target)));
}

/**
 * The 1-based, dense shard indices for a count — the array a `fromJSON` matrix
 * consumes, and the range `vrt.mjs --shard i/N` validates against.
 *
 * @param {number} count
 * @returns {number[]}
 */
export function shardList(count) {
  return Array.from({ length: count }, (_, i) => i + 1);
}

/**
 * Count CSF story exports in one story file's source.
 *
 * `export const Name` at line start is the CSF contract Storybook itself
 * indexes on, so this regex tracks the real story count without executing
 * anything. Non-story exports sneaking in (a helper exported from a stories
 * file) would inflate the estimate by one shard at worst — sizing, not
 * correctness.
 *
 * @param {string} source
 * @returns {number}
 */
export function countStoryExports(source) {
  return (source.match(/^export const [A-Za-z_$][\w$]*/gm) ?? []).length;
}

/**
 * Predicted shot count for a story total: every story renders once per
 * theme/viewport combination.
 *
 * @param {number} stories
 * @returns {number}
 */
export function countVrtShots(stories) {
  return stories * SHOTS_PER_STORY;
}

/**
 * Turn measured workload into both forms the workflows need: a JSON array for
 * `strategy.matrix`, and a scalar N for the harness's `--shard i/N` argument.
 *
 * The scalar is emitted explicitly rather than reusing `strategy.job-total`,
 * which counts every leg of the matrix — correct for VRT but wrong for a11y,
 * where the theme dimension multiplies the leg count and would make each job
 * claim to be shard i of 2N.
 *
 * @param {{shots: number, stories: number}} workload
 * @param {{vrt: {target: number, max: number}, a11y: {target: number, max: number}}} limits
 * @returns {{vrt: {count: number, list: number[]}, a11y: {count: number, list: number[]}}}
 */
export function planShards({ shots, stories }, limits = PROFILES.ci) {
  const vrtCount = shardCount(shots, limits.vrt);
  const a11yCount = shardCount(stories, limits.a11y);
  return {
    vrt: { count: vrtCount, list: shardList(vrtCount) },
    a11y: { count: a11yCount, list: shardList(a11yCount) },
  };
}

/**
 * Story files under src/, by the same naming convention Storybook's config
 * globs on.
 *
 * A missing src/ is not an error — it returns [] so the planner degrades to
 * one shard of each rather than failing the run before the suite gets a
 * chance to explain itself.
 *
 * @returns {Promise<string[]>} absolute paths
 */
export async function listStoryFiles(dir = SRC_DIR) {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && /\.stories\.[cm]?[jt]sx?$/.test(e.name))
      .map((e) => path.join(e.parentPath ?? e.path, e.name));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// CLI: measure the real tree and print $GITHUB_OUTPUT keys on stdout, with the
// rationale on stderr so it lands in the job log without polluting the outputs.
if (import.meta.url === `file://${process.argv[1]}`) {
  // Only one flag, so no parser: `--profile <name>`, defaulting to `ci`.
  const flagIndex = process.argv.indexOf("--profile");
  const profileName = flagIndex === -1 ? "ci" : process.argv[flagIndex + 1];
  let limits;
  try {
    limits = resolveProfile(profileName);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }

  const { readFile } = await import("node:fs/promises");
  const files = await listStoryFiles();
  let stories = 0;
  for (const file of files) stories += countStoryExports(await readFile(file, "utf8"));
  const shots = countVrtShots(stories);
  const plan = planShards({ shots, stories }, limits);

  console.error(`Profile: ${profileName}.`);
  console.error(`Stories: ${stories} across ${files.length} file(s) — ~${shots} predicted shot(s).`);
  console.error(
    `VRT: ${plan.vrt.count} shard(s) at ~${Math.ceil(shots / plan.vrt.count)} shots each ` +
      `(target ${limits.vrt.target}, cap ${limits.vrt.max}).`,
  );
  console.error(
    `A11y: ${plan.a11y.count} shard(s) x 2 themes = ${plan.a11y.count * 2} legs, ` +
      `~${Math.ceil(stories / plan.a11y.count)} stories each (target ${limits.a11y.target}, cap ${limits.a11y.max}).`,
  );
  if (shots === 0) {
    console.error("No story files found — planning one shard each.");
  }

  console.log(`vrt_shards=${JSON.stringify(plan.vrt.list)}`);
  console.log(`vrt_shard_count=${plan.vrt.count}`);
  console.log(`a11y_shards=${JSON.stringify(plan.a11y.list)}`);
  console.log(`a11y_shard_count=${plan.a11y.count}`);
}
