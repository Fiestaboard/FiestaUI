import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, type ToolState } from "./tool";

function Card({ state, open }: { state: ToolState; open?: boolean }) {
  return (
    <Tool state={state} defaultOpen={open}>
      <ToolHeader title="Create page" detail="Morning" />
      <ToolContent>
        <ToolInput input={{ name: "Morning" }} />
        <ToolOutput output="Page created." errorText={state === "output-error" ? "Name taken." : undefined} />
      </ToolContent>
    </Tool>
  );
}

describe("Tool", () => {
  it("is one expandable button named by its title and state", () => {
    render(<Card state="input-available" />);
    const header = screen.getByRole("button", { name: /Create page.*Morning.*Running/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(document.querySelector('[data-slot="tool"]')).toHaveAttribute("data-state", "input-available");
  });

  it("expands on click and shows the arguments as JSON", async () => {
    const user = userEvent.setup();
    render(<Card state="output-available" />);
    await user.click(screen.getByRole("button", { name: /Create page/ }));

    expect(screen.getByRole("button", { name: /Create page/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/"name": "Morning"/)).toBeInTheDocument();
    expect(screen.getByText("Page created.")).toBeInTheDocument();
  });

  it("opens by default when it failed, and shows the error in place of the result", () => {
    render(<Card state="output-error" />);
    expect(screen.getByRole("button", { name: /Failed/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Name taken.")).toBeInTheDocument();
    expect(screen.queryByText("Page created.")).not.toBeInTheDocument();
  });

  it("opens by default when it is waiting for approval", () => {
    render(<Card state="approval-requested" />);
    expect(screen.getByRole("button", { name: /Waiting for your approval/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("takes translated state names from labels", () => {
    render(
      <Tool state="denied" labels={{ states: { denied: "Abgelehnt" } }}>
        <ToolHeader title="Delete page" />
      </Tool>,
    );
    expect(screen.getByRole("button", { name: /Abgelehnt/ })).toBeInTheDocument();
  });

  it("renders no output block when there is nothing to show", () => {
    render(
      <Tool state="input-available" defaultOpen>
        <ToolHeader title="List pages" />
        <ToolContent>
          <ToolOutput />
        </ToolContent>
      </Tool>,
    );
    expect(document.querySelector('[data-slot="tool-output"]')).toBeNull();
  });
});
