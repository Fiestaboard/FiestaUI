import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { CHARACTER_SETS } from "./character-sets";
import {
  characterSetForModel,
  DEVICE_FAMILIES,
  DEVICE_MODEL_IDS,
  DEVICE_MODELS,
  deviceModelForDeviceType,
  deviceModelForPreset,
  ledSpecForModel,
  modelsByTechnology,
  validateDeviceModel,
} from "./devices";
import { LED_MATRIX_PRESETS, type LedMatrixPresetId } from "./led-matrix";
import { defaultTransitionIdForModel, transitionSpecForDevice } from "./led-transition-registry";

describe("device taxonomy", () => {
  it("every model belongs to a family of its own technology", () => {
    for (const id of DEVICE_MODEL_IDS) {
      const m = DEVICE_MODELS[id];
      expect(m.id).toBe(id);
      expect(DEVICE_FAMILIES[m.family].technology, id).toBe(m.technology);
      expect(typeof m.charset === "string" ? CHARACTER_SETS[m.charset] : m.charset, id).toBeDefined();
      expect(m.animation.sources, id).toBeDefined();
    }
    expect(modelsByTechnology("split_flap").map((m) => m.id)).toEqual([
      "vestaboard_flagship",
      "vestaboard_note",
      "vestaboard_note_array",
      "vestaboard_panel",
    ]);
  });

  it("every LED preset maps onto one model with the preset's geometry, font and colour", () => {
    for (const preset of Object.keys(LED_MATRIX_PRESETS) as LedMatrixPresetId[]) {
      const m = deviceModelForPreset(preset);
      const p = LED_MATRIX_PRESETS[preset];
      expect(m.legacy?.preset).toBe(preset);
      expect(m.technology).toBe("led_matrix");
      expect(m.geometry).toEqual({ kind: "pixels", width: p.width, height: p.height });
      expect(m.font).toBe(p.font);
      expect(m.pixelShape).toBe(p.pixelShape);
      expect(m.color.kind).toBe(p.monochrome ? "monochrome" : "rgb");
      expect(m.charset).toBe(p.font === "3x5" ? "led_3x5" : "led_5x7");
      expect(ledSpecForModel(m)).toEqual({ width: p.width, height: p.height, font: p.font });
    }
  });

  it("every DeviceType maps onto a Vestaboard model, and the Flagship's set follows its flap", () => {
    expect(deviceModelForDeviceType("flagship").geometry).toEqual({ kind: "cells", rows: 6, cols: 22 });
    expect(deviceModelForDeviceType("note").geometry).toEqual({ kind: "cells", rows: 3, cols: 15 });
    expect(deviceModelForDeviceType("note_array").geometry).toEqual({ kind: "note_array" });
    expect(deviceModelForDeviceType("panel").geometry).toEqual({ kind: "panel" });
    const flagship = DEVICE_MODELS.vestaboard_flagship;
    expect(characterSetForModel(flagship).id).toBe("vestaboard_v1");
    expect(characterSetForModel(flagship, "heart").id).toBe("vestaboard_v2");
    expect(characterSetForModel(DEVICE_MODELS.vestaboard_note, "degree").id).toBe("vestaboard_v2");
    // The Pixoo defaults to the 3×5 face: 10 × 16 cells clears FiestaBoard's 3 × 15 floor.
    expect(characterSetForModel(DEVICE_MODELS.divoom_pixoo64).id).toBe("led_3x5");
    expect(flagship.charsetByCode62).toEqual({ degree: "vestaboard_v1", heart: "vestaboard_v2" });
    expect(ledSpecForModel(flagship)).toBeNull();
  });
});

