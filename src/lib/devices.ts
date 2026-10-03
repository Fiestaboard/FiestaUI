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
 * draws (./character-sets), how it can animate, how its pixels look, and the
 * font an LED is set in. `DeviceType` and the LED presets keep working — each
 * maps onto exactly one model — so nothing existing changes shape.
 *
 * Animation capability decides which entries of the transition menu
 * (./led-transition-registry) a model can run and which is its default: a
 * message change flips when the device can show it, and snaps when it
 * cannot. An explicit `transition` prop wins when the device can run it.
 */

import type { Code62Glyph } from "./board-characters";
import type { DeviceType } from "./board-dimensions";
import {
  CHARACTER_SET_IDS,
  type CharacterSet,
  characterSetForDevice,
  type CharacterSetId,
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
  /** A virtual board; `gridRows × gridCols` is chosen per board. */
  | { kind: "panel" }
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
  maxFrames?: number;
  minFrameMs?: number;
  notes: string;
  /** Where the numbers come from. `unverified` in the text marks a memory. */
  sources: string[];
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
  family: DeviceFamilyId;
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
  charset: CharacterSetId | CharacterSet;
  /** For a model whose flap varies by board: the set per code-62 glyph. */
  charsetByCode62?: Record<Code62Glyph, CharacterSetId | CharacterSet>;
  animation: DeviceAnimation;
  /** LED only. */
  font?: LedFontId;
  pixelShape?: "round" | "square";
  /** The pre-taxonomy identifiers this model answers to. A plugin's has none. */
  legacy?: { deviceType?: DeviceType; preset?: LedMatrixPresetId };
}

const SPLIT_FLAP_ANIMATION: DeviceAnimation = {
  delivery: "none",
  maxFps: 0,
  notes: "The hardware cascades by itself (~16 ms per flap at 60 RPM); a client sends one message, never frames.",
  sources: [],
};

