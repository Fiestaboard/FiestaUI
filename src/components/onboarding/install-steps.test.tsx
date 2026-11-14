import { render, screen, within } from "@testing-library/react";
import { Check, Ellipsis, Plus } from "lucide-react";
import { describe, expect, it } from "vitest";

import { InstallSteps } from "./install-steps";

/*
 * InstallSteps (slice 1.10a; 07 `58:35303` step rows, 08 W6 `65:36351`).
 */

const STEPS = [
  { text: "Tap ⋯ in Safari’s address bar, then Share.", icon: <Ellipsis /> },
  { text: "Scroll down and tap Add to Home Screen.", icon: <Plus /> },
  { text: "Leave Open as Web App on, then tap Add.", icon: <Check /> },
];

describe("InstallSteps", () => {
  it("is an ordered list with one item per step, in order", () => {
    render(<InstallSteps steps={STEPS} aria-label="Add to Home Screen" />);
    const list = screen.getByRole("list", { name: "Add to Home Screen" });
    expect(list.tagName).toBe("OL");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining(STEPS[0].text),
      expect.stringContaining(STEPS[1].text),
      expect.stringContaining(STEPS[2].text),
    ]);
  });

  it("keeps list semantics explicit (Safari drops them under list-style: none)", () => {
    render(<InstallSteps steps={STEPS} />);
    expect(document.querySelector("ol")).toHaveAttribute("role", "list");
  });

  it("draws 1-based numbers, hidden from assistive tech", () => {
    render(<InstallSteps steps={STEPS} />);
    const numbers = [...document.querySelectorAll<HTMLElement>('[data-slot="numbered-step-number"]')];
    expect(numbers.map((n) => n.textContent)).toEqual(["1", "2", "3"]);
    for (const n of numbers) expect(n).toHaveAttribute("aria-hidden", "true");
    // The accessible text of an item is the step copy only.
    expect(screen.getAllByRole("listitem")[0]).toHaveAccessibleName("");
    expect(screen.getAllByRole("listitem")[0].textContent).toBe(`1${STEPS[0].text}`);
  });

  it("starts numbering at `start`", () => {
    render(<InstallSteps steps={STEPS.slice(1)} start={2} />);
    const numbers = [...document.querySelectorAll('[data-slot="numbered-step-number"]')].map((n) => n.textContent);
    expect(numbers).toEqual(["2", "3"]);
    expect(document.querySelector("ol")).toHaveAttribute("start", "2");
  });

  it("with `start`, the announced position agrees with the drawn number", () => {
    render(<InstallSteps steps={STEPS.slice(1)} start={2} />);
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.getAttribute("aria-posinset"))).toEqual(["2", "3"]);
    expect(items.map((li) => li.getAttribute("aria-setsize"))).toEqual(["3", "3"]);
  });

  it("from 1, leaves position to the list (no posinset)", () => {
    render(<InstallSteps steps={STEPS} />);
    for (const li of screen.getAllByRole("listitem")) {
      expect(li).not.toHaveAttribute("aria-posinset");
      expect(li).not.toHaveAttribute("aria-setsize");
    }
  });

  it("renders the trailing glyph aria-hidden, and omits the slot when there is none", () => {
    render(<InstallSteps steps={[STEPS[0], { text: "No glyph here." }]} />);
    const icons = document.querySelectorAll<HTMLElement>('[data-slot="numbered-step-icon"]');
    expect(icons).toHaveLength(1);
    expect(icons[0]).toHaveAttribute("aria-hidden", "true");
    expect(icons[0].querySelector("svg")).not.toBeNull();
  });

  it("uses an explicit id as the key and forwards props", () => {
    render(
      <InstallSteps
        steps={[
          { id: "a", text: "First" },
          { id: "b", text: "Second" },
        ]}
        className="mt-2"
        data-testid="steps"
      />,
    );
    const list = screen.getByTestId("steps");
    expect(list).toHaveAttribute("data-slot", "install-steps");
    expect(list).toHaveAttribute("data-appearance", "panel");
    expect(list.className).toContain("mt-2");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });
});
