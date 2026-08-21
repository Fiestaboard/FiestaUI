/**
 * Behavioral regression test for issue #205: a board with content must not
 * announce a generic name.
 *
 * `StaticBoardDisplay` draws its message as a wall of glyph tiles inside an
 * `aria-hidden` container, so the `role="img"` label is the *only* thing a
 * screen reader can read. Its default was the constant `"Board preview"`, so
 * four different boards in a thumbnail grid all announced identically while a
 * sighted user read four different messages. axe cannot catch this: a non-empty
 * `aria-label` passes `image-alt` no matter what it says.
 *
 * A code-shape check would be the wrong instrument — what matters is the name
 * the DOM actually exposes, for a real message, through whichever prop the
 * consumer set. So this mounts the real components (React + react-dom in jsdom)
 * and reads `aria-label` off the rendered board. jsdom rather than a browser
 * because `release:test` runs in CI's `automation` job, which does `npm ci` but
 * never `npx playwright install`; an accessible *name* is DOM state, not paint,
 * so nothing here needs a compositor. Same harness shape as
 * board-flap-cascade.test.mjs.
 *
 * What it pins down:
 *   1. all three renderers put the message's text in their default name;
 *   2. color markup never leaks into the name;
 *   3. an explicit `previewLabel` still wins (BoardShowcase depends on it);
 *   4. `messageLabel` can rebuild the wording and receives the plain text;
 *   5. a board that draws no text falls back to a generic name rather than
 *      announcing a dangling "Board preview:";
 *   6. an empty board still announces `emptyLabel`.
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
  import { StaticBoardDisplay } from "./static-board-display";
  import { BoardTeaser } from "./board-teaser";

  const COMPONENTS = { BoardDisplay, StaticBoardDisplay, BoardTeaser };

  export function mount(container, name, props) {
    const root = createRoot(container);
    root.render(createElement(COMPONENTS[name], props));
    return () => root.unmount();
  }
`;

const MESSAGE = "HELLO WORLD\n{red}WELCOME TO{/red}\nFIESTABOARD";
/** What the tiles actually draw, in reading order. */
const MESSAGE_TEXT = "HELLO WORLD WELCOME TO FIESTABOARD";

let tmp;
let bundleUrl;
let runCounter = 0;

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "board-accessible-name-"));
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

/** Mount one board and return the accessible name its `role="img"` exposes. */
async function accessibleName(component, props) {
  const dom = installDom();
  try {
    // A fresh module instance per run: reduced-motion.ts resolves its
    // MediaQueryList at module scope and would otherwise carry the previous
    // run's window into this one.
    const harness = await import(`${bundleUrl}?run=${++runCounter}`);
    const container = dom.window.document.getElementById("root");
    const unmount = harness.mount(container, component, props);

    let img = null;
    for (let i = 0; i < 100 && !img; i++) {
      img = container.querySelector('[role="img"]');
      if (!img) await new Promise((resolve) => setTimeout(resolve, 5));
    }
    if (!img) throw new Error(`${component} never rendered a role="img"`);

    const label = img.getAttribute("aria-label");
    unmount();
    // React schedules through MessageChannel, so unmount's work is still
    // queued here. Let it drain before `restore()` closes the window, or a
    // stray callback lands on a dead document after the test has ended.
    await new Promise((resolve) => setTimeout(resolve, 10));
    return label;
  } finally {
    dom.restore();
  }
}

// The heart of #205: the renderers disagreed about whether a board's *content*
// belongs in its name. StaticBoardDisplay said no, and it is the one used for
// lists and thumbnails, where telling boards apart is the whole job.
test("every renderer puts the board's own text in its default accessible name", async () => {
  for (const [component, props] of [
    ["BoardDisplay", { message: MESSAGE }],
    ["StaticBoardDisplay", { message: MESSAGE }],
    ["BoardTeaser", { teaser: "HELLO WORLD", tiles: 15 }],
  ]) {
    const name = await accessibleName(component, props);
    const expected = component === "BoardTeaser" ? "HELLO WORLD" : MESSAGE_TEXT;
    assert.ok(
      name.includes(expected),
      `${component} announced ${JSON.stringify(name)}, which does not contain the text it draws ` +
        `(${JSON.stringify(expected)}). A screen-reader user cannot tell two boards apart by a name that ` +
        "omits their content (issue #205).",
    );
  }
});

