import { describe, expect, it } from "vitest";

import { BOARD_CHARS, parseLine, resolveCode62Glyph } from "./board-characters";
import { BOARD_ICON_NAMES } from "./board-icons";
import {
  CHARACTER_SET_IDS,
  CHARACTER_SETS,
  characterSetForDevice,
  charsetDiff,
  charsetFallback,
  charsetIssue,
  charsetLineage,
  charsetSupports,
  charsInSet,
  iconsInSet,
  materializeCharacterSet,
  resolveCharacterSet,
  tryResolveCharacterSet,
  validateCharacterSet,
  validateMessage,
} from "./character-sets";
import { LED_FONTS } from "./led-fonts";

const EXT = { extendedMarkup: true, preserveCase: true };
const tok = (s: string) => parseLine(s, Infinity, EXT)[0];

describe("CHARACTER_SETS", () => {
  it("vestaboard_v1 is the flap set with a degree; v2 swaps it for a heart and extends v1", () => {
    const v1 = CHARACTER_SETS.vestaboard_v1;
    const v2 = CHARACTER_SETS.vestaboard_v2;
    const flap = BOARD_CHARS.slice(1, 62).filter((c) => c !== " ");
    for (const c of flap) expect(v1.chars, c).toContain(c);
    expect(v1.chars).not.toContain("♥");
    expect(v2.chars).not.toContain("°");
    expect(v2.chars).toContain("♥");
    expect(v2.extends).toBe("vestaboard_v1");
    expect(v2.version).toBe(2);
    expect(v1.code62Glyph).toBe("degree");
    expect(v2.code62Glyph).toBe("heart");
    expect(v1.mixedCase).toBe(false);
    expect(v1.icons).toHaveLength(0);
  });

  it("the LED sets contain the flap set, both code-62 glyphs, lowercase and the font's icons", () => {
    for (const id of ["led_5x7", "led_3x5"] as const) {
      const set = CHARACTER_SETS[id];
      for (const c of CHARACTER_SETS.vestaboard_v1.chars) expect(set.chars, `${id} ${c}`).toContain(c);
      expect(set.chars).toContain("♥");
      expect(set.chars).toContain("a");
      expect(set.mixedCase && set.colorSpans && set.blockSpans).toBe(true);
      expect(set.code62Glyph).toBeUndefined();
    }
    expect(CHARACTER_SETS.led_5x7.icons).toHaveLength(BOARD_ICON_NAMES.length);
    expect(CHARACTER_SETS.led_3x5.icons).toHaveLength(Object.keys(LED_FONTS["3x5"].icons).length);
    expect(CHARACTER_SETS.led_3x5.extends).toBe("led_5x7");
  });

  it("lineage walks root first", () => {
    expect(charsetLineage("led_3x5").map((s) => s.id)).toEqual([
      "vestaboard_v1",
      "vestaboard_v2",
      "led_5x7",
      "led_3x5",
    ]);
    expect(CHARACTER_SET_IDS).toHaveLength(4);
  });

  it("every built-in validates and survives a JSON round trip", () => {
    for (const id of CHARACTER_SET_IDS) {
      const json = JSON.parse(JSON.stringify(CHARACTER_SETS[id]));
      expect(json, id).toEqual(CHARACTER_SETS[id]);
      expect(validateCharacterSet(json), id).toEqual({ ok: true, errors: [] });
    }
  });
});

describe("characterSetForDevice folds resolveCode62Glyph", () => {
  it.each([
    ["flagship", undefined, "vestaboard_v1"],
    ["flagship", "heart", "vestaboard_v2"],
    ["note", "degree", "vestaboard_v2"],
    ["note_array", undefined, "vestaboard_v2"],
    ["panel", undefined, "vestaboard_v2"],
  ] as const)("%s / %s → %s", (device, glyph, id) => {
    const set = characterSetForDevice(device, glyph);
    expect(set.id).toBe(id);
    expect(set.code62Glyph).toBe(resolveCode62Glyph(device, glyph));
  });

  it("LED sets carry their face; flap sets have none", () => {
    expect(CHARACTER_SETS.led_3x5.font).toBe("3x5");
    expect(CHARACTER_SETS.led_5x7.font).toBe("5x7");
    expect(CHARACTER_SETS.vestaboard_v1.font).toBeUndefined();
  });
});

