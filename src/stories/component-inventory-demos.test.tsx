import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { INVENTORY_ENTRIES } from "./component-inventory";
import { DEMOS } from "./component-inventory-demos";

/*
 * The inventory page's data and demos, run in jsdom so the changed-file
 * coverage gate can see them: they are source files, not stories, so every
 * edit to them is gated. Appearance is VRT's job (Foundations/Inventory);
 * this only proves each demo mounts and that the two halves agree.
 *
 * #384 (slice 1.7a) adds the same mount test as component-inventory.test.tsx.
 * This file has a different name so the two open PRs cannot conflict; once
 * both are on alpha, keep one.
 */
describe("component inventory demos", () => {
  it("has exactly one demo per inventoried name", () => {
    expect(Object.keys(DEMOS).sort()).toEqual(INVENTORY_ENTRIES.map((e) => e.name).sort());
  });

  it.each(INVENTORY_ENTRIES.map((e) => e.name))("mounts the %s demo", (name) => {
    // Some demos call hooks, so each is mounted as a component, the way the
    // inventory story does, not called as a plain function.
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

  it("reorders the SortableList demo", async () => {
    const user = userEvent.setup();
    const Demo = DEMOS.SortableList;
    render(<Demo />);
    const list = screen.getByRole("list", { name: "Pages in Weekday mornings" });
    const first = within(list).getAllByRole("listitem")[0];

    await user.click(within(first).getByRole("button", { name: "Move down" }));

    expect(within(list).getAllByRole("listitem")[0]).toHaveTextContent("Morning commute");
  });
});
