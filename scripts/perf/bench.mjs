#!/usr/bin/env node
/**
 * FiestaUI runtime-bench harness.
 *
 * Measures what a story costs at runtime: how long it takes to mount, how
 * expensive its frames are, how much main-thread blocking it causes, and
 * whether it hands memory back when it unmounts.
 *
 * Mode:
 *
 *   node scripts/perf/bench.mjs measure --out <file> [--markdown <file>]
 *                                       [--base-url http://localhost:6007]
 *                                       [--idle-story <id>] [--control-story <id>]
 *                                       [--only <substr>] [--all-stories]
 *     Enumerate stories from a served storybook-static, measure one story per
 *     component (see selectTargets), write a JSON report. Requires the static
 *     build to be served already:
 *
 *       npm run build-storybook && npm run vrt:serve
 *
 * This harness is an INSTRUMENT for the perf-explore loop, never a CI gate.
 * It always exits 0 on a successful measurement run regardless of how
 * expensive the numbers are — there is nothing here to fail. All judgement
 * lives in bench-analyze.mjs.
 *
 * Unlike VRT, this deliberately does NOT honour vrt/skip.json. That file
 * excludes stories from *visual* baselining, and its reasons are animation
 * related — which is exactly where runtime cost concentrates. Skipping them
 * here would blind the instrument to its best targets.
 *
 * See docs/superpowers/specs/2026-08-07-perf-explore-loop-design.md.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";

import { classifyLeak, percentile, rankStories, RETENTION_CALIBRATION, summarize } from "./bench-analyze.mjs";

const SCHEMA_VERSION = 1;

/** Fresh navigations per story for the mount measurement. */
const MOUNT_REPEATS = 7;
/**
 * Mount/unmount cycles per story for the retention measurement. Ten, less two
 * dropped as warm-up, leaves eight — enough for the plateau check in
 * classifyLeak to have a meaningful second half to fit.
 */
const LEAK_CYCLES = 10;
/** How long to sample requestAnimationFrame deltas, in ms. */
const FRAME_WINDOW_MS = 3000;
/** Let entrance animations and font loading finish before sampling frames. */
const SETTLE_MS = 600;
const NAV_TIMEOUT_MS = 30_000;
const VIEWPORT = { width: 1280, height: 800 };

/**
 * The first two rAF deltas after installing the sampler are measured against
 * the evaluate() call rather than a previous frame, so they are meaningless.
 */
const FRAME_WARMUP = 2;

/**
 * Preferred stories for the idle and control roles, cheapest first.
 *
 * Both roles must be trivial components. The idle story is what we switch to
 * between cycles, and the control story defines the subtracted baseline — so a
 * heavy choice for either inflates the floor and masks real leaks in every
 * other story. Falling back to "first id alphabetically" is not good enough:
 * that picks `board-boarddisplay--color-palette` in this repo, which measured
 * a 245 KB/cycle baseline against Button's 146.
 */
const CHEAP_STORY_CANDIDATES = [
  "ui-badge--default",
  "ui-button--default",
  "ui-text--default",
  "ui-label--default",
  "ui-separator--default",
];

/**
 * Hard ceiling on stories per run, as a backstop against a story explosion
 * quietly pushing the weekly job past its timeout. Whatever it drops is
 * logged — a silent truncation would read as "we measured everything".
 */
const MAX_STORIES = 120;

const log = (msg) => process.stdout.write(`${msg}\n`);

/** `ui-button--large` -> `ui-button`. */
function componentOf(id) {
  return id.split("--")[0];
}

/**
 * One story per component, by default.
 *
 * A story costs ~10s to measure and this repo has 281 of them against 45
 * components, which is ~47 minutes of benching — more than the weekly job's
 * whole budget. The explorer reasons about components and files, not story
 * variants, so measuring twelve Badge variants buys nothing over measuring
 * one. `--all-stories` opts back in when you want the full picture locally.
 *
 * Selection is the first id alphabetically within each component, which is
 * deterministic across runs. The trade-off is real and worth stating: if a
 * component's expensive variant sorts late, this run will not see it. Target
 * it directly with `--only` when that matters.
 */
