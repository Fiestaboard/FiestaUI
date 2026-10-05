import { describe, expect, it } from "vitest";

import {
  type CharacterSet,
  charsetFallback,
  materializeCharacterSet,
  validateCharacterSet,
  validateMessage,
} from "./character-sets";
import { ACME_EURO_GLYPH, ACME_SIGN_CHARSET, ACME_SIGN_MODEL } from "./charset-golden-cases";
import {
  characterSetForModel,
  type DeviceModel,
  ledSpecForModel,
  resolveDeviceModel,
  tryResolveDeviceModel,
  validateDeviceModel,
} from "./devices";
import { frameToAscii, frameToBits, layoutLedMessage, rasterizeLedLayout, renderLedGlyph } from "./led-matrix";

/*
 * A device nobody here has heard of, declared the way a FiestaBoard output
 * plugin's manifest would: plain JSON. A 48×12 amber one-colour sign in the
 * 3×5 face, with a character set of its own — a subset of the face plus a
 * euro sign it carries as a bitmap (./charset-golden-cases, where the set is
 * also a golden fixture) — and a sequence API that takes at most 12 frames.
 * Everything FiestaUI does for a built-in must work for it: validate, lay
 * out, draw its glyphs. (Its budgeted flip and its transition menu are the
 * transition layer's tests.)
 */
const ACME_MODEL_JSON: Record<string, unknown> = JSON.parse(JSON.stringify(ACME_SIGN_MODEL));

describe("a plugin-declared device, end to end", () => {
  const charset: CharacterSet = materializeCharacterSet(ACME_SIGN_CHARSET);
  const model: DeviceModel = { ...(ACME_MODEL_JSON as Omit<DeviceModel, "charset">), charset };

  it("is plain JSON that validates, and survives a round trip", () => {
    expect(validateCharacterSet(ACME_SIGN_CHARSET)).toEqual({ ok: true, errors: [] });
    expect(validateDeviceModel(ACME_MODEL_JSON)).toEqual({ ok: true, errors: [] });
    expect(validateDeviceModel(JSON.parse(JSON.stringify(model)))).toEqual({ ok: true, errors: [] });
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);
    // Inheritance from the built-in it extends: the face, the tiles flag.
    expect(charset.font).toBe("3x5");
    expect(charset.tiles).toBe(true);
    expect(charset.chars).toContain("€");
    expect(charset.chars).not.toContain("a");
    expect(charset.icons).toEqual(["up", "down", "check"]);
    expect(charset.version).toBe(1);
  });

  it("rejects bad declarations with reasons, not a silent Flagship", () => {
    expect(validateCharacterSet({ ...ACME_SIGN_CHARSET, font: "3x5", glyphs: { "€": ["###"] } }).errors).toEqual([
      "glyphs.€: 5 rows of 3 '#'/'.' characters",
    ]);
    expect(() => materializeCharacterSet({ ...ACME_SIGN_CHARSET, glyphs: { "€": ["###"] } })).toThrow(/5 rows/);
    expect(validateCharacterSet({ ...ACME_SIGN_CHARSET, icons: ["unicorn"] }).ok).toBe(false);
    expect(
      validateDeviceModel({ ...ACME_MODEL_JSON, color: { kind: "monochrome", color: "amber", bitDepth: 1 } }).errors,
    ).toEqual(["color.color: #rrggbb"]);
    expect(validateDeviceModel({ ...ACME_MODEL_JSON, charset: "acme_sign_v1" }).errors[0]).toMatch(
      /^charset: a built-in set id/,
    );
    expect(validateDeviceModel({ ...ACME_MODEL_JSON, geometry: { kind: "cells", rows: 2, cols: 12 } }).errors).toEqual([
      "geometry.kind: an led_matrix model is measured in pixels",
    ]);
    expect(validateDeviceModel({ ...ACME_MODEL_JSON, pixelShape: "round" }).errors).toEqual([
      "pixelShape: not a device model field",
    ]);
    expect(() => materializeCharacterSet({ id: "x", extends: "nope" })).toThrow(/extends unknown set "nope"/);
    expect(() => resolveDeviceModel("acme_sign_48x12")).toThrow(/Unknown device model "acme_sign_48x12"/);
    expect(tryResolveDeviceModel("acme_sign_48x12").error).toMatch(/must be passed as an object/);
    expect(tryResolveDeviceModel(model).model).toBe(model);
  });

  it("lays a message out with the plugin's own glyph and its fallbacks", () => {
    expect(ledSpecForModel(model)).toEqual({ width: 48, height: 12, font: "3x5" });
    expect(characterSetForModel(model)).toBe(charset);
    const layout = layoutLedMessage("€12 {icon:up}", ledSpecForModel(model)!, { monochrome: "#ffb000", charset });
    expect(layout.grid).toMatchObject({ rows: 2, cols: 12 });
    expect(layout.text).toBe("€12 up");
    const frame = rasterizeLedLayout(layout);
    const ascii = frameToAscii(frame);
    // The euro's own bitmap, top-left.
    expect(
      ascii
        .split("\n")
        .slice(0, 5)
        .map((r) => r.slice(0, 3)),
    ).toEqual(ACME_EURO_GLYPH);
    // Every lit pixel is the sign's amber — a 1-bit adapter's bits.
    for (let i = 0; i < frame.pixels.length; i += 3) {
      const lit = frame.pixels[i] || frame.pixels[i + 1] || frame.pixels[i + 2];
      if (lit) expect([frame.pixels[i], frame.pixels[i + 1], frame.pixels[i + 2]]).toEqual([0xff, 0xb0, 0x00]);
    }
    expect(frameToBits(frame)).toHaveLength(48 * 12);
    // The glyph on its own, for a picker.
    expect(frameToAscii(renderLedGlyph({ type: "char", value: "€" }, "3x5", { charset })).split("\n")).toEqual(
      ACME_EURO_GLYPH,
    );
    // Without the set, the face has no euro: blank.
    expect(frameToAscii(renderLedGlyph({ type: "char", value: "€" }, "3x5"))).not.toContain("#");
  });

  it("validates a message against the set and names what the sign draws instead", () => {
    const v = validateMessage("hi {red:€} {icon:sun}", charset);
    expect(v.issues.map((i) => i.reason)).toEqual(["case", "case", "colorSpan", "icon"]);
    expect(v.issues.map((i) => i.fallback)).toEqual([
      { type: "char", value: "H" },
      { type: "char", value: "I" },
      { type: "char", value: "€" },
      { type: "color", code: "65" },
    ]);
    // Blocks it has, colour spans it lacks: the block survives, the colour goes.
    expect(charsetFallback(charset, { type: "char", value: "A", color: "red", background: "white" })).toEqual({
      type: "char",
      value: "A",
      background: "white",
    });
  });
});
