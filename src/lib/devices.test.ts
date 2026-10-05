import { describe, expect, it } from "vitest";

import {
  CHARACTER_SETS,
  type CharacterSet,
  characterSetForDevice,
  type CharacterSetId,
  charsetDiff,
  charsetHasChar,
} from "./character-sets";
import {
  characterSetForModel,
  DEVICE_FAMILIES,
  DEVICE_MODEL_IDS,
  DEVICE_MODELS,
  type DeviceFamilyId,
  type DeviceModel,
  deviceModelForDeviceType,
  deviceModelForPreset,
  isDeviceModelId,
  layoutPolicyForModel,
  ledLayoutOptionsForModel,
  ledSpecForModel,
  modelsByTechnology,
  resolveDeviceModel,
  tryResolveDeviceModel,
  validateDeviceModel,
} from "./devices";
import { LED_MATRIX_PRESETS, type LedMatrixPresetId } from "./led-matrix";
import { defaultTransitionIdForModel, transitionSpecForDevice } from "./led-transition-registry";

describe("device taxonomy", () => {
  it("every model belongs to a family of its own technology, validates, and carries no research prose", () => {
    for (const id of DEVICE_MODEL_IDS) {
      const m = DEVICE_MODELS[id];
      expect(m.id).toBe(id);
      expect(DEVICE_FAMILIES[m.family as DeviceFamilyId].technology, id).toBe(m.technology);
      expect(typeof m.charset === "string" ? CHARACTER_SETS[m.charset as CharacterSetId] : m.charset, id).toBeDefined();
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
      // The spec carries the model's defaults for the byte-changing layout
      // options — today's, for every built-in.
      expect(ledSpecForModel(m)).toEqual({
        width: p.width,
        height: p.height,
        font: p.font,
        tileGap: "gap",
        blockPadding: 0,
      });
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
    // Driven frame by frame by FiestaBoard core (fiestaboard#2190): a stream
    // at ~1 frame/s, the practical ceiling for legible flap motion; the
    // virtual panel is polled every ~2 s. Both far below any LED transition's
    // minimum, so the flap cascade stays the only animation.
    for (const id of ["vestaboard_flagship", "vestaboard_note", "vestaboard_note_array"] as const) {
      expect(DEVICE_MODELS[id].animation, id).toEqual({ delivery: "stream", maxFps: 1 });
    }
    expect(DEVICE_MODELS.vestaboard_panel.animation).toEqual({ delivery: "stream", maxFps: 0.5 });
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

describe("characterSetForModel reads the model's own set", () => {
  // A plugin may declare a split-flap model and set `legacy.deviceType` so
  // old call sites still find a DeviceType; that must not coerce its set to
  // a Vestaboard's.
  const own: CharacterSet = {
    id: "acme_flap",
    label: "ACME flap",
    version: 1,
    chars: [..."ABC"],
    tiles: false,
    icons: [],
    mixedCase: false,
    colorSpans: false,
    blockSpans: false,
  };
  const base: DeviceModel = {
    id: "acme_flap_2x10",
    label: "ACME flap 2×10",
    technology: "split_flap",
    family: "acme_serial",
    geometry: { kind: "cells", rows: 2, cols: 10 },
    color: { kind: "tiles" },
    charset: own,
    animation: { delivery: "none", maxFps: 0 },
    legacy: { deviceType: "flagship" },
  };

  it("prefers the model's charset over legacy.deviceType", () => {
    expect(characterSetForModel(base)).toBe(own);
    expect(characterSetForModel(base, "heart")).toBe(own);
    expect(characterSetForModel(base, "degree")).toBe(own);
  });

  it("prefers the model's charsetByCode62 over legacy.deviceType", () => {
    const heart: CharacterSet = { ...own, id: "acme_flap_heart", chars: [..."ABC♥"] };
    const model: DeviceModel = { ...base, charsetByCode62: { degree: own, heart } };
    expect(characterSetForModel(model)).toBe(own);
    expect(characterSetForModel(model, "degree")).toBe(own);
    expect(characterSetForModel(model, "heart")).toBe(heart);
  });

  it("materialises an embedded partial set", () => {
    const model: DeviceModel = { ...base, charset: { id: "acme_partial", extends: "vestaboard_v2", tiles: false } };
    const set = characterSetForModel(model);
    expect(set.id).toBe("acme_partial");
    expect(set.tiles).toBe(false);
    expect(set.chars).toEqual(CHARACTER_SETS.vestaboard_v2.chars);
    expect(charsetHasChar(set, "♥")).toBe(true);
    expect(charsetDiff(set, "vestaboard_v2").features).toEqual([["tiles", false, true]]);
    expect(characterSetForModel(model)).toBe(set);
  });

  it("leaves every built-in exactly where its legacy device type put it", () => {
    for (const id of DEVICE_MODEL_IDS) {
      const model = DEVICE_MODELS[id];
      if (!model.legacy?.deviceType) continue;
      for (const glyph of [undefined, "degree", "heart"] as const) {
        expect(characterSetForModel(model, glyph), `${id} / ${glyph}`).toBe(
          characterSetForDevice(model.legacy.deviceType, glyph),
        );
      }
    }
  });
});

describe("what 'fast enough' means, through the transition menu", () => {
  const flipFor = (animation: Parameters<typeof transitionSpecForDevice>[1]) =>
    transitionSpecForDevice("flip", animation);

  it("streams: full flip at ≥ 25 fps, coarse flip from 5 fps, nothing below or with no animation", () => {
    expect(flipFor({ delivery: "stream", maxFps: 60 })).toEqual({ spec: { kind: "flip" }, degraded: false });
    expect(flipFor({ delivery: "stream", maxFps: 25 })).toEqual({ spec: { kind: "flip" }, degraded: false });
    expect(flipFor({ delivery: "stream", maxFps: 10 })).toMatchObject({
      spec: { kind: "flip", stepMs: 100, halfFlap: false },
      degraded: true,
    });
    expect(flipFor({ delivery: "stream", maxFps: 4 })).toBeNull();
    expect(flipFor({ delivery: "none", maxFps: 0 })).toBeNull();
  });

  it("sequences are judged by their frame budget, never by an invented frame rate", () => {
    expect(flipFor({ delivery: "sequence", maxFps: 1, maxFrames: 32, minFrameMs: 80 })).toMatchObject({
      spec: { kind: "flip", stepMs: 80, halfFlap: false, maxFrames: 32 },
    });
    expect(flipFor({ delivery: "sequence", maxFps: 1000, maxFrames: 4 })).toBeNull();
    expect(flipFor({ delivery: "sequence", maxFps: 20, minFrameMs: 50 })).toMatchObject({
      spec: { kind: "flip", stepMs: 80, halfFlap: false },
    });
  });

  it("gives each model the default its API can carry", () => {
    expect(defaultTransitionIdForModel(DEVICE_MODELS.hub75_128x64)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.wled_32x32)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.max7219_4in1)).toBe("flip");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.p10_hub12_32x16)).toBe("flip");
    // The Pixoo 64 snaps: its hardware test (2026-10-04) found uploaded
    // animations loop and show a "LOADING…" overlay, so it is held at its
    // verified safe still-push rate, 2 fps, below every entry's minimum.
    expect(flipFor(DEVICE_MODELS.divoom_pixoo64.animation)).toBeNull();
    expect(defaultTransitionIdForModel(DEVICE_MODELS.divoom_pixoo64)).toBe("none");
    expect(defaultTransitionIdForModel(DEVICE_MODELS.tidbyt_tronbyt)).toBe("flip");
    // UNMEASURED: held at a nominal 2 fps, below every animated entry's minimum.
    expect(DEVICE_MODELS.ulanzi_tc001_awtrix.animation).toEqual({ delivery: "stream", maxFps: 2 });
    expect(defaultTransitionIdForModel(DEVICE_MODELS.ulanzi_tc001_awtrix)).toBe("none");
    for (const m of modelsByTechnology("split_flap")) expect(defaultTransitionIdForModel(m), m.id).toBe("none");
  });
});

describe("the Pixoo 64, the first test device", () => {
  it("is id divoom_pixoo64 with legacy preset pixoo64, 3×5 by default, and snaps (one frame per change)", () => {
    const pixoo = DEVICE_MODELS.divoom_pixoo64;
    expect(pixoo.legacy).toEqual({ preset: "pixoo64" });
    expect(pixoo.font).toBe("3x5");
    // 10 × 16 cells clears FiestaBoard's 3 × 15 floor; 5×7 would give 8 × 10.
    expect(characterSetForModel(pixoo).id).toBe("led_3x5");
    // Hardware test, 2026-10-04: uploaded animations loop and show a
    // "LOADING…" overlay, single frames are clean — so no sequence budget,
    // and a nominal 2 fps keeps the default transition on "none".
    expect(pixoo.animation).toEqual({ delivery: "stream", maxFps: 2 });
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

describe("layoutOptions: the byte-changing layout choices a model allows", () => {
  it("every built-in LED model allows both tile gaps and both paddings and defaults to today's; split-flap models declare none", () => {
    for (const m of modelsByTechnology("led_matrix")) {
      expect(m.layoutOptions, m.id).toEqual({
        tileGap: { allowed: ["gap", "fill"], default: "gap" },
        blockPadding: { allowed: [0, 1], default: 0 },
      });
      expect(layoutPolicyForModel(m), m.id).toEqual(m.layoutOptions);
      expect(ledSpecForModel(m), m.id).toMatchObject({ tileGap: "gap", blockPadding: 0 });
    }
    for (const m of modelsByTechnology("split_flap")) expect(m.layoutOptions, m.id).toBeUndefined();
  });

  it("an undeclared field is unrestricted with the renderer's default; a declared one narrows and may move the default", () => {
    const base = DEVICE_MODELS.hub75_64x32;
    const none: DeviceModel = { ...base, layoutOptions: undefined };
    expect(layoutPolicyForModel(none)).toEqual({
      tileGap: { allowed: ["gap", "fill"], default: "gap" },
      blockPadding: { allowed: [0, 1], default: 0 },
    });
    const fillOnly: DeviceModel = { ...base, layoutOptions: { tileGap: { allowed: ["fill"] } } };
    expect(layoutPolicyForModel(fillOnly)).toEqual({
      tileGap: { allowed: ["fill"], default: "fill" }, // the renderer default is not allowed → first allowed
      blockPadding: { allowed: [0, 1], default: 0 },
    });
    const padded: DeviceModel = {
      ...base,
      layoutOptions: { blockPadding: { allowed: [0, 1], default: 1 }, tileGap: { allowed: ["fill", "gap"] } },
    };
    expect(layoutPolicyForModel(padded)).toEqual({
      tileGap: { allowed: ["fill", "gap"], default: "gap" }, // the renderer default, when allowed, whatever the order
      blockPadding: { allowed: [0, 1], default: 1 },
    });
    expect(ledSpecForModel(padded)).toEqual({ width: 64, height: 32, font: "5x7", tileGap: "gap", blockPadding: 1 });
  });

  it("ledLayoutOptionsForModel honours an allowed choice, falls back to the default for one that is not, and never throws", () => {
    const base = DEVICE_MODELS.divoom_pixoo64;
    expect(ledLayoutOptionsForModel(base)).toEqual({ tileGap: "gap", blockPadding: 0, ignored: [] });
    expect(ledLayoutOptionsForModel(base, { tileGap: "fill", blockPadding: 1 })).toEqual({
      tileGap: "fill",
      blockPadding: 1,
      ignored: [],
    });
    const gapOnly: DeviceModel = {
      ...base,
      layoutOptions: { tileGap: { allowed: ["gap"] }, blockPadding: { allowed: [1], default: 1 } },
    };
    const r = ledLayoutOptionsForModel(gapOnly, { tileGap: "fill", blockPadding: 0 });
    expect(r.tileGap).toBe("gap");
    expect(r.blockPadding).toBe(1);
    expect(r.ignored).toEqual([
      'tileGap="fill" is not a value divoom_pixoo64 allows (tileGap: "gap"); using "gap"',
      "blockPadding=0 is not a value divoom_pixoo64 allows (blockPadding: 1); using 1",
    ]);
    // An unset choice is the model's default — the same thing the spec carries.
    expect(ledLayoutOptionsForModel(gapOnly, {})).toEqual({ tileGap: "gap", blockPadding: 1, ignored: [] });
  });

  it("validateDeviceModel checks the declaration: fields, values, distinctness, default ∈ allowed, LED only", () => {
    const base = JSON.parse(JSON.stringify(DEVICE_MODELS.divoom_pixoo64));
    expect(validateDeviceModel(base).ok).toBe(true);
    expect(validateDeviceModel({ ...base, layoutOptions: {} }).ok).toBe(true);
    expect(validateDeviceModel({ ...base, layoutOptions: { tileGap: { allowed: ["fill"] } } }).ok).toBe(true);
    expect(validateDeviceModel({ ...base, layoutOptions: "fill" }).errors).toEqual(["layoutOptions: an object"]);
    expect(validateDeviceModel({ ...base, layoutOptions: { gutter: { allowed: ["fill"] } } }).errors).toEqual([
      "layoutOptions.gutter: not a field",
    ]);
    expect(validateDeviceModel({ ...base, layoutOptions: { tileGap: "fill" } }).errors).toEqual([
      "layoutOptions.tileGap: an object with allowed (and default)",
    ]);
    expect(validateDeviceModel({ ...base, layoutOptions: { tileGap: { allowed: [] } } }).errors).toEqual([
      'layoutOptions.tileGap.allowed: a non-empty list of distinct values from "gap" | "fill"',
    ]);
    expect(validateDeviceModel({ ...base, layoutOptions: { tileGap: { allowed: ["gap", "gap"] } } }).ok).toBe(false);
    expect(validateDeviceModel({ ...base, layoutOptions: { tileGap: { allowed: ["gap", "wide"] } } }).ok).toBe(false);
    expect(validateDeviceModel({ ...base, layoutOptions: { blockPadding: { allowed: [0, 2] } } }).errors).toEqual([
      "layoutOptions.blockPadding.allowed: a non-empty list of distinct values from 0 | 1",
    ]);
    expect(validateDeviceModel({ ...base, layoutOptions: { blockPadding: { allowed: ["1"] } } }).ok).toBe(false);
    expect(
      validateDeviceModel({ ...base, layoutOptions: { tileGap: { allowed: ["gap"], default: "fill" } } }).errors,
    ).toEqual(["layoutOptions.tileGap.default: one of allowed"]);
    expect(
      validateDeviceModel({ ...base, layoutOptions: { tileGap: { allowed: ["gap"], values: 1 } } }).errors,
    ).toEqual(["layoutOptions.tileGap.values: not a field"]);
    const flagship = JSON.parse(JSON.stringify(DEVICE_MODELS.vestaboard_flagship));
    expect(validateDeviceModel({ ...flagship, layoutOptions: { tileGap: { allowed: ["gap"] } } }).errors).toEqual([
      "layoutOptions: an led_matrix model's; a split-flap board has no LED layout",
    ]);
  });
});