describe("charsetSupports / charsetIssue", () => {
  it("accepts what the set draws and names what it does not", () => {
    expect(charsetSupports("vestaboard_v1", tok("A"))).toBe(true);
    expect(charsetSupports("vestaboard_v1", tok("{66}"))).toBe(true);
    expect(charsetIssue("vestaboard_v1", tok("a"))).toBe("case");
    expect(charsetIssue("vestaboard_v1", tok("♥"))).toBe("char");
    expect(charsetIssue("vestaboard_v2", tok("°"))).toBe("char");
    expect(charsetIssue("vestaboard_v1", tok("{red:A}"))).toBe("colorSpan");
    expect(charsetIssue("vestaboard_v1", tok("{black/white:A}"))).toBe("blockSpan");
    expect(charsetIssue("vestaboard_v1", tok("{icon:sun}"))).toBe("icon");
    expect(charsetIssue("led_5x7", tok("{icon:sun}"))).toBeNull();
    expect(charsetIssue("led_3x5", tok("{icon:bus}"))).toBe("icon");
    expect(charsetIssue("led_5x7", tok("a"))).toBeNull();
    expect(charsetIssue("led_5x7", tok("~"))).toBe("char");
    expect(charsetIssue("led_5x7", tok(" "))).toBeNull();
    // A tile's span colour is informational: the tile is drawable, so no issue.
    expect(charsetIssue("vestaboard_v1", tok("{red:{63}}"))).toBeNull();
  });
});

describe("charsetFallback", () => {
  it("draws what the renderers draw: uppercased, spans dropped, icons as fallbacks, ° ↔ ♥", () => {
    expect(charsetFallback("vestaboard_v1", tok("a"))).toEqual({ type: "char", value: "A" });
    expect(charsetFallback("vestaboard_v1", tok("{red:a}"))).toEqual({ type: "char", value: "A" });
    expect(charsetFallback("vestaboard_v1", tok("{black/white:A}"))).toEqual({ type: "char", value: "A" });
    expect(charsetFallback("vestaboard_v2", tok("°"))).toEqual({ type: "char", value: "♥" });
    expect(charsetFallback("vestaboard_v1", tok("♥"))).toEqual({ type: "char", value: "°" });
    expect(charsetFallback("vestaboard_v1", tok("❤"))).toEqual({ type: "char", value: "°" });
    expect(charsetFallback("vestaboard_v1", tok("{icon:sun}"))).toEqual({ type: "color", code: "65" });
    expect(charsetFallback("vestaboard_v1", tok("{icon:up}"))).toEqual({ type: "char", value: "+" });
    expect(charsetFallback("led_3x5", tok("{icon:bus}"))).toEqual({ type: "char", value: " " });
    expect(charsetFallback("led_3x5", tok("{icon:snow}"))).toEqual({ type: "color", code: "68" });
    expect(charsetFallback("led_5x7", tok("{red:a}"))).toEqual({ type: "char", value: "a", color: "red" });
    expect(charsetFallback("vestaboard_v1", tok("~"))).toEqual({ type: "char", value: " " });
  });

  it("returns a supported token unchanged in meaning, spelling included", () => {
    const t = tok("{icon:sun}");
    expect(charsetFallback("led_5x7", t)).toBe(t);
    // A tile keeps the spelling it was parsed with; nothing normalises "red" to "63".
    expect(charsetFallback("vestaboard_v1", tok("{red}"))).toEqual({ type: "color", code: "red" });
    expect(charsetFallback("vestaboard_v1", tok("{63}"))).toEqual({ type: "color", code: "63" });
  });

  it("carries span colours through an icon's fallback character", () => {
    expect(charsetFallback("led_3x5", tok("{red:{icon:bus}}"))).toEqual({ type: "char", value: " ", color: "red" });
    expect(charsetFallback("led_3x5", tok("{black/white:{icon:bus}}"))).toEqual({
      type: "char",
      value: " ",
      color: "black",
      background: "white",
    });
    // …and then the set's own span rules apply, as for any character.
    expect(charsetFallback("vestaboard_v1", tok("{red:{icon:up}}"))).toEqual({ type: "char", value: "+" });
  });

  it("carries span colours through an icon's fallback tile, as the parser does (B1 finding 5)", () => {
    expect(tok("{red:{icon:snow}}")).toEqual({ type: "color", code: "68", icon: "snow", color: "red" });
    expect(charsetFallback("led_3x5", tok("{red:{icon:snow}}"))).toEqual({ type: "color", code: "68", color: "red" });
    expect(charsetFallback("led_3x5", tok("{black/white:{icon:snow}}"))).toEqual({
      type: "color",
      code: "68",
      color: "black",
      background: "white",
    });
    // A tile's colours are informational, so a flap set keeps them too — it
    // ignores them when it draws, exactly as it ignores them on a parsed tile.
    expect(charsetFallback("vestaboard_v1", tok("{red:{icon:sun}}"))).toEqual({
      type: "color",
      code: "65",
      color: "red",
    });
  });
});

describe("validateMessage", () => {
  it("lists every unsupported position with its fallback, for editor warnings", () => {
    const r = validateMessage("Hi {icon:sun}\n{red:72°}", "vestaboard_v1");
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => [i.row, i.col, i.reason])).toEqual([
      [0, 1, "case"],
      [0, 3, "icon"],
      [1, 0, "colorSpan"],
      [1, 1, "colorSpan"],
      [1, 2, "colorSpan"],
    ]);
    expect(r.issues[0].fallback).toEqual({ type: "char", value: "I" });
    expect(r.issues[1].fallback).toEqual({ type: "color", code: "65" });
    expect(validateMessage("Hi {icon:sun}\n{red:72°}", "led_5x7").ok).toBe(true);
    expect(validateMessage("HI {66} 72°", "vestaboard_v1").ok).toBe(true);
  });
});

