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

/** Let React commit and flush its passive effects. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

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

    root.render(base);
    await settle();
    const first = { drawn: drawnText(container), name: accessibleName(container) };

    let second = null;
    if (nextProps) {
      root.render({ ...base, ...nextProps });
      await settle();
      second = { drawn: drawnText(container), name: accessibleName(container) };
    }

    root.unmount();
    // React schedules through MessageChannel, so unmount's work is still queued
    // here. Let it drain before `restore()` closes the window, or a stray
    // callback lands on a dead document after the test has ended.
    await settle();
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
 * Mount a board and sample what every tile shows (the `data-current-char` the
 * drum reports, and the text the flap halves actually draw) while it runs.
 * Returns the set of drum glyphs and the set of drawn glyphs seen *while a tile
 * was animating or transitioning* — the static landing is covered above.
 */
async function sampleDrum(props, { nextProps = null, sampleMs = 600 } = {}) {
  const dom = installDom();
  try {
    const harness = await import(`${bundleUrl}?run=${++runCounter}`);
    const container = dom.window.document.getElementById("root");
    const root = harness.mount(container);
    const base = { size: "sm", flapSpeed: "hardware", ...props };

    root.render(base);
    await settle();
    if (nextProps) root.render({ ...base, ...nextProps });

    const drum = new Set();
    const drawn = new Set();
    const startedAt = Date.now();
    while (Date.now() - startedAt < sampleMs) {
      await new Promise((r) => setTimeout(r, 3));
      for (const tile of container.querySelectorAll("[data-current-char]")) {
        const moving =
          tile.getAttribute("data-is-animating") === "true" || tile.getAttribute("data-is-transitioning") === "true";
        if (!moving) continue;
        drum.add(tile.getAttribute("data-current-char"));
        for (const span of tile.querySelectorAll("span")) drawn.add(span.textContent);
      }
    }

    root.unmount();
    await settle();
    return { drum, drawn };
  } finally {
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
    { nextProps: { message: "A" }, sampleMs: 400 },
  );
  assert.ok(drawn.has("♥"), `the departing flap never drew ♥; drew ${JSON.stringify([...drawn])}`);
  assert.ok(!drawn.has("°"), "the departing flap drew a degree sign on a heart board");
});
