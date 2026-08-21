import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Swatch, SwatchGroup } from "./swatch";

/*
 * Swatch has no visible label and no text content, so its ENTIRE contract is
 * in the accessibility tree — which is exactly what jsdom can see and VRT
 * cannot. The fill colour is the one thing this file deliberately does not
 * assert: `color` lands as an inline `background-color`, jsdom's CSS parser
 * mangles `var(--token)` values, and appearance is VRT's job anyway.
 */

/**
 * Narrowly typed on purpose: `SwatchGroupProps` requires `aria-label` OR
 * `aria-labelledby` at the type level, so a fixture that spread a partial
 * over it would fail `tsc`. The name is supplied here and is not overridable.
 */
function BoardColour(props: {
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onValueChange?: (value: string) => void;
}) {
  return (
    <SwatchGroup aria-label="Board colour" {...props}>
      <Swatch value="black" color="#0d0d0d" label="Black" />
      <Swatch value="white" color="#fafafa" label="White" />
      <Swatch value="orange" color="#f5a623" label="Orange" />
    </SwatchGroup>
  );
}

describe("SwatchGroup", () => {
  it("is a named radiogroup of radios, not N unrelated toggle buttons", () => {
    render(<BoardColour defaultValue="black" />);

    const group = screen.getByRole("radiogroup", { name: "Board colour" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);

    // The bug this component exists to delete: three hand-rolled copies in
    // the app put aria-pressed on a one-of-N choice.
    expect(screen.queryByRole("button", { pressed: true })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Black" })).not.toHaveAttribute("aria-pressed");
  });

  it("takes each swatch's accessible name from `label` alone", () => {
    render(<BoardColour defaultValue="black" />);

    // No visible text, no title attribute, no reliance on the hex value —
    // "Black" is a name, "#0d0d0d" is not.
    expect(screen.getByRole("radio", { name: "Black" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "White" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Orange" })).toBeInTheDocument();
  });

  it("reports the selected option with aria-checked and data-checked", () => {
    render(<BoardColour defaultValue="white" />);

    const white = screen.getByRole("radio", { name: "White" });
    expect(white).toHaveAttribute("aria-checked", "true");
    // data-checked is what drives the selection ring and the check disc in
    // CSS; asserting it here is asserting that the non-colour cue can fire.
    expect(white).toHaveAttribute("data-checked");
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "false");
  });

  it("keeps one tab stop for the whole group", async () => {
    const user = userEvent.setup();
    render(<BoardColour defaultValue="black" />);

    await user.tab();
    expect(screen.getByRole("radio", { name: "Black" })).toHaveFocus();

    // Tabbing again leaves the group entirely — that is roving tabindex, and
    // it is the second half of the a11y bug in the hand-rolled copies.
    await user.tab();
    expect(screen.getByRole("radio", { name: "White" })).not.toHaveFocus();
    expect(screen.getByRole("radio", { name: "Orange" })).not.toHaveFocus();
  });

  it("moves AND selects with the arrow keys", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardColour defaultValue="black" onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard("{ArrowRight}");

    const white = screen.getByRole("radio", { name: "White" });
    expect(white).toHaveFocus();
    expect(white).toHaveAttribute("aria-checked", "true");
    // A radiogroup selects as it traverses — unlike ToggleGroup, which only
    // moves focus. Exactly one argument: Base UI's `(value, eventDetails)`
    // pair must be normalised or `onValueChange={setState}` breaks.
    expect(onValueChange).toHaveBeenCalledWith("white");
  });

  it("wraps at both ends", async () => {
    const user = userEvent.setup();
    render(<BoardColour defaultValue="black" />);

    await user.tab();
    await user.keyboard("{ArrowLeft}");

    expect(screen.getByRole("radio", { name: "Orange" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Orange" })).toHaveAttribute("aria-checked", "true");
  });

  it("jumps to the first and last option with Home and End", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardColour defaultValue="white" onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Orange" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Orange" })).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Black" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");

    expect(onValueChange).toHaveBeenNthCalledWith(1, "orange");
    expect(onValueChange).toHaveBeenNthCalledWith(2, "black");
  });

  it("never empties the selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardColour defaultValue="black" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "Black" }));

    // Re-picking the picked option in a radiogroup is a no-op, not "none" —
    // the difference from ToggleGroup, and the reason a board always has a
    // colour.
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).not.toHaveBeenCalledWith("");
  });

  it("reports a click with the new value and nothing else", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardColour defaultValue="black" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "Orange" }));

    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("orange");
  });

  it("honours a controlled value without self-selecting", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardColour value="black" onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "White" }));

    expect(onValueChange).toHaveBeenCalledWith("white");
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "White" })).toHaveAttribute("aria-checked", "false");
  });

  it("inherits disabled from the group down to every swatch", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<BoardColour disabled defaultValue="black" onValueChange={onValueChange} />);

    for (const swatch of screen.getAllByRole("radio")) {
      expect(swatch).toBeDisabled();
    }

    await user.click(screen.getByRole("radio", { name: "White" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("disables one option without disabling the group", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <SwatchGroup aria-label="Board colour" defaultValue="black" onValueChange={onValueChange}>
        <Swatch value="black" color="#0d0d0d" label="Black" />
        <Swatch value="white" color="#fafafa" label="White" disabled />
      </SwatchGroup>,
    );

    expect(screen.getByRole("radio", { name: "Black" })).not.toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "White" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("flows its size to every swatch and lets one override it", () => {
    render(
      <SwatchGroup aria-label="Board colour" size="lg" defaultValue="black">
        <Swatch value="black" color="#0d0d0d" label="Black" />
        <Swatch value="white" color="#fafafa" label="White" size="sm" />
      </SwatchGroup>,
    );

    // data-size is published API — the same hook ToggleCard and Button expose.
    expect(screen.getByRole("radio", { name: "Black" })).toHaveAttribute("data-size", "lg");
    expect(screen.getByRole("radio", { name: "White" })).toHaveAttribute("data-size", "sm");
  });

  it("defaults to md and stamps the family's data-slots", () => {
    const { container } = render(<BoardColour defaultValue="black" />);

    expect(screen.getByRole("radiogroup")).toHaveAttribute("data-slot", "swatch-group");

    const black = screen.getByRole("radio", { name: "Black" });
    expect(black).toHaveAttribute("data-slot", "swatch");
    expect(black).toHaveAttribute("data-size", "md");

    // The fill is a child element, not the target: the selection ring and the
    // focus ring both live outside it and would erase each other if they
    // shared one box-shadow. The split is structural and worth pinning.
    const fill = container.querySelector('[data-slot="swatch-fill"]');
    expect(fill).not.toBeNull();
    expect(fill).toHaveAttribute("aria-hidden", "true");
    expect(black).toContainElement(fill as HTMLElement);
  });

  it("submits under a form name as a radio group", () => {
    render(
      <SwatchGroup aria-label="Board colour" name="board_color" defaultValue="black">
        <Swatch value="black" color="#0d0d0d" label="Black" />
        <Swatch value="white" color="#fafafa" label="White" />
      </SwatchGroup>,
    );

    const inputs = document.querySelectorAll('input[type="radio"][name="board_color"]');
    expect(inputs).toHaveLength(2);
  });
});

describe("Swatch", () => {
  it("is an aria-pressed toggle button when standalone", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(<Swatch color="#f5a623" label="Orange" pressed={false} onPressedChange={onPressedChange} />);

    const swatch = screen.getByRole("button", { name: "Orange" });
    expect(swatch).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();

    await user.click(swatch);

    // One argument, like every other onPressedChange in the package.
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(onPressedChange).toHaveBeenCalledWith(true);
  });

  it("emits no aria-pressed when `pressed` is omitted", () => {
    render(<Swatch color="#f5a623" label="Orange" />);

    // `pressed === undefined` means "not a toggle at all" — a swatch that
    // merely opens a picker. aria-pressed="false" would announce a state it
    // does not have.
    const swatch = screen.getByRole("button", { name: "Orange" });
    expect(swatch).not.toHaveAttribute("aria-pressed");
    expect(swatch).not.toHaveAttribute("aria-checked");
  });

  it("keeps its own tab stop when standalone", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Swatch color="#0d0d0d" label="Black" pressed={false} />
        <Swatch color="#fafafa" label="White" pressed={false} />
      </>,
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Black" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "White" })).toHaveFocus();
  });
});
