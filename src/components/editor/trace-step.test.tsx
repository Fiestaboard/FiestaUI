import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { TraceStep } from "./trace-step";

describe("TraceStep", () => {
  it("shows the evaluated expression and value with a noninteractive status cue", () => {
    const { container } = render(<TraceStep expression="SUM(3, 4)" value="7" />);
    expect(screen.getByText("SUM(3, 4)")).toBeVisible();
    expect(screen.getByText("7")).toBeVisible();
    expect(screen.getByText("Evaluated")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="trace-step-icon"]')).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
  it("exposes an error and preserves the actual error tag", () => {
    const { container } = render(<TraceStep state="error" expression="weather.temp" value="#REF" />);
    expect(screen.getByText("#REF")).toBeVisible();
    expect(screen.getByText("Error")).toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("data-state", "error");
    expect(container.querySelector('[data-slot="trace-step-icon"]')).toHaveAttribute("data-state", "error");
  });
  it("identifies a branch not evaluated independently of its muted color", () => {
    const { container } = render(<TraceStep state="skipped" expression="SEND()" value="—" />);
    expect(screen.getByText("Skipped")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="trace-step-icon"]')).toHaveAttribute("data-state", "skipped");
    expect(screen.getByText("SEND()")).toBeVisible();
  });
  it.each([
    [2, 2],
    [2.9, 2],
    [-2, 0],
    [NaN, 0],
    [Infinity, 0],
  ])("normalizes depth %s to level %s", (depth, expected) => {
    const { container } = render(<TraceStep expression="x" value="1" depth={depth} />);
    expect(container.firstChild).toHaveAttribute("data-depth", String(expected));
  });
  it("supports localized state labels and forwards row semantics/ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <div role="list">
        <TraceStep ref={ref} role="listitem" expression="x" value="1" labels={{ ok: "Calculé" }} />
      </div>,
    );
    expect(screen.getByText("Calculé")).toBeInTheDocument();
    expect(ref.current).toBe(screen.getByRole("listitem"));
  });
  it("keeps long source and value available without truncating their strings", () => {
    const expression = 'IF(ISBLANK(weather.current.temperature), "Not available", weather.current.temperature)';
    const value = "Not available until the integration reconnects";
    render(<TraceStep expression={expression} value={value} depth={100} />);
    expect(screen.getByText(expression)).toBeVisible();
    expect(screen.getByText(value)).toBeVisible();
  });
});
