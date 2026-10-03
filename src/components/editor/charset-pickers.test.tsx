import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColorPickerContent } from "./color-picker-content";
import { DrawCharPickerContent } from "./draw-char-picker-content";
import { DRAW_CHARS } from "./utils/draw-mode";

/*
 * Character-set awareness in the pickers. Without `charset` both pickers are
 * exactly what they were — that is asserted first, because the editor is
 * shipped and the flap set is its only set today.
 */

describe("DrawCharPickerContent with a charset", () => {
  it("offers every flap stamp and nothing else without a charset", () => {
    render(<DrawCharPickerContent current={{ kind: "eraser" }} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(DRAW_CHARS.length);
    expect(screen.getByRole("group")).not.toHaveAttribute("data-charset");
  });

  it("adds a lowercase row for a mixed-case LED set and keeps the stamp as typed", () => {
    const onSelect = vi.fn();
    render(<DrawCharPickerContent current={{ kind: "eraser" }} onSelect={onSelect} charset="led_5x7" />);
    expect(screen.getAllByRole("button")).toHaveLength(DRAW_CHARS.length + 26);
    const a = screen.getByRole("button", { name: "a" });
    expect(a).toHaveAttribute("data-lowercase", "");
    expect(screen.getByText("Lowercase")).toHaveAttribute("data-slot", "draw-char-picker-lowercase-heading");
    // An LED set draws its stamps as dots.
    expect(a.querySelector('[data-slot="character-glyph"] svg')).not.toBeNull();
    a.click();
    expect(onSelect).toHaveBeenCalledWith({ kind: "char", char: "a" });
    expect(screen.getByRole("group")).toHaveAttribute("data-charset", "led_5x7");
  });

  it("lets the set decide the code-62 glyph, over deviceType", () => {
    render(
      <DrawCharPickerContent
        current={{ kind: "eraser" }}
        onSelect={vi.fn()}
        deviceType="flagship"
        charset="vestaboard_v2"
      />,
    );
    expect(screen.getByRole("button", { name: "Heart" })).toHaveTextContent("♥");
    expect(screen.queryByRole("button", { name: "Degree" })).toBeNull();
  });
});

describe("ColorPickerContent with a charset", () => {
  it("is tiles and code 62 only without a charset, and still so for a split-flap set", () => {
    const { rerender } = render(
      <ColorPickerContent onInsert={vi.fn()} onInsertTextColor={vi.fn()} onInsertIcon={vi.fn()} />,
    );
    expect(screen.queryByRole("option", { name: /text$/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /icon$/ })).toBeNull();
    rerender(
      <ColorPickerContent
        onInsert={vi.fn()}
        onInsertTextColor={vi.fn()}
        onInsertIcon={vi.fn()}
        charset="vestaboard_v1"
      />,
    );
    expect(screen.queryByRole("option", { name: /text$/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /icon$/ })).toBeNull();
    expect(screen.getByRole("option", { name: "Degree character" })).toBeInTheDocument();
  });

  it("offers text colours and icons for an LED set, through their own callbacks", () => {
    const onInsert = vi.fn();
    const onInsertTextColor = vi.fn();
    const onInsertIcon = vi.fn();
    render(
      <ColorPickerContent
        onInsert={onInsert}
        onInsertTextColor={onInsertTextColor}
        onInsertIcon={onInsertIcon}
        charset="led_3x5"
      />,
    );
    const textGroup = screen.getByRole("group", { name: "Text colour" });
    within(textGroup).getByRole("button", { name: "Red text" }).click();
    expect(onInsertTextColor).toHaveBeenCalledWith("red");
    // `{black:TEXT}` is a kept feature: black is offered too.
    expect(within(textGroup).getByRole("button", { name: "Black (unlit on LEDs)" })).toBeInTheDocument();
    const iconGroup = screen.getByRole("group", { name: "Icons" });
    within(iconGroup).getByRole("button", { name: "sun icon" }).click();
    expect(onInsertIcon).toHaveBeenCalledWith("sun");
    expect(within(iconGroup).queryByRole("button", { name: "bus icon" })).toBeNull(); // not in the 3×5 set
    expect(onInsert).not.toHaveBeenCalled();
    // Each icon and text colour is drawn by the set, not spelled out.
    expect(
      within(iconGroup).getByRole("button", { name: "sun icon" }).querySelector('[data-slot="character-glyph"] svg'),
    ).not.toBeNull();
    // Tiles are still the tile tokens, in the listbox.
    screen.getByRole("option", { name: "Red color" }).click();
    expect(onInsert).toHaveBeenCalledWith("{{red}}");
  });

  it("keeps Enter and Space on an icon or text colour to that button — never the highlighted tile", () => {
    const onInsert = vi.fn();
    const onInsertIcon = vi.fn();
    render(
      <ColorPickerContent
        onInsert={onInsert}
        onInsertTextColor={vi.fn()}
        onInsertIcon={onInsertIcon}
        charset="led_5x7"
      />,
    );
    const listbox = screen.getByRole("listbox");
    // Arm the listbox's highlight, as a keyboard user would.
    fireEvent.focus(listbox);
    fireEvent.keyDown(listbox, { key: "ArrowRight" });
    const sun = screen.getByRole("button", { name: "sun icon" });
    sun.focus();
    fireEvent.keyDown(sun, { key: "Enter" });
    fireEvent.keyDown(sun, { key: " " });
    expect(onInsert).not.toHaveBeenCalled();
    // The groups are outside the listbox and reachable by Tab (plain buttons, no roving index).
    expect(listbox.contains(sun)).toBe(false);
    expect(sun).not.toHaveAttribute("tabindex", "-1");
    // Enter on a swatch still inserts the highlighted tile.
    const swatch = screen.getByRole("option", { name: "Orange color" });
    swatch.focus();
    fireEvent.keyDown(swatch, { key: "Enter" });
    expect(onInsert).toHaveBeenCalledWith("{{orange}}");
  });

  it("offers neither row when the host gives no callback, even for an LED set", () => {
    render(<ColorPickerContent onInsert={vi.fn()} charset="led_5x7" />);
    expect(screen.queryByRole("option", { name: /text$/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /icon$/ })).toBeNull();
  });
});
