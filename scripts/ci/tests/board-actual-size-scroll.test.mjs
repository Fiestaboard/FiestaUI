import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Conformance guard for issue #197: ScaledBoardDisplay's "Actual size" mode
// must give the board its natural width inside the scroll container.
//
// BoardDisplay renders `width: fit-content`, which resolves to
// `min(max-content, max(min-content, available))` — so against a slot narrower
// than the board it clamps the *frame* to the slot while the fixed-width tiles
// keep going. Measured before the fix: a 934px board painted a 560px box, and
// at the end of the scroll its right edge sat 378px short of the container's.
//
// The real assertion is a layout one and cannot be made here: `release:test` is
// the hermetic node-test gate and its CI job installs no browser. So this file
// guards the code shape, and the *behaviour* is asserted in a live layout by the
// `play` function on Board/ScaledBoardDisplay's NoteArrayWithToggle story, which
// the storybook test-runner executes in the a11y-tests job. The last test below
// is what keeps that pairing honest: it fails if the browser-side guard is
// deleted, so this file cannot quietly become the only thing standing.

const here = dirname(fileURLToPath(import.meta.url));
const boardDir = join(here, "../../../src/components/board");
const strip = (raw) => raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

// Comments stripped so prose can't satisfy the code-shape assertions.
const scaled = strip(readFileSync(join(boardDir, "scaled-board-display.tsx"), "utf8"));
const stories = strip(readFileSync(join(boardDir, "scaled-board-display.stories.tsx"), "utf8"));

/** The `mode === "actual"` return, i.e. everything the actual-size path renders. */
function actualBranch() {
  const start = scaled.indexOf('if (mode === "actual")');
  assert.notEqual(start, -1, 'expected an `if (mode === "actual")` branch in scaled-board-display.tsx');
  const end = scaled.indexOf("\n  }", start);
  assert.notEqual(end, -1, "expected the actual-size branch to be closed");
  return scaled.slice(start, end);
}

test("the actual-size scroll container floors its content at the board's natural width", () => {
  const branch = actualBranch();
  assert.match(
    branch,
    /overflow-x-auto/,
    "the actual-size branch must still scroll horizontally — that is the mode's whole point",
  );
  // `min-w-max` / `w-max` — a max-content floor. Without one, `fit-content`
  // collapses the board's box to the slot and the frame stops mid-grid.
  assert.match(
    branch,
    /\b(?:min-w-max|w-max)\b/,
    "the element wrapping BoardDisplay inside the actual-size scroll container must floor its width at " +
      "max-content (`min-w-max`), or `width: fit-content` clamps the board's own box to the slot and " +
      "scrolling runs out of board before it runs out of tiles (issue #197)",
  );
});

test("the actual-size scroll container does not pair a scrolling axis with `visible`", () => {
  const branch = actualBranch();
  assert.doesNotMatch(
    branch,
    /overflow[XY]\s*:\s*["']visible["']/,
    "per CSS Overflow, a `visible` value computes to `auto` when the other axis scrolls, so this pairing " +
      "never applies as written; say what actually happens instead (issue #197)",
  );
});

test("the live-layout guard for #197 is still wired to a story", () => {
  assert.match(
    stories,
    /play:\s*async/,
    "Board/ScaledBoardDisplay must keep a `play` function — it is the only place #197 is asserted against a " +
      "real layout, since release:test's CI job has no browser",
  );
  assert.match(
    stories,
    /scrollLeft\s*=\s*[\w.]*\.scrollWidth/,
    "the story guard must scroll to the end of the actual-size container before measuring (issue #197)",
  );
  assert.match(
    stories,
    /getBoundingClientRect\(\)\.right\s*-\s*[\s\S]{0,80}getBoundingClientRect\(\)\.right/,
    "the story guard must compare the container's right edge with the board's at the end of the scroll " +
      "(issue #197)",
  );
});
