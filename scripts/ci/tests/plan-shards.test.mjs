import assert from "node:assert/strict";
import { test } from "node:test";

import {
  A11Y_LIMITS,
  countStoryExports,
  countVrtShots,
  planShards,
  PROFILES,
  resolveProfile,
  shardCount,
  shardList,
  SHOTS_PER_STORY,
  VRT_LIMITS,
} from "../plan-shards.mjs";

test("shard count divides the workload by the target, rounding up", () => {
  const limits = { target: 150, max: 99 };
  assert.equal(shardCount(150, limits), 1);
  assert.equal(shardCount(151, limits), 2);
  assert.equal(shardCount(300, limits), 2);
  assert.equal(shardCount(1976, limits), 14);
});

test("a workload always gets at least one shard", () => {
  const limits = { target: 150, max: 99 };
  assert.equal(shardCount(0, limits), 1);
  assert.equal(shardCount(1, limits), 1);
});

// The cap is the org's 20-slot concurrency ceiling expressed in job counts.
// Past it, shards get BIGGER rather than more numerous — the suite still runs
// in full, it just stops buying more parallelism it cannot actually schedule.
test("shard count is capped, and the cap makes shards larger rather than more numerous", () => {
  const limits = { target: 150, max: 4 };
  assert.equal(shardCount(600, limits), 4);
  assert.equal(shardCount(100_000, limits), 4);
});

test("an unseeded or unreadable workload degrades to a single shard, never zero", () => {
  // A zero count reaches here when src/ holds no story files yet.
  // Zero shards would render an empty matrix, which GitHub treats as a skipped
  // job — the VRT gate would silently stop running instead of failing loudly.
  for (const limits of [VRT_LIMITS, A11Y_LIMITS]) {
    assert.equal(shardCount(0, limits), 1);
  }
});

test("shard list is 1-based and dense", () => {
  assert.deepEqual(shardList(1), [1]);
  assert.deepEqual(shardList(4), [1, 2, 3, 4]);
  assert.equal(shardList(14).length, 14);
});

test("shard indices are exactly the range the harness validates against", () => {
  const list = shardList(14);
  assert.equal(Math.min(...list), 1);
  assert.equal(Math.max(...list), 14);
  assert.equal(new Set(list).size, list.length);
});

test("story exports are counted by the CSF contract: export const at line start", () => {
  const source = [
    "export const Default: Story = {};",
    "export const WithForm = () => (<div />);",
    "const helper = 1;",
    "  export const Indented = {};", // not at line start — not counted
    "export function notAStoryHelper() {}", // not a const export
  ].join("\n");
  assert.equal(countStoryExports(source), 2);
});

test("an empty or storyless file counts zero", () => {
  assert.equal(countStoryExports(""), 0);
  assert.equal(countStoryExports("const x = 1;\nexport default meta;"), 0);
});

test("predicted shots are stories times the theme/viewport fan-out", () => {
  // Every story renders once per THEMES x VIEWPORTS combination.
  assert.equal(countVrtShots(2), 2 * SHOTS_PER_STORY);
  assert.equal(countVrtShots(0), 0);
});

test("a plan emits both a matrix array and the scalar the --shard flag needs", () => {
  const plan = planShards({ shots: 1976, stories: 494 });
  assert.equal(plan.vrt.count, 14);
  assert.equal(plan.vrt.list.length, 14);
  assert.equal(plan.a11y.count, 4);
  assert.equal(plan.a11y.list.length, 4);
});

test("the plan grows its job count as the suite grows", () => {
  const small = planShards({ shots: 400, stories: 100 });
  const large = planShards({ shots: 1976, stories: 494 });
  assert.ok(large.vrt.count > small.vrt.count, "more shots must buy more VRT shards");
  assert.ok(large.a11y.count > small.a11y.count, "more stories must buy more a11y shards");
});

test("the plan is serialisable as GitHub Actions matrix input", () => {
  const plan = planShards({ shots: 1976, stories: 494 });
  // `fromJSON` needs a real JSON array; a stringified JS array with single
  // quotes parses as a string and silently produces a one-leg matrix.
  assert.deepEqual(JSON.parse(JSON.stringify(plan.vrt.list)), plan.vrt.list);
  assert.equal(JSON.stringify(plan.a11y.list), "[1,2,3,4]");
});

test("planShards defaults to the ci profile", () => {
  const workload = { shots: 2360, stories: 590 };
  assert.deepEqual(planShards(workload), planShards(workload, PROFILES.ci));
});

test("an unknown profile name throws instead of falling back", () => {
  // A typo that silently resolved to `ci` would plan a perfectly valid fan-out
  // of the wrong width, and nothing anywhere would turn red. Same reasoning as
  // the strict `--shard` parsing in scripts/vrt/shard.mjs.
  assert.throws(() => resolveProfile("updat"), /Unknown --profile "updat"/);
  assert.throws(() => resolveProfile(undefined), /Unknown --profile/);
  // Not reachable via inherited object keys either.
  assert.throws(() => resolveProfile("constructor"), /Unknown --profile/);
});

test("every profile resolves to a usable pair of limit sets", () => {
  for (const name of Object.keys(PROFILES)) {
    const limits = resolveProfile(name);
    for (const suite of ["vrt", "a11y"]) {
      assert.ok(limits[suite].target > 0, `${name}.${suite}.target must be positive`);
      assert.ok(limits[suite].max >= 1, `${name}.${suite}.max must be at least 1`);
    }
  }
});
