import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv from "ajv";
import { describe, expect, it } from "vitest";

import { CHARACTER_SET_IDS, CHARACTER_SETS, materializeCharacterSet, validateCharacterSet } from "./character-sets";
import { ACME_SIGN_CHARSET, ACME_SIGN_MODEL, GOLDEN_PLUGIN_CHARSETS } from "./charset-golden-cases";
import { DEVICE_MODEL_IDS, DEVICE_MODELS, validateDeviceModel } from "./devices";
import {
  FIESTAPANEL_LED_MATRIX_MODEL,
  FIESTAPANEL_SPLIT_FLAP_MODEL,
  PLUGIN_MODEL_FIXTURES,
} from "./plugin-model-fixtures";

/*
 * The two JSON Schemas are what FiestaBoard and its output plugins validate
 * `device_models` / `character_set` data against, with python-jsonschema.
 * Ajv (Draft 7, strict) stands in for it here. The schemas are registered by
 * `$id` ONLY — never by filename — so a `$ref` that a standards-compliant
 * resolver cannot follow fails here too, instead of being papered over by a
 * filename lookup (scripts/ci/tests/schema-refs.test.mjs checks the same
 * thing statically).
 */

const fixture = (name: string) =>
  JSON.parse(readFileSync(resolve(__dirname, "../../scripts/ci/tests/fixtures", name), "utf8"));
const json = <T>(v: T): T => JSON.parse(JSON.stringify(v));

const deviceSchema = fixture("device-model.schema.json");
const charsetSchema = fixture("character-set.schema.json");
const ajv = new Ajv({ strict: true, allErrors: true });
ajv.addSchema(charsetSchema);
ajv.addSchema(deviceSchema);
const validDevice = ajv.getSchema(deviceSchema.$id)!;
const validCharset = ajv.getSchema(charsetSchema.$id)!;
const schemaErrors = (v: typeof validDevice) =>
  (v.errors ?? []).map((e) => `${e.instancePath} ${e.message}`).join("; ");

describe("the schemas", () => {
  it("compile under strict Draft 7 and resolve device-model's $ref to character-set by $id", () => {
    expect(deviceSchema.$id).toBe("https://fiestaboard.app/schemas/device-model.schema.json");
    expect(charsetSchema.$id).toBe("https://fiestaboard.app/schemas/character-set.schema.json");
    expect(validDevice).toBeDefined();
    expect(validCharset).toBeDefined();
    // An embedded charset is checked through the $ref: a broken one fails the model.
    expect(validDevice({ ...json(ACME_SIGN_MODEL), charset: { ...json(ACME_SIGN_CHARSET), icons: ["unicorn"] } })).toBe(
      false,
    );
  });

  it("accept every fixture data file", () => {
    const sets = fixture("character-sets.json");
    for (const id of CHARACTER_SET_IDS)
      expect(validCharset(sets[id]), `${id}: ${schemaErrors(validCharset)}`).toBe(true);
    const models = fixture("device-models.json");
    for (const id of DEVICE_MODEL_IDS)
      expect(validDevice(models[id]), `${id}: ${schemaErrors(validDevice)}`).toBe(true);
    const golden = fixture("charset-golden.json");
    for (const { input, materialized } of golden.sets) {
      expect(validCharset(input), `${input.id} input: ${schemaErrors(validCharset)}`).toBe(true);
      expect(validCharset(materialized), `${input.id} materialized: ${schemaErrors(validCharset)}`).toBe(true);
    }
  });

  it("accept a plugin-declared 48×12 amber sign with its own € glyph, and its partial set over a built-in", () => {
    expect(validDevice(json(ACME_SIGN_MODEL)), schemaErrors(validDevice)).toBe(true);
    for (const set of GOLDEN_PLUGIN_CHARSETS)
      expect(validCharset(json(set)), `${set.id}: ${schemaErrors(validCharset)}`).toBe(true);
  });

  it("accept FiestaBoard's two FiestaPanel declarations, one per render style, and plugin-models.json carries them", () => {
    expect(validDevice(json(FIESTAPANEL_SPLIT_FLAP_MODEL)), schemaErrors(validDevice)).toBe(true);
    expect(validDevice(json(FIESTAPANEL_LED_MATRIX_MODEL)), schemaErrors(validDevice)).toBe(true);
    expect(validateDeviceModel(json(FIESTAPANEL_SPLIT_FLAP_MODEL))).toEqual({ ok: true, errors: [] });
    expect(validateDeviceModel(json(FIESTAPANEL_LED_MATRIX_MODEL))).toEqual({ ok: true, errors: [] });
    const models = fixture("plugin-models.json").models;
    expect(models).toEqual(json(PLUGIN_MODEL_FIXTURES));
    for (const m of models) expect(validDevice(m), `${m.id}: ${schemaErrors(validDevice)}`).toBe(true);
  });
});

