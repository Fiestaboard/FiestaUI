/**
 * Display content: what a preview shows when the caller has no message of
 * its own, and how a few plain lines become one.
 *
 * Figma's 02 Display / LED & Panel (`39:49571`) has a `Content` axis:
 *
 * - `Sample`: fixed renderer art, the same for every use of a display type;
 * - `Message`: editable Line 1–3. On an LED, line 1 is the default text
 *   colour, line 2 board green and line 3 board orange.
 *
 * `DisplayPreview` maps both onto its message (`content="sample"` and
 * `lines`); the pure helpers live here so a picker, a crop or a test can use
 * the same content without mounting a renderer. They only build board
 * markup: the renderers draw it exactly as they draw any other message.
 */

import { parseLine } from "./board-characters";
import { type BoardDimensions, MIN_GRID_COLS, MIN_GRID_ROWS, NOTE_COLS, NOTE_ROWS } from "./board-dimensions";
import { type DeviceModel, type DisplayTechnology, ledLayoutOptionsForModel, ledSpecForModel } from "./devices";
import { type LedFontId } from "./led-fonts";
import { type LedGridLayout, ledGridLayout } from "./led-matrix";

/** Figma's Content axis: Message (the caller's) or Sample (fixed art). */
export type DisplayContent = "message" | "sample";

/**
 * The colour each Message line is drawn in on an LED, by position. `null`
 * is the matrix's default text colour. Board green and board orange are the
 * `--color-board-green` / `--color-board-orange` tiles, the colours 02 draws.
 * A line past the third keeps the default colour.
 */
export const DISPLAY_LINE_COLORS = [null, "green", "orange"] as const;

/**
 * Lines → one board message. Each line is board markup in its own right
 * (`{66}` is still a tile, `{icon:sun}` still an icon). On an LED, lines 2
 * and 3 are wrapped in their {@link DISPLAY_LINE_COLORS} span; on
 * split-flap the lines are joined as they are, because a flap has no text
 * colour. An empty line stays empty.
 */
export function displayLinesMarkup(lines: readonly string[], technology: DisplayTechnology): string {
  return lines
    .map((line, i) => {
      const color = technology === "led_matrix" ? DISPLAY_LINE_COLORS[i] : null;
      return color && line !== "" ? `{${color}:${line}}` : line;
    })
    .join("\n");
}

/** The six colour tiles, red to violet, repeated to `n` columns: the flap samples' last row. */
const RAINBOW = ["63", "64", "65", "66", "67", "68"] as const;
const rainbowRow = (n: number) => Array.from({ length: n }, (_, i) => `{${RAINBOW[i % RAINBOW.length]}}`).join("");

/** A Flagship's columns: the width the board sample's rainbow is written at. */
const FLAGSHIP_COLS = 22;

/**
 * The Sample content, richest first. The LED schedule and strip are 02's own
 * sample art (Pixoo `28:22736`, TC001 `28:22734`); the weather is 02's
 * Message default (Line 1–3), for a matrix too small for the schedule; the
 * two smallest are for matrices narrower than the strip (a P10's 5 × 2).
 * The split-flap greeting is 02's FiestaPanel sample, and the Note sample
 * the same greeting in three rows; each rainbow runs the full width of the
 * board drawn, and the art is centred vertically on a taller board (as 02
 * draws the FiestaPanel). The flap samples carry no `°`: a Note-charset
 * board draws code 62 as a heart.
 */
export const DISPLAY_SAMPLES = {
  ledSchedule: "MON OCT 3\n\n09:30 STANDUP\n12:00 LUNCH\n15:00 1:1 ♥\n\n{67}{67}{67} 3 LEFT",
  ledWeather: displayLinesMarkup(["72° SUNNY", "N JUDAH 4", "HI 78"], "led_matrix"),
  ledStrip: "72° {66}OK",
  ledTiny: "72° {66}",
  ledDot: "{66}",
  flapBoard: "GOOD MORNING\n\nSUNNY  HI 78  LO 61\nN JUDAH     4 MIN\n\n" + rainbowRow(FLAGSHIP_COLS),
  flapNote: "GOOD MORNING\nN JUDAH  4 MIN\n" + rainbowRow(NOTE_COLS),
} as const;

