import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColorPickerContent, colorSwatchClassName } from "./color-picker-content";
import { DrawCharPickerContent } from "./draw-char-picker-content";

/*
 * Slice 1.6b (C6): the touch sizes of the two pickers the touch bar puts in
 * sheets. Row 1.6b: swatches at 48 px, DrawChar cells ≥44 px.
 */

describe("ColorPickerContent size=touch", () => {
  it("48 px swatches and glyph buttons in a full-width grid", () => {
    render(
      <ColorPickerContent
        size="touch"
        charset="led_5x7"
        onInsert={() => {}}
        onInsertTextColor={() => {}}
        onInsertIcon={() => {}}
      />,
    );
    const red = screen.getByRole("option", { name: "Red color" });
    expect(red.className).toMatch(/\bh-12\b/);
    expect(red.className).toMatch(/\btext-sm\b/);
    expect(red.parentElement!.className).toMatch(/\bw-full\b/);
    expect(screen.getByRole("option", { name: /character/ }).className).toMatch(/\bh-12\b/);
    expect(screen.getByRole("button", { name: "Red text" }).className).toMatch(/\bh-12\b/);
    // At touch a group may open the sheet: no rule above the first.
    expect(screen.getByRole("group", { name: "Icons" }).className).toMatch(/first:border-t-0/);
  });

  it("sections pick which groups render", () => {
    const { unmount } = render(
      <ColorPickerContent
        charset="led_5x7"
        sections={["icons"]}
        onInsert={() => {}}
        onInsertTextColor={() => {}}
        onInsertIcon={() => {}}
      />,
    );
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.queryByRole("group", { name: "Text colour" })).toBeNull();
    expect(within(screen.getByRole("group", { name: "Icons" })).getAllByRole("button").length).toBeGreaterThan(0);
    unmount();

    render(
      <ColorPickerContent
        charset="led_5x7"
        sections={["tiles", "textColors"]}
        onInsert={() => {}}
        onInsertTextColor={() => {}}
        onInsertBlockColor={() => {}}
        onInsertIcon={() => {}}
      />,
    );
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Text colour" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Block colour" })).toBeNull();
    expect(screen.queryByRole("group", { name: "Icons" })).toBeNull();
  });

  it("colorSwatchClassName is the one swatch recipe at both sizes", () => {
    expect(colorSwatchClassName("red")).toMatch(/^h-10 rounded-md text-xs /);
    expect(colorSwatchClassName("red", "touch", "ring-2")).toMatch(
      /^h-12 rounded-md text-sm .* ring-2 bg-board-red text-black$/,
    );
  });
});

describe("DrawCharPickerContent size=touch", () => {
  it("44 px cells in six columns; the arrows move by the column count", () => {
    const onSelect = vi.fn();
    render(
      <DrawCharPickerContent
        size="touch"
        charset="led_5x7"
        current={{ kind: "char", char: "A" }}
        onSelect={onSelect}
      />,
    );
    const picker = screen.getByTestId("draw-char-picker");
    expect(picker).toHaveAttribute("data-size", "touch");
    expect(picker.className).toMatch(/\bw-full\b/);
    const a = screen.getByRole("button", { name: "A" });
    expect(a.className).toMatch(/\bsize-11\b/);
    expect(document.querySelector('[data-slot="draw-char-picker-lowercase-heading"]')!.className).toMatch(
      /\bcol-span-full\b/,
    );
    a.focus();
    fireEvent.keyDown(a, { key: "ArrowDown" });
    const cells = picker.querySelectorAll<HTMLButtonElement>("button");
    expect(document.activeElement).toBe(cells[6]);
    fireEvent.keyDown(cells[6], { key: "ArrowUp" });
    expect(document.activeElement).toBe(cells[0]);
    const icon = picker.querySelector<HTMLButtonElement>("[data-draw-icon]")!;
    expect(icon.className).toMatch(/\bsize-11\b/);
    fireEvent.click(icon);
    expect(onSelect).toHaveBeenCalledWith({ kind: "icon", icon: icon.dataset.drawIcon });
  });

  it("default size keeps the eight-column popover grid", () => {
    render(<DrawCharPickerContent current={{ kind: "eraser" }} onSelect={() => {}} />);
    const picker = screen.getByTestId("draw-char-picker");
    expect(picker).not.toHaveAttribute("data-size");
    const cells = picker.querySelectorAll<HTMLButtonElement>("button");
    cells[0].focus();
    fireEvent.keyDown(cells[0], { key: "ArrowDown" });
    expect(document.activeElement).toBe(cells[8]);
  });
});
