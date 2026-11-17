import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { ListRowGroup } from "../containment/list-row";
import { ProblemItem } from "./problem-item";

describe("ProblemItem", () => {
  it("keeps a translated visible jump label in the accessible name without a second translation", () => {
    render(<ProblemItem severity="error" message="Zeile 2" labels={{ jump: "Zur Ursache" }} onJump={vi.fn()} />);
    expect(screen.getByRole("button")).toHaveAccessibleName("Zur Ursache: Zeile 2");
  });
  it.each(["error", "warning"] as const)("names %s without relying on color or live announcements", (severity) => {
    render(<ProblemItem severity={severity} message="Missing data" detail="Last update 2 h ago" />);
    expect(screen.getByRole("img", { name: severity === "error" ? "Error" : "Warning" })).toBeInTheDocument();
    expect(screen.getByText("Missing data")).toBeVisible();
    expect(screen.getByText("Last update 2 h ago")).toBeVisible();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("composes ListRowGroup with independent fix and jump buttons", async () => {
    const user = userEvent.setup();
    const fix = vi.fn();
    const jump = vi.fn();
    render(
      <ListRowGroup aria-label="Problems" variant="plain">
        <ProblemItem
          severity="error"
          message="#REF · Row 12"
          detail="muni.next does not exist"
          fixes={[{ id: "fix", label: "Use muni:home.next", onClick: fix }]}
          onJump={jump}
        />
      </ListRowGroup>,
    );
    const row = screen.getByRole("listitem");
    const button = within(row).getByRole("button", { name: "Use muni:home.next" });
    await user.click(button);
    await user.keyboard("{Enter} ");
    expect(fix).toHaveBeenCalledTimes(3);
    await user.tab();
    expect(within(row).getByRole("button", { name: "Jump: #REF · Row 12" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(jump).toHaveBeenCalledOnce();
    expect(row.querySelector("button button")).toBeNull();
  });

  it("keeps actions non-submitting and individual fixes disabled", () => {
    const submit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const fix = vi.fn();
    const jump = vi.fn();
    render(
      <form onSubmit={submit}>
        <ProblemItem
          severity="warning"
          message="Dependency"
          fixes={[
            { id: "disabled", label: "Update", onClick: fix, disabled: true },
            { id: "enabled", label: "Review", onClick: fix, variant: "outline" },
          ]}
          onJump={jump}
        />
      </form>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    expect(fix).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Review" }));
    fireEvent.click(screen.getByRole("button", { name: /Jump:/ }));
    expect(fix).toHaveBeenCalledOnce();
    expect(jump).toHaveBeenCalledOnce();
    expect(submit).not.toHaveBeenCalled();
  });

  it("disables every action without hiding the explanation", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(
      <ProblemItem
        severity="error"
        message="Cannot save"
        detail="Unknown function"
        disabled
        fixes={[{ id: "fix", label: "Fix", onClick: action }]}
        onJump={action}
      />,
    );
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    await user.tab();
    expect(document.activeElement).toBe(document.body);
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByText("Unknown function")).toBeVisible();
  });

  it.each(["row", "card"] as const)("forwards root attributes and renders diagnostic content in %s", (presentation) => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ProblemItem
        ref={ref}
        id="problem"
        className="custom"
        data-testid="problem"
        severity="error"
        message="Line 1"
        detail="Unknown function"
        diagnostic={<code>Formula #NAME?: FORMATDAT</code>}
        presentation={presentation}
        layout="inline"
        size="touch"
        fixes={[{ id: "fix", label: "Use FORMATDATE and save", onClick: vi.fn(), variant: "default" }]}
        onJump={vi.fn()}
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("problem"));
    expect(ref.current).toHaveAttribute("id", "problem");
    expect(ref.current).toHaveClass("custom");
    expect(ref.current).toHaveAttribute("data-presentation", presentation);
    expect(screen.getByText("Formula #NAME?: FORMATDAT")).toBeVisible();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("places card fixes outside the tinted Alert", () => {
    render(
      <ProblemItem
        severity="warning"
        presentation="card"
        message="Review this"
        fixes={[{ id: "fix", label: "Fix it", onClick: vi.fn() }]}
      />,
    );
    const alert = document.querySelector('[data-slot="alert"]');
    expect(alert).toHaveTextContent("Review this");
    expect(alert).not.toContainElement(screen.getByRole("button"));
  });

  it("accepts translated severity/jump names and preserves long copy", () => {
    const message = "Eine sehr lange Fehlermeldung ".repeat(20);
    render(
      <ProblemItem
        severity="warning"
        message={message}
        onJump={vi.fn()}
        labels={{ warning: "Warnung", jump: "Zur Ursache" }}
      />,
    );
    expect(screen.getByRole("img", { name: "Warnung" })).toBeInTheDocument();
    expect(screen.getByRole("button")).toHaveTextContent("Zur Ursache");
    expect(screen.getByRole("button")).toHaveAccessibleName(`Zur Ursache: ${message.trim()}`);
  });

  it("supports a card without detail, diagnostic, or actions", () => {
    render(<ProblemItem presentation="card" severity="error" message="A problem" />);
    expect(screen.getByText("A problem")).toBeVisible();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
