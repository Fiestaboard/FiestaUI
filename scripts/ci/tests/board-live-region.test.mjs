/**
 * Behavioral regression test for issue #206: a live board's message change must
 * be announceable, and silent by default.
 *
 * `BoardDisplay` exposes the board as one `role="img"` whose `aria-label` is
 * recomputed when the message changes. A changed `aria-label` on a static
 * `role="img"` is not announced by any screen reader — only a change inside an
 * `aria-live` region is — so on a genuinely live board (transit times, alerts)
 * a sighted user watched the board flip and a screen-reader user heard nothing.
 * axe cannot see this: it inspects one static snapshot and has no rule for
 * "this content updates but is not in a live region".
 *
 * The capability is opt-in and must stay that way. In editor and preview
 * contexts the message changes on every keystroke, and a live region there
 * would be intolerably chatty; only the consuming app knows whether its board
 * is live.
 *
 * Only running the component over time can check any of this, so this mounts
 * the real `BoardDisplay` (React + react-dom in jsdom), changes `message`, and
 * reads the region. jsdom rather than a browser because `release:test` runs in
 * CI's `automation` job, which does `npm ci` but never `npx playwright install`
 * — and a live region is DOM state, not paint. Same harness shape as
 * board-flap-cascade.test.mjs.
 *
 * What it pins down:
 *   1. nothing announces by default, before or after a message change;
 *   2. opted in, the region exists from the first render, is polite and atomic,
 *      and is visually hidden;
 *   3. it is *empty* on mount — a board that has not changed has not got
 *      anything to say, and a region that mirrored the current text would be
 *      read twice on first encounter;
 *   4. a message change puts the new board text in it;
 *   5. a re-render with the same message announces nothing new;
 *   6. the loading -> message transition announces the message;
 *   7. toggling only `announceUpdates` takes effect — BoardDisplay has a custom
 *      `memo` comparator, and a prop missing from it is silently inert.
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

const FIRST = "FIRST MESSAGE";
const SECOND = "BUS 33 IN 2 MIN";

let tmp;
let bundleUrl;
let runCounter = 0;

before(async () => {
  tmp = await mkdtemp(path.join(tmpdir(), "board-live-region-"));
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wait for React to commit. React 19 flushes concurrent renders through a
 * MessageChannel macrotask, so a fixed sleep races the commit on a loaded CI
 * runner and reads the region before it holds anything. Instead poll until
 * `ready` sees the expected DOM (or ~2s passes, after which the assertion
 * reports whatever is really there). With no `ready`, one interval elapses —
 * enough for the "nothing changed" steps, where there is no state to wait for.
 */
async function settle(ready) {
  const deadline = Date.now() + 2000;
  do {
    await sleep(15);
  } while (ready && !ready() && Date.now() < deadline);
}

/** Everything a screen reader could pick up, as the DOM currently stands. */
function readAria(container) {
  const regions = [...container.querySelectorAll("[aria-live]")];
  const img = container.querySelector('[role="img"]');
  return {
    regionCount: regions.length,
    live: regions[0]?.getAttribute("aria-live") ?? null,
    atomic: regions[0]?.getAttribute("aria-atomic") ?? null,
    className: regions[0]?.className ?? null,
    announced: regions[0]?.textContent ?? null,
    name: img?.getAttribute("aria-label") ?? null,
  };
}

/** `until` conditions for `run` steps: the DOM state that marks the commit. */
const named = (text) => (r) => (r.name ?? "").includes(text);
const announced = (text) => (r) => (r.announced ?? "").includes(text);
const regionMounted = (r) => r.regionCount === 1;

/**
 * Mount a board, run `steps` against it in order, and return one reading of the
 * DOM after each step. A step may carry an `until` predicate over the reading:
 * the step is not considered settled until it holds (see `settle`), so each
 * step is a distinct committed render, as a live board would produce.
 * `animationsEnabled: false` keeps the tiles from cascading: this is about
 * what is announced, and the cascade is timed elsewhere
 * (board-flap-cascade.test.mjs).
 */
async function run(steps, base = {}) {
  const dom = installDom();
  try {
    const harness = await import(`${bundleUrl}?run=${++runCounter}`);
    const container = dom.window.document.getElementById("root");
    const root = harness.mount(container);

    const readings = [];
    for (const { until, ...props } of steps) {
      root.render({ size: "sm", deviceType: "note", animationsEnabled: false, ...base, ...props });
      await settle(until && (() => until(readAria(container))));
      readings.push(readAria(container));
    }

    root.unmount();
    // React schedules through MessageChannel; let unmount drain before the
    // window closes, or a stray callback lands on a dead document.
    await settle();
    return readings;
  } finally {
    dom.restore();
  }
}

test("a board announces nothing by default, before or after a message change", async () => {
  const [initial, changed] = await run([
    { message: FIRST, until: named(FIRST) },
    { message: SECOND, until: named(SECOND) },
  ]);

  assert.equal(
    initial.regionCount,
    0,
    "a board must not mount a live region unless asked: in an editor or a thumbnail the message changes on " +
      "every keystroke, and only the consuming app knows whether its board is live (issue #206)",
  );
  assert.equal(changed.regionCount, 0, "a message change must not conjure a live region either");
  assert.match(changed.name, /BUS 33 IN 2 MIN/, "the role=img name must still track the message");
});

