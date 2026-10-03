/**
 * The cases behind scripts/ci/tests/fixtures/led-golden.json — the
 * byte-for-byte contract a port of this renderer (FiestaBoard's Python
 * `src/led/`) is checked against. Kept as data so the generator
 * (scripts/ci/led-fixtures.mjs) and the drift test (./led-fixtures.test.ts)
 * read one list.
 */

import type { DeviceModelId } from "./devices";
import type { LedLayoutOptions, LedMatrixSpec } from "./led-matrix";
import type { LedTransitionId } from "./led-transition-registry";
import type { LedTransitionSpec } from "./led-transitions";

export interface GoldenLayoutCase {
  name: string;
  message: string;
  spec: LedMatrixSpec;
  options?: Omit<LedLayoutOptions, "charset">;
}

export interface GoldenTransitionCase {
  name: string;
  from: string;
  to: string;
  spec: LedMatrixSpec;
  options?: Omit<LedLayoutOptions, "charset">;
  /** A spec as written, or an id resolved through `model`'s capabilities. */
  transition: LedTransitionId | LedTransitionSpec;
  model?: DeviceModelId;
  fps?: number;
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
    name: "heart flap",
    message: "72° ♥ {icon:heart}",
    spec: { width: 32, height: 8, font: "3x5" },
    options: { code62Glyph: "heart" },
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
];

export const GOLDEN_TRANSITION_CASES: readonly GoldenTransitionCase[] = [
  {
    name: "flip, seeded scramble, 3x5",
    from: "AB 12",
    to: "CD 99",
    spec: { width: 24, height: 5, font: "3x5" },
    transition: { kind: "flip", stepMs: 80, scrambleSteps: 4, stagger: 2, halfFlap: false },
  },
  {
    name: "flip with half-flaps, sampled at 25 fps",
    from: "{black/white:ON}",
    to: "{black/white:OK}",
    spec: { width: 12, height: 5, font: "3x5" },
    transition: { kind: "flip", stepMs: 80, scrambleSteps: 3, stagger: 0 },
    fps: 25,
  },
  {
    name: "pixoo 32-frame budget",
    from: "72° SUNNY\n{66} AQI 42",
    to: "61° RAIN\n{63} AQI 90",
    spec: { width: 32, height: 16, font: "3x5" },
    transition: { kind: "flip", scrambleSteps: 40, stagger: 20 },
    model: "divoom_pixoo64",
  },
  {
    name: "fade quantised to 8 frames",
    from: "AB",
    to: "CA",
    spec: { width: 12, height: 5, font: "3x5" },
    transition: { kind: "fade", durationMs: 777, maxFrames: 8 },
  },
  {
    name: "fade continuous at 10 fps",
    from: "HI",
    to: "YO",
    spec: { width: 12, height: 5, font: "3x5" },
    transition: { kind: "fade", durationMs: 300 },
    fps: 10,
  },
];