/*
 * The hand-written validators and the schemas are two definitions of one
 * contract. This table pins them together: for every document both must
 * give the same verdict, so neither can drift without the other.
 */
const pixoo = () => json(DEVICE_MODELS.divoom_pixoo64);
const flagship = () => json(DEVICE_MODELS.vestaboard_flagship);
const led5x7 = () => json(CHARACTER_SETS.led_5x7);
const v1 = () => json(CHARACTER_SETS.vestaboard_v1);

const DEVICE_TABLE: Array<[string, boolean, () => unknown]> = [
  ["a built-in LED model", true, pixoo],
  ["a built-in split-flap model with charsetByCode62", true, flagship],
  ["the plugin sign with an embedded partial set", true, () => json(ACME_SIGN_MODEL)],
  ["an embedded full set", true, () => ({ ...pixoo(), charset: led5x7() })],
  [
    "no appearance, no legacy, no font",
    true,
    () => {
      const m = pixoo();
      delete m.appearance;
      delete m.legacy;
      delete m.font;
      return m;
    },
  ],
  ["animation without notes or sources", true, () => ({ ...pixoo(), animation: { delivery: "stream", maxFps: 30 } })],
  [
    "monochrome 8-bit colour",
    true,
    () => ({ ...pixoo(), color: { kind: "monochrome", color: "#FFB000", bitDepth: 8 } }),
  ],
  [
    "appearance with every field",
    true,
    () => ({
      ...flagship(),
      appearance: {
        pixelShape: "round",
        dotRatio: 1,
        offColor: "#000000",
        substrateColor: "#111111",
        bezel: "#222222",
        boardColors: ["black"],
        options: { board_color: ["black"] },
      },
    }),
  ],
  ["not an object", false, () => "divoom_pixoo64"],
  ["an unknown top-level field", false, () => ({ ...pixoo(), pixelShape: "square" })],
  [
    "an embedded partial set with an unknown field",
    false,
    () => ({ ...json(ACME_SIGN_MODEL), charset: { ...json(ACME_SIGN_CHARSET), colour: true } }),
  ],
  ["an uppercase id", false, () => ({ ...pixoo(), id: "Pixoo64" })],
  ["an empty label", false, () => ({ ...pixoo(), label: "" })],
  ["an unknown technology", false, () => ({ ...pixoo(), technology: "eink" })],
  ["an empty family", false, () => ({ ...pixoo(), family: "" })],
  ["an LED model measured in cells", false, () => ({ ...pixoo(), geometry: { kind: "cells", rows: 2, cols: 10 } })],
  [
    "pixels geometry with a zero width",
    false,
    () => ({ ...pixoo(), geometry: { kind: "pixels", width: 0, height: 64 } }),
  ],
  [
    "pixels geometry with a fractional height",
    false,
    () => ({ ...pixoo(), geometry: { kind: "pixels", width: 64, height: 6.5 } }),
  ],
  ["cells geometry without cols", false, () => ({ ...flagship(), geometry: { kind: "cells", rows: 6 } })],
  ["a panel with no declared size", true, () => ({ ...flagship(), geometry: { kind: "panel" } })],
  ["a panel with a declared size", true, () => ({ ...flagship(), geometry: { kind: "panel", rows: 12, cols: 29 } })],
  ["a panel with a zero-row size", false, () => ({ ...flagship(), geometry: { kind: "panel", rows: 0, cols: 29 } })],
  [
    "a panel with a fractional width",
    false,
    () => ({ ...flagship(), geometry: { kind: "panel", rows: 12, cols: 29.5 } }),
  ],
  ["an unknown geometry kind", false, () => ({ ...flagship(), geometry: { kind: "hex" } })],
  ["rgb with the wrong bit depth", false, () => ({ ...pixoo(), color: { kind: "rgb", bitDepth: 16 } })],
  [
    "monochrome with a named colour",
    false,
    () => ({ ...pixoo(), color: { kind: "monochrome", color: "amber", bitDepth: 1 } }),
  ],
  [
    "monochrome with a 4-bit depth",
    false,
    () => ({ ...pixoo(), color: { kind: "monochrome", color: "#ffb000", bitDepth: 4 } }),
  ],
  ["an unknown colour kind", false, () => ({ ...pixoo(), color: { kind: "cmyk" } })],
  ["a charset id that is not built in", false, () => ({ ...pixoo(), charset: "acme_sign_v1" })],
  ["an embedded set that is broken", false, () => ({ ...pixoo(), charset: { ...led5x7(), version: 0 } })],
  ["charsetByCode62 missing a glyph", false, () => ({ ...flagship(), charsetByCode62: { degree: "vestaboard_v1" } })],
  [
    "charsetByCode62 with a stranger",
    false,
    () => ({ ...flagship(), charsetByCode62: { degree: "vestaboard_v1", heart: "nope" } }),
  ],
  ["an unknown delivery", false, () => ({ ...pixoo(), animation: { delivery: "push", maxFps: 1 } })],
  ["a negative maxFps", false, () => ({ ...pixoo(), animation: { delivery: "stream", maxFps: -1 } })],
  ["maxFrames of zero", false, () => ({ ...pixoo(), animation: { delivery: "sequence", maxFps: 1, maxFrames: 0 } })],
  ["minFrameMs of zero", false, () => ({ ...pixoo(), animation: { delivery: "sequence", maxFps: 1, minFrameMs: 0 } })],
  [
    "notes that are not a string",
    false,
    () => ({ ...pixoo(), animation: { delivery: "stream", maxFps: 1, notes: 5 } }),
  ],
  [
    "sources that are not strings",
    false,
    () => ({ ...pixoo(), animation: { delivery: "stream", maxFps: 1, sources: [1] } }),
  ],
  ["an unknown font", false, () => ({ ...pixoo(), font: "8x8" })],
  ["a split-flap model with a known font", true, () => ({ ...flagship(), font: "3x5" })],
  ["a split-flap model with an unknown font", false, () => ({ ...flagship(), font: "8x8" })],
  ["an unknown appearance field", false, () => ({ ...pixoo(), appearance: { shape: "round" } })],
  ["an unknown pixel shape", false, () => ({ ...pixoo(), appearance: { pixelShape: "hex" } })],
  ["a dot ratio above 1", false, () => ({ ...pixoo(), appearance: { dotRatio: 1.2 } })],
  ["a dot ratio of 0", false, () => ({ ...pixoo(), appearance: { dotRatio: 0 } })],
  ["a named off colour", false, () => ({ ...pixoo(), appearance: { offColor: "grey" } })],
  ["a short bezel colour", false, () => ({ ...pixoo(), appearance: { bezel: "#123" } })],
  ["board colours that are not strings", false, () => ({ ...flagship(), appearance: { boardColors: [1] } })],
  [
    "options whose values are not lists",
    false,
    () => ({ ...flagship(), appearance: { options: { board_color: "black" } } }),
  ],
  ["an unknown legacy device type", false, () => ({ ...flagship(), legacy: { deviceType: "mini" } })],
  ["a non-string legacy preset", false, () => ({ ...pixoo(), legacy: { preset: 64 } })],
  ["the built-in layoutOptions (both gaps, both paddings, today's defaults)", true, pixoo],
  [
    "an LED model with no layoutOptions",
    true,
    () => {
      const m = pixoo();
      delete m.layoutOptions;
      return m;
    },
  ],
  [
    "layoutOptions declaring one field only",
    true,
    () => ({ ...pixoo(), layoutOptions: { tileGap: { allowed: ["fill"] } } }),
  ],
  ["an empty layoutOptions", true, () => ({ ...pixoo(), layoutOptions: {} })],
  [
    "a split-flap model with layoutOptions",
    false,
    () => ({ ...flagship(), layoutOptions: { tileGap: { allowed: ["gap"] } } }),
  ],
  ["layoutOptions that is not an object", false, () => ({ ...pixoo(), layoutOptions: "fill" })],
  ["an unknown layoutOptions field", false, () => ({ ...pixoo(), layoutOptions: { gutter: { allowed: ["fill"] } } })],
  ["a tileGap choice that is not an object", false, () => ({ ...pixoo(), layoutOptions: { tileGap: "fill" } })],
  ["a tileGap choice without allowed", false, () => ({ ...pixoo(), layoutOptions: { tileGap: { default: "fill" } } })],
  ["an empty tileGap.allowed", false, () => ({ ...pixoo(), layoutOptions: { tileGap: { allowed: [] } } })],
  [
    "a repeated tileGap.allowed value",
    false,
    () => ({ ...pixoo(), layoutOptions: { tileGap: { allowed: ["gap", "gap"] } } }),
  ],
  ["an unknown tileGap value", false, () => ({ ...pixoo(), layoutOptions: { tileGap: { allowed: ["gap", "wide"] } } })],
  [
    "an unknown tileGap default",
    false,
    () => ({ ...pixoo(), layoutOptions: { tileGap: { allowed: ["gap"], default: "wide" } } }),
  ],
  ["a blockPadding of 2", false, () => ({ ...pixoo(), layoutOptions: { blockPadding: { allowed: [0, 2] } } })],
  [
    "a blockPadding given as a string",
    false,
    () => ({ ...pixoo(), layoutOptions: { blockPadding: { allowed: ["1"] } } }),
  ],
  [
    "an unknown key inside a choice",
    false,
    () => ({ ...pixoo(), layoutOptions: { blockPadding: { allowed: [1], values: [1] } } }),
  ],
];

