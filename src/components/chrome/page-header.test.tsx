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
});
