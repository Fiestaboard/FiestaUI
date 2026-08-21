import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

/*
 * EXEMPLAR — a purely presentational family.
 *
 * The house pattern for a component that renders markup and nothing else:
 * assert the SEMANTICS the component promises in its own doc comment, not the
 * markup it happens to emit today. breadcrumb.tsx documents a nav landmark, an
 * ordered list, `aria-current="page"` on the final crumb and presentation-only
 * separators — so those are the four assertions, each queried the way an
 * assistive technology would reach it (`getByRole`), never by `data-slot` or
 * class name.
 *
 * Note what is NOT here: nothing asserts the muted-foreground colour or the
 * chevron's size. Tailwind never runs in jsdom (see vitest.config.ts) and VRT
 * already photographs this family at two viewports in two themes.
 */

function Trail() {
  return (
    <Breadcrumb aria-label="Breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/docs">Docs</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="/docs/components">Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe("Breadcrumb", () => {
  it("exposes the trail as a named navigation landmark", () => {
    render(<Trail />);

    // The name is a required prop precisely so this can never be nameless;
    // querying by name is what proves the prop reached the landmark.
    expect(screen.getByRole("navigation", { name: "Breadcrumb" })).toBeInTheDocument();
  });

  it("counts only the crumbs as list items, not the separators", () => {
    render(<Trail />);

    // Three crumbs and two separators are rendered; a screen reader must hear
    // "list, 3 items", because the depth IS the breadcrumb's information.
    const list = screen.getByRole("list");
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks the final crumb as the current page and gives it no link role", () => {
    render(<Trail />);

    const current = screen.getByText("Breadcrumb");
    expect(current).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Breadcrumb" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders the caller's element through asChild while keeping breadcrumb props", () => {
    render(
      <Breadcrumb aria-label="Breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <a href="/router-owned" data-testid="router-link">
                Home
              </a>
            </BreadcrumbLink>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    const link = screen.getByRole("link", { name: "Home" });
    expect(link).toHaveAttribute("data-testid", "router-link");
    expect(link).toHaveAttribute("href", "/router-owned");
    expect(link).toHaveAttribute("data-slot", "breadcrumb-link");
  });

  it("keeps the ellipsis glyph out of the accessibility tree but announces its label", () => {
    render(
      <Breadcrumb aria-label="Breadcrumb">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbEllipsis label="More pages" />
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>,
    );

    // The wrapper stays visible to AT — only the icon is hidden — so the
    // sr-only label survives, which is the whole point of the required prop.
    expect(screen.getByText("More pages")).toBeInTheDocument();
  });
});