const CHARSET_TABLE: Array<[string, boolean, () => unknown]> = [
  ["a built-in LED set", true, led5x7],
  ["a built-in flap set", true, v1],
  ["a partial set over a built-in with its own glyph", true, () => json(ACME_SIGN_CHARSET)],
  ["a complete set extending nothing", true, () => json(GOLDEN_PLUGIN_CHARSETS[1])],
  ["a partial set that gives only an id and extends", true, () => ({ id: "x", extends: "led_3x5" })],
  ["an astral character in chars", true, () => ({ ...led5x7(), chars: ["😀"] })],
  ["not an object", false, () => "led_5x7"],
  ["an unknown field", false, () => ({ ...led5x7(), colour: true })],
  ["a partial set over a built-in with an unknown field", false, () => ({ id: "x", extends: "led_3x5", colour: true })],
  ["a partial set with a typo'd field", false, () => ({ ...json(ACME_SIGN_CHARSET), glyph: { "€": [".##"] } })],
  ["an id with a space", false, () => ({ ...led5x7(), id: "led 5x7" })],
  [
    "a set that extends nothing, missing a flag",
    false,
    () => {
      const s = v1();
      delete (s as { tiles?: boolean }).tiles;
      return s;
    },
  ],
  [
    "a set over a built-in may leave a flag out",
    true,
    () => {
      const s = led5x7();
      delete (s as { tiles?: boolean }).tiles;
      return s;
    },
  ],
  ["an empty label", false, () => ({ ...led5x7(), label: "" })],
  ["version 0", false, () => ({ ...led5x7(), version: 0 })],
  ["a fractional version", false, () => ({ ...led5x7(), version: 1.5 })],
  ["extends that is not a string", false, () => ({ ...led5x7(), extends: 1 })],
  ["a two-character entry in chars", false, () => ({ ...led5x7(), chars: ["ab"] })],
  ["a blank in chars", false, () => ({ ...led5x7(), chars: [" "] })],
  ["a non-string in chars", false, () => ({ ...led5x7(), chars: [1] })],
  ["a non-boolean flag", false, () => ({ ...led5x7(), mixedCase: "yes" })],
  ["an unregistered icon", false, () => ({ ...led5x7(), icons: ["unicorn"] })],
  ["an unknown code62Glyph", false, () => ({ ...led5x7(), code62Glyph: "star" })],
  ["an unknown font", false, () => ({ ...led5x7(), font: "4x6" })],
  ["glyphs that are not an object", false, () => ({ ...led5x7(), glyphs: ["###"] })],
  [
    "a glyph keyed by two characters",
    false,
    () => ({
      ...led5x7(),
      chars: [...led5x7().chars, "€"],
      glyphs: { "€€": [".##", "##.", "#..", "##.", ".##", "...", "..."] },
    }),
  ],
  [
    "a glyph with a stray character in a row",
    false,
    () => ({ ...json(ACME_SIGN_CHARSET), glyphs: { "€": [".##", "##.", "#-.", "##.", ".##"] } }),
  ],
  ["a glyph with no rows", false, () => ({ ...json(ACME_SIGN_CHARSET), glyphs: { "€": [] } })],
];

