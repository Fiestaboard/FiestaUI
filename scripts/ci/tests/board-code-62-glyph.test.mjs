/**
 * Behavioral regression test for FiestaBoard#1657: a Flagship whose code-62
 * flap carries a heart must draw a heart, and announce one.
 *
 * Character code 62 is one code with two possible flaps. Vestaboard shipped
 * every Flagship with a degree sign until 2026, then replaced it with a heart on
 * newly-manufactured units. Nothing queryable distinguishes the two, so the
 * consuming app passes `code62Glyph` and the board draws what it is told.
 *
 * Two things here cannot be checked by reading `board-characters.ts`, which is
 * why this mounts the real component in jsdom rather than unit-testing the
 * helper (that half lives in board-characters.test.mjs):
 *
 *   1. `BoardDisplay` is `memo`'d with a **hand-written comparator** that lists
 *      every prop it cares about. A prop threaded correctly into the render but
 *      forgotten in that list renders right on first mount and then freezes: a
 *      user flipping the setting in Settings → Hardware would see nothing move.
 *      So this re-renders the same root with the glyph flipped and requires the
 *      tiles to follow.
 *   2. The tiles and the `role="img"` accessible name are built by two separate
 *      memos. They must not disagree — a board drawing ♥ while announcing
 *      "degree" is a text alternative for a different image (WCAG 1.1.1) — so
 *      both are read off the same rendered DOM and compared.
 *
 * jsdom rather than a browser, for the same reason as board-accessible-name and
 * board-flap-cascade: `release:test` runs in CI's `automation` job, which does
 * `npm ci` but never `npx playwright install`. Nothing asserted below needs a
 * compositor — the drawn glyph is a `data-current-char` attribute and the name
 * is `aria-label`, both DOM state.
 */

import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "esbuild";
import { JSDOM } from "jsdom";

const here = path.dirname(fileURLToPath(import.meta.url));
const boardDir = path.resolve(here, "../../../src/components/board");

const HARNESS = `
  import { createElement } from "react";
  import { createRoot } from "react-dom/client";
  import { BoardDisplay } from "./board-display";

  export { act } from "react";

  export function mount(container) {
    const root = createRoot(container);
    return {
      render: (props) => root.render(createElement(BoardDisplay, props)),
      unmount: () => root.unmount(),
    };
  }
`;

let tmp;
let bundleUrl;
let runCounter = 0;

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "board-code-62-glyph-"));
  const outfile = path.join(tmp, "harness.mjs");
  await build({
    stdin: { contents: HARNESS, resolveDir: boardDir, sourcefile: "harness.js", loader: "js" },
    outfile,
    bundle: true,
    format: "esm",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"development"' },
    logLevel: "silent",
  });
  bundleUrl = pathToFileURL(outfile).href;
});

after(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true });
});

