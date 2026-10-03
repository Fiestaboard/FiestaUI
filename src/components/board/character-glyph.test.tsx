import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BOARD_ICON_NAMES } from "../../lib/board-icons";
import { CHARACTER_SETS } from "../../lib/character-sets";
import { CharacterGlyph, characterGlyphName, characterGlyphRenderer, characterGlyphToken } from "./character-glyph";

describe("characterGlyphToken", () => {
  it("reads a character, a tile by code or name, an icon by name or markup, and one-cell markup", () => {
    expect(characterGlyphToken("A")).toEqual({ type: "char", value: "A" });
    expect(characterGlyphToken("a")).toEqual({ type: "char", value: "a" });
    expect(characterGlyphToken("63")).toEqual({ type: "color", code: "63" });
    expect(characterGlyphToken("red")).toEqual({ type: "color", code: "red" });
    expect(characterGlyphToken("black")).toEqual({ type: "color", code: "black" });
    expect(characterGlyphToken("Black")).toEqual({ type: "color", code: "black" });
    expect(characterGlyphToken("70")).toEqual({ type: "color", code: "70" });
    expect(characterGlyphToken("b")).toEqual({ type: "char", value: "b" });
    expect(characterGlyphToken("{red}")).toEqual({ type: "color", code: "red" });
    expect(characterGlyphToken("sun")).toMatchObject({ icon: "sun" });
    expect(characterGlyphToken("{icon:sun}")).toMatchObject({ icon: "sun" });
    expect(characterGlyphToken("{red:A}")).toEqual({ type: "char", value: "A", color: "red" });
    expect(characterGlyphToken("{black/white:A}")).toEqual({
      type: "char",
      value: "A",
      color: "black",
      background: "white",
    });
    expect(characterGlyphToken("")).toEqual({ type: "char", value: " " });
  });
});

describe("characterGlyphName", () => {
  it("names every kind of token in human words, never raw markup", () => {
    expect(characterGlyphName({ type: "char", value: "A" })).toBe("capital A");
    expect(characterGlyphName({ type: "char", value: "a" })).toBe("lowercase a");
    expect(characterGlyphName({ type: "char", value: "7" })).toBe("digit 7");
    expect(characterGlyphName({ type: "char", value: "°" })).toBe("degree sign");
    expect(characterGlyphName({ type: "char", value: "♥" })).toBe("heart");
    expect(characterGlyphName({ type: "char", value: " " })).toBe("blank");
    expect(characterGlyphName({ type: "color", code: "63" })).toBe("red tile");
    expect(characterGlyphName({ type: "color", code: "purple" })).toBe("violet tile");
    expect(characterGlyphName({ type: "char", value: " ", icon: "sun" })).toBe("sun icon");
    expect(characterGlyphName({ type: "color", code: "65", icon: "sun" })).toBe("sun icon");
    expect(characterGlyphName({ type: "char", value: "A", color: "red" })).toBe("capital A in red");
    expect(characterGlyphName({ type: "char", value: "A", color: "black", background: "white" })).toBe(
      "capital A in black on white",
    );
  });
});

describe("characterGlyphRenderer", () => {
  it("draws LED sets as dots and Vestaboard sets as tiles", () => {
    expect(characterGlyphRenderer(CHARACTER_SETS.led_5x7)).toBe("led");
    expect(characterGlyphRenderer(CHARACTER_SETS.led_3x5)).toBe("led");
    expect(characterGlyphRenderer(CHARACTER_SETS.vestaboard_v1)).toBe("tile");
    expect(characterGlyphRenderer(CHARACTER_SETS.vestaboard_v2)).toBe("tile");
  });
});

describe("<CharacterGlyph>", () => {
  it("is an image named after the token, drawn by the set's renderer", () => {
    render(<CharacterGlyph token="{icon:sun}" charset="led_5x7" />);
    const img = screen.getByRole("img", { name: "sun icon" });
    expect(img).toHaveAttribute("data-renderer", "led");
    expect(img.querySelector("svg")).not.toBeNull();
    expect(img).not.toHaveAttribute("data-unsupported");
  });

  it("draws a flap tile for a Vestaboard set", () => {
    render(<CharacterGlyph token="63" charset="vestaboard_v2" />);
    const img = screen.getByRole("img", { name: "red tile" });
    expect(img).toHaveAttribute("data-renderer", "tile");
    expect(img.querySelector("svg")).toBeNull();
  });

  it("draws the set's fallback for an unsupported token and says so in the name", () => {
    render(<CharacterGlyph token="{icon:sun}" charset="vestaboard_v1" markUnsupported />);
    const img = screen.getByRole("img", { name: "sun icon, not available — drawn as yellow tile" });
    expect(img).toHaveAttribute("data-unsupported", "");
    expect(img.querySelector('[data-slot="character-glyph-marker"]')).not.toBeNull();
  });

  it("uppercases for an uppercase set, and keeps case for an LED set", () => {
    render(<CharacterGlyph token="a" charset="vestaboard_v1" />);
    expect(screen.getByRole("img", { name: "lowercase a, not available — drawn as capital A" })).toHaveTextContent("A");
  });

  it("is decorative on request, for a button that already names it", () => {
    render(
      <button type="button" aria-label="sun icon">
        <CharacterGlyph token="sun" charset="led_3x5" decorative />
      </button>,
    );
    expect(screen.queryByRole("img")).toBeNull();
    expect(document.querySelector('[data-slot="character-glyph"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("takes a device model, using its set, colour and pixel look", () => {
    render(<CharacterGlyph token="{red:A}" model="max7219_4in1" />);
    const img = screen.getByRole("img", { name: "capital A in red" });
    expect(img).toHaveAttribute("data-charset", "led_3x5");
    // Monochrome: the lit dots are the panel's red, not the span's.
    const lit = [...img.querySelectorAll("circle")].filter((c) => c.getAttribute("fill") !== "#1f1f1f");
    expect(lit.length).toBeGreaterThan(0);
    expect(new Set(lit.map((c) => c.getAttribute("fill")))).toEqual(new Set(["rgb(255,59,31)"]));
  });

  it("takes an explicit height, and draws an unlit (black) glyph visibly with an outline", () => {
    render(<CharacterGlyph token="{black:A}" charset="led_5x7" height={40} />);
    const svg = screen.getByRole("img", { name: "capital A in black" }).querySelector("svg")!;
    expect(svg).toHaveAttribute("height", "40");
    const outlined = [...svg.querySelectorAll("circle")].filter((c) => c.getAttribute("stroke"));
    expect(outlined.length).toBeGreaterThan(0);
    expect(new Set(outlined.map((c) => c.getAttribute("fill")))).toEqual(new Set(["#3b3b3b"]));
  });

  it("draws every icon of each LED set", () => {
    for (const set of ["led_5x7", "led_3x5"] as const) {
      for (const name of BOARD_ICON_NAMES) {
        const { unmount } = render(<CharacterGlyph token={`{icon:${name}}`} charset={set} />);
        expect(document.querySelector('[data-slot="character-glyph"] svg')).not.toBeNull();
        unmount();
      }
    }
  });
});
