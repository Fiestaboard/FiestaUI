import { describe, expect, it } from "vitest";

import { parseLine } from "./board-characters";
import { ALL_COLOR_CODES } from "./board-colors";
import {
  BOARD_ICON_ALIASES,
  BOARD_ICON_NAMES,
  BOARD_ICONS,
  isBoardIconName,
  resolveBoardIconName,
} from "./board-icons";

/*
 * The icon registry is the markup contract behind `{icon:…}`: which names
 * exist, what colour an LED draws them in, and what a split-flap board draws
 * instead. These pin its shape; the parser tests in
 * scripts/ci/tests/board-characters.test.mjs pin how `parseLine` reads it.
 */

describe("BOARD_ICONS", () => {
  it("is the sixteen icons the spec names, in registry order", () => {
    expect(BOARD_ICON_NAMES).toEqual([
      "sun",
      "cloud",
      "rain",
      "snow",
      "bolt",
      "check",
      "cross",
      "up",
      "down",
      "star",
      "bus",
      "train",
      "music",
      "bell",
      "fog",
      "partly",
    ]);
    expect(Object.keys(BOARD_ICONS)).toEqual(BOARD_ICON_NAMES);
  });

  it("gives every icon a label, a hex colour and a fallback a flap can draw", () => {
    for (const name of BOARD_ICON_NAMES) {
      const { label, color, fallback } = BOARD_ICONS[name];
      expect(label, name).toMatch(/\S/);
      expect(color, name).toMatch(/^#[0-9a-f]{6}$/);
      // A colour tile, one board character, or a blank — never a word.
      if (fallback !== null && !ALL_COLOR_CODES[fallback]) expect(fallback, name).toHaveLength(1);
    }
  });

  it("falls back to tiles that mean the same thing in the board's colour language", () => {
    expect(BOARD_ICONS.sun.fallback).toBe("65"); // yellow
    expect(BOARD_ICONS.rain.fallback).toBe("67"); // blue
    expect(BOARD_ICONS.snow.fallback).toBe("68"); // violet: "very cold"
    expect(BOARD_ICONS.check.fallback).toBe("66"); // green
    expect(BOARD_ICONS.cross.fallback).toBe("63"); // red
    expect(BOARD_ICONS.bolt.fallback).toBe("64"); // orange
    expect(BOARD_ICONS.up.fallback).toBe("+");
    expect(BOARD_ICONS.down.fallback).toBe("-");
    expect(BOARD_ICONS.fog.fallback).toBe("-");
    for (const name of ["bus", "train", "music", "bell"] as const) expect(BOARD_ICONS[name].fallback).toBeNull();
  });

  it("is prototype-safe: inherited Object keys are not icons", () => {
    for (const key of ["toString", "constructor", "valueOf", "hasOwnProperty", "__proto__"]) {
      expect(isBoardIconName(key), key).toBe(false);
      expect(resolveBoardIconName(key), key).toBeNull();
      expect(BOARD_ICONS[key as never], key).toBeUndefined();
      expect(BOARD_ICON_ALIASES[key], key).toBeUndefined();
    }
  });
});

describe("resolveBoardIconName", () => {
  it("resolves every registered name to itself and every alias to its icon", () => {
    for (const name of BOARD_ICON_NAMES) expect(resolveBoardIconName(name)).toBe(name);
    expect(BOARD_ICON_ALIASES).toEqual({ storm: "bolt", x: "cross" });
    for (const [alias, name] of Object.entries(BOARD_ICON_ALIASES)) {
      expect(resolveBoardIconName(alias)).toBe(name);
      expect(isBoardIconName(alias), alias).toBe(false);
    }
  });

  /*
   * FiestaBoard's legacy single-brace shortcuts, copied verbatim from
   * FiestaBoard src/templates/engine.py `SYMBOL_CHARS` (the ASCII each one
   * expanded to before D16). Its engine now expands every one through this
   * registry — `{sun}` → `{icon:sun}` — so each name must resolve here and
   * nowhere else; the heart is the one exception, a character not an icon.
   */
  const FIESTABOARD_SYMBOL_CHARS: Record<string, string> = {
    sun: "*",
    star: "*",
    cloud: "O",
    rain: "/",
    snow: "*",
    storm: "!",
    fog: "-",
    partly: "%",
    heart: "<3",
    check: "+",
    x: "X",
  };

  it("resolves every FiestaBoard legacy shortcut (D16), with {icon:heart} as the ♥ character", () => {
    for (const shortcut of Object.keys(FIESTABOARD_SYMBOL_CHARS)) {
      const token = parseLine(`{icon:${shortcut}}`, 1, { extendedMarkup: true })[0];
      if (shortcut === "heart") {
        expect(resolveBoardIconName(shortcut)).toBeNull();
        expect(token).toEqual({ type: "char", value: "♥" });
        continue;
      }
      const name = resolveBoardIconName(shortcut);
      expect(name, shortcut).not.toBeNull();
      expect(BOARD_ICONS[name!], shortcut).toBeDefined();
      // The shortcut draws the icon's split-flap fallback, tagged with the
      // canonical name — the tile fallbacks win over the old ASCII (D16).
      expect(token, shortcut).toMatchObject({ icon: name });
      const { fallback } = BOARD_ICONS[name!];
      if (fallback !== null && ALL_COLOR_CODES[fallback])
        expect(token).toEqual({ type: "color", code: fallback, icon: name });
      else expect(token).toEqual({ type: "char", value: fallback ?? " ", icon: name });
    }
    // The two whose shortcut name differs from the icon's own.
    expect(resolveBoardIconName("storm")).toBe("bolt");
    expect(resolveBoardIconName("x")).toBe("cross");
    // The tile fallbacks the release notes call out: {sun} was `*`, now a yellow tile.
    expect(parseLine("{icon:sun}", 1, { extendedMarkup: true })[0]).toEqual({ type: "color", code: "65", icon: "sun" });
  });

  it("is exact: unknown names, the heart and upper case are not resolved here", () => {
    expect(resolveBoardIconName("nope")).toBeNull();
    expect(resolveBoardIconName("")).toBeNull();
    // `{icon:heart}` is the ♥ character, handled by the parser, not an icon.
    expect(resolveBoardIconName("heart")).toBeNull();
    // Case folding is the parser's job: it lowercases before asking.
    expect(resolveBoardIconName("SUN")).toBeNull();
  });
});