/** Install a jsdom window as the global environment (see board-flap-cascade). */
function installDom() {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.matchMedia = (query) => ({
    media: query,
    matches: false,
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
  const saved = new Map();
  const put = (key, value) => {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  };
  // jsdom has no MessageChannel, and act() queues its work through one. Node's
  // own would do, but its ports stay open and keep the test process alive
  // after the last test; this one posts through setImmediate and holds nothing.
  window.MessageChannel = class ImmediateChannel {
    constructor() {
      this.port1 = { onmessage: null, close() {} };
      this.port2 = {
        postMessage: (data) => setImmediate(() => this.port1.onmessage?.({ data })),
        close() {},
      };
    }
  };
  for (const key of globals) {
    saved.set(key, Reflect.get(globalThis, key));
    put(key, key === "window" ? window : window[key]);
  }
  // Every render, tick and unmount below goes through React's act(), which
  // commits the work (effects included) before it returns. Without it, each
  // step was a fixed sleep that a CPU-starved runner could outlast.
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    window,
    restore() {
      for (const [key, value] of saved) put(key, value);
      dom.window.close();
    },
  };
}

/**
 * Replace `setInterval` with intervals the test fires by hand.
 *
 * The board advances its drum from intervals: the shared loading ticker, and
 * each tile's stepper. On a real clock the hardware cadence is 16ms a flip,
 * and on a loaded CI runner a single re-render of a 132-tile board takes far
 * longer than that, so ticks pile up and React commits several steps at once.
 * The drum then reports 61 then 63, and a test waiting to see code 62 never
 * does (seen on CI as `saw ["?"," ","A","63","C"]`). Firing each interval once
 * per step, inside act(), makes every step its own commit, however slow the
 * machine.
 */
function manualIntervals() {
  const real = { setInterval: globalThis.setInterval, clearInterval: globalThis.clearInterval };
  const active = new Map();
  let nextId = 1;
  globalThis.setInterval = (fn, _ms, ...args) => {
    const id = nextId++;
    active.set(id, () => fn(...args));
    return id;
  };
  globalThis.clearInterval = (id) => {
    if (!active.delete(id)) real.clearInterval(id);
  };
  return {
    /** Fire every active interval once: one flip for every moving tile. */
    step() {
      for (const cb of [...active.values()]) cb();
    },
    restore() {
      globalThis.setInterval = real.setInterval;
      globalThis.clearInterval = real.clearInterval;
    },
  };
}

/**
 * What the tiles actually drew, in reading order, with padding collapsed.
 *
 * Read as rendered text rather than from `data-current-char`: the glyph a
 * sighted user sees is the tile's text content, and that is what has to agree
 * with the accessible name.
 */
function drawnText(container) {
  return [...container.querySelectorAll('[data-testid^="char-tile-"]')]
    .map((t) => t.textContent || " ")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** The board's accessible name — the only thing a screen reader gets. */
function accessibleName(container) {
  const board = container.querySelector('[role="img"]');
  assert.ok(board, "BoardDisplay rendered no role=img element to read a name from");
  return board.getAttribute("aria-label");
}

/**
 * Mount one board, optionally re-render it with different props, and report
 * what the tiles drew and what the board announced after each render.
 *
 * `animationsEnabled: false` because the split-flap cascade would otherwise
 * walk the tile through intermediate glyphs; this test is about which glyph a
 * tile lands on, and board-flap-cascade.test.mjs already owns the walk.
 */
async function renderBoard(props, nextProps) {
  const dom = installDom();
  try {
    // A fresh module instance per run: reduced-motion.ts resolves its
    // MediaQueryList at module scope and would otherwise carry the previous
    // run's window into this one.
    const harness = await import(`${bundleUrl}?run=${++runCounter}`);
    const container = dom.window.document.getElementById("root");
    const root = harness.mount(container);
    const base = { size: "sm", animationsEnabled: false, ...props };

    await harness.act(async () => root.render(base));
    const first = { drawn: drawnText(container), name: accessibleName(container) };

    let second = null;
    if (nextProps) {
      await harness.act(async () => root.render({ ...base, ...nextProps }));
      second = { drawn: drawnText(container), name: accessibleName(container) };
    }

    // Inside act(), so unmount's work has drained before `restore()` closes the
    // window and no stray callback lands on a dead document.
    await harness.act(async () => root.unmount());
    return { first, second };
  } finally {
    dom.restore();
  }
}

test("a flagship told nothing keeps drawing a degree", async () => {
  // Every install that predates the setting must render exactly as it did.
  const { first } = await renderBoard({ message: "52 °F", deviceType: "flagship" });
  assert.equal(first.drawn, "52 °F");
  assert.match(first.name, /52 °F/, `expected the name to keep the degree; got ${JSON.stringify(first.name)}`);
});

test("a flagship whose flap carries a heart draws a heart", async () => {
  const { first } = await renderBoard({ message: "52 °F", deviceType: "flagship", code62Glyph: "heart" });
  assert.equal(first.drawn, "52 ♥F", "the tiles drew a degree on a board whose code-62 flap is a heart");
});

test("a flagship drawing a heart announces a heart, not a degree", async () => {
  // The reporter's specific concern: the tile and the name are built by two
  // separate memos, and a name saying "degree" for a ♥ tile is WCAG 1.1.1.
  const { first } = await renderBoard({ message: "52 °F", deviceType: "flagship", code62Glyph: "heart" });
  assert.match(first.name, /52 ♥F/, `the board drew "52 ♥F" but announced ${JSON.stringify(first.name)}`);
});

test("flipping the setting on a mounted board updates the tiles", async () => {
  // BoardDisplay's memo comparator is hand-written. A prop missing from it
  // renders correctly once and then never again — exactly what a user toggling
  // Settings → Hardware would hit.
  const { first, second } = await renderBoard(
    { message: "52 °F", deviceType: "flagship", code62Glyph: "degree" },
    { code62Glyph: "heart" },
  );
  assert.equal(first.drawn, "52 °F");
  assert.equal(second.drawn, "52 ♥F", "the board ignored a changed code62Glyph — check the memo comparator");
});

test("flipping the setting on a mounted board updates the accessible name", async () => {
  const { second } = await renderBoard(
    { message: "52 °F", deviceType: "flagship", code62Glyph: "degree" },
    { code62Glyph: "heart" },
  );
  assert.match(second.name, /52 ♥F/, `the name did not follow the flipped setting; got ${JSON.stringify(second.name)}`);
});

test("a note board draws a heart whatever the flagship setting says", async () => {
  // Note hardware only ever shipped the heart flap, so the setting is not the
  // device's to take — a stale flagship preference must not reach it.
  const { first } = await renderBoard({ message: "LOVE °", deviceType: "note", code62Glyph: "degree" });
  assert.equal(first.drawn, "LOVE ♥");
  assert.match(first.name, /LOVE ♥/, `a Note announced ${JSON.stringify(first.name)} for a board drawing "LOVE ♥"`);
});

// ── The drum, not just the landing ──────────────────────────────────────────
//
// `getCharIndex("♥")` and `getCharIndex("°")` are both 62, so a heart board's
// tiles cascade through index 62 like any other. The flap halves used to draw
// `BOARD_CHARS[62]` ("°") for that position regardless of the board, so a heart
// board flashed a degree sign on the way past code 62, and a tile leaving ♥
// folded a "°" flap down over it. The halves have to draw the board's own
// code-62 glyph.

/**
 * Mount a board and record everything every tile shows while it runs: each
 * value the drum reports (`data-current-char`) and each glyph the flap halves
 * draw. Returns the set of drum glyphs and the set of drawn glyphs.
 *
 * Recorded with a MutationObserver attached BEFORE the first render, so a
 * first loading tick that lands on code 62 is caught too. Time does not
 * run on its own here: intervals are fired by hand (see manualIntervals), one
 * step per act(), so every position the drum takes is committed and seen.
 * Nothing depends on how fast the machine is.
 *
 * Steps stop two flips after the drum has passed code 62 (either glyph), so
 * the halves of the next flip, which show the departing glyph, are seen too;
 * or after `maxSteps`, enough to go round the whole drum twice.
 */
async function sampleDrum(props, { nextProps = null, maxSteps = 160 } = {}) {
  const dom = installDom();
  const clock = manualIntervals();
  try {
    const harness = await import(`${bundleUrl}?run=${++runCounter}`);
    const container = dom.window.document.getElementById("root");

    const drum = new Set();
    const drawn = new Set();
    const addText = (node) => {
      if (node.nodeType === 3) drawn.add(node.data);
      else if (node.nodeType === 1) {
        if (node.tagName === "SPAN") drawn.add(node.textContent);
        for (const span of node.querySelectorAll("span")) drawn.add(span.textContent);
        if (node.hasAttribute("data-current-char")) drum.add(node.getAttribute("data-current-char"));
        for (const tile of node.querySelectorAll("[data-current-char]"))
          drum.add(tile.getAttribute("data-current-char"));
      }
    };
    const record = (records) => {
      for (const r of records) {
        if (r.type === "attributes") {
          if (r.oldValue !== null) drum.add(r.oldValue);
          drum.add(r.target.getAttribute("data-current-char"));
        } else if (r.type === "characterData") {
          drawn.add(r.oldValue);
          drawn.add(r.target.data);
        } else {
          for (const node of r.addedNodes) addText(node);
        }
      }
    };
    const observer = new dom.window.MutationObserver(record);
    // Read what is queued now rather than waiting for the observer's callback.
    const flush = () => record(observer.takeRecords());
    observer.observe(container, {
      subtree: true,
      childList: true,
      characterData: true,
      characterDataOldValue: true,
      attributes: true,
      attributeFilter: ["data-current-char"],
      attributeOldValue: true,
    });

    const root = harness.mount(container);
    const base = { size: "sm", flapSpeed: "hardware", ...props };

    await harness.act(async () => root.render(base));
    flush();
    if (nextProps) {
      await harness.act(async () => root.render({ ...base, ...nextProps }));
      flush();
    }

    const passedCode62 = () => drum.has("♥") || drum.has("°") || drawn.has("♥") || drawn.has("°");
    let seenAtStep = -1;
    for (let i = 0; i < maxSteps; i++) {
      await harness.act(async () => clock.step());
      flush();
      if (seenAtStep < 0 && passedCode62()) seenAtStep = i;
      if (seenAtStep >= 0 && i - seenAtStep >= 2) break;
    }
    observer.disconnect();

    await harness.act(async () => root.unmount());
    return { drum, drawn };
  } finally {
    clock.restore();
    dom.restore();
  }
}

test("a loading heart board cycles its drum through ♥, never °", async () => {
  // Note hardware carries the heart flap. The drum starts from the target,
  // and "?" is code 61, so the first loading tick lands on code 62 — which on
  // this board is a heart.
  const { drum, drawn } = await sampleDrum({ message: "?", deviceType: "note", isLoading: true });
  assert.ok(drum.has("♥"), `the drum never reported ♥ at code 62; saw ${JSON.stringify([...drum])}`);
  assert.ok(!drum.has("°"), "a heart board's drum reported a degree sign at code 62");
  assert.ok(drawn.has("♥"), "the flap halves never drew the heart while cycling");
  assert.ok(!drawn.has("°"), "the flap halves drew a degree sign on a heart board");
});

test("a loading flagship with a heart flap cycles through ♥ too", async () => {
  const { drum, drawn } = await sampleDrum({
    message: "?",
    deviceType: "flagship",
    code62Glyph: "heart",
    isLoading: true,
  });
  assert.ok(drum.has("♥"), `the drum never reported ♥ at code 62; saw ${JSON.stringify([...drum])}`);
  assert.ok(!drawn.has("°"), "the flap halves drew a degree sign on a heart-flap flagship");
});

test("a loading degree board cycles its drum through °, never ♥", async () => {
  const { drum, drawn } = await sampleDrum({ message: "?", deviceType: "flagship", isLoading: true });
  assert.ok(drum.has("°"), `the drum never reported ° at code 62; saw ${JSON.stringify([...drum])}`);
  assert.ok(!drum.has("♥"), "a degree board's drum reported a heart at code 62");
  assert.ok(drawn.has("°"), "the flap halves never drew the degree sign while cycling");
  assert.ok(!drawn.has("♥"), "the flap halves drew a heart on a degree board");
});

test("a tile leaving ♥ on a heart board folds a ♥ flap down, not a °", async () => {
  // The old-character halves of the first flip draw the glyph the tile is
  // leaving. Leaving code 62 on a heart board, that glyph is ♥.
  const { drawn } = await sampleDrum(
    { message: "♥", deviceType: "note", flapSpeed: "standard" },
    { nextProps: { message: "A" } },
  );
  assert.ok(drawn.has("♥"), `the departing flap never drew ♥; drew ${JSON.stringify([...drawn])}`);
  assert.ok(!drawn.has("°"), "the departing flap drew a degree sign on a heart board");
});