describe("what 'fast enough' means, through the transition menu", () => {
  const base = { notes: "", sources: [] };
  const flipFor = (animation: Parameters<typeof transitionSpecForDevice>[1]) =>
    transitionSpecForDevice("flip", animation);

  it("streams: full flip at ≥ 25 fps, coarse flip from 5 fps, nothing below or with no animation", () => {
    expect(flipFor({ ...base, delivery: "stream", maxFps: 60 })).toEqual({ spec: { kind: "flip" }, degraded: false });
    expect(flipFor({ ...base, delivery: "stream", maxFps: 25 })).toEqual({ spec: { kind: "flip" }, degraded: false });
    expect(flipFor({ ...base, delivery: "stream", maxFps: 10 })).toMatchObject({
      spec: { kind: "flip", stepMs: 100, halfFlap: false },
      degraded: true,
    });
    expect(flipFor({ ...base, delivery: "stream", maxFps: 4 })).toBeNull();
    expect(flipFor({ ...base, delivery: "none", maxFps: 0 })).toBeNull();
  });

  it("sequences are judged by their frame budget, never by an invented frame rate", () => {
    expect(flipFor({ ...base, delivery: "sequence", maxFps: 1, maxFrames: 32, minFrameMs: 80 })).toMatchObject({
      spec: { kind: "flip", stepMs: 80, halfFlap: false, maxFrames: 32 },
    });
    expect(flipFor({ ...base, delivery: "sequence", maxFps: 1000, maxFrames: 4 })).toBeNull();
    expect(flipFor({ ...base, delivery: "sequence", maxFps: 20, minFrameMs: 50 })).toMatchObject({
      spec: { kind: "flip", stepMs: 80, halfFlap: false },
    });
  });

  it("gives each model the default its API can carry", () => {
    expect(defaultTransitionIdForModel(DEVICE_MODELS.hub75_128x64)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.wled_32x32)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.max7219_4in1)).toBe("flip");
    expect(flipFor(DEVICE_MODELS.divoom_pixoo64.animation)).toMatchObject({
      spec: { kind: "flip", stepMs: 80, halfFlap: false, maxFrames: 32 },
    });
    expect(DEVICE_MODELS.divoom_pixoo64.animation).toMatchObject({ delivery: "sequence", maxFrames: 32 });
    expect(DEVICE_MODELS.divoom_pixoo64.animation.notes).toMatch(/Loading/);
    expect(DEVICE_MODELS.divoom_pixoo64.animation.notes).toMatch(/300 pushes/);
    expect(defaultTransitionIdForModel(DEVICE_MODELS.tidbyt_tronbyt)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.ulanzi_tc001_awtrix)).toBe("none");
    expect(DEVICE_MODELS.ulanzi_tc001_awtrix.animation.notes).toMatch(/UNMEASURED/);
    expect(defaultTransitionIdForModel(DEVICE_MODELS.vestaboard_flagship)).toBe("none");
  });

  it("maps every old preset id onto a manufacturer-qualified model", () => {
    expect(deviceModelForPreset("pixoo64").id).toBe("divoom_pixoo64");
    expect(deviceModelForPreset("awtrix").id).toBe("ulanzi_tc001_awtrix");
    expect(deviceModelForPreset("max7219").id).toBe("max7219_4in1");
    expect(deviceModelForPreset("p10_32x16").id).toBe("p10_hub12_32x16");
    expect(deviceModelForPreset("tronbyt").id).toBe("tidbyt_tronbyt");
  });
});

describe("the device-model fixture", () => {
  it("matches scripts/ci/tests/fixtures/device-models.json, which output plugins are validated against, and validates", () => {
    const fixture = JSON.parse(
      readFileSync(resolve(__dirname, "../../scripts/ci/tests/fixtures/device-models.json"), "utf8"),
    );
    expect(Object.keys(fixture)).toEqual(DEVICE_MODEL_IDS);
    for (const id of DEVICE_MODEL_IDS) {
      expect(fixture[id], id).toEqual(JSON.parse(JSON.stringify(DEVICE_MODELS[id])));
      expect(validateDeviceModel(fixture[id]), id).toEqual({ ok: true, errors: [] });
    }
  });
});
