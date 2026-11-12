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

import { type DeviceModel, type DisplayTechnology, ledLayoutOptionsForModel, ledSpecForModel } from "./devices";
import { type LedFontId } from "./led-fonts";
import { type LedGridLayout, ledGridLayout } from "./led-matrix";

/**
 * The colour each Message line is drawn in on an LED, by position. `null`
 * is the matrix's default text colour. Board green and board orange are the
 * `--color-board-green` / `--color-board-orange` tiles, the colours 02 draws.
 * A line past the third keeps the default colour.
 */
/** Figma's Content axis: Message (the caller's) or Sample (fixed art). */
export type DisplayContent = "message" | "sample";

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

/** The widest split-flap board that still gets the Note sample. */
const FLAGSHIP_COLS = 22;

/** The six colour tiles, red to violet, repeated to `n` columns: the samples' last row. */
const RAINBOW = ["63", "64", "65", "66", "67", "68"] as const;
const rainbowRow = (n: number) => Array.from({ length: n }, (_, i) => `{${RAINBOW[i % RAINBOW.length]}}`).join("");

/**
 * The Sample content, one message per shape. The LED schedule and strip are
 * 02's own sample art (Pixoo `28:22736`, TC001 `28:22734`); the weather is
 * 02's Message default (Line 1–3), for a matrix too small for the schedule;
 * the split-flap greeting is 02's FiestaPanel sample cut to a Flagship's 22
 * columns, and the Note sample the same greeting at 15. The flap samples
 * carry no `°`: a Note-charset board draws code 62 as a heart.
 */
export const DISPLAY_SAMPLES = {
  ledSchedule: "MON OCT 3\n\n09:30 STANDUP\n12:00 LUNCH\n15:00 1:1 ♥\n\n{67}{67}{67} 3 LEFT",
  ledWeather: displayLinesMarkup(["72° SUNNY", "N JUDAH 4", "HI 78"], "led_matrix"),
  ledStrip: "72° {66}OK",
  flapBoard: "GOOD MORNING\n\nSUNNY  HI 78  LO 61\nN JUDAH     4 MIN\n\n" + rainbowRow(FLAGSHIP_COLS),
  flapNote: "GOOD MORNING\nN JUDAH  4 MIN\n" + rainbowRow(15),
} as const;

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
 * The Sample message for a model: the richest of {@link DISPLAY_SAMPLES}
 * that fits it. An LED gets the schedule when its grid is at least 13 × 7
 * characters, the weather at 9 × 3, else the strip. A split-flap board
 * narrower than a Flagship (a Note, or a plugin's small fixed grid) gets
 * the Note sample, any other the greeting. `font` is the board's chosen
 * LED face; `cols` a split-flap panel's own width, which wins over the
 * model's.
 */
export function displaySampleMessage(model: DeviceModel, options: { font?: LedFontId; cols?: number } = {}): string {
  if (model.technology === "led_matrix") {
    const grid = ledSampleGrid(model, options.font);
    if (grid && grid.cols >= 13 && grid.rows >= 7) return DISPLAY_SAMPLES.ledSchedule;
    if (grid && grid.cols >= 9 && grid.rows >= 3) return DISPLAY_SAMPLES.ledWeather;
    return DISPLAY_SAMPLES.ledStrip;
  }
  const g = model.geometry;
  const cols = options.cols ?? (g.kind === "cells" || g.kind === "panel" ? g.cols : undefined);
  if (cols !== undefined && cols < FLAGSHIP_COLS) return DISPLAY_SAMPLES.flapNote;
  if (cols === undefined || cols === FLAGSHIP_COLS) return DISPLAY_SAMPLES.flapBoard;
  // Wider than a Flagship (a FiestaPanel, a big panel): the rainbow runs the
  // full width, as 02's FiestaPanel sample draws it.
  return DISPLAY_SAMPLES.flapBoard.replace(rainbowRow(FLAGSHIP_COLS), rainbowRow(cols));
}
