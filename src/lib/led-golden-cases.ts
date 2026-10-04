/**
 * The cases behind scripts/ci/tests/fixtures/led-golden.json — the
 * byte-for-byte contract a port of this renderer (FiestaBoard's Python
 * `src/led/`) is checked against. Kept as data so the generator
 * (scripts/ci/led-fixtures.mjs) and the drift test (./led-fixtures.test.ts)
 * read one list.
 */

import type { CharacterSetInput } from "./character-sets";
import { ACME_SIGN_CHARSET } from "./charset-golden-cases";
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
];
