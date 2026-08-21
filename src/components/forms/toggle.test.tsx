import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Toggle, ToggleGroup } from "./toggle";

/*
 * EXEMPLAR — ARIA state and selection semantics.
 *
 * ToggleGroup is where a jsdom unit test earns its keep, because everything it
 * promises lives in the accessibility tree rather than in pixels: `aria-pressed`
 * per item, ONE tab stop for the whole group (roving tabindex), arrow keys that
 * move focus without committing, and a single-select model that — unlike the
 * radiogroups in toggle-card.tsx — can legally be emptied.
 *
 * The pattern to copy for any stateful component:
 *
 *   • Query by role and accessible name. `getByRole("button", { pressed: true })`
 *     asks the same question a screen reader does; `container.querySelector`
 *     asks a question no user can.
 *   • Assert the state transition, not the styling that follows from it. The
 *     pressed FILL is VRT's job; `aria-pressed="true"` is this file's.
 *   • Prove the keyboard contract explicitly — here, that ArrowRight moves
 *     focus but does NOT change the selection, which is the single behaviour
 *     separating this component from SegmentedControl.
 */

/**
 * The fixture is typed with only the props the tests vary, deliberately: the
 * group's name is supplied here and NOT overridable, because `ToggleGroupProps`
 * requires `aria-label` or `aria-labelledby` and spreading a partial over it
 * would make every render site re-satisfy that union.
 */
function Toolbar(props: {
  defaultValue?: string[];
  multiple?: boolean;
  disabled?: boolean;
  onValueChange?: (groupValue: string[]) => void;
}) {
  return (
    <ToggleGroup aria-label="Text alignment" {...props}>
      <Toggle value="left">Left</Toggle>
      <Toggle value="center">Center</Toggle>
      <Toggle value="right">Right</Toggle>
    </ToggleGroup>
  );
}

describe("ToggleGroup", () => {
  it("names the group and exposes each item as a toggle button", () => {
    render(<Toolbar defaultValue={["left"]} />);

    const group = screen.getByRole("group", { name: "Text alignment" });
    const items = within(group).getAllByRole("button");

    expect(items).toHaveLength(3);
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Center" })).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps one tab stop for the whole group", async () => {
    const user = userEvent.setup();
    render(<Toolbar defaultValue={["left"]} />);

    await user.tab();
    expect(screen.getByRole("button", { name: "Left" })).toHaveFocus();

    // Tabbing again must leave the group entirely — that is what roving
    // tabindex buys, and it is invisible to any assertion but this one.
    await user.tab();
    expect(screen.getByRole("button", { name: "Center" })).not.toHaveFocus();
    expect(screen.getByRole("button", { name: "Right" })).not.toHaveFocus();
  });

  it("moves focus with ArrowRight without committing a selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Toolbar defaultValue={["left"]} onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("button", { name: "Center" })).toHaveFocus();
    // The whole reason this is a toolbar and not a radiogroup: traversing an
    // editor toolbar must not re-align the document at every stop.
    expect(onValueChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true");
  });

  it("commits the focused item on Space and reports the new value array", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Toolbar defaultValue={["left"]} onValueChange={onValueChange} />);

    await user.tab();
    await user.keyboard("{ArrowRight} ");

    expect(onValueChange).toHaveBeenCalledWith(["center"]);
    expect(screen.getByRole("button", { name: "Center" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "false");
  });

  it("lets a single-select group be emptied by pressing the pressed item", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Toolbar defaultValue={["left"]} onValueChange={onValueChange} />);

    await user.click(screen.getByRole("button", { name: "Left" }));

    // "None of these" is expressible here and is NOT expressible in a
    // radiogroup — the documented reason ToggleGroup exists alongside
    // SegmentedControl.
    expect(onValueChange).toHaveBeenCalledWith([]);
    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "false");
  });

  it("allows any-of-N when multiple", async () => {
    const user = userEvent.setup();
    render(<Toolbar multiple defaultValue={["left"]} />);

    await user.click(screen.getByRole("button", { name: "Right" }));

    expect(screen.getByRole("button", { name: "Left" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Right" })).toHaveAttribute("aria-pressed", "true");
  });

  it("inherits disabled from the group down to every item", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Toolbar disabled defaultValue={["left"]} onValueChange={onValueChange} />);

    for (const item of screen.getAllByRole("button")) {
      expect(item).toBeDisabled();
    }

    await user.click(screen.getByRole("button", { name: "Center" }));
    expect(onValueChange).not.toHaveBeenCalled();
  });
});

describe("Toggle", () => {
  it("owns its pressed state when standalone", async () => {
    const user = userEvent.setup();
    const onPressedChange = vi.fn();
    render(
      <Toggle aria-label="Bold" onPressedChange={onPressedChange}>
        B
      </Toggle>,
    );

    const toggle = screen.getByRole("button", { name: "Bold" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    await user.click(toggle);

    // One argument, not Base UI's `(pressed, eventDetails)` pair — the wrapper
    // narrows the signature so `onPressedChange={setBold}` behaves.
    expect(onPressedChange).toHaveBeenCalledWith(true);
    expect(onPressedChange).toHaveBeenCalledTimes(1);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });
});
