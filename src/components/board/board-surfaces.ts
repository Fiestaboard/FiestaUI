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

/*
 * Tile materials — the leaf bevel, the tile's recess and the drop shadows.
 *
 * These used to be box-shadow stacks set inline on every tile: four inset
 * bevel edges per leaf, plus a blurred drop shadow and four soft inset edges
 * per tile. WebKit paints inset and blurred box-shadows element by element,
 * and a board is ~130 tiles, so a page with a few boards froze Safari for
 * 1.4-2 s on every navigation while Chromium did not notice. Measured on a
 * real FiestaBoard, removing only box-shadow took that to ~40 ms.
 *
 * Now each bevel is a `background-image` gradient (painted with the
 * background, almost free) and each drop shadow is unblurred. The values live
 * in theme.css as classes, not inline styles: a class is parsed once for the
 * whole page, while an inline style is parsed again on every tile, and with
 * ~1000 tiles on a page that parsing was a visible frame of its own.
 *
 * The values themselves (light from above-left: highlight on the top and left
 * edges, shadow on the bottom and right) are the hardware-validated ones from
 * issues #179 and #193, carried over edge for edge — see theme.css.
 */

/**
 * Character-leaf body: the 1px bevel that makes a letter tile read as a flap.
 * No drop shadow: the leaf is full-bleed inside a tile with `overflow:
 * hidden`, so one would be clipped; the leaf reads as raised because its hard
 * bevel sits directly inside the tile's recess edge.
 */
export const charLeafBevelClass: Record<BoardType, string> = {
  black: "board-leaf-bevel-black",
  white: "board-leaf-bevel-white",
};

/**
 * The tile's recess (soft inner edges, visible around a colour leaf) and, on a
 * white board, its drop shadow onto the board. A black board has none: it
 * cannot be seen on the #050505 bezel, and it cost WebKit a frame (theme.css).
 */
export const tileMaterialClass: Record<BoardType, string> = {
  black: "board-tile-recess-black",
  white: "board-tile-recess-white board-tile-drop-white",
};

/** A small (`sm`) preview tile: the white board's drop shadow alone; a recess is invisible at 14×18px. */
export const smallTileMaterialClass: Record<BoardType, string> = {
  black: "",
  white: "board-tile-drop-sm-white",
};

/** Colour leaf: the saturated panel inset in a colour tile's aperture — its bevel, plus a drop shadow on white. */
export const colorLeafClass: Record<BoardType, string> = {
  black: "board-color-leaf",
  white: "board-color-leaf board-color-leaf-drop",
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
