import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { BOARD_ICON_ALIASES, BOARD_ICONS } from "./board-icons";
import { DEVICE_MODELS } from "./devices";
import { LED_FONTS } from "./led-fonts";
import { GOLDEN_LAYOUT_CASES, GOLDEN_TRANSITION_CASES } from "./led-golden-cases";
import { layoutLedMessage, rasterizeLedLayout } from "./led-matrix";
import { resolveLedTransition } from "./led-transition-registry";
import { ledTransitionFrames, planLedTransition } from "./led-transitions";

/*
 * The data contract FiestaBoard's Python port and its output plugins are
 * checked against lives in scripts/ci/tests/fixtures/. These tests fail
 * when the code drifts from the fixtures; `node scripts/ci/led-fixtures.mjs`
 * regenerates them on purpose.
 */

const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../scripts/ci/tests/fixtures", name), "utf8"));
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const b64 = (pixels: Uint8ClampedArray) => Buffer.from(pixels).toString("base64");

describe("LED data fixtures", () => {
  it("led-fonts.json carries both faces, every glyph and icon", () => {
    const f = fixture("led-fonts.json");
    for (const [id, font] of Object.entries(LED_FONTS)) {
      expect(f[id], id).toEqual(
        json({
          glyphWidth: font.glyphWidth,
          glyphHeight: font.glyphHeight,
          spacingX: font.spacingX,
          spacingY: font.spacingY,
          glyphs: font.glyphs,
          icons: font.icons,
        }),
      );
    }
  });

  it("board-icons.json carries the registry and its aliases", () => {
    expect(fixture("board-icons.json")).toEqual(json({ icons: BOARD_ICONS, aliases: BOARD_ICON_ALIASES }));
  });
});

describe("LED golden cases", () => {
  const golden = fixture("led-golden.json");

  it("lists every case once", () => {
    expect(golden.layouts.map((c: { name: string }) => c.name)).toEqual(GOLDEN_LAYOUT_CASES.map((c) => c.name));
    expect(golden.transitions.map((c: { name: string }) => c.name)).toEqual(GOLDEN_TRANSITION_CASES.map((c) => c.name));
  });

  it.each(GOLDEN_LAYOUT_CASES.map((c) => [c.name, c] as const))("layout: %s", (name, c) => {
    const expected = golden.layouts.find((g: { name: string }) => g.name === name);
    const layout = layoutLedMessage(c.message, c.spec, c.options ?? {});
    const frame = rasterizeLedLayout(layout);
    expect(layout.text).toBe(expected.text);
    expect({ width: frame.width, height: frame.height, frame: b64(frame.pixels) }).toEqual({
      width: expected.width,
      height: expected.height,
      frame: expected.frame,
    });
  });

  it.each(GOLDEN_TRANSITION_CASES.map((c) => [c.name, c] as const))("transition: %s", (name, c) => {
    const expected = golden.transitions.find((g: { name: string }) => g.name === name);
    const spec = c.model ? resolveLedTransition(c.transition, DEVICE_MODELS[c.model]).spec : c.transition;
    expect(json(spec)).toEqual(expected.resolvedSpec);
    const from = layoutLedMessage(c.from, c.spec, c.options ?? {});
    const to = layoutLedMessage(c.to, c.spec, c.options ?? {});
    const tr = planLedTransition(from, to, spec as Exclude<typeof spec, "none">);
    expect({ durationMs: tr.durationMs, frameCount: tr.frameCount }).toEqual({
      durationMs: expected.durationMs,
      frameCount: expected.frameCount,
    });
    expect(ledTransitionFrames(tr, c.fps ?? 30).map((f) => b64(f.pixels))).toEqual(expected.frames);
  });

  it("the Pixoo case is exactly 32 frames and lands on the final one", () => {
    const c = golden.transitions.find((g: { name: string }) => g.name === "pixoo 32-frame budget");
    expect(c.frameCount).toBe(32);
    expect(c.frames).toHaveLength(32);
    const to = rasterizeLedLayout(layoutLedMessage("61° RAIN\n{63} AQI 90", { width: 32, height: 16, font: "3x5" }));
    expect(c.frames.at(-1)).toBe(b64(to.pixels));
  });
});
