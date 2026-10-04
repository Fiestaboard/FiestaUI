import { describe, expect, it } from "vitest";

import { CHARACTER_SETS } from "./character-sets";
import {
  characterSetForModel,
  DEVICE_FAMILIES,
  DEVICE_MODEL_IDS,
  DEVICE_MODELS,
  type DeviceFamilyId,
  deviceModelForDeviceType,
  deviceModelForPreset,
  isDeviceModelId,
  ledSpecForModel,
  modelsByTechnology,
  resolveDeviceModel,
  tryResolveDeviceModel,
  validateDeviceModel,
} from "./devices";
import { LED_MATRIX_PRESETS, type LedMatrixPresetId } from "./led-matrix";

describe("device taxonomy", () => {
  it("every model belongs to a family of its own technology, validates, and carries no research prose", () => {
    for (const id of DEVICE_MODEL_IDS) {
      const m = DEVICE_MODELS[id];
      expect(m.id).toBe(id);
      expect(DEVICE_FAMILIES[m.family as DeviceFamilyId].technology, id).toBe(m.technology);
      expect(typeof m.charset === "string" ? CHARACTER_SETS[m.charset] : m.charset, id).toBeDefined();
      expect(validateDeviceModel(JSON.parse(JSON.stringify(m))), id).toEqual({ ok: true, errors: [] });
      // The researched notes and sources live in the fixture, not the bundle.
      expect(m.animation, id).not.toHaveProperty("notes");
      expect(m.animation, id).not.toHaveProperty("sources");
      expect(m, id).not.toHaveProperty("pixelShape");
    }
    expect(modelsByTechnology("split_flap").map((m) => m.id)).toEqual([
      "vestaboard_flagship",
      "vestaboard_note",
      "vestaboard_note_array",
      "vestaboard_panel",
    ]);
    expect(modelsByTechnology("led_matrix")).toHaveLength(DEVICE_MODEL_IDS.length - 4);
  });

  it("every LED preset maps onto one model with the preset's geometry, font and colour", () => {
    for (const preset of Object.keys(LED_MATRIX_PRESETS) as LedMatrixPresetId[]) {
      const m = deviceModelForPreset(preset);
      const p = LED_MATRIX_PRESETS[preset];
      expect(m.legacy?.preset).toBe(preset);
      expect(m.technology).toBe("led_matrix");
      expect(m.geometry).toEqual({ kind: "pixels", width: p.width, height: p.height });
      expect(m.font).toBe(p.font);
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
    expect(flagship.charsetByCode62).toEqual({ degree: "vestaboard_v1", heart: "vestaboard_v2" });
    expect(ledSpecForModel(flagship)).toBeNull();
  });

  it("maps every old preset id onto a manufacturer-qualified model", () => {
    expect(deviceModelForPreset("pixoo64").id).toBe("divoom_pixoo64");
    expect(deviceModelForPreset("awtrix").id).toBe("ulanzi_tc001_awtrix");
    expect(deviceModelForPreset("max7219").id).toBe("max7219_4in1");
    expect(deviceModelForPreset("p10_32x16").id).toBe("p10_hub12_32x16");
    expect(deviceModelForPreset("tronbyt").id).toBe("tidbyt_tronbyt");
  });

  it("resolves built-ins by id and refuses strangers with the list", () => {
    expect(isDeviceModelId("divoom_pixoo64")).toBe(true);
    expect(isDeviceModelId("pixoo64")).toBe(false);
    expect(resolveDeviceModel("hub75_64x32")).toBe(DEVICE_MODELS.hub75_64x32);
    expect(resolveDeviceModel(DEVICE_MODELS.hub75_64x32)).toBe(DEVICE_MODELS.hub75_64x32);
    expect(() => resolveDeviceModel("flagship")).toThrow(
      /Unknown device model "flagship"\. Built-ins: vestaboard_flagship/,
    );
    expect(tryResolveDeviceModel("flagship").error).toMatch(/must be passed as an object/);
  });
});

describe("the Pixoo 64, the first test device", () => {
  it("is id divoom_pixoo64 with legacy preset pixoo64, 3×5 by default, a 32-frame sequence budget", () => {
    const pixoo = DEVICE_MODELS.divoom_pixoo64;
    expect(pixoo.legacy).toEqual({ preset: "pixoo64" });
    expect(pixoo.font).toBe("3x5");
    // 10 × 16 cells clears FiestaBoard's 3 × 15 floor; 5×7 would give 8 × 10.
    expect(characterSetForModel(pixoo).id).toBe("led_3x5");
    expect(pixoo.animation).toEqual({ delivery: "sequence", maxFps: 12.5, maxFrames: 32, minFrameMs: 80 });
    expect(pixoo.geometry).toEqual({ kind: "pixels", width: 64, height: 64 });
  });
});

describe("appearance is preview-only data on every built-in", () => {
  it("the Pixoo is square diffused dots on a dark substrate", () => {
    expect(DEVICE_MODELS.divoom_pixoo64.appearance).toEqual({
      pixelShape: "square",
      dotRatio: 0.82,
      offColor: "#171717",
      substrateColor: "#0a0a0a",
    });
  });

  it("every LED model says how its pixels look; every split-flap model offers its board colours", () => {
    for (const m of modelsByTechnology("led_matrix")) {
      expect(m.appearance?.pixelShape, m.id).toMatch(/^(round|square)$/);
      expect(m.appearance?.dotRatio, m.id).toBeGreaterThan(0);
      expect(m.appearance?.offColor, m.id).toMatch(/^#[0-9a-f]{6}$/);
      expect(m.appearance?.substrateColor, m.id).toMatch(/^#[0-9a-f]{6}$/);
    }
    expect(DEVICE_MODELS.ulanzi_tc001_awtrix.appearance?.pixelShape).toBe("square");
    expect(DEVICE_MODELS.tidbyt_tronbyt.appearance?.pixelShape).toBe("square");
    expect(DEVICE_MODELS.hub75_64x32.appearance?.pixelShape).toBe("round");
    expect(DEVICE_MODELS.max7219_4in1.appearance?.dotRatio).toBe(0.72);
    for (const m of modelsByTechnology("split_flap")) {
      expect(m.appearance, m.id).toEqual({
        boardColors: ["black", "white"],
        options: { board_color: ["black", "white"] },
      });
    }
  });

  it("validates the block and refuses a top-level pixelShape", () => {
    const base = JSON.parse(JSON.stringify(DEVICE_MODELS.divoom_pixoo64));
    expect(validateDeviceModel({ ...base, pixelShape: "square" }).errors).toEqual([
      "pixelShape: not a device model field",
    ]);
    expect(validateDeviceModel({ ...base, appearance: { pixelShape: "hex" } }).errors).toEqual([
      'appearance.pixelShape: "round" or "square"',
    ]);
    expect(validateDeviceModel({ ...base, appearance: { dotRatio: 1.5, offColor: "grey", shape: 1 } }).errors).toEqual([
      "appearance.shape: not a field",
      "appearance.dotRatio: a number in (0, 1]",
      "appearance.offColor: #rrggbb",
    ]);
    expect(validateDeviceModel({ ...base, appearance: { options: { board_color: "black" } } }).errors).toEqual([
      "appearance.options: an object of field → allowed values (strings)",
    ]);
    expect(validateDeviceModel({ ...base, appearance: { bezel: "#334455", boardColors: ["black"] } }).ok).toBe(true);
  });
});
