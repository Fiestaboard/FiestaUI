#!/usr/bin/env node
/**
 * FiestaUI visual regression testing (VRT) harness.
 *
 * Self-contained: Playwright (chromium) + pixelmatch + pngjs. No cloud services.
 *
 * Modes (all assume a served storybook-static build, default http://localhost:6006):
 *
 *   node scripts/vrt/vrt.mjs shoot --out <dir> [--url <base>]
 *     Screenshot every story (desktop + mobile viewports x dark + light themes)
 *     into <dir>/<viewport>/<theme>/<id>.png
 *
 *   node scripts/vrt/vrt.mjs compare [--url <base>]
 *     Shoot to a temp dir, compare against committed baselines in vrt/baselines/.
 *     Failing stories get a diff image in vrt/diffs/. Exits nonzero on drift,
 *     missing baselines (new stories), or stale baselines (deleted stories,
 *     retired viewports/themes, or a leftover pre-viewport baseline layout).
 *     If vrt/baselines/ is absent or empty, warns and exits 0 (not yet seeded).
 *
 *   node scripts/vrt/vrt.mjs update [--url <base>]
 *     Regenerate vrt/baselines/ wholesale (stale ids are deleted).
 *
 * Stories listed in vrt/skip.json (exact ids or "prefix*" globs) are excluded;
 * an entry may narrow the skip to specific viewports with "viewports": [...].
 * See docs/VISUAL_REGRESSION.md for the full workflow.
 */

import { mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import pixelmatch from "pixelmatch";
import { chromium } from "playwright";
import { PNG } from "pngjs";

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
  const args = { mode: argv[2], url: "http://localhost:6006", out: null };
  for (let i = 3; i < argv.length; i++) {
    if (argv[i] === "--url") args.url = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else {
      console.error(`Unknown argument: ${argv[i]}`);
      process.exit(2);
    }
  }
  args.url = args.url?.replace(/\/$/, "");
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

function fileNameFor(id) {
  // Story ids are already url-safe ("components-button--primary") but be defensive.
  return `${id.replace(/[^a-zA-Z0-9_-]/g, "_")}.png`;
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
 * Screenshot every non-skipped story into <outDir>/<viewport>/<theme>/<id>.png.
 * Returns the shot ids per viewport (they can differ — skips are viewport-aware).
 */
async function shoot(baseUrl, outDir) {
  const skipEntries = await loadSkipList();
  const allIds = await fetchStoryIds(baseUrl);
  const idsByViewport = Object.fromEntries(
    VIEWPORT_NAMES.map((viewport) => [viewport, allIds.filter((id) => !isSkipped(id, viewport, skipEntries))]),
  );

  const tasks = VIEWPORT_NAMES.flatMap((viewport) =>
    THEMES.flatMap((theme) => idsByViewport[viewport].map((id) => ({ id, theme, viewport }))),
  );
  const totalSkipped =
    VIEWPORT_NAMES.reduce((n, v) => n + (allIds.length - idsByViewport[v].length), 0) * THEMES.length;
  log(
    `Shooting ${allIds.length} stories x ${VIEWPORT_NAMES.length} viewports (${VIEWPORT_NAMES.join(", ")}) x ` +
      `${THEMES.length} themes = ${tasks.length} shots (${totalSkipped} skipped) from ${baseUrl}`,
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
  return idsByViewport;
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

async function compare(baseUrl) {
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
    const idsByViewport = await shoot(baseUrl, tempDir);
    await rm(DIFFS_DIR, { recursive: true, force: true });

    for (const stray of strays) {
      failures.push(
        `[${stray}]: stale baseline path — not a <viewport>/<theme>/ directory. Run the VRT update workflow.`,
      );
    }

    for (const viewport of VIEWPORT_NAMES) {
      for (const theme of THEMES) {
        const scope = `${viewport}/${theme}`;
        const expectedNames = new Set(baselineFiles[viewport][theme]);
        for (const id of idsByViewport[viewport]) {
          const name = fileNameFor(id);
          const baselinePath = path.join(BASELINES_DIR, viewport, theme, name);
          const actualPath = path.join(tempDir, viewport, theme, name);
          if (!expectedNames.has(name)) {
            failures.push(`[${scope}] ${id}: new story — no baseline. Run the VRT update workflow.`);
            continue;
          }
          expectedNames.delete(name);
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
        for (const orphan of expectedNames) {
          failures.push(`[${scope}] ${orphan}: stale baseline — story no longer exists. Run the VRT update workflow.`);
        }
      }
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }

  if (failures.length > 0) {
    console.error(`\nvrt: ${failures.length} failure(s):`);
    for (const f of failures) console.error(`  ${f}`);
    console.error("\nDiff images written to vrt/diffs/. If the change is intentional, run the VRT update workflow.");
    process.exit(1);
  }
  log("vrt: all stories match baselines");
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

async function main() {
  const { mode, url, out } = parseArgs(process.argv);
  if (mode === "shoot") {
    if (!out) {
      console.error("shoot requires --out <dir>");
      process.exit(2);
    }
    await shoot(url, path.resolve(out));
  } else if (mode === "compare") {
    await compare(url);
  } else if (mode === "update") {
    await update(url);
  } else {
    console.error("Usage: node scripts/vrt/vrt.mjs <shoot --out <dir>|compare|update> [--url <base>]");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`vrt: ${err.stack || err}`);
  process.exit(1);
});
