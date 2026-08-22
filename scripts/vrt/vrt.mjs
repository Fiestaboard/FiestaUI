#!/usr/bin/env node
/**
 * FiestaUI visual regression testing (VRT) harness.
 *
 * Self-contained: Playwright (chromium) + pixelmatch + pngjs. No cloud services.
 *
 * Modes (all assume a served storybook-static build, default http://localhost:6006):
 *
 *   node scripts/vrt/vrt.mjs shoot --out <dir> [--url <base>] [--shard i/N]
 *     Screenshot every story (desktop + mobile viewports x dark + light themes)
 *     into <dir>/<viewport>/<theme>/<id>.png. With --shard, writes only this
 *     shard's slice plus a manifest-<i>-of-<N>.json describing what the whole
 *     run should produce and what this shard produced — see `adopt`.
 *
 *   node scripts/vrt/vrt.mjs compare [--url <base>] [--shard i/N]
 *     Shoot to a temp dir, compare against committed baselines in vrt/baselines/.
 *     Failing stories get a diff image in vrt/diffs/. Exits nonzero on drift,
 *     missing baselines (new stories), or stale baselines (deleted stories,
 *     retired viewports/themes, or a leftover pre-viewport baseline layout).
 *     If vrt/baselines/ is absent or empty, warns and exits 0 (not yet seeded).
 *     With --shard, pixel-compares only this shard's slice; the whole-suite
 *     inventory checks (new/stale/stray baselines) are owned by shard 1 so they
 *     are reported exactly once per run rather than once per shard.
 *
 *   node scripts/vrt/vrt.mjs update [--url <base>]
 *     Regenerate vrt/baselines/ wholesale (stale ids are deleted).
 *
 *   node scripts/vrt/vrt.mjs adopt --from <dir>
 *     Replace vrt/baselines/ with a tree merged from sharded `shoot` runs,
 *     but ONLY after every shard's manifest proves the merge is complete.
 *     This is the sharded counterpart to `update`; see scripts/vrt/shard.mjs
 *     for why a partial tree must never be adopted silently.
 *
 * Stories listed in vrt/skip.json (exact ids or "prefix*" globs) are excluded;
 * an entry may narrow the skip to specific viewports with "viewports": [...].
 * See docs/VISUAL_REGRESSION.md for the full workflow.
 */

import { cp, mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pixelmatch from "pixelmatch";
import { chromium } from "playwright";
import { PNG } from "pngjs";

import {
  buildManifest,
  fileNameFor,
  isInventoryOwner,
  parseShard,
  selectShard,
  taskKey,
  verifyManifests,
} from "./shard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASELINES_DIR = path.join(ROOT, "vrt", "baselines");
const DIFFS_DIR = path.join(ROOT, "vrt", "diffs");
const SKIP_FILE = path.join(ROOT, "vrt", "skip.json");

const THEMES = ["dark", "light"];
// Baselines are keyed by viewport, so these names are part of the on-disk
// layout: vrt/baselines/<viewport>/<theme>/<story-id>.png. Renaming, adding or
// removing one invalidates that viewport's baselines and requires an update run.
const VIEWPORTS = {
  desktop: { width: 1200, height: 800 },
  mobile: { width: 390, height: 844 }, // iPhone 12/13/14-class logical size
};
const VIEWPORT_NAMES = Object.keys(VIEWPORTS);
const CONCURRENCY = 6;
const SETTLE_MS = 350;
const POST_FREEZE_MS = 100;
const NAV_TIMEOUT_MS = 30_000;

// Per-pixel color threshold for pixelmatch (0..1, smaller = stricter).
const PIXEL_THRESHOLD = 0.1;
// A story fails when diffPixels > max(MIN_DIFF_PIXELS, DIFF_RATIO * totalPixels).
const MIN_DIFF_PIXELS = 50;
const DIFF_RATIO = 0.0005; // 0.05%

const FREEZE_CSS = `*,*::before,*::after{animation-play-state:paused!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}`;

const log = (msg) => process.stdout.write(`${msg}\n`);

function parseArgs(argv) {
  const args = { mode: argv[2], url: "http://localhost:6006", out: null, from: null, shard: null };
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--url") args.url = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--from") args.from = argv[++i];
    else if (argv[i] === "--shard") args.shard = argv[++i];
    else {
      console.error(`Unknown argument: ${argv[i]}`);
      process.exit(2);
    }
  }
  args.url = args.url?.replace(/\/$/, "");
  // Throws on anything malformed rather than defaulting. A bad spec selects an
  // empty slice, and a VRT run that compares nothing still exits 0 — so a typo
  // in the workflow would disable the visual gate without turning anything red.
  try {
    args.shard = parseShard(args.shard);
  } catch (err) {
    console.error(err.message);
    process.exit(2);
  }
  return args;
}

