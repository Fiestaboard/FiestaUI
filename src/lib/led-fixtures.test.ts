import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { parseLine } from "./board-characters";
import { BOARD_ICON_ALIASES, BOARD_ICONS } from "./board-icons";
import {
  CHARACTER_SET_IDS,
  CHARACTER_SETS,
  charsetFallback,
  charsetIssue,
  materializeCharacterSet,
  validateMessage,
} from "./character-sets";
import {
  GOLDEN_FALLBACK_CASES,
  GOLDEN_MESSAGE_CASES,
  GOLDEN_PLUGIN_CHARSETS,
  goldenCharacterSet,
} from "./charset-golden-cases";
import { DEVICE_MODEL_IDS, DEVICE_MODELS } from "./devices";
import { LED_FONTS } from "./led-fonts";
import { GOLDEN_LAYOUT_CASES } from "./led-golden-cases";
import { layoutLedMessage, rasterizeLedLayout } from "./led-matrix";

/*
 * The data contract FiestaBoard's Python port and its output plugins are
 * checked against lives in scripts/ci/tests/fixtures/. These tests fail
 * when the code drifts from the fixtures; `node scripts/ci/led-fixtures.mjs`
 * regenerates them on purpose.
 */

const read = (path: string) => JSON.parse(readFileSync(resolve(__dirname, "../..", path), "utf8"));
const fixture = (name: string) => read(`scripts/ci/tests/fixtures/${name}`);
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const b64 = (pixels: Uint8ClampedArray) => Buffer.from(pixels).toString("base64");

describe("board data fixtures", () => {
  it("board-icons.json carries the registry and its aliases", () => {
    expect(fixture("board-icons.json")).toEqual(json({ icons: BOARD_ICONS, aliases: BOARD_ICON_ALIASES }));
  });
});

