import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildManifest,
  isInventoryOwner,
  parseShard,
  selectShard,
  taskKey,
  verifyManifests,
} from "../../vrt/shard.mjs";

const tasks = (n) => Array.from({ length: n }, (_, i) => ({ id: `s${i}`, theme: "dark", viewport: "desktop" }));

test("a shard spec parses into a 1-based index and total", () => {
  assert.deepEqual(parseShard("1/15"), { index: 1, total: 15 });
  assert.deepEqual(parseShard("15/15"), { index: 15, total: 15 });
});

test("an absent shard spec means the whole suite", () => {
  assert.equal(parseShard(null), null);
  assert.equal(parseShard(undefined), null);
});

test("a malformed or out-of-range shard spec is rejected, not silently coerced", () => {
  // Every one of these would otherwise quietly shoot the wrong slice — or an
  // empty one — and a VRT job that compares nothing still exits 0.
  for (const bad of ["", "3", "3/", "/3", "a/b", "0/5", "6/5", "-1/5", "3/0", "1.5/5", "3/5/7"]) {
    assert.throws(() => parseShard(bad), /shard/i, `expected "${bad}" to be rejected`);
  }
});

test("shards partition the task list exactly once, with no gaps or overlap", () => {
  const all = tasks(2132);
  const total = 15;
  const seen = new Set();
  for (let index = 1; index <= total; index++) {
    for (const t of selectShard(all, { index, total })) {
      const key = `${t.viewport}/${t.theme}/${t.id}`;
      assert.equal(seen.has(key), false, `${key} appeared in more than one shard`);
      seen.add(key);
    }
  }
  assert.equal(seen.size, all.length, "every task must land in exactly one shard");
});

test("shards are balanced to within one task", () => {
  const all = tasks(2132);
  const total = 15;
  const sizes = [];
  for (let index = 1; index <= total; index++) sizes.push(selectShard(all, { index, total }).length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `unbalanced shards: ${sizes.join(",")}`);
});

// Stride rather than contiguous chunks: tasks are grouped by viewport then
// theme, so a contiguous slice would hand one shard every desktop shot and
// another every mobile shot. Those cost different amounts, and the job is only
// as fast as its slowest shard.
test("sharding is strided so viewport and theme cost spreads across shards", () => {
  const mixed = [
    { id: "a", theme: "dark", viewport: "desktop" },
    { id: "b", theme: "dark", viewport: "desktop" },
    { id: "a", theme: "dark", viewport: "mobile" },
    { id: "b", theme: "dark", viewport: "mobile" },
  ];
  const first = selectShard(mixed, { index: 1, total: 2 });
  assert.deepEqual(new Set(first.map((t) => t.viewport)), new Set(["desktop", "mobile"]));
});

test("an unsharded run selects everything", () => {
  const all = tasks(10);
  assert.equal(selectShard(all, null).length, 10);
});

test("more shards than tasks yields empty slices rather than throwing", () => {
  const all = tasks(2);
  assert.equal(selectShard(all, { index: 1, total: 5 }).length, 1);
  assert.equal(selectShard(all, { index: 5, total: 5 }).length, 0);
});

// Global inventory checks (stale baselines, orphans, strays) need the FULL
// story list, which every shard has. Letting all 15 report them would print
// each failure 15 times; letting none report them would silently drop the
// check that catches a deleted-but-not-rebaselined story.
test("exactly one shard owns the global inventory checks", () => {
  const total = 15;
  const owners = [];
  for (let index = 1; index <= total; index++) if (isInventoryOwner({ index, total })) owners.push(index);
  assert.deepEqual(owners, [1], "inventory checks must be owned by exactly one shard");
});

test("an unsharded run owns the inventory checks", () => {
  assert.equal(isInventoryOwner(null), true);
});

test("task keys are the on-disk baseline path, so manifests and files agree", () => {
  assert.equal(
    taskKey({ viewport: "desktop", theme: "dark", id: "components-button--primary" }),
    "desktop/dark/components-button--primary.png",
  );
});

test("task keys sanitise ids the same way baseline filenames do", () => {
  assert.equal(taskKey({ viewport: "mobile", theme: "light", id: "a/b c" }), "mobile/light/a_b_c.png");
});

const manifests = (total, expected) =>
  Array.from({ length: total }, (_, i) =>
    buildManifest({
      shard: { index: i + 1, total },
      expected,
      shot: expected.filter((_, idx) => idx % total === i),
    }),
  );

test("a complete set of manifests verifies", () => {
  const expected = ["desktop/dark/a.png", "desktop/dark/b.png", "mobile/light/c.png"];
  const result = verifyManifests(manifests(3, expected));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.expected.slice().sort(), expected.slice().sort());
  assert.equal(result.total, 3);
});

test("a missing shard fails verification instead of committing a thinned tree", () => {
  // This is the whole point of the manifest. A dropped artifact would
  // otherwise produce a baseline tree with holes, and the next compare would
  // read those holes as "new story — no baseline" rather than as a broken seed.
  const expected = ["desktop/dark/a.png", "desktop/dark/b.png", "mobile/light/c.png"];
  const result = verifyManifests(manifests(3, expected).filter((m) => m.shard !== 2));
  assert.ok(result.errors.length > 0);
  assert.match(result.errors.join("\n"), /shard 2/i);
});

test("duplicate shards fail verification", () => {
  const expected = ["desktop/dark/a.png", "desktop/dark/b.png"];
  const all = manifests(2, expected);
  const result = verifyManifests([all[0], all[0]]);
  assert.ok(result.errors.length > 0);
  assert.match(result.errors.join("\n"), /duplicate|shard 2/i);
});

test("shards that disagree about the full story set fail verification", () => {
  // Two shards built from different Storybook builds — e.g. a re-run that
  // picked up a newer commit. Merging them yields a tree that matches neither.
  const a = buildManifest({
    shard: { index: 1, total: 2 },
    expected: ["desktop/dark/a.png"],
    shot: ["desktop/dark/a.png"],
  });
  const b = buildManifest({ shard: { index: 2, total: 2 }, expected: ["desktop/dark/b.png"], shot: [] });
  const result = verifyManifests([a, b]);
  assert.ok(result.errors.length > 0);
  assert.match(result.errors.join("\n"), /disagree|expected/i);
});

test("shards that disagree about the shard total fail verification", () => {
  const expected = ["desktop/dark/a.png"];
  const a = buildManifest({ shard: { index: 1, total: 2 }, expected, shot: expected });
  const b = buildManifest({ shard: { index: 2, total: 3 }, expected, shot: [] });
  assert.ok(verifyManifests([a, b]).errors.length > 0);
});

test("a shard that shot less than it claimed fails verification", () => {
  const expected = ["desktop/dark/a.png", "desktop/dark/b.png"];
  const a = buildManifest({ shard: { index: 1, total: 2 }, expected, shot: ["desktop/dark/a.png"] });
  const b = buildManifest({ shard: { index: 2, total: 2 }, expected, shot: [] });
  const result = verifyManifests([a, b]);
  assert.ok(result.errors.length > 0);
  assert.match(result.errors.join("\n"), /desktop\/dark\/b\.png/);
});

test("an empty manifest set fails rather than adopting an empty tree", () => {
  const result = verifyManifests([]);
  assert.ok(result.errors.length > 0);
});
