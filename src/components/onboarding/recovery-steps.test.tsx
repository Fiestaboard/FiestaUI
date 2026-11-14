import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { cardGroundClassName } from "../containment/card";
import { RecoverySteps } from "./recovery-steps";

/*
 * RecoverySteps (slice 1.10b; 05 `36:6344`, 08 P4 `61:43307`).
 */

const STEPS = [
  { text: "Make sure the hub is plugged in and has finished starting." },
  { text: "Docker or Home Assistant? Enter its address instead, for example 192.168.1.50:4420." },
  { text: "Still stuck? On a computer on this Wi-Fi, open fiestaboard.app/find." },
];

function root(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="recovery-steps"]');
  if (!el) throw new Error("no [data-slot=recovery-steps] rendered");
  return el;
}

describe("RecoverySteps", () => {
  it("is an ordered list named by its title", () => {
    render(<RecoverySteps title="Try these, in order" steps={STEPS} />);
    const list = screen.getByRole("list", { name: "Try these, in order" });
    expect(list.tagName).toBe("OL");
    expect(list).toHaveAttribute("data-appearance", "plain");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    expect(root()).toContainElement(list);
  });

  it("numbers from 1, hidden from assistive tech, in the plain appearance", () => {
    render(<RecoverySteps title="Try these, in order" steps={STEPS} />);
    const numbers = [...root().querySelectorAll<HTMLElement>('[data-slot="numbered-step-number"]')];
    expect(numbers.map((n) => n.textContent)).toEqual(["1", "2", "3"]);
    for (const n of numbers) expect(n).toHaveAttribute("aria-hidden", "true");
  });

  it("without a title the list is unnamed and no title row renders", () => {
    render(<RecoverySteps steps={STEPS} aria-label="Fixes" />);
    expect(root().querySelector('[data-slot="recovery-steps-title"]')).toBeNull();
    expect(screen.getByRole("list", { name: "Fixes" })).toBeInTheDocument();
  });

  it("is static content: no role or live region on the card", () => {
    render(<RecoverySteps title="Try these, in order" steps={STEPS} />);
    expect(root()).not.toHaveAttribute("role");
    expect(root().querySelector("[aria-live]")).toBeNull();
  });

  it("forwards className and props to the card", () => {
    render(<RecoverySteps title="Try these" steps={STEPS} className="mt-4" id="fixes" />);
    expect(root()).toHaveAttribute("id", "fixes");
    expect(root().className).toContain("mt-4");
    for (const c of cardGroundClassName.split(" ")) expect(root()).toHaveClass(c);
  });

  it("passes `start` through: drawn numbers and announced positions agree", () => {
    render(<RecoverySteps title="Try these" steps={STEPS.slice(1)} start={2} />);
    const numbers = [...root().querySelectorAll('[data-slot="numbered-step-number"]')].map((n) => n.textContent);
    expect(numbers).toEqual(["2", "3"]);
    expect(screen.getAllByRole("listitem").map((li) => li.getAttribute("aria-posinset"))).toEqual(["2", "3"]);
  });
});
