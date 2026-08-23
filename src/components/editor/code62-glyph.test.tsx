import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ColorPickerContent } from "./color-picker-content";
import { DrawCharPickerContent } from "./draw-char-picker-content";

/*
 * Code 62 (#265). Two components decided which glyph a board draws from
 * `deviceType === "note"`. That inference is wrong on 2026 hardware: some
 * Flagships ship a heart flap in that slot, so the glyph is a property of
 * the individual board and only its owner knows (FiestaBoard#1657, #1664).
 *
 * Two distinct defects follow from it, and both are covered here:
 *
 *   1. ColorPickerContent GATED the button on isNote, so a Flagship owner
 *      could not insert code 62 from the picker at all.
 *   2. Both components word the affordance from the inference, so a
 *      heart-flap Flagship is offered a control captioned "degree" that
 *      paints a heart — a name that contradicts what is drawn (SC 1.1.1).
 *
 * Both glyphs encode to code 62 on the wire, so the INSERTED value must not
 * change with the wording. That is asserted too: it is the invariant that
 * makes this safe to be display-only.
 */

describe("ColorPickerContent code 62", () => {
  it("offers the button on a Flagship, which used to be impossible", () => {
    render(<ColorPickerContent onInsert={vi.fn()} deviceType="flagship" />);

    expect(screen.getByRole("option", { name: "Degree character" })).toBeInTheDocument();
  });

  it("words it as a degree on a Flagship that has not been told otherwise", () => {
    render(<ColorPickerContent onInsert={vi.fn()} deviceType="flagship" />);

    expect(screen.getByRole("option", { name: "Degree character" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Heart character" })).toBeNull();
  });

  it("words it as a heart on a Flagship carrying the heart flap", () => {
    render(<ColorPickerContent onInsert={vi.fn()} deviceType="flagship" code62Glyph="heart" />);

    expect(screen.getByRole("option", { name: "Heart character" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Degree character" })).toBeNull();
  });

  it("keeps the heart wording on a Note regardless of what it is told", () => {
    // Note hardware only ever shipped the heart flap, so the prop is ignored.
    render(<ColorPickerContent onInsert={vi.fn()} deviceType="note" code62Glyph="degree" />);

    expect(screen.getByRole("option", { name: "Heart character" })).toBeInTheDocument();
  });

  it("inserts the same character whichever glyph is drawn", () => {
    // Display-only: both encode to code 62 on the wire.
    const onInsert = vi.fn();
    const { rerender } = render(<ColorPickerContent onInsert={onInsert} deviceType="flagship" />);
    screen.getByRole("option", { name: "Degree character" }).click();

    rerender(<ColorPickerContent onInsert={onInsert} deviceType="flagship" code62Glyph="heart" />);
    screen.getByRole("option", { name: "Heart character" }).click();

    expect(onInsert).toHaveBeenCalledTimes(2);
    expect(onInsert.mock.calls.every(([value]) => value === "°")).toBe(true);
  });

  it("takes localized wording for both glyphs", () => {
    const { rerender } = render(
      <ColorPickerContent
        onInsert={vi.fn()}
        deviceType="flagship"
        labels={{ degreeCharacterAriaLabel: "Caractère degré" }}
      />,
    );
    expect(screen.getByRole("option", { name: "Caractère degré" })).toBeInTheDocument();

    rerender(
      <ColorPickerContent
        onInsert={vi.fn()}
        deviceType="flagship"
        code62Glyph="heart"
        labels={{ heartCharacterAriaLabel: "Caractère cœur" }}
      />,
    );
    expect(screen.getByRole("option", { name: "Caractère cœur" })).toBeInTheDocument();
  });
});

describe("DrawCharPickerContent code 62", () => {
  const noop = vi.fn();

  it("names it Degree on a Flagship that has not been told otherwise", () => {
    render(<DrawCharPickerContent current={{ kind: "char", char: "A" }} onSelect={noop} deviceType="flagship" />);

    expect(screen.getByRole("button", { name: "Degree" })).toBeInTheDocument();
  });

  it("names it Heart on a Flagship carrying the heart flap", () => {
    // The defect: this key paints a heart on such a board while announcing
    // "Degree".
    render(
      <DrawCharPickerContent
        current={{ kind: "char", char: "A" }}
        onSelect={noop}
        deviceType="flagship"
        code62Glyph="heart"
      />,
    );

    expect(screen.getByRole("button", { name: "Heart" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Degree" })).toBeNull();
  });

  it("draws the heart glyph when the flap carries one", () => {
    render(
      <DrawCharPickerContent
        current={{ kind: "char", char: "A" }}
        onSelect={noop}
        deviceType="flagship"
        code62Glyph="heart"
      />,
    );

    // The tile and the accessible name have to agree about what the board
    // draws, or it shows ♥ while announcing "Degree".
    expect(screen.getByRole("button", { name: "Heart" })).toHaveTextContent("♥");
  });

  it("still resolves a Note to the heart", () => {
    render(<DrawCharPickerContent current={{ kind: "char", char: "A" }} onSelect={noop} deviceType="note" />);

    expect(screen.getByRole("button", { name: "Heart" })).toBeInTheDocument();
  });
});