describe("filters and diffs", () => {
  it("filters icons and chars by set", () => {
    expect(iconsInSet("vestaboard_v1")).toEqual([]);
    expect(iconsInSet("led_5x7")).toEqual(BOARD_ICON_NAMES);
    expect(iconsInSet("led_3x5")).not.toContain("bus");
    expect(charsInSet("vestaboard_v2", ["A", "°", "♥", "a"])).toEqual(["A", "♥"]);
  });

  it("diffs what a set adds and lacks against another", () => {
    const d = charsetDiff("led_5x7", "vestaboard_v2");
    expect(d.addedChars).toContain("a");
    expect(d.addedChars).toContain("°");
    expect(d.removedChars).toEqual([]);
    expect(d.addedIcons).toEqual(BOARD_ICON_NAMES);
    expect(d.features.map(([f]) => f)).toEqual(["mixedCase", "colorSpans", "blockSpans"]);
    const small = charsetDiff("led_3x5", "led_5x7");
    expect(small.addedChars).toEqual([]);
    expect(small.removedIcons).toEqual(["snow", "bus", "train", "music", "bell", "partly"]);
    const v2 = charsetDiff("vestaboard_v2", "vestaboard_v1");
    expect(v2).toMatchObject({ addedChars: ["♥"], removedChars: ["°"], features: [] });
  });
});

describe("plugin sets: validate, materialise, refuse", () => {
  it("materialises a partial set over a built-in: given fields replace, missing inherit, version is its own", () => {
    const set = materializeCharacterSet({ id: "plugin_v1", extends: "led_5x7", chars: ["A", "B"], icons: [] });
    expect(set).toMatchObject({
      id: "plugin_v1",
      extends: "led_5x7",
      label: "LED matrix, 5×7 face",
      version: 1,
      font: "5x7",
      mixedCase: true,
      tiles: true,
      chars: ["A", "B"],
      icons: [],
    });
    expect(validateCharacterSet(set).ok).toBe(true);
    // Arrays and glyphs replace wholesale — never merged with the parent's.
    const over = materializeCharacterSet({
      id: "a",
      extends: "led_3x5",
      glyphs: { A: ["###", "#.#", "###", "#.#", "#.#"] },
    });
    expect(Object.keys(over.glyphs!)).toEqual(["A"]);
    const chained = materializeCharacterSet({ id: "b", extends: "a", version: 7 }, [over]);
    expect(chained.version).toBe(7);
    expect(chained.glyphs).toBe(over.glyphs);
    expect(materializeCharacterSet({ id: "c", extends: "vestaboard_v2" }).version).toBe(1);
  });

  it("refuses nonsense with reasons", () => {
    expect(
      validateCharacterSet({
        id: "Bad Id",
        label: "",
        version: 0,
        chars: ["ab"],
        tiles: 1,
        icons: ["x"],
        mixedCase: true,
        colorSpans: true,
        blockSpans: true,
        colour: "no",
      }).errors.length,
    ).toBeGreaterThanOrEqual(7);
    expect(validateCharacterSet({ id: "x", extends: "led_3x5", colour: "no" }).errors).toEqual([
      "colour: not a character set field",
    ]);
    expect(validateCharacterSet({ id: "x", extends: "led_3x5", chars: [" "] }).ok).toBe(false);
    expect(validateCharacterSet({ id: "x", extends: "led_3x5", chars: ["😀"] }).ok).toBe(true);
    expect(validateCharacterSet({ id: "x", extends: "led_3x5", glyphs: { A: ["#-#"] } }).errors).toEqual([
      "glyphs.A: rows of '#'/'.' characters",
    ]);
    expect(
      validateCharacterSet({
        id: "x",
        label: "x",
        version: 1,
        chars: ["A"],
        tiles: false,
        icons: [],
        mixedCase: false,
        colorSpans: false,
        blockSpans: false,
        glyphs: { A: ["#"] },
      }).errors,
    ).toEqual(["glyphs: need a font to size against"]);
    expect(() => materializeCharacterSet({ id: "x", extends: "nope" })).toThrow(/extends unknown set "nope"/);
    expect(() => materializeCharacterSet({ id: "x", extends: "x" })).toThrow(/extends unknown set "x"/);
    expect(() => materializeCharacterSet({ id: "x" })).toThrow(/is invalid/);
    expect(() => resolveCharacterSet("nope")).toThrow(/Unknown character set "nope"/);
    expect(tryResolveCharacterSet("nope").error).toMatch(/must be passed as an object/);
    const set = materializeCharacterSet({ id: "plugin_v1", extends: "led_5x7" });
    expect(tryResolveCharacterSet(set).set).toBe(set);
  });
});
