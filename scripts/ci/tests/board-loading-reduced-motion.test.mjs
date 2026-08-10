import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Conformance guard for issue #58: the board loading animation is JS-driven
// (a shared ticker feeding React state), so CSS `@media
// (prefers-reduced-motion)` cannot reach it. The board must consult
// `prefers-reduced-motion` itself in the loading-ticker path — the shared
// interval must not run while the preference is `reduce` — and must subscribe
// to `change` so flipping the OS setting mid-load freezes/resumes live.
//
// The query used to live inline in board-display.tsx and now lives in
// reduced-motion.ts, so the assertions below read BOTH files as one surface.
// Splitting them is fine; what must not happen is the query disappearing, or
// surviving only in a module board-display no longer imports. The import
// assertion is what stops this guard passing on an orphaned copy.

const here = dirname(fileURLToPath(import.meta.url));
const boardDir = join(here, "../../../src/components/board");
const strip = (raw) => raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// Comments stripped so prose can't satisfy the code-shape assertions.
const display = strip(readFileSync(join(boardDir, "board-display.tsx"), "utf8"));
const reducedMotion = strip(readFileSync(join(boardDir, "reduced-motion.ts"), "utf8"));
const source = `${display}\n${reducedMotion}`;

test("the board consults prefers-reduced-motion via matchMedia", () => {
  assert.match(
    source,
    /matchMedia\(\s*["']\(prefers-reduced-motion:\s*reduce\)["']\s*\)/,
    "the board must read window.matchMedia('(prefers-reduced-motion: reduce)') in " +
      "board-display.tsx or reduced-motion.ts — the JS-driven loading cycle is " +
      "invisible to CSS media queries (issue #58)",
  );
});

test("board-display actually imports the reduced-motion module", () => {
  assert.match(
    display,
    /import\s*\{[^}]*\}\s*from\s*["']\.\/reduced-motion["']/,
    "board-display.tsx must import from ./reduced-motion — otherwise the query above " +
      "can satisfy this suite while sitting in a module nothing uses (issue #58)",
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
