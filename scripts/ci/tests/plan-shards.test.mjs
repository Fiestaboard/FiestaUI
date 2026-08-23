import assert from "node:assert/strict";
import { test } from "node:test";

import {
  A11Y_LIMITS,
  countStories,
  countVrtShots,
  planShards,
  PROFILES,
  resolveProfile,
  shardCount,
  shardList,
  VRT_LIMITS,
  VRT_UPDATE_LIMITS,
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
  // A zero count reaches here when vrt/baselines/ is absent (not yet seeded).
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

test("counts derive from the committed baseline tree", () => {
  const files = [
    "desktop/dark/a.png",
    "desktop/dark/b.png",
    "desktop/light/a.png",
    "desktop/light/b.png",
    "mobile/dark/a.png",
    "mobile/dark/b.png",
    "mobile/light/a.png",
    "mobile/light/b.png",
  ];
  // Every shot is one comparison, so the shot count IS the baseline count.
  assert.equal(countVrtShots(files), 8);
  // A11y visits each story once per theme, and the theme axis is already a
  // separate matrix dimension — so its unit is stories, not shots.
  assert.equal(countStories(files), 2);
});

test("story count ignores viewport and theme fan-out", () => {
  const files = ["desktop/dark/only.png", "desktop/light/only.png", "mobile/dark/only.png", "mobile/light/only.png"];
  assert.equal(countVrtShots(files), 4);
  assert.equal(countStories(files), 1);
});

test("story count survives a baseline tree that is mid-migration", () => {
  // Only desktop/dark has been written yet. The story count must not collapse
  // to zero (which would silently drop a11y to one shard) just because the
  // other viewport/theme dirs are not populated.
  assert.equal(countStories(["desktop/dark/a.png", "desktop/dark/b.png", "desktop/dark/c.png"]), 3);
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

// --- Profiles -------------------------------------------------------------
//
// ci.yml plans `compare`; vrt-update.yml plans `shoot`. Same sizing rule, two
// slot budgets — see VRT_UPDATE_LIMITS for the measurements behind the split.

test("the update profile applies the same per-shard sizing rule as ci", () => {
  // Not merely equal today: derived, so retuning one cannot silently leave the
  // other behind. Shard SIZE is a property of setup cost against per-shot cost,
  // and both fan-outs pay the same of each.
  assert.equal(VRT_UPDATE_LIMITS.target, VRT_LIMITS.target);
});

test("the update profile asks for fewer runner slots than ci's", () => {
  // The whole point of the profile. A rebaseline overlaps the CI run on the
  // branch it was dispatched from, and ci.yml alone peaks at ~28 legs against
  // the org's 20 shared slots.
  assert.ok(
    VRT_UPDATE_LIMITS.max < VRT_LIMITS.max,
    `update cap (${VRT_UPDATE_LIMITS.max}) must be below ci's (${VRT_LIMITS.max})`,
  );
});

test("the update profile plans a narrower VRT fan-out for the same tree", () => {
  const workload = { shots: 2360, stories: 590 }; // the tree as of this commit
  const ci = planShards(workload, PROFILES.ci);
  const update = planShards(workload, PROFILES.update);

  assert.equal(ci.vrt.count, 16);
  assert.equal(update.vrt.count, 8);
  assert.equal(update.vrt.list.length, 8);
});

test("narrowing the fan-out changes shard size, never coverage", () => {
  // The cap makes shards LARGER rather than dropping work — the same property
  // VRT_LIMITS.max relies on. Every shot must still be owned by some shard.
  const shots = 2360;
  const update = planShards({ shots, stories: 590 }, PROFILES.update);
  assert.ok(
    update.vrt.count * Math.ceil(shots / update.vrt.count) >= shots,
    "the planned shards must between them cover every shot",
  );
});

test("a11y sizing is identical across profiles", () => {
  // Only VRT's slot budget differs; a11y is not dispatched by vrt-update.yml
  // at all, and giving it a second set of numbers would invite drift.
  const workload = { shots: 2360, stories: 590 };
  assert.deepEqual(planShards(workload, PROFILES.ci).a11y, planShards(workload, PROFILES.update).a11y);
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
