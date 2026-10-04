import { render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BOARD_ICON_NAMES } from "../../lib/board-icons";
import { CHARACTER_SETS } from "../../lib/character-sets";
import { ACME_EURO_GLYPH, ACME_SIGN_MODEL, ACME_ZERO_GLYPH, goldenCharacterSet } from "../../lib/charset-golden-cases";
import { type DeviceModel } from "../../lib/devices";
import { CharacterGlyph, characterGlyphName, characterGlyphRenderer, characterGlyphToken } from "./character-glyph";

const ACME_SET = goldenCharacterSet("acme_sign_v1");
const ACME_SET_V2 = goldenCharacterSet("acme_sign_v2");
const ACME_MODEL: DeviceModel = {
  ...ACME_SIGN_MODEL,
  charset: ACME_SET,
  animation: { ...ACME_SIGN_MODEL.animation, sources: [] },
};

/** The lit dots of a rendered LED glyph as rows of `#`/`.`, like a font bitmap. */
function litRows(root: ParentNode, width: number, height: number): string[] {
  const dots = [...root.querySelectorAll("circle, rect")];
  expect(dots).toHaveLength(width * height);
  const off = new Set(["#171717", "#1a1206"]);
  const rows: string[] = [];
  for (let y = 0; y < height; y++) {
    rows.push(
      dots
        .slice(y * width, (y + 1) * width)
        .map((d) => (off.has(d.getAttribute("fill")!) ? "." : "#"))
        .join(""),
    );
  }
  return rows;
}

describe("characterGlyphToken", () => {
  it("reads a character, a tile by code or name, an icon by name or markup, and one-cell markup", () => {
    expect(characterGlyphToken("A")).toEqual({ type: "char", value: "A" });
    expect(characterGlyphToken("a")).toEqual({ type: "char", value: "a" });
    expect(characterGlyphToken("63")).toEqual({ type: "color", code: "63" });
    expect(characterGlyphToken("red")).toEqual({ type: "color", code: "red" });
    expect(characterGlyphToken("black")).toEqual({ type: "color", code: "black" });
    expect(characterGlyphToken("Black")).toEqual({ type: "color", code: "black" });
    expect(characterGlyphToken("purple")).toEqual({ type: "color", code: "purple" });
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
    expect(characterGlyphToken("€")).toEqual({ type: "char", value: "€" });
  });

  it("passes a parsed token through, and never reads an inherited name as a tile", () => {
    const token = { type: "char", value: "Z" } as const;
    expect(characterGlyphToken(token)).toBe(token);
    expect(characterGlyphToken("constructor")).toEqual({ type: "char", value: "c" });
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
    expect(characterGlyphName({ type: "color", code: "red" })).toBe("red tile");
    expect(characterGlyphName({ type: "color", code: "purple" })).toBe("violet tile");
    expect(characterGlyphName({ type: "color", code: "71" })).toBe("black tile");
    expect(characterGlyphName({ type: "char", value: " ", icon: "sun" })).toBe("sun icon");
    expect(characterGlyphName({ type: "color", code: "65", icon: "sun" })).toBe("sun icon");
    expect(characterGlyphName({ type: "char", value: "A", color: "red" })).toBe("capital A in red");
    expect(characterGlyphName({ type: "char", value: "A", color: "black", background: "white" })).toBe(
      "capital A in black on white",
    );
    // A character without a listed name is named by itself; labels can add one.
    expect(characterGlyphName({ type: "char", value: "€" })).toBe("€");
    expect(characterGlyphName({ type: "char", value: "€" }, { symbols: { "€": "euro sign" } })).toBe("euro sign");
    // Added symbols merge into the defaults rather than replacing them.
    expect(characterGlyphName({ type: "char", value: "!" }, { symbols: { "€": "euro sign" } })).toBe(
      "exclamation mark",
    );
  });
});

