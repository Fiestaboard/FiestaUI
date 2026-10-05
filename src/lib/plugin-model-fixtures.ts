/**
 * Device models the way a FiestaBoard output plugin declares them: plain
 * JSON, no built-in id, passed to every API as the object. These are the
 * fixtures `DisplayPreview` is tested and shown against, and the examples
 * scripts/ci/tests/fixtures/plugin-models.json carries for plugin authors
 * (spec §6.1). They are **not** built-ins: `resolveDeviceModel("fiestapanel_…")`
 * throws, as it does for any id the package does not ship.
 *
 * FiestaPanel is FiestaBoard's own display: a TV showing a life-size board.
 * It renders in one of two styles, and FiestaBoard declares a model per
 * style — a split-flap panel sized in characters, and an LED-matrix look
 * sized in pixels — so a preview is dispatched on the model's technology
 * like any other device's. (The TV bezel around either is FiestaBoard's to
 * define; until it is, `DisplayPreview` draws the bare board — see its
 * `frame` prop.)
 */

import { ACME_SIGN_MODEL } from "./charset-golden-cases";

/**
 * FiestaPanel in its split-flap style: a 55" TV in landscape fits 12 rows ×
 * 29 columns of life-size flaps, which is neither a Flagship nor a Note
 * multiple, so the geometry is a `panel` with its size declared. A board's
 * own `gridRows` / `gridCols` still win over the declared size.
 */
export const FIESTAPANEL_SPLIT_FLAP_MODEL = {
  id: "fiestapanel_split_flap",
  label: "FiestaPanel (split-flap)",
  technology: "split_flap",
  family: "fiestapanel",
  geometry: { kind: "panel", rows: 12, cols: 29 },
  color: { kind: "tiles" },
  charset: "vestaboard_v2",
  // The TV app polls frames about every 2 s, like the legacy virtual panel.
  animation: { delivery: "stream", maxFps: 0.5 },
  appearance: {
    boardColors: ["black", "white"],
    options: { board_color: ["black", "white"] },
  },
} as const;

/**
 * FiestaPanel in its LED-matrix style: the same TV drawing a 192 × 96 grid
 * of diffused square pixels (10 px of screen per LED on a 1080p panel). It
 * streams at the display's refresh rate, so every transition is available.
 */
export const FIESTAPANEL_LED_MATRIX_MODEL = {
  id: "fiestapanel_led_matrix",
  label: "FiestaPanel (LED matrix)",
  technology: "led_matrix",
  family: "fiestapanel",
  geometry: { kind: "pixels", width: 192, height: 96 },
  color: { kind: "rgb", bitDepth: 24 },
  charset: "led_5x7",
  animation: { delivery: "stream", maxFps: 60 },
  font: "5x7",
  appearance: { pixelShape: "square", dotRatio: 0.82, offColor: "#1a1a1a", substrateColor: "#000000" },
} as const;

/** Every plugin-style model fixture, as declared. */
export const PLUGIN_MODEL_FIXTURES = [
  ACME_SIGN_MODEL,
  FIESTAPANEL_SPLIT_FLAP_MODEL,
  FIESTAPANEL_LED_MATRIX_MODEL,
] as const;
