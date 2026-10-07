import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Reveal } from "./reveal";

function reveal(): HTMLElement {
  return document.querySelector<HTMLElement>("[data-slot=reveal]")!;
}

describe("Reveal", () => {
  it("is inert and marked closed when not open", () => {
    render(
      <Reveal open={false}>
        <button type="button">hidden</button>
      </Reveal>,
    );
    expect(reveal()).toHaveAttribute("data-state", "closed");
    expect(reveal()).toHaveAttribute("inert");
    // Testing Library's role queries do not model `inert`, so assert the
    // contract the browser enforces: the control sits under an inert ancestor.
    expect(screen.getByRole("button").closest("[inert]")).toBe(reveal());
  });

  it("is reachable when open", () => {
    render(
      <Reveal open>
        <button type="button">shown</button>
      </Reveal>,
    );
    expect(reveal()).toHaveAttribute("data-state", "open");
    expect(reveal()).not.toHaveAttribute("inert");
    expect(screen.getByRole("button", { name: "shown" })).toBeInTheDocument();
  });
});
