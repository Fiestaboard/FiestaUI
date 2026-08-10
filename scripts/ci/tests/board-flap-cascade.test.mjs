/**
 * Behavioral regression test for issue #196: a message change must *cascade*.
 *
 * The bug this guards against was not a wrong style or a missing prop — every
 * static check passed while the board snapped. `CharTile`'s loading effect also
 * listed `targetCharIndex` in its dependencies, so a message change re-ran it,
 * and its idle branch snapped `currentCharIndex` to the new target earlier in
 * the very same passive-effect flush that the transition effect was about to
 * step away from. The transition started and cancelled itself inside one batch:
 * `isTransitioning` never reached a committed render, the flap layers never
 * mounted, and `flapSpeed` had nothing left to control. A conformance test
 * reading the source cannot see any of that — only running the component over
 * time can.
 *
 * So this mounts the real `BoardDisplay` (React + react-dom in jsdom), changes
 * `message`, and samples the grid while it settles. jsdom rather than a browser
 * because `release:test` runs in CI's `automation` job, which does `npm ci` but
 * never `npx playwright install` — and this project's playwright entries carry
 * no install script, so no browser binary exists there. Nothing asserted below
 * needs a compositor: the cascade is JS state, and the flap layers are inline
 * styles jsdom reflects faithfully. The browser-side proof (real CSS animations,
 * real paint) lives in scripts/ci/board-flap-cascade-e2e.mjs.
 *
 * What it pins down:
 *   1. a message change produces intermediate characters (a real walk around
 *      the drum), not a snap;
 *   2. the flap layers actually mount while it walks (`perspective: 800px`);
 *   3. settle time scales with `flapSpeed` — the whole point of #178;
 *   4. under `prefers-reduced-motion: reduce` it still snaps per tile, with no
 *      intermediate characters and no flap layers (issue #180).
 */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { JSDOM } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const boardDir = path.resolve(here, "../../../src/components/board");

// React, react-dom and the component are bundled together into one
// self-contained module: the bundle is imported afresh for every run (see
// `?run=` below), and a shared React would then be driving two different
// documents. It also keeps the emitted file free of bare imports, so it can
// live in the OS temp dir instead of somewhere inside the repo.
const HARNESS = `
  import { createElement } from "react";
  import { createRoot } from "react-dom/client";
  import { BoardDisplay } from "./board-display";

  export function mount(container) {
    const root = createRoot(container);
    return {
      render: (props) => root.render(createElement(BoardDisplay, props)),
      unmount: () => root.unmount(),
    };
  }
`;

// One character apart on the board drum per step, so a tile's settle time is
// (distance around the drum) x flapStepMs. "A" -> "K" is ten steps, which is
// long enough to be unambiguous and short enough to keep the slowest preset
// well inside a test budget.
const FROM = "A";
const TO = "K";
const STEPS = 10;

// How long a cascade is allowed to take to *start* before we call it a snap.
// The quickest preset (hardware, 16ms/step) takes ten times that to finish, so
// this can never mistake a fast cascade for a snap; it only has to cover
// React's commit plus the first effect flush.
const START_GRACE_MS = 300;

/** Every preset, plus the step duration each resolves to. */
const PRESETS = [
  ["hardware", 16],
  ["quick", 48],
  ["standard", 80],
  ["relaxed", 130],
];

let tmp;
let bundleUrl;

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "board-flap-cascade-"));
  const outfile = path.join(tmp, "harness.mjs");
  await build({
    stdin: { contents: HARNESS, resolveDir: boardDir, sourcefile: "harness.js", loader: "js" },
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    jsx: "automatic",
    // React's dev build is the one that runs effects the way the browser does
    // (and the one Storybook serves), so this measures the same code path.
    define: { "process.env.NODE_ENV": '"development"' },
    logLevel: "silent",
  });
  bundleUrl = pathToFileURL(outfile).href;
});

