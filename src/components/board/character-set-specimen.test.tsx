import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BOARD_ICON_NAMES } from "../../lib/board-icons";
import { CharacterSetSpecimen } from "./character-set-specimen";

describe("CharacterSetSpecimen", () => {
  const itemNames = (sheet: HTMLElement, list: string) =>
    [...within(within(sheet).getByRole("list", { name: list })).getAllByRole("listitem")].map(
      (li) => li.querySelector(".sr-only")!.textContent,
    );

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
  });

  it("shows an LED set with lowercase and every icon, and marks what it adds over a base", () => {
    render(<CharacterSetSpecimen charset="led_5x7" compareTo="vestaboard_v2" />);
    const sheet = screen.getByRole("group", { name: "LED matrix, 5×7 face" });
    const letterItems = within(within(sheet).getByRole("list", { name: "Letters" })).getAllByRole("listitem");
    const a = letterItems.find((li) => li.textContent === "lowercase a")!;
    expect(a).toHaveAttribute("data-added", "");
    expect(letterItems.find((li) => li.textContent === "capital A")).not.toHaveAttribute("data-added");
    expect(itemNames(sheet, "Icons")).toHaveLength(BOARD_ICON_NAMES.length);
    expect(itemNames(sheet, "Icons")).toContain("sun icon");
    expect(sheet.querySelector('[data-slot="character-glyph"][data-renderer="led"] svg')).not.toBeNull();
    expect(sheet).toHaveTextContent("Mixed case");
    // 26 lowercase + the degree sign: "characters", not "letters".
    expect(sheet).toHaveTextContent(
      "Adds over Vestaboard (heart flap): 27 characters, 16 icons, Mixed case, Colour spans",
    );
    expect(sheet).not.toHaveTextContent("mixedCase");
  });

  it("lists what a smaller set lacks, by name", () => {
    render(<CharacterSetSpecimen charset="led_3x5" compareTo="led_5x7" />);
    const sheet = screen.getByRole("group", { name: "LED matrix, 3×5 face" });
    expect(sheet).toHaveTextContent("Lacks from LED matrix, 5×7 face: snow, bus, train, music, bell, partly cloudy");
    expect(itemNames(sheet, "Icons")).not.toContain("bus icon");
  });
});