async function loadSkipList() {
  try {
    const raw = JSON.parse(await readFile(SKIP_FILE, "utf8"));
    if (!Array.isArray(raw)) throw new Error("vrt/skip.json must be a JSON array");
    return raw.map((entry) => {
      const pattern = typeof entry === "string" ? entry : entry.id;
      if (!pattern) throw new Error(`skip.json entry missing "id": ${JSON.stringify(entry)}`);
      // Optional: narrow a skip to specific viewports. Omitted = every viewport,
      // which is the right default (most nondeterminism is width-independent).
      const viewports = typeof entry === "string" ? null : (entry.viewports ?? null);
      if (viewports !== null) {
        if (!Array.isArray(viewports) || viewports.length === 0) {
          throw new Error(`skip.json entry "${pattern}": "viewports" must be a non-empty array`);
        }
        for (const v of viewports) {
          if (!VIEWPORT_NAMES.includes(v)) {
            throw new Error(
              `skip.json entry "${pattern}": unknown viewport "${v}" (expected one of ${VIEWPORT_NAMES})`,
            );
          }
        }
      }
      return { pattern, viewports };
    });
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

function isSkipped(id, viewport, skipEntries) {
  return skipEntries.some(
    ({ pattern, viewports }) =>
      (pattern.endsWith("*") ? id.startsWith(pattern.slice(0, -1)) : id === pattern) &&
      (viewports === null || viewports.includes(viewport)),
  );
}

async function fetchStoryIds(baseUrl) {
  const res = await fetch(`${baseUrl}/index.json`);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${baseUrl}/index.json (HTTP ${res.status}). Is storybook-static being served?`);
  }
  const index = await res.json();
  return Object.values(index.entries)
    .filter((entry) => entry.type === "story")
    .map((entry) => entry.id)
    .sort();
}

async function shootStory(page, baseUrl, id, theme, outFile) {
  const url = `${baseUrl}/iframe.html?globals=theme:${theme}&id=${encodeURIComponent(id)}&viewMode=story`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  // Wait for the story to actually render (storybook clears the root on errors).
  await page
    .waitForFunction(() => document.querySelector("#storybook-root")?.childElementCount > 0, null, { timeout: 10_000 })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(SETTLE_MS);
  // Freeze animations/transitions AFTER settle so entrance animations land on
  // their final frame instead of being paused mid-flight.
  await page.addStyleTag({ content: FREEZE_CSS });
  await page.waitForTimeout(POST_FREEZE_MS);

  // Screenshot #storybook-root, falling back to the viewport when the root is
  // missing or has a zero-size box (stories whose content is position: fixed,
  // e.g. the app sidebar, leave the root itself unpaintable).
  const root = page.locator("#storybook-root");
  const box = (await root.count()) > 0 ? await root.boundingBox() : null;
  if (box && box.width >= 1 && box.height >= 1) {
    await root.screenshot({ path: outFile, animations: "disabled", timeout: 15_000 });
  } else {
    await page.screenshot({ path: outFile, animations: "disabled" });
  }
}

/**
 * Screenshot this shard's slice of the story set into
 * <outDir>/<viewport>/<theme>/<id>.png.
 *
 * Returns BOTH the full per-viewport id map and this shard's task list. The id
 * map is deliberately unsharded: `compare` uses it for the whole-suite
 * inventory checks, which must see every story regardless of which slice this
 * runner shot. Only `tasks` is narrowed.
 *
 * @param {string} baseUrl
 * @param {string} outDir
 * @param {{index: number, total: number}|null} shard
 */
async function shoot(baseUrl, outDir, shard = null) {
  const skipEntries = await loadSkipList();
  const allIds = await fetchStoryIds(baseUrl);
  const idsByViewport = Object.fromEntries(
    VIEWPORT_NAMES.map((viewport) => [viewport, allIds.filter((id) => !isSkipped(id, viewport, skipEntries))]),
  );

  // Deterministic ordering is what makes sharding safe: every shard derives the
  // same list from the same Storybook build and takes a disjoint stride of it.
  // `allIds` is sorted by fetchStoryIds, and VIEWPORT_NAMES/THEMES are fixed
  // literals, so this order is stable across runners.
  const allTasks = VIEWPORT_NAMES.flatMap((viewport) =>
    THEMES.flatMap((theme) => idsByViewport[viewport].map((id) => ({ id, theme, viewport }))),
  );
  const tasks = selectShard(allTasks, shard);
  const totalSkipped =
    VIEWPORT_NAMES.reduce((n, v) => n + (allIds.length - idsByViewport[v].length), 0) * THEMES.length;
  const scope = shard
    ? `shard ${shard.index}/${shard.total}: ${tasks.length} of ${allTasks.length}`
    : `${tasks.length}`;
  log(
    `Shooting ${allIds.length} stories x ${VIEWPORT_NAMES.length} viewports (${VIEWPORT_NAMES.join(", ")}) x ` +
      `${THEMES.length} themes = ${scope} shots (${totalSkipped} skipped) from ${baseUrl}`,
  );

  for (const viewport of VIEWPORT_NAMES) {
    for (const theme of THEMES) await mkdir(path.join(outDir, viewport, theme), { recursive: true });
  }

  const failures = [];
  const started = Date.now();
  let done = 0;

  const browser = await chromium.launch();
  try {
    // One context per viewport (a context's viewport is fixed at creation), each
    // drained by the same worker pool size so wall-clock scales linearly.
    for (const viewport of VIEWPORT_NAMES) {
      const viewportTasks = tasks.filter((t) => t.viewport === viewport);
      // A shard can legitimately hold nothing for a viewport once shards
      // outnumber tasks; launching a context to shoot zero stories just burns
      // seconds.
      if (viewportTasks.length === 0) continue;
      const context = await browser.newContext({
        viewport: VIEWPORTS[viewport],
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      let cursor = 0;
      const worker = async () => {
        const page = await context.newPage();
        while (cursor < viewportTasks.length) {
          const { id, theme } = viewportTasks[cursor++];
          const outFile = path.join(outDir, viewport, theme, fileNameFor(id));
          try {
            await shootStory(page, baseUrl, id, theme, outFile);
          } catch (err) {
            failures.push({ id, theme, viewport, error: err.message });
          }
          done++;
          if (done % 50 === 0) log(`  ${done}/${tasks.length} shots...`);
        }
        await page.close();
      };
      await Promise.all(Array.from({ length: CONCURRENCY }, worker));
      await context.close();
    }
  } finally {
    await browser.close();
  }

  log(`Shot ${tasks.length - failures.length}/${tasks.length} in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (failures.length > 0) {
    for (const f of failures) console.error(`  SHOOT FAILED [${f.viewport}/${f.theme}] ${f.id}: ${f.error}`);
    throw new Error(`${failures.length} stories failed to screenshot`);
  }

  // The manifest is what lets `adopt` prove a merged tree is whole. Written
  // only for sharded runs — an unsharded `shoot`/`update` produces the entire
  // tree by construction and has nothing to reassemble.
  if (shard) {
    await writeFile(
      path.join(outDir, `manifest-${shard.index}-of-${shard.total}.json`),
      `${JSON.stringify(
        buildManifest({ shard, expected: allTasks.map(taskKey), shot: tasks.map(taskKey) }),
        null,
        2,
      )}\n`,
    );
  }
  return { idsByViewport, tasks };
}

function padTo(png, width, height) {
  if (png.width === width && png.height === height) return png;
  const out = new PNG({ width, height });
  PNG.bitblt(png, out, 0, 0, png.width, png.height, 0, 0);
  return out;
}

function comparePair(expectedBuf, actualBuf) {
  const expected = PNG.sync.read(expectedBuf);
  const actual = PNG.sync.read(actualBuf);
  const width = Math.max(expected.width, actual.width);
  const height = Math.max(expected.height, actual.height);
  const sizeMismatch = expected.width !== actual.width || expected.height !== actual.height;
  const a = padTo(expected, width, height);
  const b = padTo(actual, width, height);
  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: PIXEL_THRESHOLD });
  const budget = Math.max(MIN_DIFF_PIXELS, Math.round(width * height * DIFF_RATIO));
  return { diffPixels, budget, sizeMismatch, diffPng: diff, failed: sizeMismatch || diffPixels > budget };
}