describe("validateDeviceModel agrees with device-model.schema.json", () => {
  it.each(DEVICE_TABLE)("%s → valid: %s", (_name, valid, doc) => {
    const d = doc();
    expect(validDevice(d), `schema: ${schemaErrors(validDevice)}`).toBe(valid);
    const r = validateDeviceModel(d);
    expect(r.ok, `validateDeviceModel: ${r.errors.join("; ")}`).toBe(valid);
  });

  it("the TS validator is stricter where the schema cannot say: a layoutOptions default must be one of allowed", () => {
    const d = { ...pixoo(), layoutOptions: { tileGap: { allowed: ["gap"], default: "fill" } } };
    expect(validDevice(d)).toBe(true);
    expect(validateDeviceModel(d).errors).toEqual(["layoutOptions.tileGap.default: one of allowed"]);
  });
});

describe("validateCharacterSet agrees with character-set.schema.json", () => {
  it.each(CHARSET_TABLE)("%s → valid: %s", (_name, valid, doc) => {
    const d = doc();
    expect(validCharset(d), `schema: ${schemaErrors(validCharset)}`).toBe(valid);
    const r = validateCharacterSet(d);
    expect(r.ok, `validateCharacterSet: ${r.errors.join("; ")}`).toBe(valid);
  });

  it("the TS validator is stricter where the schema cannot say: glyph size against the face, glyphs in chars", () => {
    // The face must be known to size against: a partial declaration that
    // inherits its `font` is sized when it is materialised.
    const wrongSize = { ...json(ACME_SIGN_CHARSET), font: "3x5", glyphs: { "€": ["###"] } };
    expect(validCharset(wrongSize)).toBe(true);
    expect(validateCharacterSet(wrongSize).ok).toBe(false);
    expect(() => materializeCharacterSet({ ...ACME_SIGN_CHARSET, glyphs: { "€": ["###"] } })).toThrow(/5 rows of 3/);
    const notInChars = { ...json(ACME_SIGN_CHARSET), glyphs: { "£": [".##", "##.", "#..", "##.", ".##"] } };
    expect(validCharset(notInChars)).toBe(true);
    expect(validateCharacterSet(notInChars).ok).toBe(false);
  });

  it("materialising a partial set rejects what the schema rejects: an unknown key is an error, not dropped", () => {
    const typo = { ...ACME_SIGN_CHARSET, colour: true };
    expect(validCharset(json(typo))).toBe(false);
    expect(validateCharacterSet(typo).ok).toBe(false);
    expect(() => materializeCharacterSet(typo)).toThrow(/colour: not a character set field/);
  });
});
