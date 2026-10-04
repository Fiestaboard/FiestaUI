/**
 * Device taxonomy: display technology → family → model.
 *
 * FiestaBoard started with one technology (split-flap) and one family
 * (Vestaboard), so `DeviceType` — `flagship | note | note_array | panel` —
 * is really "which Vestaboard shape". Adding LED matrices makes the levels
 * explicit:
 *
 *     technology   split_flap                      led_matrix
 *     family       vestaboard                      divoom · awtrix · hub75 · wled · max7219 · p10
 *     model        flagship · note · note_array    pixoo64 · awtrix · hub75_64x32 · …
 *                  · panel
 *
 * A model is **plain, JSON-serialisable data**: a FiestaBoard output plugin
 * (a Pixoo adapter, a plugin for a sign nobody here has heard of) declares
 * one in its manifest and passes the *object* to every API here; the
 * built-ins are defaults, not the universe ({@link validateDeviceModel},
 * {@link resolveDeviceModel}). An unknown id is an error with a reason,
 * never silently a Vestaboard.
 *
 * A model declares what every renderer, adapter and editor needs to know:
 * geometry (or how it is chosen), colour capability, the character set it
 * draws (./character-sets), how it can animate, the font an LED is set in,
 * and — preview-only — how it looks. `DeviceType` and the LED presets keep
 * working: each maps onto exactly one model, so nothing existing changes
 * shape.
 *
 * The researched prose behind each model's animation figures (what the API
 * does, its risks, the sources) is deliberately *not* here: it ships in
 * scripts/ci/tests/fixtures/device-models.json (and in each output plugin's
 * own data), so the runtime carries only what rendering needs.
 */

import type { Code62Glyph } from "./board-characters";
import type { DeviceType } from "./board-dimensions";
import {
  CHARACTER_SET_IDS,
  type CharacterSet,
  type CharacterSetId,
  type CharacterSetInput,
  isCharacterSetId,
  resolveCharacterSet,
  validateCharacterSet,
  type ValidationResult,
} from "./character-sets";
import { LED_FONTS, type LedFontId } from "./led-fonts";
import { LED_MATRIX_PRESETS, type LedMatrixPresetId, type LedMatrixSpec } from "./led-matrix";

export type DisplayTechnology = "split_flap" | "led_matrix";

/**
 * A family is the *protocol an adapter speaks*: every model in a family is
 * driven the same way (Vestaboard's cloud/local API, the Divoom HTTP API,
 * AWTRIX custom apps, DDP for WLED, a HUB75 daemon, a MAX7219 or P10 host
 * bridge, the Tronbyt push API). Models within a family differ in geometry
 * and look, never in how they are addressed.
 */
export type DeviceFamilyId = "vestaboard" | "divoom" | "awtrix" | "hub75" | "wled" | "max7219" | "p10" | "tronbyt";

export interface DeviceFamily {
  id: DeviceFamilyId;
  label: string;
  technology: DisplayTechnology;
}

export const DEVICE_FAMILIES: Readonly<Record<DeviceFamilyId, DeviceFamily>> = {
  vestaboard: { id: "vestaboard", label: "Vestaboard", technology: "split_flap" },
  divoom: { id: "divoom", label: "Divoom", technology: "led_matrix" },
  awtrix: { id: "awtrix", label: "AWTRIX", technology: "led_matrix" },
  hub75: { id: "hub75", label: "HUB75 panels", technology: "led_matrix" },
  wled: { id: "wled", label: "WLED", technology: "led_matrix" },
  max7219: { id: "max7219", label: "MAX7219 modules", technology: "led_matrix" },
  p10: { id: "p10", label: "P10 DMD modules", technology: "led_matrix" },
  tronbyt: { id: "tronbyt", label: "Tronbyt", technology: "led_matrix" },
};