async function readdirSafe(dir) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

/**
 * Inventory vrt/baselines/ under the <viewport>/<theme>/<id>.png layout.
 *
 * Also reports anything on disk that the layout does not account for — a
 * retired viewport or theme directory, or the pre-viewport layout where the
 * theme dirs sat at the top level. Those surface as stale-baseline failures so
 * a half-migrated baseline tree can never quietly pass.
 */
async function listBaselineFiles() {
  const files = {};
  const strays = [];
  for (const viewport of VIEWPORT_NAMES) {
    files[viewport] = {};
    for (const theme of THEMES) {
      files[viewport][theme] = (await readdirSafe(path.join(BASELINES_DIR, viewport, theme)))
        .filter((e) => e.isFile() && e.name.endsWith(".png"))
        .map((e) => e.name);
    }
    for (const entry of await readdirSafe(path.join(BASELINES_DIR, viewport))) {
      if (!(entry.isDirectory() && THEMES.includes(entry.name))) strays.push(`${viewport}/${entry.name}`);
    }
  }
  for (const entry of await readdirSafe(BASELINES_DIR)) {
    if (!(entry.isDirectory() && VIEWPORT_NAMES.includes(entry.name))) strays.push(entry.name);
  }
  const total = VIEWPORT_NAMES.reduce((n, v) => n + THEMES.reduce((m, t) => m + files[v][t].length, 0), 0);
  return { files, strays, total };
}

