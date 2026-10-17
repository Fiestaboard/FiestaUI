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

  it("slides on the translate property while closed and carries none when open", () => {
    const { rerender } = render(
      <Reveal open={false}>
        <span>x</span>
      </Reveal>,
    );
    const inner = (): HTMLElement => reveal().firstElementChild as HTMLElement;
    // Tailwind 4 translate utilities set `translate`, so the transition must
    // name it or the slide snaps.
    expect(inner().className).toContain("transition-[opacity,translate]");
    expect(inner().className).toContain("-translate-y-1");
    rerender(
      <Reveal open>
        <span>x</span>
      </Reveal>,
    );
    expect(inner().className).not.toMatch(/(^|\s)-?translate-y-/);
  });
});
