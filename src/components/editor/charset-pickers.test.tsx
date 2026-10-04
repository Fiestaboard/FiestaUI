import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { CharacterSetId } from "../../lib/character-sets";
import { goldenCharacterSet } from "../../lib/charset-golden-cases";
import { ColorPickerContent } from "./color-picker-content";
import { DrawCharPickerContent } from "./draw-char-picker-content";
import { DRAW_CHARS } from "./utils/draw-mode";

/*
 * Character-set awareness in the pickers.
 *
 * Without `charset` both pickers must be byte-for-byte what they were: the
 * editor is shipped, FiestaBoard's production pickers are local copies of
 * this behaviour, and the flap set is its only set today. The snapshots in
 * ./__snapshots__ were generated against the pickers BEFORE `charset`
 * existed (commit 30467c5, the parent of this change) and are never updated
 * from the charset-aware code: a diff here is a regression, not a change.
 *
 * The one normalisation: Base UI stamps each tooltip trigger with a React
 * `useId` (`base-ui-_r_1_`), a per-process counter that depends on how
 * many ids were minted before — a property of the test run, not of the
 * picker. Everything else, attribute order included, is compared verbatim.
 */
const stableIds = (html: string) => html.replace(/id="base-ui-_r_[0-9a-z]+_"/g, 'id="base-ui-ID"');

describe("byte-identical without a charset", () => {
  it("ColorPickerContent: Flagship default, Note, heart-flap Flagship, localized", () => {
    const configs = [
      {},
      { deviceType: "note" as const },
      { deviceType: "flagship" as const, code62Glyph: "heart" as const },
      {
        deviceType: "flagship" as const,
        labels: { degreeCharacterAriaLabel: "Caractère degré", degreeLabel: "degré" },
      },
    ];
    for (const props of configs) {
      const { container, unmount } = render(<ColorPickerContent onInsert={vi.fn()} {...props} />);
      expect(stableIds(container.innerHTML)).toMatchSnapshot();
      unmount();
    }
  });

  it("DrawCharPickerContent: eraser, a selected stamp, Note heart, heart-flap Flagship", () => {
    const configs = [
      { current: { kind: "eraser" as const } },
      { current: { kind: "char" as const, char: "%" } },
      { current: { kind: "char" as const, char: "°" }, deviceType: "note" as const },
      { current: { kind: "eraser" as const }, deviceType: "flagship" as const, code62Glyph: "heart" as const },
    ];
    for (const props of configs) {
      const { container, unmount } = render(<DrawCharPickerContent onSelect={vi.fn()} {...props} />);
      expect(stableIds(container.innerHTML)).toMatchSnapshot();
      unmount();
    }
  });

  it("ColorPickerContent: the set-driven callbacks alone change nothing", () => {
    // A host that passes the new callbacks but no set gets the old picker.
    const { container } = render(
      <ColorPickerContent
        onInsert={vi.fn()}
        onInsertTextColor={vi.fn()}
        onInsertBlockColor={vi.fn()}
        onInsertIcon={vi.fn()}
      />,
    );
    const { container: plain } = render(<ColorPickerContent onInsert={vi.fn()} />);
    expect(stableIds(container.innerHTML)).toBe(stableIds(plain.innerHTML));
  });
});

/*
 * The keyboard. The swatch grid is a roving listbox whose container handles
 * the keys; everything else in the picker is a plain button. The bug this
 * pins: the container's handler used to catch Enter and Space bubbling from
 * ANY descendant and insert `{{COLORS[highlightedIndex]}}` — so Enter on an
 * icon (or, before any set existed, on the code-62 button) inserted a tile.
 */