describe("characterGlyphRenderer", () => {
  it("draws LED sets as dots and Vestaboard sets as tiles, by whether the set has a face", () => {
    expect(characterGlyphRenderer(CHARACTER_SETS.led_5x7)).toBe("led");
    expect(characterGlyphRenderer(CHARACTER_SETS.led_3x5)).toBe("led");
    expect(characterGlyphRenderer(CHARACTER_SETS.vestaboard_v1)).toBe("tile");
    expect(characterGlyphRenderer(CHARACTER_SETS.vestaboard_v2)).toBe("tile");
    expect(characterGlyphRenderer(ACME_SET)).toBe("led");
    expect(characterGlyphRenderer(goldenCharacterSet("lobby_flap"))).toBe("tile");
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

  it("draws the fallback plainly when not marked", () => {
    render(<CharacterGlyph token="a" charset="vestaboard_v1" />);
    const img = screen.getByRole("img", { name: "lowercase a, not available — drawn as capital A" });
    expect(img).toHaveTextContent("A");
    expect(img.querySelector('[data-slot="character-glyph-marker"]')).toBeNull();
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

  it("keeps a typed heart and a typed degree distinct on an LED set", () => {
    const { unmount } = render(<CharacterGlyph token="♥" charset="led_5x7" />);
    const heart = litRows(screen.getByRole("img", { name: "heart" }), 5, 7);
    unmount();
    render(<CharacterGlyph token="°" charset="led_5x7" />);
    const degree = litRows(screen.getByRole("img", { name: "degree sign" }), 5, 7);
    expect(heart).not.toEqual(degree);
    expect(screen.getByRole("img")).not.toHaveAttribute("data-unsupported");
  });

  it("on a Vestaboard set the flap decides: a heart on the degree flap draws the degree, and the other way round", () => {
    const { unmount } = render(<CharacterGlyph token="♥" charset="vestaboard_v1" />);
    expect(screen.getByRole("img", { name: "heart, not available — drawn as degree sign" })).toHaveTextContent("°");
    unmount();
    render(<CharacterGlyph token="°" charset="vestaboard_v2" />);
    expect(screen.getByRole("img", { name: "degree sign, not available — drawn as heart" })).toHaveTextContent("♥");
  });

  it("picks a Flagship's set from code62Glyph", () => {
    const { unmount } = render(<CharacterGlyph token="♥" model="vestaboard_flagship" code62Glyph="heart" />);
    expect(screen.getByRole("img", { name: "heart" })).toHaveAttribute("data-charset", "vestaboard_v2");
    unmount();
    render(<CharacterGlyph token="♥" model="vestaboard_flagship" code62Glyph="degree" />);
    expect(screen.getByRole("img", { name: "heart, not available — drawn as degree sign" })).toHaveAttribute(
      "data-charset",
      "vestaboard_v1",
    );
  });

  it("takes a device model, using its set, colour and pixel look", () => {
    render(<CharacterGlyph token="{red:A}" model="max7219_4in1" />);
    const img = screen.getByRole("img", { name: "capital A in red" });
    expect(img).toHaveAttribute("data-charset", "led_3x5");
    // Monochrome: the lit dots are the panel's red, not the span's.
    const lit = [...img.querySelectorAll("circle")].filter((c) => c.getAttribute("fill") !== "#171717");
    expect(lit.length).toBeGreaterThan(0);
    expect(new Set(lit.map((c) => c.getAttribute("fill")))).toEqual(new Set(["rgb(255,59,31)"]));
  });

  it("draws the dot shape, size and off colour from the model's appearance", () => {
    const { unmount } = render(<CharacterGlyph token="A" model="divoom_pixoo64" />);
    let svg = screen.getByRole("img").querySelector("svg")!;
    expect(svg).toHaveAttribute("data-pixel-shape", "square");
    expect(svg.querySelector("rect")).toHaveAttribute("width", "0.82");
    unmount();
    render(<CharacterGlyph token="A" model={ACME_MODEL} />);
    svg = screen.getByRole("img").querySelector("svg")!;
    expect(svg).toHaveAttribute("data-pixel-shape", "round");
    expect(svg.querySelector("circle")).toHaveAttribute("r", "0.3");
    expect(svg.querySelector("circle")).toHaveAttribute("fill", "#1a1206");
    expect(svg.style.background).toMatch(/^(#000000|rgb\(0, 0, 0\))$/);
  });

  it("draws round dots at the default ratio when given only a set, and lets pixelShape override", () => {
    const { unmount } = render(<CharacterGlyph token="A" charset="led_5x7" />);
    let svg = screen.getByRole("img").querySelector("svg")!;
    expect(svg).toHaveAttribute("data-pixel-shape", "round");
    expect(svg.querySelector("circle")).toHaveAttribute("r", "0.36");
    unmount();
    render(<CharacterGlyph token="A" charset="led_5x7" pixelShape="square" />);
    svg = screen.getByRole("img").querySelector("svg")!;
    expect(svg.querySelector("rect")).toHaveAttribute("width", "0.82");
  });

  it("draws a plugin set's own glyphs from their bitmaps, which beat the shared face", () => {
    const { unmount } = render(<CharacterGlyph token="€" charset={ACME_SET} />);
    const euro = screen.getByRole("img", { name: "€" });
    expect(euro).not.toHaveAttribute("data-unsupported");
    expect(litRows(euro, 3, 5)).toEqual(ACME_EURO_GLYPH);
    unmount();
    render(<CharacterGlyph token="0" charset={ACME_SET_V2} />);
    expect(litRows(screen.getByRole("img", { name: "digit 0" }), 3, 5)).toEqual(ACME_ZERO_GLYPH);
  });

  it("marks what a plugin set cannot draw, through the set's own rules", () => {
    render(<CharacterGlyph token="a" charset={ACME_SET} markUnsupported />);
    expect(screen.getByRole("img", { name: "lowercase a, not available — drawn as capital A" })).toHaveAttribute(
      "data-charset",
      "acme_sign_v1",
    );
  });

  it("refuses an unknown set or model id instead of drawing a Vestaboard", () => {
    expect(() => render(<CharacterGlyph token="A" charset={"acme_sign_v1" as "led_5x7"} />)).toThrow(
      /Unknown character set "acme_sign_v1"/,
    );
    expect(() => render(<CharacterGlyph token="A" model="acme_sign_48x12" />)).toThrow(
      /Unknown device model "acme_sign_48x12"/,
    );
  });

  it("stands as tall as a flap tile at each size, or at an explicit height", () => {
    const { unmount } = render(<CharacterGlyph token="A" charset="led_5x7" size="lg" />);
    let svg = screen.getByRole("img").querySelector("svg")!;
    expect(svg).toHaveAttribute("height", "26");
    expect(svg).toHaveAttribute("width", "19.5"); // 6 columns × 26/8
    expect(svg.getAttribute("class")).toContain("h-[26px]");
    expect(svg.getAttribute("class")).toContain("lg:h-[46px]");
    unmount();
    render(<CharacterGlyph token="A" charset="led_5x7" height={40} />);
    svg = screen.getByRole("img").querySelector("svg")!;
    expect(svg).toHaveAttribute("height", "40");
    expect(svg.getAttribute("class")).toBeNull();
  });

  it("draws an unlit (black) glyph visibly with an outline", () => {
    render(<CharacterGlyph token="{black:A}" charset="led_5x7" />);
    const svg = screen.getByRole("img", { name: "capital A in black" }).querySelector("svg")!;
    const outlined = [...svg.querySelectorAll("circle")].filter((c) => c.getAttribute("stroke"));
    expect(outlined.length).toBeGreaterThan(0);
    expect(new Set(outlined.map((c) => c.getAttribute("fill")))).toEqual(new Set(["rgb(59,59,59)"]));
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

  it("renders to static markup on the server", () => {
    const html = renderToStaticMarkup(<CharacterGlyph token="{icon:sun}" charset="led_5x7" />);
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="sun icon"');
    expect(html.match(/<circle /g)).toHaveLength(35);
  });
});