function selectTargets(ids, { allStories }) {
  if (allStories) return ids;
  const seen = new Set();
  return ids.filter((id) => {
    const component = componentOf(id);
    if (seen.has(component)) return false;
    seen.add(component);
    return true;
  });
}

function parseArgs(argv) {
  const args = {
    mode: argv[2],
    out: null,
    markdown: null,
    baseUrl: "http://localhost:6007",
    idleStory: null,
    controlStory: null,
    only: null,
    allStories: false,
    trustRetention: false,
  };
  for (let i = 3; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--out") args.out = argv[++i];
    else if (flag === "--markdown") args.markdown = argv[++i];
    else if (flag === "--base-url") args.baseUrl = argv[++i].replace(/\/$/, "");
    else if (flag === "--idle-story") args.idleStory = argv[++i];
    else if (flag === "--control-story") args.controlStory = argv[++i];
    else if (flag === "--only") args.only = argv[++i];
    else if (flag === "--all-stories") args.allStories = true;
    else if (flag === "--trust-retention") args.trustRetention = true;
    else {
      console.error(`Unknown argument: ${flag}`);
      process.exit(2);
    }
  }
  return args;
}

async function fetchStoryIds(baseUrl) {
  let res;
  try {
    res = await fetch(`${baseUrl}/index.json`);
  } catch (err) {
    throw new Error(`Could not reach ${baseUrl}/index.json (${err.message}). Is \`npm run vrt:serve\` running?`);
  }
  if (!res.ok) {
    throw new Error(`Failed to fetch ${baseUrl}/index.json (HTTP ${res.status}). Is storybook-static being served?`);
  }
  const index = await res.json();
  return Object.values(index.entries)
    .filter((entry) => entry.type === "story")
    .map((entry) => entry.id)
    .sort();
}

function storyUrl(baseUrl, id) {
  return `${baseUrl}/iframe.html?id=${encodeURIComponent(id)}&viewMode=story`;
}

/**
 * Records, in-page, the moment the story root first receives a child. Runs at
 * document start on every navigation.
 */
function installMountProbe(page) {
  return page.addInitScript(() => {
    window.__benchRootAt = null;
    const observer = new MutationObserver(() => {
      const root = document.querySelector("#storybook-root");
      if (window.__benchRootAt === null && root && root.childElementCount > 0) {
        window.__benchRootAt = performance.now();
        observer.disconnect();
      }
    });
    const start = () => observer.observe(document.documentElement, { childList: true, subtree: true });
    if (document.documentElement) start();
    else document.addEventListener("readystatechange", start, { once: true });
  });
}

async function waitForStory(page) {
  await page
    .waitForFunction(() => document.querySelector("#storybook-root")?.childElementCount > 0, null, { timeout: 10_000 })
    .catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
}

/**
 * Mount cost, measured from `domContentLoadedEventEnd` rather than from
 * navigation start. Every story shares one Storybook bundle, so timing from
 * navigation start would measure that shared parse over and over and flatten
 * the differences between stories. From DCL onward is the story's own work.
 */
