/**
 * Behavioral verification for issue #58: the board loading animation must
 * freeze under `prefers-reduced-motion: reduce` and still cycle without it.
 *
 * The loading cycle is JS-driven (shared 80ms ticker feeding React state), so
 * this cannot be verified with CSS assertions or a static DOM snapshot — it
 * has to be observed over time. This script drives the built storybook with
 * Playwright's `reducedMotion` emulation and samples every tile's
 * `data-current-char` twice, 500ms apart:
 *
 *   - reducedMotion: "reduce"        -> 0 tiles may change (frozen)
 *   - reducedMotion: "no-preference" -> tiles must still cycle
 *
 * Not part of the hermetic `release:test` glob (it needs a storybook build);
 * run ad hoc:
 *
 *   npm run build-storybook && node scripts/ci/board-loading-reduced-motion-e2e.mjs
 */

import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATIC_DIR = path.join(ROOT, "storybook-static");
const STORY_ID = "board-boarddisplay--loading";
const SETTLE_MS = 300;
const SAMPLE_MS = 500;

const CONTENT_TYPES = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

// Serve storybook-static ourselves on an ephemeral port — a fixed port could
// silently hit a stale server from another checkout already listening there.
function serveStatic() {
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const rel = pathname === "/" ? "index.html" : pathname.slice(1);
      const file = path.join(STATIC_DIR, rel);
      if (!file.startsWith(STATIC_DIR)) throw new Error("outside root");
      await stat(file);
      res.writeHead(200, { "content-type": CONTENT_TYPES[path.extname(file)] ?? "application/octet-stream" });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

/** Sample all tiles' data-current-char twice, SAMPLE_MS apart. */
async function sampleStory(browser, baseUrl, reducedMotion) {
  const context = await browser.newContext({ reducedMotion });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/iframe.html?id=${STORY_ID}&viewMode=story`);
  await page.waitForSelector('[data-testid^="char-tile-"]');
  // Let the loading cycle establish itself before sampling.
  await page.waitForTimeout(SETTLE_MS);

  const read = () =>
    page.$$eval('[data-testid^="char-tile-"]', (els) => els.map((el) => el.getAttribute("data-current-char")));

  const before = await read();
  await page.waitForTimeout(SAMPLE_MS);
  const after = await read();
  await context.close();

  if (before.length === 0 || before.length !== after.length) {
    throw new Error(`Bad tile sample: before=${before.length}, after=${after.length}`);
  }
  const changed = before.reduce((n, ch, i) => (ch !== after[i] ? n + 1 : n), 0);
  return { total: before.length, changed };
}

await stat(path.join(STATIC_DIR, "iframe.html")).catch(() => {
  throw new Error(`${STATIC_DIR}/iframe.html not found. Run \`npm run build-storybook\` first.`);
});
const { server, port } = await serveStatic();
const baseUrl = `http://127.0.0.1:${port}`;

let failed = false;
try {
  const browser = await chromium.launch();
  try {
    const reduced = await sampleStory(browser, baseUrl, "reduce");
    const normal = await sampleStory(browser, baseUrl, "no-preference");

    console.log(`story: ${STORY_ID} (sampled over ${SAMPLE_MS}ms)`);
    console.log(`  reducedMotion=reduce         -> ${reduced.changed}/${reduced.total} tiles changed`);
    console.log(`  reducedMotion=no-preference  -> ${normal.changed}/${normal.total} tiles changed`);

    if (reduced.changed !== 0) {
      failed = true;
      console.error(`FAIL: ${reduced.changed} tiles cycled under prefers-reduced-motion (expected 0)`);
    }
    if (normal.changed === 0) {
      failed = true;
      console.error("FAIL: no tiles cycled without reduced motion (loading animation is broken)");
    }
    if (!failed) console.log("PASS: loading tiles freeze under reduced motion and cycle without it");
  } finally {
    await browser.close();
  }
} finally {
  server.close();
}

process.exit(failed ? 1 : 0);
