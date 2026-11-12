/* eslint-disable jsx-a11y/anchor-has-content -- the card replaces the anchor's children; asserted below */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PagePreviewCard } from "./page-preview-card";

/*
 * The accessibility tree and the data-slot contract. The board is drawn at
 * actual size and cropped, never scaled (owner rule 9) — that is VRT's job.
 */

function card(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="page-preview-card"]');
  if (!el) throw new Error("no [data-slot=page-preview-card] element rendered");
  return el;
}

describe("PagePreviewCard", () => {
  it("is a button named by the title, described by the subtitle", () => {
    render(
      <PagePreviewCard
        title="Dinner note"
        description="Last shown yesterday, 6:30 PM"
        board={<div data-testid="board">board</div>}
      />,
    );
    const button = screen.getByRole("button", { name: "Dinner note" });
    expect(button).toBe(card());
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAccessibleDescription("Last shown yesterday, 6:30 PM");
  });

  it("keeps the board out of the accessibility tree and inside the board slot", () => {
    render(<PagePreviewCard title="Dinner note" board={<div data-testid="board">GOOD MORNING</div>} />);
    const slot = screen.getByTestId("board").parentElement;
    expect(slot).toHaveAttribute("data-slot", "page-preview-card-board");
    expect(slot).toHaveAttribute("aria-hidden", "true");
  });

  it("shows a decorative chevron by default", () => {
    render(<PagePreviewCard title="Dinner note" />);
    const trailing = card().querySelector('[data-slot="page-preview-card-trailing"]');
    expect(trailing).toHaveAttribute("data-kind", "chevron");
    expect(trailing).toHaveAttribute("aria-hidden", "true");
  });

  it("selected: aria-current, data-selected and a check in place of the chevron", () => {
    render(<PagePreviewCard title="Dinner note" selected />);
    expect(card()).toHaveAttribute("aria-current", "true");
    expect(card()).toHaveAttribute("data-selected", "");
    expect(card().querySelector('[data-slot="page-preview-card-trailing"]')).toHaveAttribute("data-kind", "check");
  });

  it("trailing={null} removes the chevron; custom trailing renders as given", () => {
    const { rerender } = render(<PagePreviewCard title="A" trailing={null} />);
    expect(card().querySelector('[data-slot="page-preview-card-trailing"]')).toBeNull();
    rerender(<PagePreviewCard title="A" trailing={<span data-testid="t">3</span>} />);
    expect(screen.getByTestId("t").closest('[data-slot="page-preview-card-trailing"]')).toHaveAttribute(
      "data-kind",
      "custom",
    );
  });

  it("fires onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<PagePreviewCard title="Dinner note" onClick={onClick} />);
    await user.click(screen.getByRole("button", { name: "Dinner note" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("render={<a href>} makes the whole card a real link", () => {
    render(
      <PagePreviewCard title="Birthday · Sam" description="Flagship · made by Maya" render={<a href="/pages/1" />} />,
    );
    const link = screen.getByRole("link", { name: "Birthday · Sam" });
    expect(link).toHaveAttribute("href", "/pages/1");
    expect(link).not.toHaveAttribute("type");
    expect(link).toHaveAttribute("data-slot", "page-preview-card");
    expect(link).toHaveAccessibleDescription("Flagship · made by Maya");
  });

  it("disabled: native disabled on the button, aria-disabled + guard on a link", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<PagePreviewCard title="A" disabled onClick={onClick} />);
    expect(screen.getByRole("button", { name: "A" })).toBeDisabled();
    rerender(<PagePreviewCard title="A" disabled onClick={onClick} render={<a href="/a" />} />);
    const link = screen.getByRole("link", { name: "A" });
    expect(link).toHaveAttribute("aria-disabled", "true");
    await user.click(link);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets the caller name the card", () => {
    render(<PagePreviewCard title="A" aria-label="Open A" aria-describedby="x" />);
    const button = screen.getByRole("button", { name: "Open A" });
    expect(button).not.toHaveAttribute("aria-labelledby");
    expect(button).toHaveAttribute("aria-describedby", "x");
  });
});
