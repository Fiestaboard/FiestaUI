import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WeekCalendarInspector } from "./week-calendar-inspector";

describe("WeekCalendarInspector", () => {
  it("is a region named by its title heading, with the description line under it", () => {
    render(
      <WeekCalendarInspector title="Happy birthday Sam" description="Sat Nov 14 · 12:00 – 3:00 PM · Kitchen board" />,
    );
    const region = screen.getByRole("region", { name: "Happy birthday Sam" });
    expect(region).toHaveAttribute("data-slot", "week-calendar-inspector");
    expect(screen.getByRole("heading", { level: 2, name: "Happy birthday Sam" })).toBeInTheDocument();
    expect(region).toHaveTextContent("Sat Nov 14 · 12:00 – 3:00 PM · Kitchen board");
  });

  it("takes a heading level", () => {
    render(<WeekCalendarInspector title="Dinner" headingLevel={3} />);
    expect(screen.getByRole("heading", { level: 3, name: "Dinner" })).toBeInTheDocument();
  });

  it("draws the conflict as a polite destructive alert with its actions", () => {
    render(
      <WeekCalendarInspector
        title="Happy birthday Sam"
        conflict="Overlaps Weekend brunch from 12:00 to 1:00 PM."
        conflictActions={<button type="button">Start at 1:00 PM instead</button>}
      />,
    );
    const alert = screen.getByRole("status");
    expect(alert).toHaveAttribute("data-slot", "alert");
    expect(alert).toHaveTextContent("Overlaps Weekend brunch from 12:00 to 1:00 PM.");
    expect(alert.querySelector('[data-slot="week-calendar-inspector-conflict-actions"]')).toContainElement(
      screen.getByRole("button", { name: "Start at 1:00 PM instead" }),
    );
  });

  it("leaves the conflict out, and its actions with it, when there is none", () => {
    const { container } = render(
      <WeekCalendarInspector title="Dinner" conflictActions={<button type="button">Fix</button>} />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: "Fix" })).toBeNull();
    expect(container.querySelector('[data-slot="week-calendar-inspector-conflict-actions"]')).toBeNull();
  });

  it("renders a conflict without actions", () => {
    const { container } = render(<WeekCalendarInspector title="Dinner" conflict="Overlaps Quiet." />);
    expect(screen.getByRole("status")).toHaveTextContent("Overlaps Quiet.");
    expect(container.querySelector('[data-slot="week-calendar-inspector-conflict-actions"]')).toBeNull();
  });

  it("puts the preview, the fields and the actions in order", () => {
    const { container } = render(
      <WeekCalendarInspector
        title="Dinner"
        preview={<div data-testid="board" />}
        actions={<button type="button">Delete…</button>}
      >
        <div data-testid="fields" />
      </WeekCalendarInspector>,
    );
    const slots = [...container.querySelectorAll("[data-slot^='week-calendar-inspector-']")].map((n) =>
      n.getAttribute("data-slot"),
    );
    expect(slots).toEqual([
      "week-calendar-inspector-title",
      "week-calendar-inspector-preview",
      "week-calendar-inspector-fields",
      "week-calendar-inspector-actions",
    ]);
    expect(screen.getByTestId("board")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete…" })).toBeInTheDocument();
  });

  it("omits empty slots and passes className and props to the root", () => {
    const { container } = render(<WeekCalendarInspector title="Dinner" className="w-[458px]" id="insp" />);
    const root = container.querySelector('[data-slot="week-calendar-inspector"]');
    expect(root).toHaveClass("w-[458px]");
    expect(root).toHaveAttribute("id", "insp");
    expect(container.querySelector('[data-slot="week-calendar-inspector-preview"]')).toBeNull();
    expect(container.querySelector('[data-slot="week-calendar-inspector-fields"]')).toBeNull();
    expect(container.querySelector('[data-slot="week-calendar-inspector-actions"]')).toBeNull();
    expect(container.querySelector('[data-slot="week-calendar-inspector-description"]')).toBeNull();
  });
});
