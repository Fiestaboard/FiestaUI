/**
 * Behavioral regression test for FiestaBoard#1666: the plugin surfaces have to
 * honor the board's code-62 flap too.
 *
 * `BoardDisplay` and `StaticBoardDisplay` learned `code62Glyph` in #247, but
 * the two components a plugin is advertised with — `PluginCard`'s teaser strip
 * and `BoardShowcase`'s hero board — took only `boardType`, so every plugin
 * preview drew `°` no matter what flap the owner's board carries. The first
 * author to put a temperature in a manifest `teaser` makes that visible, on
 * exactly the boards FiestaBoard#1657 was about.
 *
 * Mounted rather than unit-tested for the reasons board-code-62-glyph.test.mjs
 * gives, plus one specific to these two:
 *
 *   - `BoardTeaser` builds its tiles in a `useMemo` and its accessible name in
 *     another. A glyph applied inside the first without joining its dependency
 *     list renders right on first mount and then freezes — the same failure
 *     shape as a forgotten memo comparator, one layer down.
 *   - The teaser and the showcase are two independent paths to the same board
 *     text, so both are asserted here; a prop threaded into one and dropped in
 *     the other is the exact bug being fixed.
 *
 * jsdom rather than a browser, for the same reason as the tests it sits beside:
 * `release:test` runs in CI's `automation` job, which never installs Playwright,
 * and everything asserted below is DOM state.
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
const pluginDir = path.resolve(here, "../../../src/components/plugin");

const HARNESS = `
  import { createElement } from "react";
  import { createRoot } from "react-dom/client";
  import { PluginCard } from "./plugin-card";
  import { BoardShowcase } from "./board-showcase";

  // The card's primary link is supplied by the consumer; a plain anchor stands
  // in for the app's router so the test only has to talk about board glyphs.
  const renderLink = ({ className, children }) => createElement("a", { className, href: "#" }, children);
  const Card = (props) => createElement(PluginCard, { renderLink, ...props });

  const COMPONENTS = { PluginCard: Card, BoardShowcase };

  export function mount(container, componentName) {
    const root = createRoot(container);
    const Component = COMPONENTS[componentName];
    return {
      render: (props) => root.render(createElement(Component, props)),
      unmount: () => root.unmount(),
    };
  }
`;

let tmp;
let bundleUrl;
let runCounter = 0;

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "plugin-preview-code-62-"));
  const outfile = path.join(tmp, "harness.mjs");
  await build({
    stdin: { contents: HARNESS, resolveDir: pluginDir, sourcefile: "harness.js", loader: "js" },
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

/** Install a jsdom window as the global environment (see board-code-62-glyph). */
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
  // ScaledBoardTeaser measures its container to pick a scale.
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

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
    "ResizeObserver",
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

/** What the tiles drew, in reading order, with padding collapsed. */
function drawnText(container, tileAttribute) {
  return [...container.querySelectorAll(`[${tileAttribute}]`)]
    .map((tile) => tile.textContent || " ")
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

/** The accessible name of the board-ish element — all a screen reader gets. */
function accessibleName(container) {
  const board = container.querySelector('[role="img"]');
  assert.ok(board, "nothing rendered a role=img element to read a name from");
  return board.getAttribute("aria-label");
}

/**
 * Mount one component, optionally re-render it with different props, and report
 * what it drew and announced after each render.
 */
async function render(componentName, tileAttribute, props, nextProps) {
  const dom = installDom();
  try {
    const harness = await import(`${bundleUrl}?run=${++runCounter}`);
    const container = dom.window.document.getElementById("root");
    const root = harness.mount(container, componentName);

    root.render(props);
    await settle();
    const first = { drawn: drawnText(container, tileAttribute), name: accessibleName(container) };

    let second = null;
    if (nextProps) {
      root.render({ ...props, ...nextProps });
      await settle();
      second = { drawn: drawnText(container, tileAttribute), name: accessibleName(container) };
    }

    root.unmount();
    // React schedules through MessageChannel; let unmount's work drain before
    // `restore()` closes the window.
    await settle();
    return { first, second };
  } finally {
    dom.restore();
  }
}

/** A card whose teaser puts a temperature — and so code 62 — on the strip. */
const cardProps = (extra) => ({
  name: "Weather",
  teaser: "52 °F CLEAR",
  ...extra,
});

const showcaseProps = (extra) => ({
  previews: [{ device_type: "flagship", rows: ["52 °F CLEAR"] }],
  ...extra,
});

test("a plugin card told nothing keeps drawing a degree", async () => {
  // Every consumer that has not been taught about the flap must render as before.
  const { first } = await render("PluginCard", "data-teaser-tile", cardProps());
  assert.equal(first.drawn, "52 °F CLEAR");
  assert.match(first.name, /52 °F CLEAR/, `expected the teaser to keep the degree; got ${JSON.stringify(first.name)}`);
});

test("a plugin card teaser draws a heart when the board's flap carries one", async () => {
  const { first } = await render("PluginCard", "data-teaser-tile", cardProps({ code62Glyph: "heart" }));
  assert.equal(first.drawn, "52 ♥F CLEAR", "the teaser drew a degree on a board whose code-62 flap is a heart");
});

test("a plugin card teaser announces the glyph it drew", async () => {
  // A strip drawing ♥ while announcing "degree" is a text alternative for a
  // different image (WCAG 1.1.1).
  const { first } = await render("PluginCard", "data-teaser-tile", cardProps({ code62Glyph: "heart" }));
  assert.match(first.name, /52 ♥F CLEAR/, `the teaser drew "52 ♥F CLEAR" but announced ${JSON.stringify(first.name)}`);
});

test("flipping the setting on a mounted plugin card updates the teaser", async () => {
  // The tiles come out of a useMemo. A glyph applied inside it but missing from
  // its dependency list renders once and then freezes.
  const { first, second } = await render("PluginCard", "data-teaser-tile", cardProps({ code62Glyph: "degree" }), {
    code62Glyph: "heart",
  });
  assert.equal(first.drawn, "52 °F CLEAR");
  assert.equal(second.drawn, "52 ♥F CLEAR", "the teaser ignored a changed code62Glyph — check the useMemo deps");
});

test("a board showcase told nothing keeps drawing a degree", async () => {
  const { first } = await render("BoardShowcase", "data-note-tile", showcaseProps());
  assert.equal(first.drawn, "52 °F CLEAR");
});

test("a board showcase draws a heart when the board's flap carries one", async () => {
  const { first } = await render("BoardShowcase", "data-note-tile", showcaseProps({ code62Glyph: "heart" }));
  assert.equal(first.drawn, "52 ♥F CLEAR", "the showcase drew a degree on a board whose code-62 flap is a heart");
});

test("a board showcase announces the glyph it drew", async () => {
  const { first } = await render("BoardShowcase", "data-note-tile", showcaseProps({ code62Glyph: "heart" }));
  assert.match(first.name, /52 ♥F CLEAR/, `the showcase drew a heart but announced ${JSON.stringify(first.name)}`);
});

test("a note preview draws a heart whatever the flagship setting says", async () => {
  // Note hardware only ever shipped the heart flap, so a stale flagship
  // preference must not reach it.
  const { first } = await render(
    "BoardShowcase",
    "data-note-tile",
    showcaseProps({ previews: [{ device_type: "note", rows: ["LOVE °"] }], code62Glyph: "degree" }),
  );
  assert.equal(first.drawn, "LOVE ♥");
});
