/**
 * Shared split-flap *materials* — the leaf body and the hinge seam.
 *
 * Geometry lives in ../../lib/board-metrics; this is the other half: what a
 * leaf is made of. BoardDisplay, StaticBoardDisplay and BoardTeaser all draw
 * the same physical object, so the values live in one place for the same
 * reason the class maps do (issue #68).
 *
 * Issue #179 found two ways the character tile stopped reading as a flap:
 *
 * 1. Only *colour* tiles had a leaf body. A colour tile renders an inset panel
 *    with a drop shadow and four inset bevel edges, so it reads as a leaf
 *    sitting in a recess; a character tile rendered the glyph straight onto the
 *    cell background with no bevel at all. On a board that is almost entirely
 *    letters, the hardware read was being carried by the minority of tiles.
 *
 * 2. The hinge seam — the single most identifying feature of a split-flap —
 *    was a flat `rgba(0,0,0,0.3)`. Over a red leaf that composites to a clearly
 *    visible line; over the `#0d0d0d` tile background it composites to
 *    `rgb(9,9,9)`, a 4/255 luminance delta, i.e. nothing. In the default dark
 *    theme the split simply did not exist on letter tiles.
 *
 * These values were originally matched to the component's own stated intent (a
 * leaf in a recess, lit from above-left, with a physical gap at the hinge)
 * rather than to a physical reference, which #179 flagged as a caveat. They
 * have since been checked against the real hardware and signed off — see #193.
 * Treat them as validated, not provisional.
 */

import type { CSSProperties } from "react";

export type BoardType = "black" | "white";

/**
 * Character-leaf body — the character tile's answer to `colorTileBoxShadow`.
 *
 * Same structure (light from above-left: highlight on the top and left edges,
 * shadow on the bottom and right), tinted for a dark leaf instead of a
 * saturated one. On `#0d0d0d` a leaf cannot be made darker in any useful way,
 * so the top-edge highlight does the work: `rgba(255,255,255,0.10)` over the
 * tile background lands around `rgb(37,37,37)`, a ~24/255 step, which is a
 * visible edge without lifting the tile off the board's black.
 *
 * There is no outer drop shadow here, unlike the colour leaf. The colour leaf
 * is inset inside the aperture, so its drop shadow falls on visible background;
 * the character leaf is full-bleed inside a tile with `overflow: hidden`, so an
 * outer shadow would be clipped entirely. The leaf still reads as raised
 * because its 1px hard bevel sits directly inside the tile's own soft recess
 * shadow — the two adjacent, opposite-polarity edges are what define the edge.
 */
export const charLeafBoxShadow: Record<BoardType, string> = {
  black: `
      inset 0 1px 0 rgba(255,255,255,0.10),
      inset 0 -1px 0 rgba(0,0,0,0.55),
      inset 1px 0 0 rgba(255,255,255,0.05),
      inset -1px 0 0 rgba(0,0,0,0.40)
    `,
  white: `
      inset 0 1px 0 rgba(255,255,255,0.75),
      inset 0 -1px 0 rgba(0,0,0,0.14),
      inset 1px 0 0 rgba(255,255,255,0.55),
      inset -1px 0 0 rgba(0,0,0,0.10)
    `,
};

/**
 * Hinge seam — 2px tall, positioned from the tile's vertical midpoint.
 *
 * Two-tone rather than a single dark line: 1px for the gap itself, then 1px of
 * the *lower* leaf's top edge catching light. That is what the real gap looks
 * like, and it is the only version that reads on both leaf colours — a dark
 * line alone is invisible on a near-black leaf, and a light line alone is
 * invisible on a white one. Each theme gets the pairing that suits it: on the
 * black board the highlight carries the seam and the dark line only deepens the
 * gap over saturated colour leaves; on the white board the dark line carries it
 * and the highlight is near-null by design.
 *
 * `zIndex: 5` is baked in so the seam sits above every other layer a tile can
 * draw — the flap leaves (1–3), the cast shadow (4), the glyph panel and the
 * sheen — in the one place the stacking order is decided.
 */
export const SEAM_CLASS = "absolute top-1/2 left-0 right-0 h-[2px] pointer-events-none";

const seamGradient = (gap: string, highlight: string) =>
  `linear-gradient(to bottom, ${gap} 0 1px, ${highlight} 1px 2px)`;

export const seamStyle: Record<BoardType, CSSProperties> = {
  black: { background: seamGradient("rgba(0,0,0,0.35)", "rgba(255,255,255,0.13)"), zIndex: 5 },
  white: { background: seamGradient("rgba(0,0,0,0.12)", "rgba(255,255,255,0.55)"), zIndex: 5 },
};
