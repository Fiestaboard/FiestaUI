#!/usr/bin/env node
/**
 * FiestaUI visual regression capture harness.
 *
 * Self-contained: Playwright (chromium). No cloud services.
 *
 * This harness only CAPTURES screenshots. Comparison, baselines, reports and
 * approvals are handled by fiestaboard/visual-regression-action, which stores
 * baselines as build artifacts from `main` — nothing is committed to git.
 * See docs/VISUAL_REGRESSION.md for the full workflow.
 *
 * Usage (assumes a served storybook-static build, default http://localhost:6006):
 *
 *   node scripts/vrt/vrt.mjs shoot --out <dir> [--url <base>] [--shard i/N]
 *     Screenshot every story (desktop + mobile viewports x dark + light themes)
 *     into <dir>/<viewport>/<theme>/<id>.png. With --shard, writes only this
 *     shard's slice plus a manifest-<i>-of-<N>.json describing what the whole
 *     run should produce and what this shard produced — the collect job uses
 *     the manifests to prove the merged tree is complete before comparing.
 *
 * Stories listed in vrt/skip.json (exact ids or "prefix*" globs) are excluded;
 * an entry may narrow the skip to specific viewports with "viewports": [...].
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { buildManifest, fileNameFor, parseShard, selectShard, taskKey } from "./shard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP_FILE = path.join(ROOT, "vrt", "skip.json");

const THEMES = ["dark", "light"];
// Baselines are keyed by viewport, so these names are part of the on-disk
// layout: <viewport>/<theme>/<story-id>.png in the shot tree. Renaming, adding or
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

// Comparison tolerances live in ci.yml as inputs to
// fiestaboard/visual-regression-action (threshold / diff-ratio), which took
// over from this harness's old in-repo compare. Keep them in sync there.

const FREEZE_CSS = `*,*::before,*::after{animation-play-state:paused!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}`;

const log = (msg) => process.stdout.write(`${msg}\n`);

function parseArgs(argv) {
  const args = { mode: argv[2], url: "http://localhost:6006", out: null, shard: null };
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--url") args.url = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
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

async function main() {
  const { mode, url, out, shard } = parseArgs(process.argv);
  if (mode === "shoot") {
    if (!out) {
      console.error("shoot requires --out <dir>");
      process.exit(2);
    }
    await shoot(url, path.resolve(out), shard);
  } else {
    console.error("Usage: node scripts/vrt/vrt.mjs shoot --out <dir> [--url <base>] [--shard <i/N>]");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`vrt: ${err.stack || err}`);
  process.exit(1);
});