after(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

/**
 * Install a jsdom window as the global environment.
 *
 * `reduceMotion` drives the `matchMedia` stub: reduced-motion.ts reads the
 * query at module scope, so it has to exist before the component is imported,
 * and jsdom does not implement matchMedia at all.
 */
function installDom({ reduceMotion = false } = {}) {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.matchMedia = (query) => ({
    media: query,
    matches: query.includes("prefers-reduced-motion: reduce") ? reduceMotion : false,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });

  const globals = [
    "window",
    "document",
    "navigator",
    "HTMLElement",
    "Element",
    "Node",
    "Event",
    "MessageChannel",
    "MessagePort",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "getComputedStyle",
  ];
  // defineProperty, not assignment: some of these (`navigator`) are
  // getter-only on the Node global and a plain write would silently no-op.
  const saved = new Map();
  const put = (key, value) => {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  for (const key of globals) {
    saved.set(key, Reflect.get(globalThis, key));
    put(key, key === "window" ? window : window[key]);
  }
  globalThis.IS_REACT_ACT_ENVIRONMENT = false;

  return {
    window,
    restore() {
      for (const [key, value] of saved) put(key, value);
      dom.window.close();
    },
  };
}

/** One tile's rendered character, and whether its flap layers are mounted. */
function readGrid(container) {
  const tiles = [...container.querySelectorAll("[data-current-char]")];
  return {
    chars: tiles.map((t) => t.getAttribute("data-current-char")).join(""),
    transitioning: tiles.filter((t) => t.getAttribute("data-is-transitioning") === "true").length,
    // The flap layers are the only thing that sets perspective (see
    // charTileAnimatingStyle); if none is set, no tile ever mounted them.
    flapLayers: tiles.filter((t) => t.style.perspective === "800px").length,
  };
}

/**
 * Mount BoardDisplay with `message`, switch it to `nextMessage`, and sample the
 * grid every few milliseconds until nothing is transitioning any more.
 */
let runCounter = 0;

async function runMessageChange({ flapSpeed, reduceMotion = false, timeoutMs = 6000 }) {
  const dom = installDom({ reduceMotion });
  try {
    // A fresh module instance per run. reduced-motion.ts resolves its
    // MediaQueryList at module scope, and the loading tickers and flap-layer
    // style cache are module-level too — a cached module would carry the
    // previous run's window and preference into this one.
    const harness = await import(`${bundleUrl}?run=${++runCounter}`);

    const container = dom.window.document.getElementById("root");
    const root = harness.mount(container);

    const render = (message) => root.render({ message, size: "sm", deviceType: "note", flapSpeed });

    render(FROM);
    // Let the mount commit and its effects flush.
    await new Promise((r) => setTimeout(r, 30));

    const before = readGrid(container);
    assert.ok(before.chars.includes(FROM), `expected the board to render "${FROM}" first, got "${before.chars}"`);

    const seenChars = new Set();
    let peakFlapLayers = 0;
    let peakTransitioning = 0;

    const startedAt = Date.now();
    render(TO);

    // "Settled" means: a cascade started, and then stopped. Watching only for
    // `transitioning === 0` would report a settle on the very first sample,
    // before React has even committed the new message — which is exactly the
    // snap this test exists to catch, scored as a pass.
    let settleMs = null;
    let cascadeStarted = false;
    while (Date.now() - startedAt < timeoutMs) {
      await new Promise((r) => setTimeout(r, 4));
      const elapsed = Date.now() - startedAt;
      const grid = readGrid(container);
      seenChars.add(grid.chars);
      peakFlapLayers = Math.max(peakFlapLayers, grid.flapLayers);
      peakTransitioning = Math.max(peakTransitioning, grid.transitioning);
      if (grid.transitioning > 0) {
        cascadeStarted = true;
      } else if (cascadeStarted) {
        settleMs = elapsed;
        break;
      } else if (elapsed > START_GRACE_MS) {
        // Nothing ever started stepping: the board snapped. Reported as 0 so
        // the caller can tell "snapped" from "still running at timeout".
        settleMs = 0;
        break;
      }
    }

    const after = readGrid(container);
    root.unmount();
    // Let React's scheduler drain before `restore()` tears the window down —
    // a callback that lands after `window.close()` throws out of band and the
    // test runner reports it as a failure of whichever test is running.
    await new Promise((r) => setTimeout(r, 25));

    return {
      settleMs,
      after: after.chars,
      // Grid states other than the start and the end: each one is a frame
      // where at least one tile showed a character it was only passing
      // through. A snap produces none.
      intermediateStates: [...seenChars].filter((c) => c !== before.chars && c !== after.chars).length,
      peakFlapLayers,
      peakTransitioning,
    };
  } finally {
    dom.restore();
  }
}

describe("a message change cascades (issue #196)", () => {
  test("intermediate characters appear and the flap layers mount", async () => {
    const run = await runMessageChange({ flapSpeed: "standard" });

    assert.ok(
      run.settleMs !== null,
      "the board never stopped transitioning — the cascade started but nothing finished it",
    );
    assert.ok(
      run.intermediateStates > 0,
      `the board snapped: it went straight from "${FROM}" to "${TO}" with no intermediate characters. ` +
        "A message change must step each changed tile around the character drum (issue #196).",
    );
    assert.ok(
      run.peakFlapLayers > 0,
      "no tile ever mounted its flap layers (nothing set perspective:800px), so nothing could animate " +
        "even though the characters changed (issue #196)",
    );
    assert.equal(run.after.replaceAll(" ", ""), TO, "the board must still arrive at the new message");
  });

  test("settle time scales with flapSpeed", async () => {
    const settle = {};
    for (const [preset] of PRESETS) {
      const run = await runMessageChange({ flapSpeed: preset });
      assert.ok(run.settleMs !== null, `flapSpeed="${preset}" never settled`);
      assert.ok(run.intermediateStates > 0, `flapSpeed="${preset}" snapped instead of cascading`);
      settle[preset] = run.settleMs;
    }

    const summary = PRESETS.map(([p, ms]) => `${p}(${ms}ms/step)=${settle[p]}ms`).join("  ");

    // The contract is monotonic, not exact: jsdom timers drift and each step
    // costs a React render on top of its interval. Every preset must be
    // meaningfully slower than the one below it — a board that ignores
    // flapSpeed produces four identical numbers, which is the reported symptom.
    for (let i = 1; i < PRESETS.length; i++) {
      const [slower, slowerMs] = PRESETS[i];
      const [faster, fasterMs] = PRESETS[i - 1];
      assert.ok(
        settle[slower] > settle[faster] + STEPS * (slowerMs - fasterMs) * 0.5,
        `flapSpeed="${slower}" (${slowerMs}ms/step) must take substantially longer to settle than ` +
          `"${faster}" (${fasterMs}ms/step); flapSpeed is not driving the cascade cadence. ${summary}`,
      );
    }

    // Each preset must also be in the right ballpark on its own terms: ten
    // steps at N ms cannot settle in much less than 10 x N.
    for (const [preset, stepMs] of PRESETS) {
      assert.ok(
        settle[preset] >= STEPS * stepMs * 0.5,
        `flapSpeed="${preset}" settled in ${settle[preset]}ms, far below the ${STEPS} x ${stepMs}ms ` +
          `the cascade should take. ${summary}`,
      );
    }
  });
});

describe("reduced motion still snaps (issue #180)", () => {
  test("no intermediate characters and no flap layers under prefers-reduced-motion", async () => {
    const run = await runMessageChange({ flapSpeed: "relaxed", reduceMotion: true, timeoutMs: 800 });

    assert.equal(
      run.peakTransitioning,
      0,
      "under prefers-reduced-motion a message change must snap per tile, not run a cascade (issue #180)",
    );
    assert.equal(run.peakFlapLayers, 0, "under prefers-reduced-motion no tile may mount its flap layers (issue #180)");
    assert.equal(run.intermediateStates, 0, "under prefers-reduced-motion no intermediate character may be shown");
    assert.equal(run.after.replaceAll(" ", ""), TO, "the board must still show the new message immediately");
  });
});
