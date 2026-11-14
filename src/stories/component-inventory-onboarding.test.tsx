import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { INVENTORY_ENTRIES } from "./component-inventory";
import { DEMOS } from "./component-inventory-demos";

/*
 * The inventory page's data and demos, run in jsdom so the changed-file
 * coverage gate can see them. Named apart from the copies other open slices
 * carry (`component-inventory.test.tsx`, `-demos`, `-cards`, `-mount`) so the
 * merges do not conflict; collapse them into one after the last merge.
 */
describe("component inventory (onboarding)", () => {
  it("has exactly one demo per inventoried name", () => {
    expect(Object.keys(DEMOS).sort()).toEqual(INVENTORY_ENTRIES.map((e) => e.name).sort());
  });

  it.each(INVENTORY_ENTRIES.map((e) => e.name))("mounts the %s demo", (name) => {
    const Demo = DEMOS[name as keyof typeof DEMOS];
    const { container } = render(<Demo />);
    expect(container).toBeInstanceOf(HTMLElement);
  });

  it("lists the onboarding section with its entries", () => {
    for (const name of ["ConnectPhoneCard", "InstallCard", "InstallSteps", "PrivacyNote", "RecoverySteps"] as const) {
      expect(INVENTORY_ENTRIES.some((e) => e.name === name)).toBe(true);
      const Demo = DEMOS[name];
      const { unmount } = render(<Demo />);
      unmount();
    }
    const Card = DEMOS.InstallCard;
    render(<Card />);
    expect(screen.getByRole("button", { name: "Install" })).toBeInTheDocument();
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

  it("runs the PromptInput submit and Toaster demo handlers", () => {
    const Prompt = DEMOS.PromptInput;
    const { container, unmount } = render(<Prompt />);
    const form = container.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);
    unmount();
    const Toast = DEMOS.Toaster;
    render(<Toast />);
    fireEvent.click(screen.getByRole("button", { name: "Show toast" }));
  });
});
