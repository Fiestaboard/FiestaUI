import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl, SegmentedControlItem } from "./toggle-card";

/*
 * SegmentedControl's `layout` axis (#241).
 *
 * The axis is visual — a row of hugging pills versus equal-width cells in a
 * grid — and Tailwind does not run in jsdom, so the class strings that do the
 * actual work are inert here. What IS testable, and what this file holds the
 * component to, is the resolved-variant contract the rest of the repo relies
 * on: `data-layout` / `data-columns` stamped on the group, `data-layout`
 * flowing down to every item through the group context, and — the thing a
 * layout prop must never quietly break — the radiogroup keyboard contract
 * being identical in both layouts.
 */

function Density(props: {
  layout?: "inline" | "grid";
  columns?: "2" | "3" | "4";
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}) {
  return (
    <SegmentedControl aria-label="Board density" {...props}>
      <SegmentedControlItem value="compact">Compact</SegmentedControlItem>
      <SegmentedControlItem value="cosy">Cosy</SegmentedControlItem>
      <SegmentedControlItem value="roomy">Roomy</SegmentedControlItem>
    </SegmentedControl>
  );
}

describe("SegmentedControl layout", () => {
  it("defaults to the inline row and reports no column count", () => {
    render(<Density defaultValue="cosy" />);

    const group = screen.getByRole("radiogroup", { name: "Board density" });

    expect(group).toHaveAttribute("data-layout", "inline");
    // `columns` is meaningless without a grid; stamping it anyway would
    // advertise a column count the row does not have.
    expect(group).not.toHaveAttribute("data-columns");
    for (const item of within(group).getAllByRole("radio")) {
      expect(item).toHaveAttribute("data-layout", "inline");
    }
  });

  it("stamps the grid layout on the group and every item", () => {
    render(<Density layout="grid" defaultValue="cosy" />);

    const group = screen.getByRole("radiogroup", { name: "Board density" });
    const items = within(group).getAllByRole("radio");

    expect(group).toHaveAttribute("data-layout", "grid");
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item).toHaveAttribute("data-layout", "grid");
    }
    // The layout axis must not touch selection semantics.
    expect(screen.getByRole("radio", { name: "Cosy" })).toHaveAttribute("aria-checked", "true");
  });

  it("honours columns in a grid and defaults to two", () => {
    const { unmount } = render(<Density layout="grid" columns="3" defaultValue="cosy" />);

    expect(screen.getByRole("radiogroup", { name: "Board density" })).toHaveAttribute("data-columns", "3");

    unmount();
    render(<Density layout="grid" defaultValue="cosy" />);

    expect(screen.getByRole("radiogroup", { name: "Board density" })).toHaveAttribute("data-columns", "2");
  });

  it.each(["inline", "grid"] as const)("keeps one tab stop and arrow-select in %s layout", async (layout) => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Density layout={layout} defaultValue="cosy" onValueChange={onValueChange} />);

    // One tab stop for the whole group, landing on the checked option.
    await user.tab();
    expect(screen.getByRole("radio", { name: "Cosy" })).toHaveFocus();

    // Arrows move AND select — the radiogroup contract, not ToggleGroup's.
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Roomy" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Roomy" })).toHaveAttribute("aria-checked", "true");
    // One argument, not Base UI's `(value, eventDetails)` pair.
    expect(onValueChange).toHaveBeenLastCalledWith("roomy");

    // ...and wraps at the end.
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Compact" })).toHaveFocus();

    // Tabbing again leaves the group entirely.
    await user.tab();
    for (const item of screen.getAllByRole("radio")) {
      expect(item).not.toHaveFocus();
    }
  });
});
