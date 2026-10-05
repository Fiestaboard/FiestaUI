import { describe, expect, it } from "vitest";

import {
  type CharacterSet,
  charsetFallback,
  charsetHasChar,
  charsInSet,
  iconsInSet,
  LOWERCASE_CHARS,
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
import { defaultTransitionIdForModel, resolveLedTransition, transitionsForModel } from "./led-transition-registry";
import { ledScramblePool, ledTransitionFrames, planLedTransition } from "./led-transitions";

/*
 * A device nobody here has heard of, declared the way a FiestaBoard output
 * plugin's manifest would: plain JSON. A 48×12 amber one-colour sign in the
 * 3×5 face, with a character set of its own — a subset of the face plus a
 * euro sign it carries as a bitmap (./charset-golden-cases, where the set is
 * also a golden fixture) — and a sequence API that takes at most 12 frames.
 * Everything FiestaUI does for a built-in must work for it: validate, lay
 * out, draw its glyphs, flip under its budget, list its menu.
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
    // The sign declares no layoutOptions: unrestricted, with the renderer's defaults.
    expect(ledSpecForModel(model)).toEqual({ width: 48, height: 12, font: "3x5", tileGap: "gap", blockPadding: 0 });
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

  it("flips under the plugin's 12-frame budget, in one colour, landing on the target", () => {
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
    // The default flip (14 frames) is compressed: stagger first, then scramble.
    expect(tr.frameCount).toBe(12);
    // The scramble draws only from the sign's own set, carried on the layout.
    expect(from.options.charset).toBe(charset);
    const pool = new Set(ledScramblePool(charset));
    for (let f = 1; f < 11; f++) {
      tr.layoutAt(f * 100).cells.forEach((cell, i) => {
        if (cell.glyph !== from.cells[i].glyph && cell.glyph !== to.cells[i].glyph) {
          expect(pool.has(cell.glyph), `frame ${f} cell ${i}`).toBe(true);
        }
      });
    }
    expect(tr.durationMs).toBe(11 * 100);
    const frames = ledTransitionFrames(tr);
    expect(frames).toHaveLength(12);
    expect([...frames[0].pixels]).toEqual([...tr.from.pixels]);
    expect([...frames.at(-1)!.pixels]).toEqual([...tr.to.pixels]);
    // Every frame is one colour (the sign's amber) — a 1-bit adapter's bits.
    for (const f of frames) {
      for (let i = 0; i < f.pixels.length; i += 3) {
        const lit = f.pixels[i] || f.pixels[i + 1] || f.pixels[i + 2];
        if (lit) expect([f.pixels[i], f.pixels[i + 1], f.pixels[i + 2]]).toEqual([0xff, 0xb0, 0x00]);
      }
      expect(frameToBits(f)).toHaveLength(48 * 12);
    }
    // A longer request still fits the budget exactly, and a caller's own
    // step never goes under the device's minimum frame time.
    const long = resolveLedTransition({ kind: "flip", scrambleSteps: 40, stagger: 20, stepMs: 20 }, model);
    expect(long.spec).toMatchObject({ kind: "flip", maxFrames: 12, stepMs: 100, halfFlap: false });
    expect(planLedTransition(from, to, long.spec as Exclude<typeof long.spec, "none">).frameCount).toBe(12);
  });

  it("scrambles from its own set: no lowercase, no sun, the euro included", () => {
    const pool = ledScramblePool(charset);
    expect(pool.length).toBe(charset.chars.length + 7 + charset.icons.length);
    expect(new Set(pool).size).toBe(pool.length);
    expect(pool).not.toContain(0);
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
    // A tighter budget drops the flip (it needs 8 frames) but keeps a fade.
    const tight: DeviceModel = { ...model, animation: { ...model.animation, maxFrames: 6 } };
    expect(defaultTransitionIdForModel(tight)).toBe("none");
    expect(transitionsForModel(tight).find((a) => a.id === "flip")).toMatchObject({
      available: false,
      reason: "Needs at least 8 frames; this device plays sequences of up to 6.",
    });
    expect(transitionsForModel(tight).find((a) => a.id === "fade")!.available).toBe(true);
    expect(resolveLedTransition("flip", tight)).toMatchObject({ id: "none", source: "fallback", requested: "flip" });
  });

  it("tells the pickers what to offer: its stamps, its icons, no lowercase, no text colours", () => {
    // What ColorPickerContent and DrawCharPickerContent read from the set
    // (the component-level assertions are in
    // ../components/editor/charset-pickers.test.tsx, with the same set).
    expect(iconsInSet(charset)).toEqual(["check", "up", "down"]); // registry order
    expect(charsInSet(charset, LOWERCASE_CHARS)).toEqual([]);
    expect(charset.mixedCase).toBe(false);
    expect(charset.colorSpans).toBe(false);
    expect(charset.blockSpans).toBe(true);
    expect(charset.code62Glyph).toBeUndefined();
    expect(charsetHasChar(charset, "°")).toBe(false);
    expect(charsetHasChar(charset, "♥")).toBe(false);
    expect(charsInSet(charset, ["A", "€", "a", "!", "-", "0"])).toEqual(["A", "€", "-", "0"]);
    // And LedTransitionPicker: every entry runs under the 12-frame budget,
    // flip the default; nothing to mark aria-disabled.
    const menu = transitionsForModel(model);
    expect(menu.every((a) => a.available)).toBe(true);
    expect(menu.filter((a) => a.degraded).map((a) => a.id)).toEqual([
      "flip",
      "cascade",
      "slide",
      "wipe",
      "fade",
      "dissolve",
    ]);
    expect(defaultTransitionIdForModel(model)).toBe("flip");
  });
});