describe("LED data fixtures", () => {
  it("led-fonts.json carries both faces, every glyph and icon", () => {
    const f = fixture("led-fonts.json");
    expect(Object.keys(f)).toEqual(Object.keys(LED_FONTS));
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

  it("character-sets.json carries the built-ins", () => {
    const f = fixture("character-sets.json");
    expect(Object.keys(f)).toEqual(CHARACTER_SET_IDS);
    for (const id of CHARACTER_SET_IDS) expect(f[id], id).toEqual(json(CHARACTER_SETS[id]));
  });

  it("device-models.json carries the built-ins plus the research prose the runtime leaves out", () => {
    const f = fixture("device-models.json");
    const notes = read("scripts/ci/device-model-notes.json").models;
    expect(Object.keys(f)).toEqual(DEVICE_MODEL_IDS);
    expect(Object.keys(notes)).toEqual(DEVICE_MODEL_IDS);
    for (const id of DEVICE_MODEL_IDS) {
      const { notes: n, sources, ...animation } = f[id].animation;
      expect({ ...f[id], animation }, id).toEqual(json(DEVICE_MODELS[id]));
      expect({ notes: n, sources }, id).toEqual(notes[id]);
      expect(n, id).not.toBe("");
    }
    expect(f.divoom_pixoo64.animation.notes).toMatch(/LOADING/);
    expect(f.divoom_pixoo64.animation.notes).toMatch(/SNAPS/);
    expect(f.divoom_pixoo64.animation.sources[0]).toMatch(/hardware test on a Pixoo 64/);
    expect(f.ulanzi_tc001_awtrix.animation.notes).toMatch(/UNMEASURED/);
  });
});

describe("LED golden cases", () => {
  const golden = fixture("led-golden.json");

  it("lists every layout case once, and no transition cases yet", () => {
    expect(golden.layouts.map((c: { name: string }) => c.name)).toEqual(GOLDEN_LAYOUT_CASES.map((c) => c.name));
    expect(new Set(golden.layouts.map((c: { name: string }) => c.name)).size).toBe(GOLDEN_LAYOUT_CASES.length);
    expect(golden.transitions).toEqual([]);
  });

  it.each(GOLDEN_LAYOUT_CASES.map((c) => [c.name, c] as const))("layout: %s", (name, c) => {
    const expected = golden.layouts.find((g: { name: string }) => g.name === name);
    expect(json(c)).toEqual({
      name: expected.name,
      message: expected.message,
      spec: expected.spec,
      ...(expected.options ? { options: expected.options } : {}),
      ...(expected.charset ? { charset: expected.charset } : {}),
    });
    const charset = c.charset ? materializeCharacterSet(c.charset) : undefined;
    const layout = layoutLedMessage(c.message, c.spec, { ...c.options, charset });
    const frame = rasterizeLedLayout(layout);
    expect(layout.text).toBe(expected.text);
    expect({ width: frame.width, height: frame.height, frame: b64(frame.pixels) }).toEqual({
      width: expected.width,
      height: expected.height,
      frame: expected.frame,
    });
  });
});

describe("charset golden cases", () => {
  const golden = fixture("charset-golden.json");
  const EXT = { extendedMarkup: true, preserveCase: true };

  it("materialises every plugin set exactly as declared: over a built-in with its own glyphs, one overriding the face's, one inheriting all but version", () => {
    expect(golden.sets.map((s: { input: { id: string } }) => s.input.id)).toEqual(
      GOLDEN_PLUGIN_CHARSETS.map((s) => s.id),
    );
    for (const input of GOLDEN_PLUGIN_CHARSETS) {
      const entry = golden.sets.find((s: { input: { id: string } }) => s.input.id === input.id);
      expect(entry.input, input.id).toEqual(json(input));
      expect(entry.materialized, input.id).toEqual(json(materializeCharacterSet(input)));
    }
    const acme = golden.sets.find((s: { input: { id: string } }) => s.input.id === "acme_sign_v1");
    expect(acme.input.extends).toBe("led_3x5");
    expect(acme.input.glyphs["€"]).toHaveLength(5);
    expect(acme.materialized).toMatchObject({ font: "3x5", tiles: true, version: 1, glyphs: acme.input.glyphs });
    // A set's bitmap for a character the face also has: the set's wins.
    const acme2 = golden.sets.find((s: { input: { id: string } }) => s.input.id === "acme_sign_v2");
    expect(acme2.input.glyphs["0"]).toHaveLength(5);
    expect(acme2.input.glyphs["0"]).not.toEqual(LED_FONTS["3x5"].glyphs["0"]);
    expect(acme2.materialized).toMatchObject({
      version: 2,
      glyphs: { "€": acme.input.glyphs["€"], "0": acme2.input.glyphs["0"] },
    });
    // `version` is never inherited: the parent is version 2, the child says
    // nothing, the child is version 1 — everything else is the parent's.
    const lobby = golden.sets.find((s: { input: { id: string } }) => s.input.id === "lobby_flap");
    expect(lobby.input).toEqual({ id: "lobby_flap", label: "Lobby flap board", extends: "vestaboard_v2" });
    expect(CHARACTER_SETS.vestaboard_v2.version).toBe(2);
    expect(lobby.materialized).toEqual({
      ...json(CHARACTER_SETS.vestaboard_v2),
      id: "lobby_flap",
      label: "Lobby flap board",
      extends: "vestaboard_v2",
      version: 1,
    });
  });

  it("lists every fallback and message case once", () => {
    expect(golden.fallbacks.map((c: { name: string }) => c.name)).toEqual(GOLDEN_FALLBACK_CASES.map((c) => c.name));
    expect(new Set(golden.fallbacks.map((c: { name: string }) => c.name)).size).toBe(GOLDEN_FALLBACK_CASES.length);
    expect(golden.messages.map((c: { name: string }) => c.name)).toEqual(GOLDEN_MESSAGE_CASES.map((c) => c.name));
  });

  it.each(GOLDEN_FALLBACK_CASES.map((c) => [c.name, c] as const))("fallback: %s", (name, c) => {
    const expected = golden.fallbacks.find((g: { name: string }) => g.name === name);
    const tokens = parseLine(c.markup, Infinity, EXT);
    expect(tokens).toHaveLength(1);
    const set = goldenCharacterSet(c.set);
    expect(
      json({ ...c, token: tokens[0], issue: charsetIssue(set, tokens[0]), fallback: charsetFallback(set, tokens[0]) }),
    ).toEqual(expected);
  });

  it.each(GOLDEN_MESSAGE_CASES.map((c) => [c.name, c] as const))("message: %s", (name, c) => {
    const expected = golden.messages.find((g: { name: string }) => g.name === name);
    expect(json({ ...c, ...validateMessage(c.message, goldenCharacterSet(c.set)) })).toEqual(expected);
  });

  it("covers every charsetFallback branch", () => {
    const outcomes = golden.fallbacks.map((c: { issue: string | null; fallback: { type: string; value?: string } }) =>
      c.issue === null ? "same" : `${c.issue}→${c.fallback.type}${c.fallback.value === " " ? ":blank" : ""}`,
    );
    for (const o of [
      "same",
      "case→char",
      "colorSpan→char",
      "blockSpan→char",
      "char→char",
      "char→char:blank",
      "icon→color",
      "icon→char",
      "icon→char:blank",
      "tile→char:blank",
    ]) {
      expect(outcomes, o).toContain(o);
    }
  });
});
