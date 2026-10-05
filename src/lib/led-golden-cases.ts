/**
 * The cases behind scripts/ci/tests/fixtures/led-golden.json — the
 * byte-for-byte contract a port of this renderer (FiestaBoard's Python
 * `src/led/`) is checked against. Kept as data so the generator
 * (scripts/ci/led-fixtures.mjs) and the drift test (./led-fixtures.test.ts)
 * read one list.
 */

import type { CharacterSetInput } from "./character-sets";
import { ACME_SIGN_CHARSET, ACME_SIGN_V2_CHARSET } from "./charset-golden-cases";
import type { LedLayoutOptions, LedMatrixSpec } from "./led-matrix";

export interface GoldenLayoutCase {
  name: string;
  message: string;
  spec: LedMatrixSpec;
  options?: Omit<LedLayoutOptions, "charset">;
  /** A plugin's set, as declared; the generator and the test materialise it. */
  charset?: CharacterSetInput;
}

export const GOLDEN_LAYOUT_CASES: readonly GoldenLayoutCase[] = [
  { name: "awtrix 3x5 clip", message: "72° {66}OK TOO LONG", spec: { width: 32, height: 8, font: "3x5" } },
  { name: "5x7 weather with tiles", message: "72° SUNNY\nHI 78 LO 61\n{65}{65} UV 6", spec: { width: 64, height: 32 } },
  {
    name: "spans, block, icon, lowercase",
    message: "{red:HOT} {black/white:UV 6}\n{icon:sun} Sunny {icon:up}",
    spec: { width: 64, height: 32, font: "5x7" },
    options: { letterCase: "mixed" },
  },
  {
    name: "monochrome amber with block",
    message: "{black/white:OPEN} 9-5\n{66}{red:HI}",
    spec: { width: 32, height: 16, font: "5x7" },
    options: { monochrome: "#ffb000" },
  },
  {
    // Characters keep their identity on an LED: ° is a degree sign, a typed
    // ♥ / ❤ and {icon:heart} are all the (red) heart. No code-62 flap here.
    name: "degree and typed hearts",
    message: "72° ♥ {icon:heart} ❤",
    spec: { width: 32, height: 8, font: "3x5" },
  },
  {
    name: "icon aliases and fallbacks",
    message: "{icon:storm}{icon:x}{icon:bus}{icon:fog}",
    spec: { width: 24, height: 5, font: "3x5" },
  },
  {
    name: "pixoo 3x5 default grid",
    message: "Mon Oct 3\n{icon:bell} 09:30 Standup",
    spec: { width: 64, height: 64, font: "3x5" },
    options: { letterCase: "mixed" },
  },
  {
    // A plugin's set over a built-in: its own € bitmap draws, an icon it
    // has (up) draws, one it lacks (sun) draws the 3×5 face's glyph anyway
    // (the layout draws what the face can; the set gates the editor), and
    // the amber panel makes every lit pixel one colour.
    name: "plugin set with custom glyph, monochrome",
    message: "€12 {icon:up} {icon:sun}\n{black/white:OK} {63}",
    spec: { width: 48, height: 12, font: "3x5" },
    options: { monochrome: "#ffb000" },
    charset: ACME_SIGN_CHARSET,
  },
  {
    // A set's own bitmap wins over the face's for the same character (D17
    // rule 5): the ACME v2 zero is rounded where the 3×5 face's is square,
    // and its € still draws. In colour this time.
    name: "plugin glyph overrides the face's",
    message: "€100",
    spec: { width: 16, height: 5, font: "3x5" },
    charset: ACME_SIGN_V2_CHARSET,
  },
  {
    // The 3×5 face has no snow (tile 68) and no partly (tile 69), so each
    // draws its tile: bare, inside a colour span (a tile is its own colour,
    // the span changes nothing) and inside a block — where the block field
    // lights first, gutter joined, and the tile fills its glyph box over it.
    name: "tile-fallback icons bare, in a colour span, in a block",
    message: "{icon:snow}{icon:partly}\n{red:{icon:snow}{icon:partly}}\n{black/white:{icon:snow}{icon:partly}}",
    spec: { width: 8, height: 17, font: "3x5" },
  },
  {
    // The 3×5 face has no bus and no bell, and their fallback is null: the
    // cell is blank, bare or in a colour span, and inside a block it is an
    // empty block cell whose field still lights and joins the next cell's.
    name: "blank-fallback icons bare, in a colour span, in a block",
    message: "{icon:bus}A\n{red:{icon:bell}A}\n{black/white:{icon:bus}A}",
    spec: { width: 8, height: 17, font: "3x5" },
  },
  {
    // An icon the face draws, inside a block: the field lights behind it and
    // the icon draws over it in its own colour; a colour span around an icon
    // leaves the icon's colour alone.
    name: "block behind a drawn icon",
    message: "{black/white:{icon:sun}OK} {red:{icon:up}}",
    spec: { width: 30, height: 7, font: "5x7" },
  },
  {
    // The same on a monochrome panel: inverse video. The tile-fallback icon
    // in the block is an unlit square in the lit slab, the drawn icon's pixels
    // are unlit over it, and the bare ones light in the panel colour.
    name: "icon fallbacks in a block, monochrome",
    message: "{black/white:{icon:snow}{icon:sun}}{icon:snow}{icon:sun}",
    spec: { width: 16, height: 5, font: "3x5" },
    options: { monochrome: "#ffb000" },
  },
];