function ledModel(
  id: DeviceModelId,
  preset: LedMatrixPresetId,
  family: DeviceFamilyId,
  animation: DeviceAnimation,
  overrides: Partial<DeviceModel> = {},
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
    pixelShape: p.pixelShape,
    legacy: { preset },
    ...overrides,
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
    animation: SPLIT_FLAP_ANIMATION,
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
    animation: SPLIT_FLAP_ANIMATION,
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
    animation: SPLIT_FLAP_ANIMATION,
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
    animation: SPLIT_FLAP_ANIMATION,
    legacy: { deviceType: "panel" },
  },
  // The first test device. The HTTP API takes a whole animation at once
  // (`Draw/SendHttpGif`: frames of 64×64 RGB888 at `PicSpeed` ms each) and
  // plays it locally, so a flip is uploaded as a sequence rather than
  // streamed frame by frame — streaming manages about one frame a second.
  divoom_pixoo64: ledModel("divoom_pixoo64", "pixoo64", "divoom", {
    delivery: "sequence",
    // `maxFrames` is the hard budget a transition is compressed into. The
    // device plays the sequence itself; `maxFps` here is only the playback
    // cadence we author at (1000 / minFrameMs), not a measured device limit,
    // and nothing is judged by it for a sequence player.
    maxFps: 12.5,
    maxFrames: 32,
    minFrameMs: 80,
    notes:
      "Draw/SendHttpGif: one POST per frame (PicNum frames, PicOffset index, PicSpeed ms, PicData base64 RGB888, PicWidth must be 64), played locally. HARD BUDGET: a transition gets 32 frames start to finish and is compressed, never cut, so it always lands on the final frame. RISK, from the same sources: (1) every uploaded animation first shows a ~5 s 'Loading..' overlay; (2) frames must be pushed ~150 ms–1 s apart, so a 32-frame change takes 5–32 s to upload; (3) the device stops responding after ~300 pushes — about 9 animated changes at 32 frames — until rebooted; (4) frames beyond ~32–40 can crash it; Draw/ResetHttpGifId must precede each animation and Draw/CommandList cannot batch frames. Adapter mitigation to decide: keep a push counter and schedule a reboot (or fall back to single-frame pushes) before ~250 pushes, and/or author fewer frames per change (16 ≈ 18 changes between reboots). The official doc's '≤ 60 frames' is unverified (JS-rendered page).",
    sources: [
      "https://raw.githubusercontent.com/cyanheads/pixoo-toolkit/main/AGENTS.md",
      "https://github.com/gickowtf/pixoo-homeassistant/pull/158",
      "https://github.com/SomethingWithComputers/pixoo",
      "https://raw.githubusercontent.com/Grayda/pixoo_api/main/NOTES.md",
      "https://doc.divoom-gz.com/web/#/12?page_id=93 (unverified: not fetchable)",
    ],
  }),
  ulanzi_tc001_awtrix: ledModel("ulanzi_tc001_awtrix", "awtrix", "awtrix", {
    delivery: "stream",
    // UNMEASURED. No documented push rate and no test device; full-frame
    // `db` bitmaps fail above 8×8 (issue #214) and the firmware's own app
    // switch is 500 ms. Held at a nominal 2 fps — below every animated
    // entry's minimum — so it stays on "none" until someone measures it.
    maxFps: 2,
    notes:
      "Custom apps take `draw` ops (dp/dl/dr/df/dc/dfc/dt/db) over HTTP or MQTT; `db` with a full 8×32 bitmap returned ErrorParsingJson (#214). TSPEED (app transition) defaults to 500 ms, ATIME 7 s. No stated rate limit; the push rate is UNMEASURED (no test device), so the model stays on snap and lets the firmware's own Slide transition carry the change.",
    sources: [
      "https://raw.githubusercontent.com/Blueforcer/awtrix3/main/docs/api.md",
      "https://github.com/Blueforcer/awtrix3/issues/214",
    ],
  }),
  wled_32x32: ledModel("wled_32x32", "wled_32x32", "wled", {
    delivery: "stream",
    maxFps: 40,
    notes:
      "DDP on UDP 4048 (480 RGB pixels per 1440-byte datagram; 1024 LEDs = 3 datagrams a frame) holds 25–40 fps on an ESP32; E1.31 is documented at '25 ms (40 fps)' for ≤ 510 LEDs; WLED_FPS default 42. The JSON `seg.i` route is HTTP + parse per call and not for this.",
    sources: [
      "https://kno.wled.ge/interfaces/ddp/",
      "https://kno.wled.ge/interfaces/e1.31-dmx/",
      "https://kno.wled.ge/interfaces/udp-realtime/",
      "https://wled.discourse.group/t/esp32-288leds-fps/3046",
    ],
  }),
  hub75_64x32: ledModel("hub75_64x32", "hub75_64x32", "hub75", {
    delivery: "stream",
    maxFps: 60,
    notes:
      "rpi-rgb-led-matrix refreshes 'typically in the hundreds of Hertz' (three 128×64 panels: 410 Hz); a Pi daemon fed over the network (flaschen-taschen style) holds 30–60 fps.",
    sources: ["https://github.com/hzeller/rpi-rgb-led-matrix"],
  }),
  hub75_64x64: ledModel("hub75_64x64", "hub75_64x64", "hub75", {
    delivery: "stream",
    maxFps: 60,
    notes: "As hub75_64x32.",
    sources: ["https://github.com/hzeller/rpi-rgb-led-matrix"],
  }),
  hub75_128x64: ledModel("hub75_128x64", "hub75_128x64", "hub75", {
    delivery: "stream",
    maxFps: 60,
    notes: "As hub75_64x32; a 128×64 chain still refreshes above 100 Hz on a Pi 4.",
    sources: ["https://github.com/hzeller/rpi-rgb-led-matrix"],
  }),
  max7219_4in1: ledModel("max7219_4in1", "max7219", "max7219", {
    delivery: "stream",
    maxFps: 50,
    notes:
      "A 32×8 frame is 32 bytes over SPI; MD_Parola's setSpeed() runs animations at any ms interval ('zero to run as fast as possible'). Hundreds of fps locally (unverified figure); the bridge from a host to the module is custom, so the figure assumes you own it.",
    sources: ["https://luma-led-matrix.readthedocs.io/en/latest/", "https://github.com/MajicDesigns/MD_Parola/wiki"],
  }),
  p10_hub12_32x16: ledModel("p10_hub12_32x16", "p10_32x16", "p10", {
    delivery: "stream",
    maxFps: 50,
    notes:
      "HUB12 modules are scanned by the host microcontroller (DMD32 / DMD_STM32, 30–70 µs row on-time); a frame over serial is 64 bytes. No standard host protocol, so the figure assumes you own the bridge.",
    sources: ["https://github.com/board707/DMD_STM32"],
  }),
  tidbyt_tronbyt: ledModel("tidbyt_tronbyt", "tronbyt", "tronbyt", {
    delivery: "sequence",
    // A WebP holds any number of frames; render.Root's `delay` is the frame
    // time. Rate is bounded by how often the server will accept a push.
    maxFps: 20,
    minFrameMs: 50,
    notes:
      "Tronbyt server: POST /v0/devices/{id}/push with a base64 WebP, displayTimeSec default 30; devices poll /next and loop the animation. Pixlet render.Root(delay=ms) sets the frame time (50 ms default — unverified). Tidbyt's cloud is rate-limited with no published number. One WebP per message change, so a flip is a sequence at 80 ms per step with no half-flaps.",
    sources: [
      "https://raw.githubusercontent.com/tronbyt/server/main/API.md",
      "https://raw.githubusercontent.com/tidbyt/pixlet/main/docs/widgets.md",
    ],
  }),
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