async function compare(baseUrl, shard = null) {
  const { files: baselineFiles, strays, total } = await listBaselineFiles();
  if (total === 0 && strays.length === 0) {
    console.warn(
      "vrt: no baselines seeded yet — run the 'VRT Update Baselines' workflow (or `npm run vrt:update`) to seed vrt/baselines/. Skipping comparison.",
    );
    return;
  }
  if (total === 0 && strays.length > 0) {
    // Every expected <viewport>/<theme> dir is empty yet vrt/baselines/ is not:
    // the tree predates the viewport layout (or names a viewport we no longer
    // shoot). Fail loudly instead of falling through to the "not seeded" warning.
    console.error(
      `vrt: vrt/baselines/ does not match the expected <viewport>/<theme>/ layout ` +
        `(viewports: ${VIEWPORT_NAMES.join(", ")}; themes: ${THEMES.join(", ")}).\n` +
        `  Unrecognized entries: ${strays.join(", ")}\n` +
        `  Run the VRT update workflow to regenerate baselines under the current layout.`,
    );
    process.exit(1);
  }

  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fiestaui-vrt-"));
  const failures = [];
  try {
    const { idsByViewport, tasks } = await shoot(baseUrl, tempDir, shard);
    await rm(DIFFS_DIR, { recursive: true, force: true });

    const present = Object.fromEntries(
      VIEWPORT_NAMES.map((v) => [v, Object.fromEntries(THEMES.map((t) => [t, new Set(baselineFiles[v][t])]))]),
    );

    // Whole-suite inventory: which baselines SHOULD exist versus which do.
    // This needs every story, not this shard's slice, and every shard has that
    // list — so exactly one shard runs it. All of them running would print each
    // failure once per shard; none running would silently drop the check that
    // catches a story deleted without a rebaseline.
    if (isInventoryOwner(shard)) {
      for (const stray of strays) {
        failures.push(
          `[${stray}]: stale baseline path — not a <viewport>/<theme>/ directory. Run the VRT update workflow.`,
        );
      }
      for (const viewport of VIEWPORT_NAMES) {
        for (const theme of THEMES) {
          const scope = `${viewport}/${theme}`;
          const orphans = new Set(present[viewport][theme]);
          for (const id of idsByViewport[viewport]) {
            const name = fileNameFor(id);
            if (orphans.delete(name)) continue;
            failures.push(`[${scope}] ${id}: new story — no baseline. Run the VRT update workflow.`);
          }
          for (const orphan of orphans) {
            failures.push(
              `[${scope}] ${orphan}: stale baseline — story no longer exists. Run the VRT update workflow.`,
            );
          }
        }
      }
    }

    // This shard's pixel comparisons. A story with no baseline is skipped
    // rather than reported here — the inventory owner above already named it,
    // and re-reporting it from whichever shard happened to draw it would
    // duplicate the failure for shard 1 and only shard 1.
    for (const { id, theme, viewport } of tasks) {
      const scope = `${viewport}/${theme}`;
      const name = fileNameFor(id);
      if (!present[viewport][theme].has(name)) continue;
      const baselinePath = path.join(BASELINES_DIR, viewport, theme, name);
      const actualPath = path.join(tempDir, viewport, theme, name);
      const result = comparePair(await readFile(baselinePath), await readFile(actualPath));
      if (result.failed) {
        const diffDir = path.join(DIFFS_DIR, viewport, theme);
        await mkdir(diffDir, { recursive: true });
        const stem = name.replace(/\.png$/, "");
        await writeFile(path.join(diffDir, `${stem}.diff.png`), PNG.sync.write(result.diffPng));
        await writeFile(path.join(diffDir, `${stem}.actual.png`), await readFile(actualPath));
        await writeFile(path.join(diffDir, `${stem}.expected.png`), await readFile(baselinePath));
        const why = result.sizeMismatch
          ? "size mismatch"
          : `${result.diffPixels} pixels differ (budget ${result.budget})`;
        failures.push(`[${scope}] ${id}: ${why}`);
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  const label = shard ? `shard ${shard.index}/${shard.total}` : "all stories";
  if (failures.length > 0) {
    console.error(`\nvrt (${label}): ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  ${f}`);
    console.error("\nDiff images written to vrt/diffs/. If the change is intentional, run the VRT update workflow.");
    process.exit(1);
  }
  log(`vrt: ${label} match baselines`);
}

async function update(baseUrl) {
  // Shoot to a temp dir first so a mid-run crash never destroys the old baselines.
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fiestaui-vrt-update-"));
  try {
    await shoot(baseUrl, tempDir);
    await rm(BASELINES_DIR, { recursive: true, force: true });
    await mkdir(path.dirname(BASELINES_DIR), { recursive: true });
    await rename(tempDir, BASELINES_DIR).catch(async (err) => {
      // Cross-device rename fallback (temp dir on a different filesystem).
      if (err.code !== "EXDEV") throw err;
      const { cp } = await import("node:fs/promises");
      await cp(tempDir, BASELINES_DIR, { recursive: true });
    });
    // The rm above is what purges stale ids — and, on a layout change, any
    // directory that is no longer a <viewport>/<theme> pair. Regeneration is
    // always wholesale, so the tree can never be left half-migrated.
    log(`vrt: baselines updated in ${path.relative(ROOT, BASELINES_DIR)}/<viewport>/<theme>/`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

/** Every `<viewport>/<theme>/<file>.png` under `dir`, as taskKey-shaped paths. */
async function listShotFiles(dir) {
  const found = new Set();
  for (const viewport of await readdirSafe(dir)) {
    if (!viewport.isDirectory()) continue;
    for (const theme of await readdirSafe(path.join(dir, viewport.name))) {
      if (!theme.isDirectory()) continue;
      for (const file of await readdirSafe(path.join(dir, viewport.name, theme.name))) {
        if (file.isFile() && file.name.endsWith(".png")) found.add(`${viewport.name}/${theme.name}/${file.name}`);
      }
    }
  }
  return found;
}

/**
 * Replace vrt/baselines/ with a tree merged from sharded `shoot` runs — the
 * sharded counterpart to `update`.
 *
 * Adoption is all-or-nothing, and the verification in front of it is the whole
 * reason this mode exists rather than a plain `mv`. Baselines are regenerated
 * wholesale, so a shard whose artifact silently failed to upload would commit
 * a tree with holes — and the next `compare` reads a hole as "new story, no
 * baseline", which looks exactly like a story someone just added. Nobody would
 * connect that to a seeding run three days earlier.
 *
 * So: the manifests must account for every shard, agree with each other, and
 * their union must equal the expected set — and every file they promise must
 * actually be on disk.
 */
async function adopt(fromDir) {
  const entries = await readdirSafe(fromDir);
  const manifestNames = entries.filter((e) => e.isFile() && /^manifest-\d+-of-\d+\.json$/.test(e.name));
  const manifests = [];
  for (const entry of manifestNames) {
    manifests.push(JSON.parse(await readFile(path.join(fromDir, entry.name), "utf8")));
  }

  const { total, expected, errors } = verifyManifests(manifests);

  // The manifests agreeing among themselves is not enough — they describe what
  // each shard *believed* it wrote. Cross-check against the bytes that arrived.
  const onDisk = await listShotFiles(fromDir);
  for (const key of expected) {
    if (!onDisk.has(key)) errors.push(`Manifest promises ${key} but no such file arrived.`);
  }
  for (const key of onDisk) {
    if (!expected.includes(key)) errors.push(`Merged tree contains ${key}, which no shard expected.`);
  }

  if (errors.length > 0) {
    // Capped: one missing shard means every file it owned is missing, which is
    // hundreds of lines saying the same thing. The structural errors (missing
    // manifests, disagreeing shards) are pushed first and are the ones worth
    // reading, so truncating the tail costs nothing diagnostically.
    const SHOWN = 20;
    console.error(`vrt: refusing to adopt an incomplete baseline tree — ${errors.length} problem(s):`);
    for (const e of errors.slice(0, SHOWN)) console.error(`  ${e}`);
    if (errors.length > SHOWN) console.error(`  ...and ${errors.length - SHOWN} more.`);
    console.error(
      `\nFound ${manifests.length} manifest(s) and ${onDisk.size} image(s) in ${fromDir}.\n` +
        "Re-run the seeding workflow; do NOT hand-merge, a partial tree is indistinguishable from new stories later.",
    );
    process.exit(1);
  }

  // Staged into a temp dir and swapped, so a crash mid-copy cannot leave
  // vrt/baselines/ half-written — same guarantee `update` gives.
  const staged = await mkdtemp(path.join(os.tmpdir(), "fiestaui-vrt-adopt-"));
  try {
    // Copies exactly the verified set, which is also what drops the
    // manifest-*.json files: they are build bookkeeping, not baselines, and
    // committing them would make every seeding run diff-noisy.
    for (const key of expected) {
      const dest = path.join(staged, key);
      await mkdir(path.dirname(dest), { recursive: true });
      await cp(path.join(fromDir, key), dest);
    }
    await rm(BASELINES_DIR, { recursive: true, force: true });
    await mkdir(path.dirname(BASELINES_DIR), { recursive: true });
    await rename(staged, BASELINES_DIR).catch(async (err) => {
      if (err.code !== "EXDEV") throw err;
      await cp(staged, BASELINES_DIR, { recursive: true });
    });
    log(
      `vrt: adopted ${expected.length} baseline(s) from ${total} shard(s) into ${path.relative(ROOT, BASELINES_DIR)}/`,
    );
  } finally {
    await rm(staged, { recursive: true, force: true });
  }
}

async function main() {
  const { mode, url, out, from, shard } = parseArgs(process.argv);
  if (mode === "shoot") {
    if (!out) {
      console.error("shoot requires --out <dir>");
      process.exit(2);
    }
    await shoot(url, path.resolve(out), shard);
  } else if (mode === "compare") {
    await compare(url, shard);
  } else if (mode === "update") {
    await update(url);
  } else if (mode === "adopt") {
    if (!from) {
      console.error("adopt requires --from <dir>");
      process.exit(2);
    }
    await adopt(path.resolve(from));
  } else {
    console.error(
      "Usage: node scripts/vrt/vrt.mjs <shoot --out <dir>|compare|update|adopt --from <dir>> " +
        "[--url <base>] [--shard <i/N>]",
    );
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`vrt: ${err.stack || err}`);
  process.exit(1);
});