/** How a model's size is known. */
export type DeviceGeometry =
  | { kind: "cells"; rows: number; cols: number }
  /** A grid of Notes; `notesWide × notesTall` is chosen per board. */
  | { kind: "note_array" }
  /** A virtual board; `gridRows × gridCols` is chosen per board. A plugin
   *  may declare the size its device renders at (`rows × cols`), which a
   *  board's own `gridRows` / `gridCols` still override. */
  | { kind: "panel"; rows?: number; cols?: number }
  | { kind: "pixels"; width: number; height: number };

export type DeviceColor =
  | { kind: "rgb"; bitDepth: 24 }
  /** One LED colour; `bitDepth` 1 is on/off, 8 is PWM brightness. */
  | { kind: "monochrome"; color: string; bitDepth: 1 | 8 }
  /** Painted flaps: the eight tile colours, no mixing. */
  | { kind: "tiles" };

/**
 * How fast a device can show a sequence of frames.
 *
 * `stream`: a client pushes each frame in real time; `maxFps` is the rate
 * that holds up. `sequence`: the client uploads an animation the device
 * plays by itself (a GIF, a WebP), bounded by `maxFrames` and `minFrameMs`;
 * `maxFps` is the playback rate. `none`: the device takes one static frame.
 */
export interface DeviceAnimation {
  delivery: "stream" | "sequence" | "none";
  maxFps: number;
  /** Hard budget for a sequence player: a transition is compressed into at
   *  most this many frames, first to final inclusive. */
  maxFrames?: number;
  minFrameMs?: number;
  /** Research prose: what the API does and its risks. Fixture and plugin
   *  data carry it; the runtime built-ins leave it out. */
  notes?: string;
  /** Where the numbers come from. `unverified` in the text marks a memory. */
  sources?: string[];
}

/**
 * How a device *looks* in a preview. Preview-only: nothing here ever reaches
 * the bytes a device is sent — font, letter case and monochrome are layout
 * options, not appearance. A plugin owns the defaults for its device; a
 * board may override only the fields `options` lists.
 */
