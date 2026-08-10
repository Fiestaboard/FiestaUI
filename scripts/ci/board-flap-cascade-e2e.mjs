/**
 * Browser-side verification for issue #196: a message change must cascade, and
 * `flapSpeed` must change how long the cascade takes.
 *
 * scripts/ci/tests/board-flap-cascade.test.mjs already pins this down in jsdom
 * and runs in CI. This script is the other half of the evidence: it drives the
 * real FlapSpeeds story in a real browser, so it can also see the things jsdom
 * cannot — the flap layers' `perspective`, and the CSS animations themselves
 * via `document.getAnimations()`. Those are what "it snaps" actually meant when
 * the issue was filed (`elementsWithPerspective: 0`, `peak running flap
 * animations: 0`).
 *
 * Not part of the hermetic `release:test` glob: it needs a storybook build, and
 * CI's `automation` job (which runs release:test) installs no browser binary.
 * Run ad hoc, next to its sibling:
 *
 *   npm run build-storybook && node scripts/ci/board-flap-cascade-e2e.mjs
 */

import { readFile, stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const STATIC_DIR = path.join(ROOT, "storybook-static");
const STORY_ID = "board-boarddisplay--flap-speeds";
const SETTLE_MS = 600;
const TIMEOUT_MS = 15000;

// The order the story renders them in, with the step duration each resolves to.
const PRESETS = [
  ["hardware", 16],
  ["quick", 48],
  ["standard", 80],
  ["relaxed", 130],
];

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

/**
 * Click "Flip every board" and sample every board once per frame until they all
 * stop transitioning.
 */
async function measure(browser, baseUrl, reducedMotion) {
  const context = await browser.newContext({ reducedMotion });
  const page = await context.newPage();
  await page.goto(`${baseUrl}/iframe.html?id=${STORY_ID}&viewMode=story`);
  await page.waitForSelector('[data-testid^="char-tile-"]');
  await page.waitForTimeout(SETTLE_MS);

  const result = await page.evaluate(async (timeoutMs) => {
    const boards = [...document.querySelectorAll('[data-slot="board-display"]')];
    const tilesOf = (board) => [...board.querySelectorAll("[data-current-char]")];
    const snapshot = () =>
      boards.map((board) => {
        const tiles = tilesOf(board);
        return {
          chars: tiles.map((t) => t.getAttribute("data-current-char")).join(""),
          transitioning: tiles.filter((t) => t.getAttribute("data-is-transitioning") === "true").length,
        };
      });

    const before = snapshot();
    const seen = boards.map(() => new Set());
    const started = boards.map(() => false);
    const settle = boards.map(() => null);
    let peakPerspective = 0;
    let peakAnimations = 0;

    // The story renders other (visually hidden) buttons; pick ours by name.
    const button = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Flip every board"));
    if (!button) throw new Error('could not find the "Flip every board" button');

    const startedAt = performance.now();
    button.click();

    await new Promise((resolve) => {
      const tick = () => {
        const elapsed = performance.now() - startedAt;
        snapshot().forEach((board, i) => {
          seen[i].add(board.chars);
          if (board.transitioning > 0) started[i] = true;
          else if (started[i] && settle[i] === null) settle[i] = elapsed;
        });
        peakPerspective = Math.max(
          peakPerspective,
          [...document.querySelectorAll("[data-current-char]")].filter(
            (el) => getComputedStyle(el).perspective !== "none",
          ).length,
        );
        peakAnimations = Math.max(
          peakAnimations,
          document.getAnimations().filter((a) => a.playState === "running").length,
        );
        const done = settle.every((s, i) => s !== null || !started[i]);
        if ((done && elapsed > 400) || elapsed > timeoutMs) return resolve();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });

    const after = snapshot();
    return {
      peakPerspective,
      peakAnimations,
      boards: boards.map((_, i) => ({
        cascaded: started[i],
        settleMs: settle[i] === null ? null : Math.round(settle[i]),
        // Grid states other than the first and the last: frames where a tile
        // was showing a character it was only passing through.
        intermediateStates: [...seen[i]].filter((c) => c !== before[i].chars && c !== after[i].chars).length,
      })),
    };
  }, TIMEOUT_MS);

  await context.close();
  return result;
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
    const normal = await measure(browser, baseUrl, "no-preference");
    const reduced = await measure(browser, baseUrl, "reduce");

    console.log(`story: ${STORY_ID}`);
    console.log("");
    console.log("  reducedMotion=no-preference");
    console.log(`    peak tiles with flap perspective: ${normal.peakPerspective}`);
    console.log(`    peak running CSS animations:      ${normal.peakAnimations}`);
    for (const [i, [preset, stepMs]] of PRESETS.entries()) {
      const b = normal.boards[i];
      if (!b) continue;
      console.log(
        `    ${preset.padEnd(9)} ${String(stepMs).padStart(3)}ms/step -> ` +
          `settle ${String(b.settleMs).padStart(5)}ms, ${b.intermediateStates} intermediate grid states`,
      );
    }

    if (normal.peakPerspective === 0) {
      failed = true;
      console.error("FAIL: no tile ever mounted its flap layers — the board snapped (issue #196)");
    }
    if (normal.peakAnimations === 0) {
      failed = true;
      console.error("FAIL: no flap animation ever ran (issue #196)");
    }
    for (const [i, [preset]] of PRESETS.entries()) {
      const b = normal.boards[i];
      if (!b) continue;
      if (!b.cascaded || b.intermediateStates === 0) {
        failed = true;
        console.error(`FAIL: flapSpeed="${preset}" snapped instead of cascading`);
      }
    }
    // Ordered strictly by step duration: four equal numbers is the reported
    // symptom, and the reason the story could not demonstrate flapSpeed at all.
    for (let i = 1; i < PRESETS.length; i++) {
      const slower = normal.boards[i];
      const faster = normal.boards[i - 1];
      if (!slower?.settleMs || !faster?.settleMs) continue;
      if (slower.settleMs <= faster.settleMs) {
        failed = true;
        console.error(
          `FAIL: flapSpeed="${PRESETS[i][0]}" settled in ${slower.settleMs}ms, no slower than ` +
            `"${PRESETS[i - 1][0]}" at ${faster.settleMs}ms — flapSpeed is not driving the cadence`,
        );
      }
    }

    console.log("");
    console.log("  reducedMotion=reduce (must snap — issue #180)");
    console.log(`    peak tiles with flap perspective: ${reduced.peakPerspective}`);
    console.log(`    peak running CSS animations:      ${reduced.peakAnimations}`);
    const cascadedUnderReduce = reduced.boards.filter((b) => b.cascaded).length;
    console.log(`    boards that cascaded:             ${cascadedUnderReduce}`);
    if (cascadedUnderReduce !== 0 || reduced.peakPerspective !== 0) {
      failed = true;
      console.error("FAIL: a board cascaded under prefers-reduced-motion (issue #180 requires a per-tile snap)");
    }

    if (!failed) console.log("\nPASS: message changes cascade, flapSpeed sets the pace, reduced motion snaps");
  } finally {
    await browser.close();
  }
} finally {
  server.close();
}

process.exit(failed ? 1 : 0);
