// The callbacks handed to page.evaluate run in the page.
/* global document, getComputedStyle */

import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";

import { chromium } from "playwright";

import { measureInPage } from "../measure.mjs";

// In-browser tests of the parity harness's DOM measurement (scripts/vrt/measure.mjs).
// They need a Chromium, so they run in CI's `parity-smoke` job and not under
// `release:test` (the `automation` job installs no browser):
//
//   node --test scripts/vrt/tests/*.test.mjs
//
// What this pins is P2, from the #378 review: probe 1's sentinel binding check.
// An element bound to a token follows a sentinel override of that custom
// property. A hard-coded hex with the same value does not. Either way, the
// page is left exactly as it was found.

const PAGE = `<!doctype html>
<style>
  :root { --primary: #f5a623; --spacing: 4px; --radius: 10px; }
  button { all: unset; display: inline-block; }
  .bound { background-color: var(--primary); padding-left: calc(var(--spacing) * 4); border-radius: calc(var(--radius) - 2px); }
  .hard  { background-color: #f5a623; padding-left: 16px; border-radius: 8px; }
  .local { --primary: #f5a623; background-color: var(--primary); }
</style>
<button class="bound">Bound</button>
<button class="hard">Hard</button>
<span><button class="local">Local</button></span>`;

const TOKENS = [
  { selector: ":scope", property: "background-color", variable: "var(--primary)" },
  { selector: ":scope", property: "padding-left", variable: "calc(var(--spacing) * 4)" },
  {
    selector: ":scope",
    property: "border-top-left-radius",
    variable: "radius/md",
    cssVar: "calc(var(--radius) - 2px)",
  },
];

let browser;
let page;

before(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
});

// A fresh page per test, so a leak from one test cannot hide in the next one's baseline.
beforeEach(async () => {
  await page.setContent(PAGE);
});

after(async () => {
  await browser?.close();
});

const measure = (rootSelector, tokens = TOKENS) => page.evaluate(measureInPage, { rootSelector, probes: { tokens } });

test("a token-bound element follows the sentinel for colours and lengths", async () => {
  const dom = await measure(".bound");
  assert.deepEqual(
    dom.tokens.map((t) => [t.property, t.binding.follows]),
    [
      ["background-color", true],
      ["padding-left", true],
      ["border-top-left-radius", true],
    ],
    JSON.stringify(dom.tokens, null, 1),
  );
  assert.deepEqual(dom.tokens[0].binding.vars, ["--primary"]);
  // The value probe still sees the real token value, not the sentinel.
  assert.equal(dom.tokens[0].value, "rgba(245, 166, 35, 1)");
  assert.equal(dom.tokens[1].value, "16px");
});

test("a hard-coded value equal to the token does NOT follow the sentinel", async () => {
  const dom = await measure(".hard");
  for (const t of dom.tokens) {
    assert.equal(t.binding.follows, false, `${t.property}: ${JSON.stringify(t.binding)}`);
  }
  assert.equal(dom.tokens[0].value, "rgba(245, 166, 35, 1)", "the value alone would have passed");
});

test("a token re-declared on the element itself still follows the sentinel", async () => {
  // The override is applied on <html> AND on the probed element, so a
  // component-level redeclaration of the same custom property is still seen.
  const dom = await measure(".local", [TOKENS[0]]);
  assert.equal(dom.tokens[0].binding.follows, true, JSON.stringify(dom.tokens[0].binding));
});

test("a probe with no custom property to override records why, and is not bound", async () => {
  const dom = await measure(".bound", [
    { selector: ":scope", property: "background-color", variable: "component/button/outline-bg" },
  ]);
  assert.equal(dom.tokens[0].binding.follows, false);
  assert.match(dom.tokens[0].binding.note, /cssVar/);
});

test("the page is left exactly as it was found", async () => {
  const snapshot = () =>
    page.evaluate(() => ({
      html: document.documentElement.getAttribute("style"),
      bound: document.querySelector(".bound").getAttribute("style"),
      children: document.querySelector(".bound").childElementCount,
      bg: getComputedStyle(document.querySelector(".bound")).backgroundColor,
      pad: getComputedStyle(document.querySelector(".bound")).paddingLeft,
    }));
  const before = await snapshot();
  assert.deepEqual(before, { html: null, bound: null, children: 0, bg: "rgb(245, 166, 35)", pad: "16px" });
  await measure(".bound");
  await measure(".hard");
  assert.deepEqual(await snapshot(), before);
});

test("an inline value already on the element is restored, priority included", async () => {
  await page.evaluate(() => document.querySelector(".bound").style.setProperty("--primary", "#f5a623", "important"));
  await measure(".bound", [TOKENS[0]]);
  const restored = await page.evaluate(() => {
    const s = document.querySelector(".bound").style;
    return [s.getPropertyValue("--primary"), s.getPropertyPriority("--primary")];
  });
  assert.deepEqual(restored, ["#f5a623", "important"]);
});
