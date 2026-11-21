import { render, screen } from "@testing-library/react";
import { Monitor } from "lucide-react";
import { describe, expect, it } from "vitest";

import { PageCard } from "./page-card";
import { PAGE_HUES, PageHeader, pageHue, PageIconGradientDefs } from "./page-header";
import { PageLayout } from "./page-layout";

describe("PageHeader collapsed", () => {
  it("renders as before when not collapsed", () => {
    render(
      <PageHeader icon={Monitor} title="Displays" description="Every board">
        <button type="button">Add</button>
      </PageHeader>,
    );
    expect(screen.getByRole("button", { name: "Add" }).closest("[inert]")).toBeNull();
    expect(screen.getByText("Every board").closest("[inert]")).toBeNull();
  });

  it("tucks the description and the action away, and keeps the h1", () => {
    render(
      <PageHeader icon={Monitor} title="Displays" description="Every board" collapsed>
        <button type="button">Add</button>
      </PageHeader>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Displays" }).closest("[inert]")).toBeNull();
    expect(screen.getByText("Every board").closest("[inert]")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Add" }).closest("[inert]")).not.toBeNull();
  });

  it("adds no wrapper for an absent action slot", () => {
    render(<PageHeader icon={Monitor} title="Displays" description="Every board" collapsed />);
    expect(document.querySelectorAll("[data-slot=reveal]")).toHaveLength(1);
  });

  it("drops the row gap while collapsed so the tucked action leaves no band", () => {
    const { rerender } = render(
      <PageHeader icon={Monitor} title="Displays" description="Every board" collapsed>
        <button type="button">Add</button>
      </PageHeader>,
    );
    const header = (): HTMLElement => document.querySelector<HTMLElement>("[data-slot=page-header]")!;
    expect(header().className).toContain("gap-y-0");
    expect(header().className).not.toContain("gap-y-3");
    rerender(
      <PageHeader icon={Monitor} title="Displays" description="Every board">
        <button type="button">Add</button>
      </PageHeader>,
    );
    expect(header().className).toContain("gap-y-3");
    expect(header().className).toContain("transition-[row-gap]");
  });

  it("right-aligns the action slot when it wraps onto its own line", () => {
    render(
      <PageHeader icon={Monitor} title="Displays" description="Every board">
        <button type="button">Add</button>
      </PageHeader>,
    );
    const action = screen.getByRole("button", { name: "Add" }).closest("[data-slot=reveal]");
    expect(action).toHaveClass("ml-auto");
  });
});

describe("PageHeader offset on a bare page (07a `302:20841`, BB-FS-8)", () => {
  const header = () => document.querySelector<HTMLElement>('[data-slot="page-header"]')!;

  it("sits 16px below the page top from the rail breakpoint, directly in PageLayout", () => {
    render(
      <PageLayout railBreakpoint="md">
        <PageHeader icon={Monitor} title="Home" description="d" />
      </PageLayout>,
    );
    expect(header()).toHaveClass("md:mt-4");
    expect(header()).not.toHaveClass("lg:mt-4");
  });

  it("keeps the offset when a route wraps the header (Schedule: PageLayout > Box > PageHeader)", () => {
    render(
      <PageLayout>
        <div>
          <PageHeader icon={Monitor} title="Schedule" description="d" />
        </div>
      </PageLayout>,
    );
    expect(header()).toHaveClass("lg:mt-4");
  });

  it("leaves a header inside a PageCard to the card's own padding", () => {
    render(
      <PageLayout railBreakpoint="md">
        <PageCard>
          <PageHeader icon={Monitor} title="Displays" description="d" />
        </PageCard>
      </PageLayout>,
    );
    expect(header()).not.toHaveClass("md:mt-4");
    expect(header()).not.toHaveClass("lg:mt-4");
  });

  it("adds nothing outside a PageLayout", () => {
    render(<PageHeader icon={Monitor} title="Loose" description="d" />);
    expect(header().className).not.toMatch(/mt-4/);
  });
});

/*
 * BB-FC-3: the icon colour used to be hashed from the TRANSLATED title, so
 * Settings was red in English and blue in German. Figma (07e `321:9076`,
 * `337:60272`) draws page icons in brand orange; an unassigned page now takes
 * that, independent of the copy. Schedule/Integrations draw no icon and no
 * description (07d `322:9978`, `324:40267`), so both are optional.
 */
describe("PageHeader icon colour and optional parts", () => {
  const iconClass = (): string => document.querySelector("[data-slot=page-header] h1 svg")!.getAttribute("class") ?? "";

  it.each(["Settings", "Einstellungen", "設定", "Paramètres"])("paints %s in brand orange", (title) => {
    render(<PageHeader icon={Monitor} title={title} description="x" />);
    expect(iconClass()).toContain("text-hue-orange");
  });

  it("still honours an assigned hue", () => {
    render(<PageHeader icon={Monitor} title="Settings" description="x" hue="green" />);
    expect(iconClass()).toContain("text-hue-green");
  });

  it("renders without an icon or a description", () => {
    render(<PageHeader title="Schedule" />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Schedule" });
    expect(h1.querySelector("svg")).toBeNull();
    expect(document.querySelector("[data-slot=page-header] .page-description")).toBeNull();
  });
});

describe("pageHue and the deprecated gradient defs", () => {
  it("hashes a key to one of the six hues, the same every time", () => {
    const hue = pageHue("schedule");
    expect(PAGE_HUES).toContain(hue);
    expect(pageHue("schedule")).toBe(hue);
  });

  it("still renders the deprecated gradient defs for consumers that mount them", () => {
    const { container } = render(<PageIconGradientDefs />);
    expect(container.querySelector("linearGradient#page-icon-gradient")).not.toBeNull();
    expect(container.querySelectorAll("stop")).toHaveLength(6);
  });
});