test("opted in, the region is polite, atomic, visually hidden — and silent on mount", async () => {
  const [initial] = await run([{ message: FIRST, announceUpdates: true, until: regionMounted }]);

  assert.equal(initial.regionCount, 1, "announceUpdates must render exactly one live region");
  assert.equal(initial.live, "polite", "a board update is informational, not urgent — polite, never assertive");
  assert.equal(initial.atomic, "true", "the whole message reads as one announcement, not word by word");
  assert.match(initial.className, /\bsr-only\b/, "the region must add no rendered pixels");
  assert.equal(
    initial.announced,
    "",
    "a board that has not changed yet has nothing to announce; a region mirroring the current text would " +
      "also be read straight after the role=img name on first encounter (issue #206)",
  );
});

test("a message change is announced", async () => {
  const [, changed] = await run([
    { message: FIRST, announceUpdates: true, until: regionMounted },
    { message: SECOND, announceUpdates: true, until: announced(SECOND) },
  ]);

  assert.match(
    changed.announced,
    /BUS 33 IN 2 MIN/,
    `the live region should carry the new board text; it says ${JSON.stringify(changed.announced)} (issue #206)`,
  );
  assert.equal(changed.regionCount, 1, "the region must persist across the change, or AT sees no mutation");
});

test("a re-render with the same message announces nothing new", async () => {
  const [, same] = await run([
    { message: FIRST, announceUpdates: true, until: regionMounted },
    { message: FIRST, announceUpdates: true },
  ]);

  assert.equal(same.announced, "", "an unchanged board must not re-announce itself");
});

test("the loading -> message transition is announced", async () => {
  const [, arrived] = await run([
    { message: null, isLoading: true, announceUpdates: true, until: regionMounted },
    { message: SECOND, isLoading: false, announceUpdates: true, until: announced(SECOND) },
  ]);

  assert.match(arrived.announced, /BUS 33 IN 2 MIN/, "the message arriving after a load is the announcement");
});

test("a refresh does not announce the loading label, only the message that follows", async () => {
  // The path a live board actually takes: it has a message, refetches, and gets
  // a new one. `loadingLabel` is an internal, transient state — announcing
  // "Loading board display" mid-cycle tells a user reading bus times nothing
  // about buses, and it doubles the announcements per refresh.
  const [, loading, refreshed] = await run([
    { message: FIRST, announceUpdates: true, until: regionMounted },
    { message: FIRST, isLoading: true, announceUpdates: true },
    { message: SECOND, isLoading: false, announceUpdates: true, until: announced(SECOND) },
  ]);

  assert.equal(
    loading.announced,
    "",
    `a refresh announced ${JSON.stringify(loading.announced)}; the loading label must never reach the region`,
  );
  assert.match(refreshed.announced, /BUS 33 IN 2 MIN/, "the message that ends the refresh is what gets announced");
});

test("a board going empty is announced — that is a content change, not a phase", async () => {
  // Deliberately unlike the loading label: a board that clears has *changed*,
  // and silence would leave a screen-reader user believing the old message
  // still stands. `emptyLabel` is a consumer-supplied, localizable string.
  const [, cleared] = await run([
    { message: FIRST, announceUpdates: true, until: regionMounted },
    {
      message: null,
      announceUpdates: true,
      emptyLabel: "The board is now empty",
      until: announced("The board is now empty"),
    },
  ]);

  assert.equal(cleared.announced, "The board is now empty");
});

test("turning announceUpdates on mid-life mounts the region empty, and the next change announces", async () => {
  // A region inserted already holding content is not reliably announced — AT
  // announces *mutations inside* a region that was already there. A consumer
  // that decides its board is live only after the first fetch would otherwise
  // get an announcement that may or may not be spoken, depending on the
  // screen reader. So arriving is never an announcement; the next real change
  // is, and that one is a mutation the region is present for.
  const [, changedWhileOff, justEnabled, changedAfter] = await run([
    { message: FIRST, announceUpdates: false, until: named(FIRST) },
    { message: SECOND, announceUpdates: false, until: named(SECOND) },
    { message: SECOND, announceUpdates: true, until: regionMounted },
    { message: "TRAIN 4 IN 6 MIN", announceUpdates: true, until: announced("TRAIN 4 IN 6 MIN") },
  ]);

  assert.equal(changedWhileOff.regionCount, 0);
  assert.equal(justEnabled.regionCount, 1, "enabling the prop must mount the region");
  assert.equal(
    justEnabled.announced,
    "",
    `enabling the prop announced ${JSON.stringify(justEnabled.announced)} in the same commit that added the ` +
      "region — AT cannot be relied on to speak that (issue #206)",
  );
  assert.match(changedAfter.announced, /TRAIN 4 IN 6 MIN/, "the first change after enabling must be announced");
});

test("toggling only announceUpdates takes effect", async () => {
  // BoardDisplay is memoized with a hand-written comparator: a prop missing
  // from it is silently inert, which is exactly how this feature would ship
  // broken.
  const [off, on] = await run([
    { message: FIRST, announceUpdates: false, until: named(FIRST) },
    { message: FIRST, announceUpdates: true, until: regionMounted },
  ]);

  assert.equal(off.regionCount, 0);
  assert.equal(
    on.regionCount,
    1,
    "turning announceUpdates on did nothing — BoardDisplay's memo comparator must compare it (issue #206)",
  );
});
