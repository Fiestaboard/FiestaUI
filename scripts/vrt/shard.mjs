// Sharding and merge-verification for the VRT harness.
//
// Split out of vrt.mjs and kept dependency-free on purpose: vrt.mjs imports
// playwright, pixelmatch and pngjs at module scope, so importing it from a
// test would mean installing browsers to assert arithmetic. Everything here is
// pure, so `scripts/ci/tests/vrt-shard.test.mjs` runs under bare `node` in the
// automation job alongside the other dependency-free suites.
//
// Two jobs live here:
//
//   * Slicing the shot list, so N runners each shoot 1/N of it (`compare`).
//   * Verifying that N partial trees reassemble into a WHOLE one (`adopt`).
//
// The second matters more than it looks. `update`/`adopt` rewrite
// vrt/baselines/ wholesale, so a shard whose artifact went missing would
// commit a baseline tree with holes — and the next `compare` reads a hole as
// "new story, no baseline", which is indistinguishable from a story someone
// just added. The manifest is what makes that failure loud.

/**
 * Baseline filename for a story id. Story ids are already url-safe
 * ("components-button--primary"); the substitution is defensive.
 *
 * Defined here rather than in vrt.mjs so the manifest and the file written
 * next to it cannot disagree — two copies of this rule would drift, and a
 * drifted copy makes `adopt` reject a tree that is actually complete.
 */
export const fileNameFor = (id) => `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;

/**
 * The `<viewport>/<theme>/<file>.png` path a task writes — used as the task's
 * identity in manifests, so the manifest and the tree on disk are directly
 * comparable without a second naming convention.
 *
 * @param {{viewport: string, theme: string, id: string}} task
 * @returns {string}
 */
export function taskKey({ viewport, theme, id }) {
  return `${viewport}/${theme}/${fileNameFor(id)}`;
}

/**
 * Parse `--shard i/N`.
 *
 * Strict by design: every malformed spec has a silent-success failure mode. A
 * shard index of 0 or one past the end selects nothing, and a VRT job that
 * compares nothing still exits 0 — so a typo in the workflow would turn the
 * visual gate off without turning any check red.
 *
 * @param {string|null|undefined} spec e.g. "3/15", or null for the whole suite
 * @returns {{index: number, total: number}|null}
 */
export function parseShard(spec) {
  if (spec === null || spec === undefined) return null;
  const match = /^(\d+)\/(\d+)$/.exec(String(spec));
  if (!match) throw new Error(`Invalid --shard "${spec}": expected <index>/<total>, e.g. 3/15`);
  const index = Number(match[1]);
  const total = Number(match[2]);
  if (total < 1) throw new Error(`Invalid --shard "${spec}": total must be at least 1`);
  if (index < 1 || index > total) throw new Error(`Invalid --shard "${spec}": index must be within 1..${total}`);
  return { index, total };
}

/**
 * This shard's slice of a task list.
 *
 * Strided (`i % total`) rather than contiguous. The task list is built grouped
 * by viewport and then theme, so contiguous chunks would give one shard every
 * desktop shot and another every mobile shot — different costs, and the suite
 * is only as fast as its slowest shard. A stride interleaves them, and also
 * keeps shard sizes within one task of each other.
 *
 * @template T
 * @param {T[]} tasks deterministically ordered task list
 * @param {{index: number, total: number}|null} shard
 * @returns {T[]}
 */
export function selectShard(tasks, shard) {
  if (!shard) return tasks.slice();
  return tasks.filter((_, i) => i % shard.total === shard.index - 1);
}

/**
 * Whether this shard performs the whole-suite inventory checks — stale
 * baselines, orphans, and stray non-`<viewport>/<theme>/` paths.
 *
 * Those checks need the full story list, which every shard has, so any shard
 * *could* run them. Exactly one must: all 15 reporting would print each
 * failure 15 times, and none reporting would silently drop the check that
 * catches a story deleted without a rebaseline. Shard 1 owns it.
 *
 * @param {{index: number, total: number}|null} shard
 * @returns {boolean}
 */
export function isInventoryOwner(shard) {
  return shard === null || shard.index === 1;
}

/**
 * Record of what one `shoot --shard` run was responsible for and what it
 * actually produced.
 *
 * `expected` is the FULL set, repeated in every shard's manifest rather than
 * written once by shard 1. That redundancy is the point: it lets the merge
 * detect shards built from different Storybook builds (a re-run that picked up
 * a newer commit), which would otherwise merge into a tree matching neither.
 *
 * @param {{shard: {index: number, total: number}, expected: string[], shot: string[]}} args
 */
export function buildManifest({ shard, expected, shot }) {
  return {
    shard: shard.index,
    total: shard.total,
    expected: [...expected].sort(),
    shot: [...shot].sort(),
  };
}

const sameSet = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * Assert that a set of shard manifests reassembles into one whole baseline
 * tree, and report every way it does not.
 *
 * Checks, in order of how quietly they would otherwise fail:
 *   1. At least one manifest — an empty merge would adopt an empty tree.
 *   2. All manifests agree on `total`.
 *   3. Shard indices are exactly 1..total, no gaps, no duplicates.
 *   4. All manifests agree on the full expected set.
 *   5. The union of what was shot equals that expected set.
 *
 * @param {Array<{shard: number, total: number, expected: string[], shot: string[]}>} manifests
 * @returns {{total: number, expected: string[], errors: string[]}}
 */
export function verifyManifests(manifests) {
  const errors = [];
  if (manifests.length === 0) {
    return { total: 0, expected: [], errors: ["No shard manifests found — refusing to adopt an empty baseline tree."] };
  }

  const totals = [...new Set(manifests.map((m) => m.total))];
  if (totals.length > 1) {
    errors.push(`Shards disagree about the shard total (${totals.join(", ")}) — they are not from one run.`);
  }
  const total = Math.max(...totals);

  const byIndex = new Map();
  for (const m of manifests) {
    if (byIndex.has(m.shard)) errors.push(`Duplicate manifest for shard ${m.shard}.`);
    byIndex.set(m.shard, m);
  }
  for (let i = 1; i <= total; i++) {
    if (!byIndex.has(i)) errors.push(`Missing manifest for shard ${i} of ${total} — its artifact did not arrive.`);
  }

  const expected = manifests[0].expected;
  for (const m of manifests) {
    if (!sameSet(m.expected, expected)) {
      errors.push(
        `Shard ${m.shard} expected a different story set than shard ${manifests[0].shard} — ` +
          `the shards were built from different Storybook builds.`,
      );
    }
  }

  const shot = new Set(manifests.flatMap((m) => m.shot));
  for (const key of expected) {
    if (!shot.has(key)) errors.push(`No shard produced ${key}.`);
  }
  for (const key of shot) {
    if (!expected.includes(key)) errors.push(`Unexpected extra shot ${key} — not in the expected story set.`);
  }

  return { total, expected, errors };
}
