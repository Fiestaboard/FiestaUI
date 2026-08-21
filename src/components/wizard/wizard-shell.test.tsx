import { render, screen } from "@testing-library/react";
import type * as React from "react";
import { describe, expect, it } from "vitest";

import { WizardShell } from "./wizard-shell";

/*
 * The shell holds no state, so this is a render contract rather than a
 * behaviour test: it exists because #229 replaced the hand-rolled header
 * medallion with the shared IconTile, and a silent regression there would
 * only surface in a VRT diff nobody reads.
 */

function Shell(props: { icon?: React.ReactNode }) {
  return (
    <WizardShell
      wordmark={<span>FiestaBoard</span>}
      title="Set up your board"
      steps={["Connect", "Customize", "Finish"]}
      current={2}
      progressLabel="Setup progress"
      stepTitle="Customize"
      {...props}
    >
      <p>Step body</p>
    </WizardShell>
  );
}

describe("WizardShell", () => {
  it("renders the product title, the step title and the step content", () => {
    render(<Shell />);

    expect(screen.getByRole("heading", { level: 1, name: "Set up your board" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Customize" })).toBeInTheDocument();
    expect(screen.getByText("Step body")).toBeInTheDocument();
  });

  it("wraps the brand mark in a board-toned IconTile", () => {
    render(<Shell icon={<svg role="img" aria-label="FiestaBoard mark" />} />);

    const medallion = document.querySelector('[data-slot="icon-tile"]');
    expect(medallion).not.toBeNull();
    expect(medallion).toHaveAttribute("data-tone", "board");
    expect(medallion).toHaveAttribute("data-size", "lg");

    // The wordmark is the lockup's accessible name; the mark repeats it, so
    // the tile stays out of the a11y tree.
    expect(screen.queryByRole("img", { name: "FiestaBoard mark" })).toBeNull();
    expect(screen.getByText("FiestaBoard")).toBeInTheDocument();
  });

  it("omits the medallion entirely when no icon is given", () => {
    render(<Shell />);

    expect(document.querySelector('[data-slot="icon-tile"]')).toBeNull();
  });
});
