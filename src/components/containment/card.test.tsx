import { render, screen } from "@testing-library/react";
import { Info } from "lucide-react";
import { describe, expect, it } from "vitest";

import { CardTitle } from "./card";

/*
 * CardTitle's icon slot (#274) exists to settle one accessibility question and
 * one layout question, so those are what this file asserts:
 *
 *   * the glyph must not be announced — the heading's text is its accessible
 *     name, and a decorative glyph beside it would be a second voice saying
 *     the same thing;
 *   * a title WITHOUT an icon must not change, because ~40 call sites across
 *     the two apps pass none and this addition has to be free for them.
 *
 * Appearance — the muted tone, the 16px glyph, the base/lg scale — is VRT's
 * job. Tailwind does not run in jsdom, so asserting on those class strings
 * would prove only that a string was concatenated. The `data-size` stamp is
 * asserted instead, because that is the published contract consumers and VRT
 * actually select on.
 */

function icon(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="card-title-icon"]');
}

describe("CardTitle", () => {
  it("names the heading by its text, not by the glyph", () => {
    render(<CardTitle icon={<Info />}>About</CardTitle>);

    // The accessible name is the text alone. If the glyph leaked into the
    // tree this would read "About" plus whatever lucide called the svg.
    expect(screen.getByRole("heading", { name: "About" })).toBeInTheDocument();
    expect(icon()).toHaveAttribute("aria-hidden", "true");
  });

  it("renders the glyph it was handed", () => {
    render(<CardTitle icon={<Info data-testid="glyph" />}>About</CardTitle>);

    expect(icon()).toContainElement(screen.getByTestId("glyph"));
  });

  it("adds no icon wrapper when no icon is passed", () => {
    render(<CardTitle>Plain</CardTitle>);

    expect(icon()).toBeNull();
    // The flex context is the part that would change how an existing
    // title's children lay out, so it must not appear unasked.
    expect(screen.getByRole("heading", { name: "Plain" }).className).not.toContain("flex");
  });

  it("defaults to the lg scale and stamps the resolved size", () => {
    const { rerender } = render(<CardTitle>Heading</CardTitle>);
    expect(screen.getByRole("heading")).toHaveAttribute("data-size", "lg");

    rerender(<CardTitle size="base">Heading</CardTitle>);
    expect(screen.getByRole("heading")).toHaveAttribute("data-size", "base");
  });

  it("keeps a size class the consumer put on the glyph", () => {
    // The `:not([class*='size-'])` escape hatch is what makes this work in
    // the browser; here we only prove the class survives to the element it
    // has to beat, since Tailwind does not run in jsdom.
    render(<CardTitle icon={<Info data-testid="glyph" className="size-5" />}>About</CardTitle>);

    expect(screen.getByTestId("glyph")).toHaveClass("size-5");
  });

  it("honours the `as` element so a card can sit at the right heading level", () => {
    render(
      <CardTitle as="h2" icon={<Info />}>
        Section
      </CardTitle>,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Section" })).toBeInTheDocument();
  });
});