/**
 * Check that a value is a well-formed {@link DeviceModel} — the contract a
 * FiestaBoard output plugin's manifest is validated against (mirrored by
 * scripts/ci/tests/fixtures/device-model.schema.json). An embedded `charset`
 * object is validated too; a `charset` id must be a built-in. Pure; never throws.
 */
export function validateDeviceModel(json: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof json !== "object" || json === null || Array.isArray(json)) return { ok: false, errors: ["not an object"] };
  const m = json as Record<string, unknown>;
  if (typeof m.id !== "string" || !/^[a-z][a-z0-9_]*$/.test(m.id))
    errors.push("id: a lowercase identifier (letters, digits, _)");
  if (typeof m.label !== "string" || m.label.length === 0) errors.push("label: a non-empty string");
  if (m.technology !== "split_flap" && m.technology !== "led_matrix")
    errors.push('technology: "split_flap" or "led_matrix"');
  if (typeof m.family !== "string" || m.family.length === 0)
    errors.push("family: the protocol the adapter speaks, as an id");
  const g = m.geometry as Record<string, unknown> | undefined;
  if (!g || typeof g !== "object") errors.push("geometry: an object");
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
  } else if (g.kind !== "note_array" && g.kind !== "panel")
    errors.push('geometry.kind: "cells" | "note_array" | "panel" | "pixels"');
  const c = m.color as Record<string, unknown> | undefined;
  if (!c || typeof c !== "object") errors.push("color: an object");
  else if (c.kind === "rgb") {
    if (c.bitDepth !== 24) errors.push("color.bitDepth: 24 for rgb");
  } else if (c.kind === "monochrome") {
    if (typeof c.color !== "string" || !HEX.test(c.color)) errors.push("color.color: #rrggbb");
    if (c.bitDepth !== 1 && c.bitDepth !== 8) errors.push("color.bitDepth: 1 or 8 for monochrome");
  } else if (c.kind !== "tiles") errors.push('color.kind: "rgb" | "monochrome" | "tiles"');
  if (typeof m.charset === "string") {
    if (!isCharacterSetId(m.charset)) {
      errors.push(`charset: a built-in set id (${CHARACTER_SET_IDS.join(", ")}) or an embedded set object`);
    }
  } else {
    const r = validateCharacterSet(m.charset);
    if (!r.ok) errors.push(...r.errors.map((e) => `charset.${e}`));
  }
  const a = m.animation as Record<string, unknown> | undefined;
  if (!a || typeof a !== "object") errors.push("animation: an object");
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
    if (typeof a.notes !== "string") errors.push("animation.notes: a string");
    if (!Array.isArray(a.sources) || a.sources.some((x) => typeof x !== "string")) {
      errors.push("animation.sources: an array of strings");
    }
  }
  if (m.technology === "led_matrix") {
    if (m.font !== undefined && !Object.hasOwn(LED_FONTS, m.font as string)) {
      errors.push(`font: one of ${Object.keys(LED_FONTS).join(", ")}`);
    }
    if (g && g.kind !== "pixels") errors.push("geometry.kind: an led_matrix model is measured in pixels");
  }
  if (m.pixelShape !== undefined && m.pixelShape !== "round" && m.pixelShape !== "square") {
    errors.push('pixelShape: "round" or "square"');
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
 * The set a particular board draws. For a Flagship that is a property of
 * the board (which flap it carries), so `code62Glyph` decides between the
 * two Vestaboard versions, exactly as `resolveCode62Glyph` does.
 */
export function characterSetForModel(model: DeviceModel, code62Glyph?: Code62Glyph): CharacterSet {
  if (model.legacy?.deviceType) return characterSetForDevice(model.legacy.deviceType, code62Glyph);
  if (model.charsetByCode62 && code62Glyph) return resolveCharacterSet(model.charsetByCode62[code62Glyph]);
  return resolveCharacterSet(model.charset);
}

/** The LED spec a model renders at, for `layoutLedMessage`. */
export function ledSpecForModel(model: DeviceModel): LedMatrixSpec | null {
  if (model.geometry.kind !== "pixels") return null;
  return { width: model.geometry.width, height: model.geometry.height, font: model.font };
}