describe("ColorPickerContent keyboard", () => {
  it("keeps Enter and Space on an icon or text colour to that button — never the highlighted tile", () => {
    const onInsert = vi.fn();
    const onInsertTextColor = vi.fn();
    const onInsertIcon = vi.fn();
    render(
      <ColorPickerContent
        onInsert={onInsert}
        onInsertTextColor={onInsertTextColor}
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
    // The button's own activation is what inserts, and it inserts THAT icon.
    fireEvent.click(sun);
    expect(onInsertIcon).toHaveBeenCalledWith("sun");
    const red = screen.getByRole("button", { name: "Red text" });
    red.focus();
    fireEvent.keyDown(red, { key: "Enter" });
    fireEvent.keyDown(red, { key: " " });
    expect(onInsert).not.toHaveBeenCalled();
    fireEvent.click(red);
    expect(onInsertTextColor).toHaveBeenCalledWith("red");
    // The groups are outside the listbox and reachable by Tab: plain
    // buttons, no roving index.
    expect(listbox.contains(sun)).toBe(false);
    expect(listbox.contains(red)).toBe(false);
    expect(sun).not.toHaveAttribute("tabindex");
    expect(red).not.toHaveAttribute("tabindex");
    // Enter on a swatch still inserts the highlighted tile.
    const swatch = screen.getByRole("option", { name: "Orange color" });
    swatch.focus();
    fireEvent.keyDown(swatch, { key: "Enter" });
    expect(onInsert).toHaveBeenCalledWith("{{orange}}");
    expect(onInsert).toHaveBeenCalledTimes(1);
  });

  it("leaves Enter on the code-62 button to that button, with and without a set", () => {
    for (const charset of [undefined, "led_5x7" as const]) {
      const onInsert = vi.fn();
      const { unmount } = render(<ColorPickerContent onInsert={onInsert} charset={charset} />);
      const listbox = screen.getByRole("listbox");
      fireEvent.focus(listbox);
      fireEvent.keyDown(listbox, { key: "ArrowRight" });
      const degree = screen.getByRole("option", { name: "Degree character" });
      degree.focus();
      const notCancelled = fireEvent.keyDown(degree, { key: "Enter" });
      // Not prevented, so the browser's own Enter-to-click fires the button.
      expect(notCancelled).toBe(true);
      expect(onInsert).not.toHaveBeenCalledWith("{{orange}}");
      fireEvent.click(degree);
      expect(onInsert).toHaveBeenCalledWith("°");
      expect(onInsert).toHaveBeenCalledTimes(1);
      unmount();
    }
  });

  it("still walks the swatch grid with the arrows and wraps", () => {
    render(<ColorPickerContent onInsert={vi.fn()} charset="led_5x7" onInsertIcon={vi.fn()} />);
    const listbox = screen.getByRole("listbox");
    fireEvent.focus(listbox);
    expect(screen.getByRole("option", { name: "Red color" })).toHaveFocus();
    fireEvent.keyDown(listbox, { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Blue color" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("option", { name: "Blue color" }), { key: "ArrowLeft" });
    expect(screen.getByRole("option", { name: "Green color" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("option", { name: "Green color" }), { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Black color" })).toHaveFocus();
    // The arrows wrap within the grid; they never leave it for an icon.
    fireEvent.keyDown(screen.getByRole("option", { name: "Black color" }), { key: "ArrowDown" });
    expect(screen.getByRole("option", { name: "Green color" })).toHaveFocus();
  });
});

describe("ColorPickerContent with a charset", () => {
  it("is tiles and code 62 only without a charset, and still so for a split-flap set", () => {
    const { rerender } = render(
      <ColorPickerContent onInsert={vi.fn()} onInsertTextColor={vi.fn()} onInsertIcon={vi.fn()} />,
    );
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.queryByRole("button", { name: /text$/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /icon$/ })).toBeNull();
    rerender(
      <ColorPickerContent
        onInsert={vi.fn()}
        onInsertTextColor={vi.fn()}
        onInsertBlockColor={vi.fn()}
        onInsertIcon={vi.fn()}
        charset="vestaboard_v1"
      />,
    );
    expect(screen.queryByRole("group")).toBeNull();
    expect(screen.getByRole("option", { name: "Degree character" })).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toHaveAttribute("data-charset", "vestaboard_v1");
  });

  it("offers text colours, block colours and icons for an LED set, through their own callbacks", () => {
    const onInsert = vi.fn();
    const onInsertTextColor = vi.fn();
    const onInsertBlockColor = vi.fn();
    const onInsertIcon = vi.fn();
    render(
      <ColorPickerContent
        onInsert={onInsert}
        onInsertTextColor={onInsertTextColor}
        onInsertBlockColor={onInsertBlockColor}
        onInsertIcon={onInsertIcon}
        charset="led_3x5"
      />,
    );
    const textGroup = screen.getByRole("group", { name: "Text colour" });
    expect(within(textGroup).getAllByRole("button")).toHaveLength(8);
    within(textGroup).getByRole("button", { name: "Red text" }).click();
    expect(onInsertTextColor).toHaveBeenCalledWith("red");
    // `{black:TEXT}` is a kept feature: black is offered too, named for what it is.
    const black = within(textGroup).getByRole("button", { name: "Black (unlit on LEDs)" });
    expect(black).toHaveAttribute("data-text-color", "black");
    // Drawn visibly: its unlit pixels carry a hairline the other glyphs lack.
    expect(black.querySelectorAll("svg [stroke]").length).toBeGreaterThan(0);
    expect(within(textGroup).getByRole("button", { name: "Red text" }).querySelectorAll("svg [stroke]")).toHaveLength(
      0,
    );
    const blockGroup = screen.getByRole("group", { name: "Block colour" });
    // Seven lit colours: a black block is an unlit cell.
    expect(within(blockGroup).getAllByRole("button")).toHaveLength(7);
    expect(within(blockGroup).queryByRole("button", { name: /^Black/ })).toBeNull();
    within(blockGroup).getByRole("button", { name: "Red block" }).click();
    expect(onInsertBlockColor).toHaveBeenCalledWith({ color: "black", background: "red" });
    const iconGroup = screen.getByRole("group", { name: "Icons" });
    within(iconGroup).getByRole("button", { name: "sun icon" }).click();
    expect(onInsertIcon).toHaveBeenCalledWith("sun");
    expect(within(iconGroup).queryByRole("button", { name: "bus icon" })).toBeNull(); // not in the 3×5 set
    expect(onInsert).not.toHaveBeenCalled();
    // Each icon and text colour is drawn by the set, not spelled out.
    expect(
      within(iconGroup).getByRole("button", { name: "sun icon" }).querySelector('[data-slot="character-glyph"] svg'),
    ).not.toBeNull();
    // Tiles are still the tile tokens, in the listbox; the code-62 button is
    // drawn by the set too.
    screen.getByRole("option", { name: "Red color" }).click();
    expect(onInsert).toHaveBeenCalledWith("{{red}}");
    expect(
      screen.getByRole("option", { name: "Degree character" }).querySelector('[data-slot="character-glyph"] svg'),
    ).not.toBeNull();
  });

  it("offers no group when the host gives no callback, even for an LED set", () => {
    render(<ColorPickerContent onInsert={vi.fn()} charset="led_5x7" />);
    expect(screen.queryByRole("group")).toBeNull();
  });

  it("lets the set decide the code-62 glyph, over deviceType", () => {
    render(<ColorPickerContent onInsert={vi.fn()} deviceType="flagship" charset="vestaboard_v2" />);
    expect(screen.getByRole("option", { name: "Heart character" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Degree character" })).toBeNull();
  });

  it("takes a plugin's set as an object and offers only what it has; an unknown id throws", () => {
    const acme = goldenCharacterSet("acme_sign_v1"); // block spans and three icons, no colour spans
    render(
      <ColorPickerContent
        onInsert={vi.fn()}
        onInsertTextColor={vi.fn()}
        onInsertBlockColor={vi.fn()}
        onInsertIcon={vi.fn()}
        charset={acme}
      />,
    );
    expect(screen.getByRole("listbox")).toHaveAttribute("data-charset", "acme_sign_v1");
    expect(screen.queryByRole("group", { name: "Text colour" })).toBeNull();
    expect(screen.getByRole("group", { name: "Block colour" })).toBeInTheDocument();
    // No ° and no ♥ in the set: nothing for a code-62 button to insert.
    expect(screen.queryByRole("option", { name: /character$/ })).toBeNull();
    const icons = within(screen.getByRole("group", { name: "Icons" })).getAllByRole("button");
    // In the icon registry's order, not the set's declaration order.
    expect(icons.map((b) => b.getAttribute("data-icon"))).toEqual(["check", "up", "down"]);
    vi.spyOn(console, "error").mockImplementation(() => {});
    // A plugin id read from JSON is not a built-in: the type stops it at
    // compile time, and a host that casts its way past that gets the throw.
    expect(() => render(<ColorPickerContent onInsert={vi.fn()} charset={"acme_sign_v1" as CharacterSetId} />)).toThrow(
      /Unknown character set "acme_sign_v1"/,
    );
  });
});

describe("DrawCharPickerContent with a charset", () => {
  it("offers every flap stamp and nothing else without a charset", () => {
    render(<DrawCharPickerContent current={{ kind: "eraser" }} onSelect={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(DRAW_CHARS.length);
    expect(screen.getByRole("group")).not.toHaveAttribute("data-charset");
    expect(screen.queryByText("Lowercase")).toBeNull();
  });

  it("adds a lowercase row for a mixed-case LED set and keeps the stamp as typed", () => {
    const onSelect = vi.fn();
    render(<DrawCharPickerContent current={{ kind: "eraser" }} onSelect={onSelect} charset="led_5x7" />);
    expect(screen.getAllByRole("button")).toHaveLength(DRAW_CHARS.length + 26);
    const a = screen.getByRole("button", { name: "a" });
    expect(a).toHaveAttribute("data-lowercase", "");
    expect(screen.getByRole("button", { name: "A" })).not.toHaveAttribute("data-lowercase");
    const heading = screen.getByText("Lowercase");
    expect(heading).toHaveAttribute("data-slot", "draw-char-picker-lowercase-heading");
    // The heading sits between the two rows.
    expect(heading.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(
      heading.compareDocumentPosition(screen.getByRole("button", { name: "Degree" })) &
        Node.DOCUMENT_POSITION_PRECEDING,
    ).toBeTruthy();
    // An LED set draws its stamps as dots.
    expect(a.querySelector('[data-slot="character-glyph"] svg')).not.toBeNull();
    a.click();
    expect(onSelect).toHaveBeenCalledWith({ kind: "char", char: "a" });
    expect(screen.getByRole("group")).toHaveAttribute("data-charset", "led_5x7");
  });

  it("walks both rows with one roving focus", () => {
    render(<DrawCharPickerContent current={{ kind: "char", char: "°" }} onSelect={vi.fn()} charset="led_5x7" />);
    const degree = screen.getByRole("button", { name: "Degree" });
    expect(degree).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(degree, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "a" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "a" }), { key: "End" });
    expect(screen.getByRole("button", { name: "z" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "z" }), { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: "A" })).toHaveFocus();
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
    // A flap set keeps the typed glyph, as the picker always has.
    expect(screen.getByRole("button", { name: "Heart" })).toHaveTextContent("♥");
    expect(screen.queryByRole("button", { name: "Degree" })).toBeNull();
    expect(screen.getByRole("button", { name: "Heart" }).querySelector("svg")).toBeNull();
  });

  it("takes a plugin's set as an object and offers only its stamps; an unknown id throws", () => {
    const acme = goldenCharacterSet("acme_sign_v1"); // A–Z, 0–9, - : . € — uppercase only, no ° or ♥
    const onSelect = vi.fn();
    render(<DrawCharPickerContent current={{ kind: "eraser" }} onSelect={onSelect} charset={acme} />);
    const offered = screen.getAllByRole("button").map((b) => b.getAttribute("data-draw-char"));
    expect(offered).toEqual(DRAW_CHARS.filter((c) => acme.chars.includes(c)));
    expect(offered).toHaveLength(26 + 10 + 3);
    expect(offered).not.toContain("°");
    expect(offered).not.toContain("a");
    expect(screen.queryByText("Lowercase")).toBeNull();
    expect(screen.getByRole("group")).toHaveAttribute("data-charset", "acme_sign_v1");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <DrawCharPickerContent
          current={{ kind: "eraser" }}
          onSelect={vi.fn()}
          charset={"acme_sign_v1" as CharacterSetId}
        />,
      ),
    ).toThrow(/Unknown character set "acme_sign_v1"/);
  });
});
