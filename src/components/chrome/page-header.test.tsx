import { render, screen } from "@testing-library/react";
import { Monitor } from "lucide-react";
import { describe, expect, it } from "vitest";

import { PageHeader } from "./page-header";

describe("PageHeader collapsed", () => {
  it("renders as before when not collapsed", () => {
    render(
      <PageHeader icon={Monitor} title="Displays" description="Every board">
        <button type="button">Add</button>
      </PageHeader>,
    );
    expect(screen.getByRole("button", { name: "Add" }).closest("[inert]")).toBeNull();
    expect(screen.getByText("Every board").closest("[inert]")).toBeNull();
  });

  it("tucks the description and the action away, and keeps the h1", () => {
    render(
      <PageHeader icon={Monitor} title="Displays" description="Every board" collapsed>
        <button type="button">Add</button>
      </PageHeader>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Displays" }).closest("[inert]")).toBeNull();
    expect(screen.getByText("Every board").closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Add" }).closest("[inert]")).not.toBeNull();
  });

  it("adds no wrapper for an absent action slot", () => {
    render(<PageHeader icon={Monitor} title="Displays" description="Every board" collapsed />);
    expect(document.querySelectorAll("[data-slot=reveal]")).toHaveLength(1);
  });

  it("drops the row gap while collapsed so the tucked action leaves no band", () => {
    const { rerender } = render(
      <PageHeader icon={Monitor} title="Displays" description="Every board" collapsed>
        <button type="button">Add</button>
      </PageHeader>,
    );
    const header = (): HTMLElement => document.querySelector<HTMLElement>("[data-slot=page-header]")!;
    expect(header().className).toContain("gap-y-0");
    expect(header().className).not.toContain("gap-y-3");
    rerender(
      <PageHeader icon={Monitor} title="Displays" description="Every board">
        <button type="button">Add</button>
      </PageHeader>,
    );
    expect(header().className).toContain("gap-y-3");
    expect(header().className).toContain("transition-[row-gap]");
  });

  it("right-aligns the action slot when it wraps onto its own line", () => {
    render(
      <PageHeader icon={Monitor} title="Displays" description="Every board">
        <button type="button">Add</button>
      </PageHeader>,
    );
    const action = screen.getByRole("button", { name: "Add" }).closest("[data-slot=reveal]");
    expect(action).toHaveClass("ml-auto");
  });
});
