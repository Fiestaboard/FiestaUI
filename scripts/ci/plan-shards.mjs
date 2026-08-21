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
// The signal is the committed baseline tree, which is exact (every baseline is
// one comparison) and free to read — no `npm ci`, no Storybook build, so the
// planner job costs seconds and never meaningfully gates anything.
//
// Dependency-free ESM so ci.yml and vrt-update.yml can run it with bare `node`.
//
// Run directly to plan from the real tree and write $GITHUB_OUTPUT keys:
//   node scripts/ci/plan-shards.mjs

import { readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASELINES_DIR = path.join(ROOT, "vrt", "baselines");

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
 * Every baseline PNG is exactly one comparison a VRT shard performs, so the
 * file count is the shot count — not an estimate of it.
 *
 * @param {string[]} relativePaths `<viewport>/<theme>/<id>.png` paths
 * @returns {number}
 */
export function countVrtShots(relativePaths) {
  return relativePaths.length;
}

/**
 * Distinct story ids across the tree.
 *
 * Counted as a set over basenames rather than by reading one `<viewport>/
 * <theme>/` directory, so a half-written or mid-migration tree still reports
 * the true story count instead of collapsing to zero and quietly dropping a11y
 * to a single shard.
 *
 * @param {string[]} relativePaths `<viewport>/<theme>/<id>.png` paths
 * @returns {number}
 */
export function countStories(relativePaths) {
  return new Set(relativePaths.map((p) => path.posix.basename(p))).size;
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
 * @returns {{vrt: {count: number, list: number[]}, a11y: {count: number, list: number[]}}}
 */
export function planShards({ shots, stories }) {
  const vrtCount = shardCount(shots, VRT_LIMITS);
  const a11yCount = shardCount(stories, A11Y_LIMITS);
  return {
    vrt: { count: vrtCount, list: shardList(vrtCount) },
    a11y: { count: a11yCount, list: shardList(a11yCount) },
  };
}

/**
 * Inventory vrt/baselines/ as `<viewport>/<theme>/<id>.png` relative paths.
 *
 * A missing tree is not an error: baselines are seeded by a separate workflow,
 * and `vrt.mjs compare` already warns-and-passes when they are absent. This
 * returns [] so the planner degrades to one shard of each rather than failing
 * the run before the suite gets a chance to explain itself.
 *
 * @returns {Promise<string[]>}
 */
export async function listBaselines(dir = BASELINES_DIR) {
  try {
    const entries = await readdir(dir, { recursive: true, withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && e.name.endsWith(".png"))
      .map((e) => path.relative(dir, path.join(e.parentPath ?? e.path, e.name)));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

// CLI: measure the real tree and print $GITHUB_OUTPUT keys on stdout, with the
// rationale on stderr so it lands in the job log without polluting the outputs.
if (import.meta.url === `file://${process.argv[1]}`) {
  const files = await listBaselines();
  const shots = countVrtShots(files);
  const stories = countStories(files);
  const plan = planShards({ shots, stories });

  console.error(`Baselines: ${shots} shot(s) across ${stories} story/stories.`);
  console.error(
    `VRT: ${plan.vrt.count} shard(s) at ~${Math.ceil(shots / plan.vrt.count)} shots each ` +
      `(target ${VRT_LIMITS.target}, cap ${VRT_LIMITS.max}).`,
  );
  console.error(
    `A11y: ${plan.a11y.count} shard(s) x 2 themes = ${plan.a11y.count * 2} legs, ` +
      `~${Math.ceil(stories / plan.a11y.count)} stories each (target ${A11Y_LIMITS.target}, cap ${A11Y_LIMITS.max}).`,
  );
  if (shots === 0) {
    console.error("No baselines found — planning one shard each. Seed baselines to unlock sharding.");
  }

  console.log(`vrt_shards=${JSON.stringify(plan.vrt.list)}`);
  console.log(`vrt_shard_count=${plan.vrt.count}`);
  console.log(`a11y_shards=${JSON.stringify(plan.a11y.list)}`);
  console.log(`a11y_shard_count=${plan.a11y.count}`);
}