async function measureMount(page, baseUrl, id) {
  const samples = [];
  for (let i = 0; i < MOUNT_REPEATS; i++) {
    await page.goto(storyUrl(baseUrl, id), { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await waitForStory(page);
    const sample = await page.evaluate(() => {
      const nav = performance.getEntriesByType("navigation")[0];
      if (!nav || window.__benchRootAt === null) return null;
      const delta = window.__benchRootAt - nav.domContentLoadedEventEnd;
      return delta > 0 ? delta : null;
    });
    if (sample !== null) samples.push(sample);
  }
  return samples;
}

/** Frame deltas and long-task count over a fixed window on the current page. */
async function measureFrames(page) {
  await page.waitForTimeout(SETTLE_MS);
  const { deltas, longTasks } = await page.evaluate(
    (windowMs) =>
      new Promise((resolve) => {
        const deltas = [];
        let longTasks = 0;
        let observer = null;
        try {
          observer = new PerformanceObserver((list) => {
            longTasks += list.getEntries().length;
          });
          observer.observe({ entryTypes: ["longtask"] });
        } catch {
          observer = null;
        }
        const start = performance.now();
        let last = start;
        const tick = (now) => {
          deltas.push(now - last);
          last = now;
          if (now - start < windowMs) {
            requestAnimationFrame(tick);
          } else {
            if (observer) observer.disconnect();
            resolve({ deltas, longTasks });
          }
        };
        requestAnimationFrame(tick);
      }),
    FRAME_WINDOW_MS,
  );
  return { deltas: deltas.slice(FRAME_WARMUP), longTasks };
}

/**
 * Retention across mount/unmount cycles.
 *
 * Toggles between the target story and a cheap idle story inside ONE document
 * — the JS heap has to stay continuous for a slope to mean anything, so
 * re-navigating (which discards the heap) would destroy the signal. Heap is
 * read with the target UNMOUNTED: a component that tears down correctly hands
 * its memory back and the series stays flat.
 *
 * This is the one measurement that depends on a Storybook internal (the addons
 * channel). When that is unavailable the result degrades to `unknown` rather
 * than to a wrong number — bench-analyze treats a null as "not measured", and
 * the explorer is told to read it as unknown rather than as clean.
 */
async function measureRetention(page, cdp, baseUrl, id, idleStory) {
  if (!idleStory || idleStory === id) {
    return { heapKbByCycle: [], reason: "no-idle-story" };
  }

  await page.goto(storyUrl(baseUrl, id), { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  await waitForStory(page);

  const hasChannel = await page.evaluate(() => Boolean(window.__STORYBOOK_ADDONS_CHANNEL__));
  if (!hasChannel) {
    return { heapKbByCycle: [], reason: "remount-unavailable" };
  }

  const show = async (storyId) => {
    await page.evaluate((sid) => {
      window.__STORYBOOK_ADDONS_CHANNEL__.emit("setCurrentStory", { storyId: sid, viewMode: "story" });
    }, storyId);
    await page.waitForTimeout(250);
  };

  const heapKbByCycle = [];
  for (let cycle = 0; cycle < LEAK_CYCLES; cycle++) {
    await show(id);
    await page.waitForTimeout(250);
    await show(idleStory);
    await cdp.send("HeapProfiler.collectGarbage");
    const { usedSize } = await cdp.send("Runtime.getHeapUsage");
    heapKbByCycle.push(usedSize / 1024);
  }

  // The first cycles include one-off allocation (module init, caches) that is
  // not retention. Dropping them keeps a warm-up ramp from reading as a leak.
  return { heapKbByCycle: heapKbByCycle.slice(2), reason: null };
}

async function measureStory(page, cdp, baseUrl, id, idleStory, baselineSlopeKb, trustRetention) {
  const mountSamples = await measureMount(page, baseUrl, id);
  const { deltas, longTasks } = await measureFrames(page);
  const retention = await measureRetention(page, cdp, baseUrl, id, idleStory);

  const mount = summarize(mountSamples);
  const frame = summarize(deltas);
  const leak = classifyLeak(retention.heapKbByCycle, { baselineSlopeKb });

  // p95 is reported only when the frame series as a whole was stable enough to
  // trust; quoting a tail statistic from a scattered sample would be worse
  // than quoting nothing.
  const frameP95 = frame.unstable ? null : percentile(deltas, 0.95);

  return {
    id,
    mountMs: mount,
    frame: {
      p50: frame.value,
      p95: frameP95,
      rawP50: frame.rawMedian,
      rawP95: percentile(deltas, 0.95),
      unstable: frame.unstable,
      reason: frame.reason,
      samples: deltas.length,
    },
    longTasks,
    // The raw series travels with the verdict. Retention is the metric most
    // likely to be wrong, and a reader who cannot see the numbers behind a
    // "leak" has no way to sanity-check it.
    //
    // The verdict itself is withheld unless --trust-retention is passed: the
    // correction this measurement needs is proportional to story weight and
    // the harness only subtracts a constant. See RETENTION_CALIBRATION.
    retention: {
      ...leak,
      verdict: trustRetention ? leak.verdict : "unknown",
      uncalibratedVerdict: leak.verdict,
      reason: trustRetention ? (retention.reason ?? leak.reason) : (retention.reason ?? RETENTION_CALIBRATION),
      heapKbByCycle: retention.heapKbByCycle.map((kb) => Math.round(kb)),
    },
    // Flattened for ranking. A null here means "not measured", never "zero".
    // Retention is absent by design — it is not calibrated, so it must not
    // influence the ordering the explorer picks its targets from.
    metrics: {
      mountMs: mount.value,
      frameP95,
      longTasks,
    },
  };
}

function num(value, digits = 1) {
  return Number.isFinite(value) ? value.toFixed(digits) : "—";
}

function renderMarkdown(report) {
  const lines = ["## Runtime bench", ""];
  lines.push(
    "Relative measurements from a single run. Scores are normalised within this run only —",
    "comparing them against another run or another machine is meaningless. `—` means the",
    "measurement was too noisy to report, which is **unknown**, not **fine**.",
    "",
    report.retentionCalibrated
      ? `Retention is net of a ${report.baselineSlopeKb.toFixed(1)} KB/cycle harness baseline ` +
          `(control story \`${report.controlStory}\`), which is Storybook's own story-switching cost.`
      : "**Retention is raw data with no verdict, and is excluded from the score.** Storybook's own " +
          "per-render retention scales with how much a story renders, so subtracting a constant baseline " +
          "cannot remove it — a trivial Button measures ~141 KB/cycle. Do NOT read a large number here as " +
          "a leak. See `RETENTION_CALIBRATION` in `scripts/perf/bench-analyze.mjs`.",
    "",
  );
  lines.push("| Story | Score | Mount ms | Frame p95 ms | Long tasks | Retention |");
  lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");

  for (const story of report.ranked.slice(0, 30)) {
    const retention = report.retentionCalibrated
      ? story.retention.verdict === "unknown"
        ? `unknown (${story.retention.reason})`
        : `${story.retention.verdict} (${num(story.retention.slopeKb)} KB/cycle)`
      : `${num(story.retention.rawSlopeKb)} raw`;
    lines.push(
      `| \`${story.id}\` | ${story.score.toFixed(3)} | ${num(story.metrics.mountMs)} | ` +
        `${num(story.metrics.frameP95)} | ${story.longTasks} | ${retention} |`,
    );
  }

  const leaks = report.ranked.filter((s) => s.retention.verdict === "leak");
  if (leaks.length > 0) {
    lines.push("", "### Retention findings", "");
    for (const story of leaks) {
      lines.push(`- \`${story.id}\` retains ~${num(story.retention.slopeKb)} KB per mount/unmount cycle.`);
    }
  }

  const { mode, storiesAvailable, storiesMeasured } = report.selection;
  lines.push(
    "",
    `_${storiesMeasured} of ${storiesAvailable} stories measured (selection: ${mode})._` +
      (mode === "one-per-component"
        ? " Story variants beyond the first per component were not measured; re-run with `--all-stories` or `--only <id>` to cover them."
        : ""),
  );
  return lines.join("\n");
}

async function measure(args) {
  if (!args.out) {
    console.error("measure requires --out <file>");
    process.exit(2);
  }

  const ids = await fetchStoryIds(args.baseUrl);
  if (ids.length === 0) throw new Error("No stories found in index.json");

  // Deterministic default so the retention baseline does not drift between
  // runs. Overridable when the first story alphabetically is a poor idle
  // choice (e.g. it animates).
  const cheap = CHEAP_STORY_CANDIDATES.filter((id) => ids.includes(id));
  const idleStory = args.idleStory ?? cheap[0] ?? ids[0];
  const controlStory =
    args.controlStory ?? cheap.find((id) => id !== idleStory) ?? ids.find((id) => id !== idleStory) ?? null;
  const matched = args.only ? ids.filter((id) => id.includes(args.only)) : ids;
  const selected = selectTargets(matched, { allStories: args.allStories || Boolean(args.only) });
  const targets = selected.slice(0, MAX_STORIES);

  if (!args.allStories && !args.only && selected.length < matched.length) {
    log(
      `Selected ${selected.length} of ${matched.length} stories (one per component). Use --all-stories for every variant.`,
    );
  }
  if (targets.length < selected.length) {
    log(`Capped at ${MAX_STORIES}: ${selected.length - targets.length} stories NOT measured this run.`);
  }
  log(`Benching ${targets.length} stories from ${args.baseUrl} (idle: ${idleStory}, control: ${controlStory})`);

  const browser = await chromium.launch({
    args: ["--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--js-flags=--expose-gc"],
  });
  const stories = [];
  const failures = [];
  const started = Date.now();
  let baselineSlopeKb = 0;
  let baselineAvailable = true;

  try {
    // One context, one page, strictly sequential. Parallel pages contend for
    // the same main thread, which is precisely what is being measured.
    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await installMountProbe(page);
    const cdp = await context.newCDPSession(page);

    // Establish the harness floor first. Storybook's own story-switching
    // retains memory on every cycle regardless of what is mounted, so without
    // this every story looks like it leaks. Measured with the identical
    // procedure so whatever it costs cancels out.
    if (controlStory) {
      const control = await measureRetention(page, cdp, args.baseUrl, controlStory, idleStory);
      const fit = classifyLeak(control.heapKbByCycle);
      if (fit.rawSlopeKb !== null) {
        baselineSlopeKb = fit.rawSlopeKb;
        log(`Harness retention baseline: ${baselineSlopeKb.toFixed(1)} KB/cycle (control: ${controlStory})`);
      } else {
        log(
          `Harness retention baseline unavailable (${control.reason ?? fit.reason}) — retention will be reported as unknown.`,
        );
        baselineAvailable = false;
      }
    } else {
      baselineAvailable = false;
    }

    for (const [index, id] of targets.entries()) {
      try {
        const trust = args.trustRetention && baselineAvailable;
        const story = await measureStory(page, cdp, args.baseUrl, id, idleStory, baselineSlopeKb, trust);
        if (!baselineAvailable) {
          // Without a baseline the raw slope is dominated by harness overhead.
          // Reporting it as a verdict would be a fabricated finding.
          story.retention = { ...story.retention, verdict: "unknown", reason: "no-baseline" };
        }
        stories.push(story);
      } catch (err) {
        failures.push({ id, error: err.message });
      }
      if ((index + 1) % 10 === 0) log(`  ${index + 1}/${targets.length} stories...`);
    }
  } finally {
    await browser.close();
  }

  const ranked = rankStories(stories);
  const report = {
    schemaVersion: SCHEMA_VERSION,
    baseUrl: args.baseUrl,
    idleStory,
    controlStory,
    baselineSlopeKb: baselineAvailable ? baselineSlopeKb : null,
    // False unless --trust-retention was passed. Anything reading this file
    // must check it before treating a retention number as meaningful.
    retentionCalibrated: Boolean(args.trustRetention && baselineAvailable),
    // Coverage is recorded explicitly so a partial run can never be mistaken
    // for a complete one by anything reading this file.
    selection: {
      mode: args.allStories ? "all-stories" : args.only ? "filtered" : "one-per-component",
      storiesAvailable: ids.length,
      storiesSelected: selected.length,
      storiesMeasured: stories.length,
    },
    storyCount: stories.length,
    failures,
    // Deliberately no timestamp: the report is committed each week, and a
    // changing timestamp would produce a diff even when nothing moved.
    ranked,
  };

  await writeFile(path.resolve(args.out), `${JSON.stringify(report, null, 2)}\n`);
  log(`Measured ${stories.length}/${targets.length} in ${((Date.now() - started) / 1000).toFixed(1)}s -> ${args.out}`);

  if (args.markdown) {
    await writeFile(path.resolve(args.markdown), `${renderMarkdown(report)}\n`);
    log(`Wrote ${args.markdown}`);
  }

  for (const failure of failures) console.error(`  BENCH FAILED ${failure.id}: ${failure.error}`);
  log(renderMarkdown(report));
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.mode === "measure") {
    await measure(args);
  } else {
    console.error("Usage: bench.mjs measure --out <file> [--markdown <file>] [--base-url <url>]");
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err.stack || err.message);
  process.exit(1);
});
