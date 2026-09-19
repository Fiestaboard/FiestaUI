import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusDot } from "./status-dot";

/*
 * The two documented shapes of StatusDot, pinned by the attribute each one
 * hangs its meaning on — because the third shape the docs also describe,
 * `role="img"` for a static dot, shipped broken: `img` makes its children
 * presentational (WAI-ARIA), so the sr-only label inside it was never the
 * dot's name and axe failed it as `role-img-alt` (the first thing PR #309
 * tripped over). A static dot has to be named by `aria-label`.
 */

describe("StatusDot", () => {
  it("is aria-hidden with no label", () => {
    render(<StatusDot status="success" data-testid="dot" />);

    const dot = screen.getByTestId("dot");
    expect(dot).toHaveAttribute("aria-hidden", "true");
    expect(dot).not.toHaveAttribute("role");
  });

  it("is a status live region named by real text when labelled", () => {
    render(<StatusDot status="success" label="Running" />);

    const dot = screen.getByRole("status");
    expect(dot).toHaveTextContent("Running");
    expect(dot).not.toHaveAttribute("aria-label");
  });

  it("names a role=img override with aria-label, since img children are presentational", () => {
    render(<StatusDot status="danger" label="Unavailable" role="img" />);

    const dot = screen.getByRole("img");
    expect(dot).toHaveAttribute("aria-label", "Unavailable");
    expect(dot).toBeEmptyDOMElement();
  });
});
