import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Heading, headingVariants } from "./heading";

/*
 * Heading's promises are the element it emits and the classes it composes:
 * semantic `level` and visual `size` are independent axes. No stylesheet loads
 * in jsdom, so the assertions are on class names, not computed styles.
 */

describe("Heading", () => {
  it("defaults to an h2 at the base size", () => {
    render(<Heading>Section</Heading>);

    const heading = screen.getByRole("heading", { name: "Section" });
    expect(heading.tagName).toBe("H2");
    expect(heading).toHaveAttribute("data-slot", "heading");
    expect(heading).toHaveClass("text-base", "leading-tight", "font-semibold");
  });

  it.each([1, 2, 3, 4] as const)("renders level={%i} as the matching h element", (level) => {
    render(<Heading level={level}>Title</Heading>);

    const heading = screen.getByRole("heading", { level, name: "Title" });
    expect(heading.tagName).toBe(`H${level}`);
  });

  it("renders level={1} as a page title at a hero size (#320)", () => {
    render(
      <Heading level={1} size="3xl">
        You're offline
      </Heading>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("text-3xl", "leading-tight", "tracking-tight");
    expect(heading).not.toHaveClass("text-base");
  });

  it("keeps level and size independent — an h1 does not imply a hero size", () => {
    render(<Heading level={1}>Plain h1</Heading>);

    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("text-base");
  });

  it.each([
    ["2xl", "text-2xl"],
    ["3xl", "text-3xl"],
  ] as const)("size=%s keeps its leading-tight through tailwind-merge", (size, textClass) => {
    // A `text-*` size utility supersedes a preceding `leading-*` in
    // tailwind-merge (#199), so each step must carry its own leading.
    const classes = headingVariants({ size }).split(" ");
    expect(classes).toContain(textClass);
    expect(classes).toContain("leading-tight");
  });

  it("lets a className override merge over the size step", () => {
    render(
      <Heading level={1} size="2xl" className="text-3xl">
        Override
      </Heading>,
    );

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveClass("text-3xl");
    expect(heading).not.toHaveClass("text-2xl");
  });
});