export interface DeviceAppearance {
  /** LED: how a lit pixel reads — a bare LED is round, a diffused face square. */
  pixelShape?: "round" | "square";
  /** LED: the lit dot's diameter as a fraction of the pixel pitch, 0–1. */
  dotRatio?: number;
  /** LED: `#rrggbb` of an unlit LED. */
  offColor?: string;
  /** `#rrggbb` of the panel substrate (soldermask) or board face behind the pixels or flaps. */
  substrateColor?: string;
  /** `#rrggbb` of the bezel around the display. Unset: the preview's theme bezel. */
  bezel?: string;
  /** Split-flap: the housing colours the board ships in; the first is the default. */
  boardColors?: readonly string[];
  /** The fields a board may override, each with its allowed values:
   *  `{ board_color: ["black", "white"] }`. Keys are the board setting names. */
  options?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Model ids are manufacturer-qualified where there is a manufacturer
 * (`divoom_pixoo64`, `ulanzi_tc001_awtrix`) and protocol-qualified where the
 * hardware is generic (`hub75_64x32`, `max7219_4in1`). The pre-taxonomy LED
 * preset ids (`pixoo64`, `awtrix`, …) keep working through
 * {@link deviceModelForPreset} and `legacy.preset`.
 */
export type DeviceModelId =
  | "vestaboard_flagship"
  | "vestaboard_note"
  | "vestaboard_note_array"
  | "vestaboard_panel"
  | "divoom_pixoo64"
  | "ulanzi_tc001_awtrix"
  | "wled_32x32"
  | "hub75_64x32"
  | "hub75_64x64"
  | "hub75_128x64"
  | "max7219_4in1"
  | "p10_hub12_32x16"
  | "tidbyt_tronbyt";

export interface DeviceModel {
  /** A built-in id, or a plugin's own (`"acme_sign_48x12"`). */
  id: string;
  label: string;
  technology: DisplayTechnology;
  /** A built-in {@link DeviceFamilyId}, or a plugin's own protocol id (`"acme_serial"`). */
  family: string;
  geometry: DeviceGeometry;
  color: DeviceColor;
  /**
   * The set the model draws. **A Flagship's is not fixed by the model**: a
   * board built before 2026 carries the degree flap (`vestaboard_v1`), one
   * built since carries the heart (`vestaboard_v2`), and only its owner
   * knows which. `charset` is the as-shipped-before-2026 set;
   * `charsetByCode62` lists both, and {@link characterSetForModel} picks
   * from it with the board's `code62Glyph`. Always go through that function
   * for a split-flap model.
   */
  charset: CharacterSetId | CharacterSet | CharacterSetInput;
  /** For a model whose flap varies by board: the set per code-62 glyph. */
  charsetByCode62?: Record<Code62Glyph, CharacterSetId | CharacterSet | CharacterSetInput>;
  animation: DeviceAnimation;
  /** LED only. */
  font?: LedFontId;
  /** Preview-only look. See {@link DeviceAppearance}. */
  appearance?: DeviceAppearance;
  /** The pre-taxonomy identifiers this model answers to. A plugin's has none. */
  legacy?: { deviceType?: DeviceType; preset?: LedMatrixPresetId };
}

/** Every key a model may carry; anything else is a typo the validators reject. */
const DEVICE_MODEL_KEYS = new Set([
  "id",
  "label",
  "technology",
  "family",
  "geometry",
  "color",
  "charset",
  "charsetByCode62",
  "animation",
  "font",
  "appearance",
  "legacy",
]);
const APPEARANCE_KEYS = new Set([
  "pixelShape",
  "dotRatio",
  "offColor",
  "substrateColor",
  "bezel",
  "boardColors",
  "options",
]);

/**
 * A Vestaboard is driven frame by frame: FiestaBoard core writes one frame at
 * a time (its transition plugins step frame-by-frame), and the board's own
 * flap cascade animates each write. ~1 frame/s is the practical ceiling for
 * legible flap motion on the local API — a placeholder pending FiestaBoard's
 * exact number, kept in one place so it is easy to change. Cloud connections
 * are additionally floored by FiestaBoard at one write per 15 s (transport
 * policy, not device capability). Well under every LED transition's minimum,
 * so the default stays "none": the flap cascade is the animation.
 * (fiestaboard#2190)
 */
const VESTABOARD_ANIMATION: DeviceAnimation = { delivery: "stream", maxFps: 1 };
/** A virtual board shown by a browser or TV app that polls frames every ~2 s. */
const PANEL_ANIMATION: DeviceAnimation = { delivery: "stream", maxFps: 0.5 };

/** Vestaboard housings come in black or white; the board setting picks. */
const VESTABOARD_APPEARANCE: DeviceAppearance = {
  boardColors: ["black", "white"],
  options: { board_color: ["black", "white"] },
};

/** The preview's LED defaults: a dark soldermask and a dim unlit LED. */
const LED_OFF_COLOR = "#171717";
const LED_SUBSTRATE_COLOR = "#0a0a0a";
/** Bare LEDs read as round dots; a diffused face (Pixoo, TC001, Tidbyt) as squares. */
const ROUND_LED: DeviceAppearance = {
  pixelShape: "round",
  dotRatio: 0.72,
  offColor: LED_OFF_COLOR,
  substrateColor: LED_SUBSTRATE_COLOR,
};
const SQUARE_LED: DeviceAppearance = {
  pixelShape: "square",
  dotRatio: 0.82,
  offColor: LED_OFF_COLOR,
  substrateColor: LED_SUBSTRATE_COLOR,
};

function ledModel(
  id: DeviceModelId,
  preset: LedMatrixPresetId,
  family: DeviceFamilyId,
  animation: DeviceAnimation,
  appearance: DeviceAppearance,
): DeviceModel {
  const p = LED_MATRIX_PRESETS[preset];
  return {
    id,
    label: p.label,
    technology: "led_matrix",
    family,
    geometry: { kind: "pixels", width: p.width, height: p.height },
    color: p.monochrome ? { kind: "monochrome", color: p.monochrome, bitDepth: 1 } : { kind: "rgb", bitDepth: 24 },
    charset: p.font === "3x5" ? "led_3x5" : "led_5x7",
    animation,
    font: p.font,
    appearance,
    legacy: { preset },
  };
}

export const DEVICE_MODELS: Readonly<Record<DeviceModelId, DeviceModel>> = {
  vestaboard_flagship: {
    id: "vestaboard_flagship",
    label: "Vestaboard Flagship",
    technology: "split_flap",
    family: "vestaboard",
    geometry: { kind: "cells", rows: 6, cols: 22 },
    color: { kind: "tiles" },
    charset: "vestaboard_v1",
    charsetByCode62: { degree: "vestaboard_v1", heart: "vestaboard_v2" },
    animation: VESTABOARD_ANIMATION,
    appearance: VESTABOARD_APPEARANCE,
    legacy: { deviceType: "flagship" },
  },
  vestaboard_note: {
    id: "vestaboard_note",
    label: "Vestaboard Note",
    technology: "split_flap",
    family: "vestaboard",
    geometry: { kind: "cells", rows: 3, cols: 15 },
    color: { kind: "tiles" },
    charset: "vestaboard_v2",
    animation: VESTABOARD_ANIMATION,
    appearance: VESTABOARD_APPEARANCE,
    legacy: { deviceType: "note" },
  },
  vestaboard_note_array: {
    id: "vestaboard_note_array",
    label: "Vestaboard Note array",
    technology: "split_flap",
    family: "vestaboard",
    geometry: { kind: "note_array" },
    color: { kind: "tiles" },
    charset: "vestaboard_v2",
    animation: VESTABOARD_ANIMATION,
    appearance: VESTABOARD_APPEARANCE,
    legacy: { deviceType: "note_array" },
  },
  vestaboard_panel: {
    id: "vestaboard_panel",
    label: "Virtual panel",
    technology: "split_flap",
    family: "vestaboard",
    geometry: { kind: "panel" },
    color: { kind: "tiles" },
    charset: "vestaboard_v2",
    animation: PANEL_ANIMATION,
    appearance: VESTABOARD_APPEARANCE,
    legacy: { deviceType: "panel" },
  },
  // The first test device. The HTTP API takes a whole animation at once and
  // plays it locally, so a flip is uploaded as a sequence rather than
  // streamed frame by frame. `maxFrames` is the hard budget a transition is
  // compressed into; `maxFps` is only the playback cadence authored at
  // (1000 / minFrameMs), not a measured device limit.
  // The Pixoo SNAPS. Hardware test on a Pixoo 64 (FiestaBoard program,
  // 2026-10-04): an uploaded animation loops forever (no play-once), more
  // than ~3 frames show a ~6 s "LOADING…" overlay first, and landing on a
  // still afterwards glitches for ~5 s — while a single-frame push is clean
  // in ~0.5 s. So one frame per change: stream at a nominal 2 fps, below
  // every animated entry's minimum, which keeps the default transition on
  // "none". The researched 32-frame sequence budget is superseded.
  divoom_pixoo64: ledModel("divoom_pixoo64", "pixoo64", "divoom", { delivery: "stream", maxFps: 2 }, SQUARE_LED),
  // UNMEASURED: no documented push rate and no test device. Held at a nominal
  // 2 fps — below every animated entry's minimum — so it stays on "none"
  // until someone measures it.
  ulanzi_tc001_awtrix: ledModel(
    "ulanzi_tc001_awtrix",
    "awtrix",
    "awtrix",
    { delivery: "stream", maxFps: 2 },
    SQUARE_LED,
  ),
  wled_32x32: ledModel("wled_32x32", "wled_32x32", "wled", { delivery: "stream", maxFps: 40 }, ROUND_LED),
  hub75_64x32: ledModel("hub75_64x32", "hub75_64x32", "hub75", { delivery: "stream", maxFps: 60 }, ROUND_LED),
  hub75_64x64: ledModel("hub75_64x64", "hub75_64x64", "hub75", { delivery: "stream", maxFps: 60 }, ROUND_LED),
  hub75_128x64: ledModel("hub75_128x64", "hub75_128x64", "hub75", { delivery: "stream", maxFps: 60 }, ROUND_LED),
  max7219_4in1: ledModel("max7219_4in1", "max7219", "max7219", { delivery: "stream", maxFps: 50 }, ROUND_LED),
  p10_hub12_32x16: ledModel("p10_hub12_32x16", "p10_32x16", "p10", { delivery: "stream", maxFps: 50 }, ROUND_LED),
  // A WebP holds any number of frames; the rate is bounded by how often the
  // server will accept a push.
  tidbyt_tronbyt: ledModel(
    "tidbyt_tronbyt",
    "tronbyt",
    "tronbyt",
    { delivery: "sequence", maxFps: 20, minFrameMs: 50 },
    SQUARE_LED,
  ),
};

export const DEVICE_MODEL_IDS = Object.keys(DEVICE_MODELS) as DeviceModelId[];

export function modelsByTechnology(technology: DisplayTechnology): DeviceModel[] {
  return DEVICE_MODEL_IDS.map((id) => DEVICE_MODELS[id]).filter((m) => m.technology === technology);
}

const MODEL_BY_PRESET = new Map<LedMatrixPresetId, DeviceModel>();
for (const id of DEVICE_MODEL_IDS) {
  const preset = DEVICE_MODELS[id].legacy?.preset;
  if (preset) MODEL_BY_PRESET.set(preset, DEVICE_MODELS[id]);
}

export function isDeviceModelId(value: unknown): value is DeviceModelId {
  return typeof value === "string" && Object.hasOwn(DEVICE_MODELS, value);
}

/** A model reference as every API here takes it: a built-in id, or the object. */
export type DeviceModelRef = DeviceModelId | DeviceModel | string;

/**
 * A model by built-in id, or the object itself (a plugin's). An unknown id
 * throws with the list of built-ins: FiestaBoard's Python `devices.py`
 * coerces an unknown type to a Flagship today, and that is exactly the
 * silent fallback this refuses.
 */
export function resolveDeviceModel(ref: DeviceModelRef): DeviceModel {
  if (typeof ref !== "string") return ref;
  if (isDeviceModelId(ref)) return DEVICE_MODELS[ref];
  throw new Error(
    `Unknown device model "${ref}". Built-ins: ${DEVICE_MODEL_IDS.join(", ")}; a plugin's model must be passed as an object.`,
  );
}

/** {@link resolveDeviceModel} without the throw: the model, or why not. */
export function tryResolveDeviceModel(
  ref: DeviceModelRef,
): { model: DeviceModel; error?: undefined } | { model?: undefined; error: string } {
  try {
    return { model: resolveDeviceModel(ref) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

const HEX = /^#[0-9a-f]{6}$/i;
const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** A `charset` reference: a built-in id, or an embedded set that validates. */
function validateCharsetRef(value: unknown, at: string, errors: string[]): void {
  if (typeof value === "string") {
    if (!isCharacterSetId(value)) {
      errors.push(`${at}: a built-in set id (${CHARACTER_SET_IDS.join(", ")}) or an embedded set object`);
    }
    return;
  }
  const r = validateCharacterSet(value);
  if (!r.ok) errors.push(...r.errors.map((e) => `${at}.${e}`));
}

/**
 * Check that a value is a well-formed {@link DeviceModel} — the contract a
 * FiestaBoard output plugin's manifest is validated against (mirrored by
 * scripts/ci/tests/fixtures/device-model.schema.json, and tested to agree
 * with it). An embedded `charset` object is validated too; a `charset` id
 * must be a built-in. Pure; never throws.
 */
export function validateDeviceModel(json: unknown): ValidationResult {
  const errors: string[] = [];
  if (!isPlainObject(json)) return { ok: false, errors: ["not an object"] };
  const m = json;
  for (const key of Object.keys(m)) if (!DEVICE_MODEL_KEYS.has(key)) errors.push(`${key}: not a device model field`);
  if (typeof m.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(m.id))
    errors.push("id: a lowercase identifier (letters, digits, _)");
  if (typeof m.label !== "string" || m.label.length === 0) errors.push("label: a non-empty string");
  if (m.technology !== "split_flap" && m.technology !== "led_matrix")
    errors.push('technology: "split_flap" or "led_matrix"');
  if (typeof m.family !== "string" || m.family.length === 0)
    errors.push("family: the protocol the adapter speaks, as an id");
  const g = m.geometry;
  if (!isPlainObject(g)) errors.push("geometry: an object");
  else if (g.kind === "cells") {
    if (!Number.isInteger(g.rows) || !Number.isInteger(g.cols) || (g.rows as number) < 1 || (g.cols as number) < 1) {
      errors.push("geometry.rows/cols: positive integers");
    }
  } else if (g.kind === "pixels") {
    if (
      !Number.isInteger(g.width) ||
      !Number.isInteger(g.height) ||
      (g.width as number) < 1 ||
      (g.height as number) < 1
    ) {
      errors.push("geometry.width/height: positive integers");
    }
  } else if (g.kind === "panel") {
    for (const axis of ["rows", "cols"]) {
      if (g[axis] !== undefined && (!Number.isInteger(g[axis]) || (g[axis] as number) < 1)) {
        errors.push(`geometry.${axis}: a positive integer, when declared`);
      }
    }
  } else if (g.kind !== "note_array") errors.push('geometry.kind: "cells" | "note_array" | "panel" | "pixels"');
  const c = m.color;
  if (!isPlainObject(c)) errors.push("color: an object");
  else if (c.kind === "rgb") {
    if (c.bitDepth !== 24) errors.push("color.bitDepth: 24 for rgb");
  } else if (c.kind === "monochrome") {
    if (typeof c.color !== "string" || !HEX.test(c.color)) errors.push("color.color: #rrggbb");
    if (c.bitDepth !== 1 && c.bitDepth !== 8) errors.push("color.bitDepth: 1 or 8 for monochrome");
  } else if (c.kind !== "tiles") errors.push('color.kind: "rgb" | "monochrome" | "tiles"');
  validateCharsetRef(m.charset, "charset", errors);
  if (m.charsetByCode62 !== undefined) {
    if (!isPlainObject(m.charsetByCode62)) errors.push("charsetByCode62: an object with degree and heart");
    else {
      for (const glyph of ["degree", "heart"]) {
        if (m.charsetByCode62[glyph] === undefined) errors.push(`charsetByCode62.${glyph}: a set`);
        else validateCharsetRef(m.charsetByCode62[glyph], `charsetByCode62.${glyph}`, errors);
      }
    }
  }
  const a = m.animation;
  if (!isPlainObject(a)) errors.push("animation: an object");
  else {
    if (a.delivery !== "stream" && a.delivery !== "sequence" && a.delivery !== "none") {
      errors.push('animation.delivery: "stream" | "sequence" | "none"');
    }
    if (typeof a.maxFps !== "number" || a.maxFps < 0) errors.push("animation.maxFps: a number ≥ 0");
    if (a.maxFrames !== undefined && (!Number.isInteger(a.maxFrames) || (a.maxFrames as number) < 1)) {
      errors.push("animation.maxFrames: a positive integer");
    }
    if (a.minFrameMs !== undefined && (typeof a.minFrameMs !== "number" || (a.minFrameMs as number) <= 0)) {
      errors.push("animation.minFrameMs: a positive number");
    }
    if (a.notes !== undefined && typeof a.notes !== "string") errors.push("animation.notes: a string");
    if (a.sources !== undefined && !isStringArray(a.sources)) errors.push("animation.sources: an array of strings");
  }
  // `font` is checked on every model, as the schema does: a split-flap model
  // has no use for one, but one it names must still be a face that exists.
  if (m.font !== undefined && !Object.hasOwn(LED_FONTS, m.font as string)) {
    errors.push(`font: one of ${Object.keys(LED_FONTS).join(", ")}`);
  }
  if (m.technology === "led_matrix" && isPlainObject(g) && g.kind !== "pixels") {
    errors.push("geometry.kind: an led_matrix model is measured in pixels");
  }
  if (m.appearance !== undefined) {
    const ap = m.appearance;
    if (!isPlainObject(ap)) errors.push("appearance: an object");
    else {
      for (const key of Object.keys(ap)) if (!APPEARANCE_KEYS.has(key)) errors.push(`appearance.${key}: not a field`);
      if (ap.pixelShape !== undefined && ap.pixelShape !== "round" && ap.pixelShape !== "square") {
        errors.push('appearance.pixelShape: "round" or "square"');
      }
      if (ap.dotRatio !== undefined && (typeof ap.dotRatio !== "number" || ap.dotRatio <= 0 || ap.dotRatio > 1)) {
        errors.push("appearance.dotRatio: a number in (0, 1]");
      }
      for (const field of ["offColor", "substrateColor", "bezel"]) {
        if (ap[field] !== undefined && (typeof ap[field] !== "string" || !HEX.test(ap[field] as string))) {
          errors.push(`appearance.${field}: #rrggbb`);
        }
      }
      if (ap.boardColors !== undefined && !isStringArray(ap.boardColors)) {
        errors.push("appearance.boardColors: an array of strings");
      }
      if (ap.options !== undefined) {
        if (!isPlainObject(ap.options) || !Object.values(ap.options).every(isStringArray)) {
          errors.push("appearance.options: an object of field → allowed values (strings)");
        }
      }
    }
  }
  if (m.legacy !== undefined) {
    const l = m.legacy;
    if (!isPlainObject(l)) errors.push("legacy: an object");
    else {
      if (l.deviceType !== undefined && !["flagship", "note", "note_array", "panel"].includes(l.deviceType as string)) {
        errors.push('legacy.deviceType: "flagship" | "note" | "note_array" | "panel"');
      }
      if (l.preset !== undefined && typeof l.preset !== "string") errors.push("legacy.preset: a string");
    }
  }
  return { ok: errors.length === 0, errors };
}

/** The model behind a pre-taxonomy LED preset id (`legacy.preset`). */
export function deviceModelForPreset(preset: LedMatrixPresetId): DeviceModel {
  return MODEL_BY_PRESET.get(preset)!;
}

/** The model behind a `DeviceType`. */
export function deviceModelForDeviceType(deviceType: DeviceType): DeviceModel {
  switch (deviceType) {
    case "note":
      return DEVICE_MODELS.vestaboard_note;
    case "note_array":
      return DEVICE_MODELS.vestaboard_note_array;
    case "panel":
      return DEVICE_MODELS.vestaboard_panel;
    default:
      return DEVICE_MODELS.vestaboard_flagship;
  }
}

/**
 * The set a particular board draws, read from the model itself: its
 * `charsetByCode62` entry for the board's glyph when it has one, else its
 * `charset`. For a Flagship which flap it carries is a property of the
 * board, so `code62Glyph` decides between the two Vestaboard versions,
 * exactly as `resolveCode62Glyph` does. `legacy.deviceType` is never
 * consulted: a plugin model that sets it for old call sites keeps its own
 * set, and the built-ins declare the sets their device types imply.
 */
export function characterSetForModel(model: DeviceModel, code62Glyph?: Code62Glyph): CharacterSet {
  if (model.charsetByCode62 && code62Glyph) return resolveCharacterSet(model.charsetByCode62[code62Glyph]);
  return resolveCharacterSet(model.charset);
}

/** The LED spec a model renders at, for `layoutLedMessage`. */
export function ledSpecForModel(model: DeviceModel): LedMatrixSpec | null {
  if (model.geometry.kind !== "pixels") return null;
  return { width: model.geometry.width, height: model.geometry.height, font: model.font };
}