const LED_TIERS = ["ledSchedule", "ledWeather", "ledStrip", "ledTiny", "ledDot"] as const;
const FLAP_TIERS = ["flapBoard", "flapNote"] as const;

/** The cells each line of `message` takes (a tile or an icon is one), and its line count. */
export function sampleExtent(message: string): BoardDimensions {
  const lines = message.split("\n");
  return {
    rows: lines.length,
    cols: Math.max(...lines.map((line) => parseLine(line, Infinity, { extendedMarkup: true }).length)),
  };
}

const fits = (message: string, grid: BoardDimensions) => {
  const e = sampleExtent(message);
  return e.rows <= grid.rows && e.cols <= grid.cols;
};

/**
 * The character grid an LED model draws in, in the face the board uses
 * (gated by the model, so a face it does not offer falls back to its own,
 * never throws). `null` for a model with no pixel geometry.
 */
export function ledSampleGrid(model: DeviceModel, font?: LedFontId): LedGridLayout | null {
  if (model.geometry.kind !== "pixels") return null;
  const face = ledLayoutOptionsForModel(model, { font }).font;
  return ledGridLayout(ledSpecForModel(model, { font: face })!);
}

/**
 * The flap grid a split-flap model draws at when its preview passes no size:
 * a fixed `cells` grid, a panel's declared size (the renderer's 3 × 15
 * floor when it declares none), or one Note for a note array.
 */
function modelFlapGrid(model: DeviceModel): BoardDimensions {
  const g = model.geometry;
  if (g.kind === "cells") return { rows: g.rows, cols: g.cols };
  if (g.kind === "panel") return { rows: g.rows ?? MIN_GRID_ROWS, cols: g.cols ?? MIN_GRID_COLS };
  return { rows: NOTE_ROWS, cols: NOTE_COLS };
}

/** `message` with its rainbow run to `cols` and blank rows above it, to centre it in `rows`. */
function sizeFlapSample(message: string, grid: BoardDimensions): string {
  const lines = message.split("\n");
  lines[lines.length - 1] = rainbowRow(grid.cols);
  const above = Math.floor((grid.rows - lines.length) / 2);
  return [...Array<string>(above).fill(""), ...lines].join("\n");
}

/**
 * The Sample message for a model: the richest of {@link DISPLAY_SAMPLES}
 * whose every line fits the grid the board draws, in rows and columns.
 *
 * - An LED's grid is its pixels in the board's face (`font`, gated by the
 *   model). The smallest tier is one tile, so every matrix gets a sample.
 * - A split-flap board's grid is `grid` when the preview knows it (a note
 *   array's notes, a panel's own size), else the model's. Its sample is
 *   sized to that grid: the rainbow runs the full width, and the art is
 *   centred vertically. A board too small for the Note sample (smaller than
 *   any split-flap board FiestaBoard draws) gets the Note sample's rows that fit.
 */
export function displaySampleMessage(
  model: DeviceModel,
  options: { font?: LedFontId; grid?: BoardDimensions } = {},
): string {
  if (model.technology === "led_matrix") {
    const g = ledSampleGrid(model, options.font);
    const grid = g ? { rows: g.rows, cols: g.cols } : { rows: 1, cols: 1 };
    return DISPLAY_SAMPLES[LED_TIERS.find((tier) => fits(DISPLAY_SAMPLES[tier], grid)) ?? "ledDot"];
  }
  const grid = options.grid ?? modelFlapGrid(model);
  // The rainbow is sized to the board, so only the text lines decide the fit.
  const tier = FLAP_TIERS.find((t) => fits(DISPLAY_SAMPLES[t].replace(/\n[^\n]*$/, "\n{63}"), grid));
  if (tier) return sizeFlapSample(DISPLAY_SAMPLES[tier], grid);
  return DISPLAY_SAMPLES.flapNote.split("\n").slice(0, Math.max(1, grid.rows)).join("\n");
}
