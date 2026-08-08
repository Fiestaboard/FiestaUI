import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Conformance guard for issue #58: the board loading animation is JS-driven
// (a shared 80ms ticker feeding React state), so CSS `@media
// (prefers-reduced-motion)` cannot reach it. board-display.tsx must consult
// `prefers-reduced-motion` itself in the loading-ticker path — the shared
// interval must not run while the preference is `reduce` — and must subscribe
// to `change` so flipping the OS setting mid-load freezes/resumes live.

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, "../../../src/components/board/board-display.tsx"), "utf8");
// Strip block and line comments so prose can't satisfy the code-shape
// assertions below.
const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

test("board-display consults prefers-reduced-motion via matchMedia", () => {
  assert.match(
    source,
    /matchMedia\(\s*["']\(prefers-reduced-motion:\s*reduce\)["']\s*\)/,
    "board-display.tsx must read window.matchMedia('(prefers-reduced-motion: reduce)') — " +
      "the JS-driven loading cycle is invisible to CSS media queries (issue #58)",
  );
});

test("the loading-ticker path is gated on the reduced-motion query", () => {
  // The subscribe function must consult the query before starting the shared
  // interval: while `reduce` matches, subscribing tiles must NOT start the
  // ticker (tiles stay frozen on their current character).
  const subscribeBody = source.match(/function subscribeLoadingTick\([\s\S]*?\n\}/);
  assert.ok(subscribeBody, "expected a subscribeLoadingTick function (shared loading ticker from PR #76)");
  assert.match(
    subscribeBody[0],
    /reducedMotion|prefersReducedMotion|reduceMotion/i,
    "subscribeLoadingTick must consult the reduced-motion state before starting the shared interval (issue #58)",
  );
});

test("board-display listens for reduced-motion changes", () => {
  assert.match(
    source,
    /addEventListener\(\s*["']change["']/,
    "board-display.tsx must subscribe to the media query's 'change' event so toggling " +
      "the OS reduce-motion setting mid-load stops/starts the loading ticker live (issue #58)",
  );
});