test("color markup never reaches the accessible name", async () => {
  for (const [component, props] of [
    ["BoardDisplay", { message: MESSAGE }],
    ["StaticBoardDisplay", { message: MESSAGE }],
  ]) {
    const name = await accessibleName(component, props);
    assert.doesNotMatch(name, /[{}]|\bred\b/i, `${component} leaked color markup into its name: ${name}`);
  }
});

test("an explicit previewLabel still wins over the derived name", async () => {
  // BoardShowcase passes a hand-written label for a curated preview; #205 must
  // not take that away from it.
  const name = await accessibleName("StaticBoardDisplay", {
    message: MESSAGE,
    previewLabel: "Air Quality & Fog displayed on a split-flap board",
  });
  assert.equal(name, "Air Quality & Fog displayed on a split-flap board");
});

test("messageLabel rebuilds the wording and receives the board's plain text", async () => {
  const name = await accessibleName("StaticBoardDisplay", {
    message: MESSAGE,
    messageLabel: (msg) => `Thumbnail — ${msg}`,
  });
  assert.equal(name, `Thumbnail — ${MESSAGE_TEXT}`);
});

test("the name says what the tiles draw on a Note, where ° is a heart", async () => {
  // messageToGrid substitutes code 62 for a heart on Note hardware. A name
  // derived without that substitution announces "degree" for a tile showing ♥,
  // which is a text alternative describing something else (WCAG 1.1.1).
  for (const component of ["BoardDisplay", "StaticBoardDisplay"]) {
    const name = await accessibleName(component, { message: "LOVE °", deviceType: "note" });
    assert.match(name, /LOVE ♥/, `${component} announced ${JSON.stringify(name)} for a board drawing "LOVE ♥"`);
  }
  // …and a flagship that was told nothing really does draw a degree sign.
  const flagship = await accessibleName("StaticBoardDisplay", { message: "52 °F" });
  assert.match(flagship, /52 °F/, `a flagship board draws °, so its name must keep it; got ${flagship}`);
});

test("the name follows the flagship's own code-62 flap (FiestaBoard#1657)", async () => {
  // A Flagship built from 2026 carries a heart where older ones carry a degree,
  // and the app passes `code62Glyph` because nothing queryable tells them apart.
  // The name is derived from the same substitution as the tiles, so it has to
  // move with the setting — not with the device type.
  for (const component of ["BoardDisplay", "StaticBoardDisplay"]) {
    const heart = await accessibleName(component, {
      message: "52 °F",
      deviceType: "flagship",
      code62Glyph: "heart",
    });
    assert.match(heart, /52 ♥F/, `${component} announced ${JSON.stringify(heart)} for a board drawing "52 ♥F"`);
  }
});

test("a board that draws no text falls back to a generic name", async () => {
  // Colour-only boards render tiles but no glyphs; "Board preview: " with
  // nothing after it would be worse than the generic name it replaced.
  const name = await accessibleName("StaticBoardDisplay", { message: "{63}{64}{65}" });
  assert.equal(name, "Board preview");
});

test("an empty board still announces its emptyLabel", async () => {
  assert.equal(await accessibleName("StaticBoardDisplay", { message: null }), "Empty board display");
  assert.equal(await accessibleName("StaticBoardDisplay", { message: "" }), "Empty board display");
  assert.equal(
    await accessibleName("StaticBoardDisplay", { message: null, emptyLabel: "No message set" }),
    "No message set",
  );
});
