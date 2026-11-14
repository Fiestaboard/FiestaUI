import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { INVENTORY_ENTRIES } from "./component-inventory";
import { DEMOS } from "./component-inventory-demos";

/*
 * The inventory page's data and demos, run in jsdom so the changed-file
 * coverage gate can see them (they are source files, not stories, so every
 * edit to them is gated). Appearance is VRT's job (Foundations/Inventory);
 * this only proves each demo mounts and that the two halves agree.
 *
 * Same shape as #384's `component-inventory.test.tsx` and #389's
 * `component-inventory-demos.test.tsx`, under its own name so the open slices
 * do not collide on one path; fold them into one file once they have landed.
 */
describe("component inventory (mount)", () => {
  it("has exactly one demo per inventoried name", () => {
    expect(Object.keys(DEMOS).sort()).toEqual(INVENTORY_ENTRIES.map((e) => e.name).sort());
  });

  it.each(INVENTORY_ENTRIES.map((e) => e.name))("mounts the %s demo", (name) => {
    // Some demos call hooks, so each is mounted as a component, the way the
    // inventory story does, not called as a plain function.
    const Demo = DEMOS[name as keyof typeof DEMOS];
    const { container } = render(<Demo />);
    expect(container.childElementCount).toBeGreaterThan(0);
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
});
