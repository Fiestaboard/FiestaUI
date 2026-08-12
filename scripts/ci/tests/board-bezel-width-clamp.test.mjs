import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

// Conformance guard for issue #200: a board's bezel must never carry a
// max-width alongside `width: fit-content`.
//
// The tiles inside a board are fixed-width and cannot shrink (BoardDisplay's
// flex items wrap a fixed-width CharTile, StaticBoardDisplay's carry `shrink-0`
// since #203), so the grid's min-content width *is* the whole board. A
// max-width caps the used width of the bezel below that anyway — max-width
// wins over the min-content floor `fit-content` would otherwise hold — so in a
// parent narrower than the board the frame paints short while the rows, which
// are `justify-center`, run out past both of its edges. The board looks broken
// rather than merely too big. Without the cap the same board overflows its
// parent honestly, which is what `ScaledBoardDisplay` measures and what
// #197/#203 already established for the actual-size scroll container.
//
// The real assertion is a layout one and cannot be made here: `release:test` is
// the hermetic node-test gate and its CI job installs no browser. So this file
// guards the code shape, and the *behaviour* is asserted in a live layout by
// the `play` function on Board/BoardDisplay's Default story, which the
// storybook test-runner executes in the a11y-tests job. The last test below is
// what keeps that pairing honest: it fails if the browser-side guard is
// deleted, so this file cannot quietly become the only thing standing.

const boardDir = join(dirname(fileURLToPath(import.meta.url)), "../../../src/components/board");
// Comments stripped so prose can't satisfy — or trip — the code-shape checks.
const strip = (raw) => raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const read = (file) => strip(readFileSync(join(boardDir, file), "utf8"));
const stories = read("board-display.stories.tsx");

/** The bezel element: the `role="img"` opening tag that carries the frame. */
function bezelTag(source, file) {
  const start = source.indexOf('role="img"');
  assert.notEqual(start, -1, `expected a role="img" bezel in ${file}`);
  const end = source.indexOf(">", source.indexOf("style=", start));
  assert.notEqual(end, -1, `expected the bezel tag in ${file} to be closed`);
  return source.slice(start, end);
}

for (const file of ["board-display.tsx", "static-board-display.tsx"]) {
  test(`${file}'s bezel pairs no max-width with its fit-content width`, () => {
    const tag = bezelTag(read(file), file);

    assert.match(
      tag,
      /width:\s*["']fit-content["']/,
      `${file}'s bezel is expected to size itself to its tiles via width: fit-content — if that changed, ` +
        "this guard needs rewriting rather than deleting (issue #200)",
    );
    assert.doesNotMatch(
      tag,
      /\bmax-w-(?:full|\[[^\]]*\]|screen|\w+)\b|maxWidth\s*:/,
      `${file}'s bezel must not cap its own width: the tiles inside it cannot shrink, so a cap clamps the ` +
        "frame to a too-narrow parent while the rows overflow past both of its edges — the board mis-frames " +
        "instead of overflowing honestly (issue #200). A consumer with a slot narrower than a board wants " +
        "ScaledBoardDisplay.",
    );
  });
}

test("the live-layout guard for #200 is still wired to a story", () => {
  assert.match(
    stories,
    /play:\s*async/,
    "Board/BoardDisplay must keep a `play` function — it is the only place #200 is asserted against a real " +
      "layout, since release:test's CI job has no browser",
  );
  assert.match(
    stories,
    /style\.width\s*=/,
    "the story guard must narrow an ancestor to less than the board's own width before measuring — that " +
      "constraint is the whole precondition of #200",
  );
  assert.match(
    stories,
    /data-note-tile/,
    "the story guard must measure the tiles against the bezel; a bezel measured on its own cannot show that " +
      "its contents escaped it (issue #200)",
  );
});
