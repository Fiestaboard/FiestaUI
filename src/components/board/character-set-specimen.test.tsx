import { render, screen, within } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { BOARD_ICON_NAMES } from "../../lib/board-icons";
import { goldenCharacterSet } from "../../lib/charset-golden-cases";
import { CharacterSetSpecimen } from "./character-set-specimen";

describe("CharacterSetSpecimen", () => {
  const itemNames = (sheet: HTMLElement, list: string) =>
    [...within(within(sheet).getByRole("list", { name: list })).getAllByRole("listitem")].map(
      (li) => li.querySelector(".sr-only")!.textContent,
    );
  const sections = (sheet: HTMLElement) =>
    [...sheet.querySelectorAll("[data-section]")].map((el) => el.getAttribute("data-section"));

  it("shows a split-flap set as tiles: uppercase, no lowercase, no icons, its code-62 glyph", () => {
    render(<CharacterSetSpecimen charset="vestaboard_v2" />);
    const sheet = screen.getByRole("group", { name: "Vestaboard (heart flap)" });
    const letters = itemNames(sheet, "Letters");
    expect(letters).toContain("capital A");
    expect(letters).not.toContain("lowercase a");
    const punct = itemNames(sheet, "Punctuation");
    expect(punct).toContain("heart");
    expect(punct).not.toContain("degree sign");
    expect(within(sheet).queryByRole("list", { name: "Icons" })).toBeNull();
    expect(itemNames(sheet, "Colour tiles")).toContain("green tile");
    expect(within(sheet).queryByRole("img")).toBeNull(); // glyphs are list items with text, not ninety images
    expect(sheet.querySelector('[data-slot="character-glyph"][data-renderer="tile"]')).not.toBeNull();
    expect(sheet).toHaveTextContent("Uppercase only");
    expect(sheet).toHaveTextContent("Code 62: ♥");
    expect(sheet).toHaveTextContent("vestaboard_v1 v1 → vestaboard_v2 v2");
    expect(sections(sheet)).toEqual(["letters", "digits", "punctuation", "tiles", "features"]);
  });

  it("shows an LED set with lowercase and every icon, and marks what it adds over a base", () => {
    render(<CharacterSetSpecimen charset="led_5x7" compareTo="vestaboard_v2" />);
    const sheet = screen.getByRole("group", { name: "LED matrix, 5×7 face" });
    const letterItems = within(within(sheet).getByRole("list", { name: "Letters" })).getAllByRole("listitem");
    const name = (li: HTMLElement) => li.querySelector(".sr-only")!.textContent;
    const a = letterItems.find((li) => name(li) === "lowercase a")!;
    expect(a).toHaveAttribute("data-added", "");
    // The marker is not colour alone: the item also says so, off screen.
    expect(a).toHaveTextContent("lowercase a (added)");
    expect(a.querySelector('[data-slot="character-set-added"]')).toHaveClass("sr-only");
    const capitalA = letterItems.find((li) => name(li) === "capital A")!;
    expect(capitalA).not.toHaveAttribute("data-added");
    expect(capitalA).not.toHaveTextContent("(added)");
    expect(itemNames(sheet, "Icons")).toHaveLength(BOARD_ICON_NAMES.length);
    expect(itemNames(sheet, "Icons")).toContain("sun icon");
    expect(sheet.querySelector('[data-slot="character-glyph"][data-renderer="led"] svg')).not.toBeNull();
    expect(sheet).toHaveTextContent("Mixed case");
    expect(sheet).toHaveTextContent("Code 62: ° or ♥");
    // 26 lowercase + the degree sign: "characters", not "letters"; features by label, never by key.
    expect(sheet).toHaveTextContent(
      "Adds over Vestaboard (heart flap): 27 characters, 16 icons, Mixed case, Colour spans",
    );
    expect(sheet).not.toHaveTextContent("mixedCase");
    expect(sheet).not.toHaveTextContent("colorSpans");
    expect(sections(sheet)).toEqual(["letters", "digits", "punctuation", "tiles", "icons", "features", "diff"]);
  });

  it("lists what a smaller set lacks, by name", () => {
    render(<CharacterSetSpecimen charset="led_3x5" compareTo="led_5x7" />);
    const sheet = screen.getByRole("group", { name: "LED matrix, 3×5 face" });
    expect(sheet).toHaveTextContent("Lacks from LED matrix, 5×7 face: snow, bus, train, music, bell, partly cloudy");
    expect(itemNames(sheet, "Icons")).not.toContain("bus icon");
  });

  it("shows a plugin's set as an object: its added characters, its own icons, no lowercase, no code-62 flap", () => {
    const acme = goldenCharacterSet("acme_sign_v1");
    render(<CharacterSetSpecimen charset={acme} compareTo="led_3x5" glyphLabels={{ symbols: { "€": "euro sign" } }} />);
    const sheet = screen.getByRole("group", { name: "ACME sign" });
    expect(sheet).toHaveAttribute("data-charset", "acme_sign_v1");
    expect(itemNames(sheet, "Added characters")).toEqual(["euro sign"]);
    expect(sheet.querySelector('[data-section="extra"] [data-added]')).not.toBeNull();
    expect(sheet.querySelector('[data-section="extra"] [data-added]')).toHaveTextContent("euro sign (added)");
    expect(itemNames(sheet, "Letters")).not.toContain("lowercase a");
    expect(itemNames(sheet, "Icons")).toEqual(["check icon", "up icon", "down icon"]); // registry order
    expect(sheet).toHaveTextContent("Uppercase only");
    expect(sheet).not.toHaveTextContent("Code 62");
    expect(sheet).toHaveTextContent("Adds over LED matrix, 3×5 face: 1 character");
    // The lacks line names characters (the added symbol label merges into the defaults), icons and features by label.
    expect(sheet).toHaveTextContent("Lacks from LED matrix, 3×5 face: exclamation mark, at sign");
    expect(sheet).toHaveTextContent("lowercase a, lowercase b");
    expect(sheet).toHaveTextContent("star, fog, Mixed case, Colour spans {red:TEXT}");
    expect(sheet).toHaveTextContent("vestaboard_v1 v1 → vestaboard_v2 v2 → led_5x7 v1 → led_3x5 v1 → acme_sign_v1 v1");
    // The euro is drawn from the plugin's bitmap, as dots.
    expect(sheet.querySelector('[data-section="extra"] [data-renderer="led"] svg')).not.toBeNull();
  });

  it("refuses an unknown set id instead of showing a Vestaboard", () => {
    expect(() => render(<CharacterSetSpecimen charset={"acme_sign_v1" as "led_5x7"} />)).toThrow(
      /Unknown character set "acme_sign_v1"/,
    );
  });

  it("renders on the server", () => {
    const html = renderToStaticMarkup(<CharacterSetSpecimen charset="led_3x5" size="sm" />);
    expect(html).toContain('data-section="icons"');
    expect(html).toContain("<svg");
  });
});
