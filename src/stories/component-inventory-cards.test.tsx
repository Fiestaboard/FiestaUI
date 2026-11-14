import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { INVENTORY_ENTRIES } from "./component-inventory";
import { DEMOS } from "./component-inventory-demos";

/*
 * The inventory page's data and demos, run in jsdom so the changed-file
 * coverage gate can see them. Appearance is VRT's job (Foundations/Inventory);
 * this proves each demo mounts and that the two halves agree.
 *
 * #384 / #387 add `component-inventory.test.tsx` and #389 adds
 * `component-inventory-demos.test.tsx` with the same mount test. This file is
 * named apart so the open PRs cannot conflict; once they are all on alpha,
 * keep one.
 */
describe("component inventory demos (1.8c)", () => {
  it("has exactly one demo per inventoried name", () => {
    expect(Object.keys(DEMOS).sort()).toEqual(INVENTORY_ENTRIES.map((e) => e.name).sort());
  });

  it.each(INVENTORY_ENTRIES.map((e) => e.name))("mounts the %s demo", (name) => {
    const Demo = DEMOS[name as keyof typeof DEMOS];
    const { container } = render(<Demo />);
    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("toggles the ThemeToggle demo both ways", () => {
    const Demo = DEMOS.ThemeToggle;
    render(<Demo />);
    const toggle = screen.getByRole("button", { name: "Toggle theme" });
    const before = toggle.outerHTML;
    fireEvent.click(toggle);
    expect(toggle.outerHTML).not.toBe(before);
    fireEvent.click(toggle);
    expect(toggle.outerHTML).toBe(before);
  });

  it("the ChoiceCard demo is a radiogroup with the Flagship selected", () => {
    const Demo = DEMOS.ChoiceCard;
    render(<Demo />);
    expect(screen.getByRole("radiogroup", { name: "Display type" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Vestaboard Flagship" })).toHaveAttribute("aria-checked", "true");
  });
});
