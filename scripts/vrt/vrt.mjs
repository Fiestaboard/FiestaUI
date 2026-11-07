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
 *
 *   node scripts/vrt/vrt.mjs parity --refs <local dir> --out <dir>
 *        [--url <base>] [--manifest vrt/figma-refs.json] [--shots <dir>]
 *     Figma parity (MASTER-PLAN §3). Joins <refs>/refs.json — a local checkout
 *     of the design-refs repo at a pinned tag, or any local stand-in; never a
 *     URL — with vrt/figma-refs.json, shoots each target at the ref's slot
 *     size, scale and theme, measures the DOM for probes 1–5, and writes
 *     <out>/report.{json,md} plus <id>.png / .ref.png / .diff.png / .dom.json.
 *     --shots reuses an earlier capture (<id>.png + <id>.dom.json) instead of
 *     launching a browser. REPORT-ONLY: findings never change the exit code
 *     (0); only bad input exits 2. Gating arrives in slice 1.1.
 */

import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";
import { PNG } from "pngjs";

import { evaluateEntry, joinRefs, loadManifest, loadRefs, renderMarkdown, resolveRefsDir } from "./parity.mjs";
import { buildManifest, fileNameFor, parseShard, selectShard, taskKey } from "./shard.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SKIP_FILE = path.join(ROOT, "vrt", "skip.json");
const PARITY_MANIFEST = path.join(ROOT, "vrt", "figma-refs.json");

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
  const args = {
    mode: argv[2],
    url: "http://localhost:6006",
    out: null,
    shard: null,
    refs: null,
    manifest: PARITY_MANIFEST,
    shots: null,
  };
  const parityOnly = new Set(["--refs", "--manifest", "--shots"]);
  for (let i = 3; i < argv.length; i++) {
    if (parityOnly.has(argv[i]) && args.mode !== "parity") {
      console.error(`${argv[i]} applies to the parity mode only`);
      process.exit(2);
    }
    if (argv[i] === "--url") args.url = argv[++i];
    else if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--shard") args.shard = argv[++i];
    else if (argv[i] === "--refs") args.refs = argv[++i];
    else if (argv[i] === "--manifest") args.manifest = argv[++i];
    else if (argv[i] === "--shots") args.shots = argv[++i];
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

// --- parity (MASTER-PLAN §3) -----------------------------------------------

/**
 * Runs in the page: measure the target root and every probe the manifest asks
 * for. Rects are CSS px relative to the root's border box. Colours are
 * normalised to rgb() through a canvas, so oklch()/color-mix() tokens compare
 * as sRGB without a colour library on the Node side.
 */
function measureInPage({ rootSelector, probes }) {
  const root = document.querySelector(rootSelector);
  if (!root) return { root: null };
  const origin = root.getBoundingClientRect();
  const pick = (selector) => (!selector || selector === ":scope" ? root : root.querySelector(selector));
  const rel = (r) => ({ x: r.x - origin.x, y: r.y - origin.y, width: r.width, height: r.height });
  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  const toRgb = (value) => {
    if (!/^(#|rgb|hsl|oklch|oklab|lab|lch|color)/.test(value)) return value;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, ${Math.round((a / 255) * 1000) / 1000})`;
  };
  // A Figma text node's box is its line boxes (lines × line-height); a DOM
  // Range gives the glyph box, a few px shorter. Keep the Range's x/width and
  // the centre of each line, and stretch the height to the computed
  // line-height, so the two boxes mean the same thing.
  const textRect = (el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    const lineHeight = parseFloat(getComputedStyle(el).lineHeight);
    if (!Number.isFinite(lineHeight)) return r;
    const lines = new Set([...range.getClientRects()].map((c) => Math.round(c.top + c.height / 2))).size || 1;
    const first = range.getClientRects()[0] ?? r;
    const top = first.top + first.height / 2 - lineHeight / 2;
    return { x: r.x, y: top, width: r.width, height: lineHeight * lines };
  };
  return {
    root: { x: 0, y: 0, width: origin.width, height: origin.height },
    rootPage: { x: origin.x, y: origin.y },
    geometry: (probes.geometry ?? []).map(({ node, selector, measure }) => {
      const el = pick(selector);
      return { node, rect: el ? rel(measure === "text" ? textRect(el) : el.getBoundingClientRect()) : null };
    }),
    text: (probes.text ?? []).map(({ node, selector, canonKey }) => {
      const el = pick(selector);
      return { node, canonKey, text: el ? el.textContent : null };
    }),
    tokens: (probes.tokens ?? []).map(({ selector, property, variable }) => {
      const el = pick(selector);
      return {
        selector,
        property,
        variable,
        value: el ? toRgb(getComputedStyle(el).getPropertyValue(property)) : null,
      };
    }),
    board: probes.board
      ? {
          tiles: [...root.querySelectorAll(probes.board.tiles)].map((el) => {
            const r = el.getBoundingClientRect();
            return { width: r.width, height: r.height, color: el.getAttribute(probes.board.colorAttr) };
          }),
        }
      : null,
  };
}

/** Storybook's `args` URL syntax: key:value pairs joined by `;`. */
function argsParam(args) {
  if (!args) return "";
  return `&args=${Object.entries(args)
    .map(([k, v]) => `${encodeURIComponent(k)}:${encodeURIComponent(String(v))}`)
    .join(";")}`;
}

/** Shoot one parity target and write <id>.png + <id>.dom.json into outDir. */
async function captureParity(browser, baseUrl, { ref, entry }, refPng, outDir) {
  const target = entry.target;
  // Screens shoot at the slot size (§3.2, M6). A component's Storybook canvas
  // pads around it, so it gets room to lay out at its natural size.
  const viewport =
    target.viewport ??
    (entry.kind === "screen"
      ? { width: ref.slotWidth, height: ref.slotHeight }
      : { width: ref.slotWidth + 200, height: ref.slotHeight + 200 });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: ref.scale,
    reducedMotion: "reduce",
    colorScheme: ref.mode === "dark" ? "dark" : "light",
  });
  try {
    const page = await context.newPage();
    const url = `${baseUrl}/iframe.html?globals=theme:${ref.mode}&id=${encodeURIComponent(target.story)}&viewMode=story${argsParam(target.args)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await page
      .waitForFunction(() => document.querySelector("#storybook-root")?.childElementCount > 0, null, {
        timeout: 10_000,
      })
      .catch(() => {});
    await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(SETTLE_MS);
    await page.addStyleTag({ content: FREEZE_CSS });
    await page.waitForTimeout(POST_FREEZE_MS);

    const dom = await page.evaluate(measureInPage, {
      rootSelector: target.root ?? "#storybook-root > *",
      probes: entry.probes ?? {},
    });
    if (!dom.root) throw new Error(`target root not found: ${target.root ?? "#storybook-root > *"}`);
    // Clip to the ref's frame: the node's origin minus the render bleed (a
    // shadow), at the ref's size. A root of the wrong size shows up in the
    // geometry probe's (root) row and in the pixel diff.
    await page.screenshot({
      path: path.join(outDir, `${ref.id}.png`),
      clip: {
        x: dom.rootPage.x - ref.renderOffset.x,
        y: dom.rootPage.y - ref.renderOffset.y,
        width: refPng.width / ref.scale,
        height: refPng.height / ref.scale,
      },
      animations: "disabled",
    });
    await writeFile(path.join(outDir, `${ref.id}.dom.json`), `${JSON.stringify(dom, null, 2)}\n`);
  } finally {
    await context.close();
  }
}

async function parity({ url, out, refs: refsArg, manifest: manifestFile, shots }) {
  // Bad input is the only non-zero exit. Everything after this is a finding.
  let refsDir;
  let refs;
  let manifest;
  try {
    if (!out) throw new Error("parity requires --out <dir>");
    refsDir = resolveRefsDir(refsArg);
    refs = loadRefs(refsDir);
    manifest = loadManifest(manifestFile);
  } catch (err) {
    console.error(`parity: ${err.message}`);
    process.exit(2);
  }
  const outDir = path.resolve(out);
  await mkdir(outDir, { recursive: true });
  const { pairs, missingRefs, unmanifested } = joinRefs(refs, manifest);
  log(`Parity: ${pairs.length} ref(s) from ${refsDir}${shots ? ` against shots in ${shots}` : ` against ${url}`}`);

  const entries = [];
  const browser = shots ? null : await chromium.launch();
  try {
    for (const pair of pairs) {
      const { ref, entry } = pair;
      try {
        const refPng = PNG.sync.read(await readFile(ref.pngPath));
        await copyFile(ref.pngPath, path.join(outDir, `${ref.id}.ref.png`));
        const shotDir = shots ? path.resolve(shots) : outDir;
        if (browser) await captureParity(browser, url, pair, refPng, outDir);
        const shotPng = PNG.sync.read(await readFile(path.join(shotDir, `${ref.id}.png`)));
        const dom = JSON.parse(await readFile(path.join(shotDir, `${ref.id}.dom.json`), "utf8"));
        if (dom.root) {
          // The target root itself must have the slot's size: a (root) row
          // in the geometry probe, against a synthetic node at the origin.
          ref.nodes = [...ref.nodes, { name: "(root)", x: 0, y: 0, width: ref.slotWidth, height: ref.slotHeight }];
          dom.geometry = [{ node: "(root)", rect: dom.root }, ...(dom.geometry ?? [])];
        }
        const { diffPng, ...result } = evaluateEntry({ ref, entry, refPng, shotPng, dom });
        await writeFile(path.join(outDir, `${ref.id}.diff.png`), PNG.sync.write(diffPng));
        entries.push(result);
      } catch (err) {
        entries.push({ id: ref.id, figmaNode: ref.figmaNode, wouldPass: false, error: err.message });
      }
    }
  } finally {
    await browser?.close();
  }

  const report = {
    gating: false,
    refsDir,
    refsTag: JSON.parse(await readFile(path.join(refsDir, "refs.json"), "utf8")).tag ?? null,
    manifest: path.relative(ROOT, path.resolve(manifestFile)),
    missingRefs,
    unmanifested,
    entries,
  };
  await writeFile(path.join(outDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  const md = renderMarkdown(report);
  await writeFile(path.join(outDir, "report.md"), md);
  log(md);
  const failing = entries.filter((e) => !e.wouldPass).length;
  log(`Parity (report-only): ${entries.length - failing}/${entries.length} would pass. Report: ${outDir}/report.md`);
}

async function main() {
  const args = parseArgs(process.argv);
  const { mode, url, out, shard } = args;
  if (mode === "shoot") {
    if (!out) {
      console.error("shoot requires --out <dir>");
      process.exit(2);
    }
    await shoot(url, path.resolve(out), shard);
  } else if (mode === "parity") {
    await parity(args);
  } else {
    console.error(
      "Usage: node scripts/vrt/vrt.mjs shoot --out <dir> [--url <base>] [--shard <i/N>]\n" +
        "       node scripts/vrt/vrt.mjs parity --refs <local dir> --out <dir> [--url <base>] " +
        "[--manifest <file>] [--shots <dir>]",
    );
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(`vrt: ${err.stack || err}`);
  process.exit(1);
});
