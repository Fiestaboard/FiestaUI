import { describe, expect, it } from "vitest";

import {
  type CharacterSet,
  type CharacterSetInput,
  materializeCharacterSet,
  validateCharacterSet,
  validateMessage,
} from "./character-sets";
import {
  characterSetForModel,
  type DeviceModel,
  ledSpecForModel,
  resolveDeviceModel,
  tryResolveDeviceModel,
  validateDeviceModel,
} from "./devices";
import { frameToAscii, frameToBits, layoutLedMessage, rasterizeLedLayout, renderLedGlyph } from "./led-matrix";
import { defaultTransitionIdForModel, resolveLedTransition, transitionsForModel } from "./led-transition-registry";
import { ledScramblePool, ledTransitionFrames, planLedTransition } from "./led-transitions";

/*
 * A device nobody here has heard of, declared the way a FiestaBoard output
 * plugin's manifest would: plain JSON. A 48×12 amber one-colour sign in the
 * 3×5 face, with a character set of its own — a subset of the face plus a
 * euro sign it carries as a bitmap — and a sequence API that takes at most
 * 12 frames. Everything FiestaUI does for a built-in must work for it:
 * validate, lay out, flip under its budget, list its menu, draw its glyphs.
 */
const EURO = [".##", "##.", "#..", "##.", ".##"];
const ACME_CHARSET_JSON: CharacterSetInput = {
  id: "acme_sign_v1",
  label: "ACME sign",
  extends: "led_3x5",
  chars: [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -:.€".replace(" ", "")],
  icons: ["up", "down", "check"],
  mixedCase: false,
  colorSpans: false,
  blockSpans: true,
  glyphs: { "€": EURO },
};

const ACME_MODEL_JSON = {
  id: "acme_sign_48x12",
  label: "ACME amber sign 48×12",
  technology: "led_matrix",
  family: "acme_serial",
  geometry: { kind: "pixels", width: 48, height: 12 },
  color: { kind: "monochrome", color: "#ffb000", bitDepth: 1 },
  charset: ACME_CHARSET_JSON,
  animation: {
    delivery: "sequence",
    maxFps: 10,
    maxFrames: 12,
    minFrameMs: 100,
    notes: "12-frame GIF over serial",
    sources: [],
  },
  font: "3x5",
  pixelShape: "round",
};

describe("a plugin-declared device, end to end", () => {
  const charset: CharacterSet = materializeCharacterSet(ACME_CHARSET_JSON);
  const model: DeviceModel = { ...(ACME_MODEL_JSON as Omit<DeviceModel, "charset">), charset };

  it("is plain JSON that validates, and survives a round trip", () => {
    expect(validateCharacterSet(ACME_CHARSET_JSON)).toEqual({ ok: true, errors: [] });
    expect(validateDeviceModel(ACME_MODEL_JSON)).toEqual({ ok: true, errors: [] });
    expect(JSON.parse(JSON.stringify(model))).toEqual(model);
    // Inheritance from the built-in it extends: the face, the tiles flag.
    expect(charset.font).toBe("3x5");
    expect(charset.tiles).toBe(true);
    expect(charset.chars).toContain("€");
    expect(charset.chars).not.toContain("a");
    expect(charset.icons).toEqual(["up", "down", "check"]);
  });

  it("rejects bad declarations with reasons, not a silent Flagship", () => {
    expect(validateCharacterSet({ ...ACME_CHARSET_JSON, font: "3x5", glyphs: { "€": ["###"] } }).errors).toEqual([
      "glyphs.€: 5 rows of 3 '#'/'.' characters",
    ]);
    expect(() => materializeCharacterSet({ ...ACME_CHARSET_JSON, glyphs: { "€": ["###"] } })).toThrow(/5 rows/);
    expect(validateCharacterSet({ ...ACME_CHARSET_JSON, icons: ["unicorn"] }).ok).toBe(false);
    expect(
      validateDeviceModel({ ...ACME_MODEL_JSON, color: { kind: "monochrome", color: "amber", bitDepth: 1 } }).errors,
    ).toEqual(["color.color: #rrggbb"]);
    expect(validateDeviceModel({ ...ACME_MODEL_JSON, charset: "acme_sign_v1" }).errors[0]).toMatch(
      /^charset: a built-in set id/,
    );
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
    const ascii = frameToAscii(rasterizeLedLayout(layout));
    // The euro's own bitmap, top-left.
    expect(
      ascii
        .split("\n")
        .slice(0, 5)
        .map((r) => r.slice(0, 3)),
    ).toEqual(EURO);
    // The glyph on its own, for a picker.
    expect(frameToAscii(renderLedGlyph({ type: "char", value: "€" }, "3x5", { charset })).split("\n")).toEqual(EURO);
    // Validation against the set warns about what the sign cannot draw.
    const v = validateMessage("hi {red:€} {icon:sun}", charset);
    expect(v.issues.map((i) => i.reason)).toEqual(["case", "case", "colorSpan", "icon"]);
  });

  it("flips under the plugin's 12-frame budget, scrambling only its own characters, landing on the target", () => {
    const spec = ledSpecForModel(model)!;
    const from = layoutLedMessage("€12", spec, { monochrome: "#ffb000", charset });
    const to = layoutLedMessage("€99", spec, { monochrome: "#ffb000", charset });
    const resolved = resolveLedTransition(undefined, model);
    expect(resolved).toMatchObject({
      id: "flip",
      source: "default",
      spec: { kind: "flip", maxFrames: 12, halfFlap: false, stepMs: 100 },
    });
    const tr = planLedTransition(from, to, resolved.spec as Exclude<typeof resolved.spec, "none">);
    expect(tr.frameCount).toBeLessThanOrEqual(12);
    const frames = ledTransitionFrames(tr);
    expect(frames).toHaveLength(tr.frameCount!);
    expect([...frames.at(-1)!.pixels]).toEqual([...tr.to.pixels]);
    // Every frame is one colour (the sign's amber) — a 1-bit adapter's bits.
    for (const f of frames) {
      for (let i = 0; i < f.pixels.length; i += 3) {
        const lit = f.pixels[i] || f.pixels[i + 1] || f.pixels[i + 2];
        if (lit) expect([f.pixels[i], f.pixels[i + 1], f.pixels[i + 2]]).toEqual([0xff, 0xb0, 0x00]);
      }
      expect(frameToBits(f)).toHaveLength(48 * 12);
    }
    // The scramble pool is the plugin's set: no lowercase, no sun, euro included.
    const pool = ledScramblePool(charset);
    expect(pool.length).toBe(charset.chars.length + 7 + charset.icons.length);
  });

  it("lists the menu for it, with the budget on every entry", () => {
    expect(defaultTransitionIdForModel(model)).toBe("flip");
    const menu = transitionsForModel(model);
    expect(menu.find((a) => a.id === "none")!.available).toBe(true);
    expect(menu.find((a) => a.id === "flip")).toMatchObject({
      available: true,
      degraded: true,
      reason: "Compressed to 12 frames: one frame per step, no half-flaps",
    });
    expect(
      menu.filter((a) => a.id !== "none").every((a) => a.available && a.spec !== "none" && a.spec?.maxFrames === 12),
    ).toBe(true);
    expect(resolveLedTransition("slide", model)).toMatchObject({
      id: "slide",
      source: "explicit",
      spec: { kind: "slide", maxFrames: 12 },
    });
  });
});
