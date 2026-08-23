import { render, screen } from "@testing-library/react";
import { GalleryHorizontalEnd } from "lucide-react";
import { describe, expect, it } from "vitest";

import { PageCard, PageSection } from "./page-card";
import { PageHeader } from "./page-header";
import { PageToolbar } from "./page-toolbar";

/*
 * PageCard's contract is mostly appearance, and Tailwind does not run in
 * jsdom — asserting on `px-6` here would prove only that a string was
 * concatenated. So this file asserts the two things that are structural
 * rather than visual, and leaves the rest to VRT:
 *
 *   * the `data-slot` stamps, because those are what PageCard's own child
 *     selectors hook onto AND what VRT and consumers select on. If a slot is
 *     renamed, un-migrated FiestaBoard routes silently keep the standalone
 *     margins that PageCard is supposed to zero — a regression with no other
 *     detector;
 *   * PageSection's heading structure, because `title` has to produce a real
 *     heading element for a flattened settings route to keep the document
 *     outline its Card version had.
 */

function slot(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-slot="${name}"]`);
}

describe("PageCard", () => {
  it("stamps the slot PageCard's own child selectors depend on", () => {
    render(
      <PageCard>
        <PageSection>content</PageSection>
      </PageCard>,
    );
    expect(slot("page-card")).not.toBeNull();
  });

  it("keeps the header and toolbar slots that its margin reset targets", () => {
    render(
      <PageCard>
        <PageHeader icon={GalleryHorizontalEnd} title="Collections" description="Groups of pages." />
        <PageToolbar right={<button>New</button>} />
      </PageCard>,
    );
    expect(slot("page-header")).not.toBeNull();
    expect(slot("page-toolbar")).not.toBeNull();
  });

  it("renders its blocks in order", () => {
    render(
      <PageCard>
        <PageSection title="First">a</PageSection>
        <PageSection title="Second">b</PageSection>
      </PageCard>,
    );
    const sections = document.querySelectorAll('[data-slot="page-section"]');
    expect(sections).toHaveLength(2);
    expect(sections[0].textContent).toContain("First");
    expect(sections[1].textContent).toContain("Second");
  });
});

describe("PageSection", () => {
  it("gives a titled section a real heading, so a flattened route keeps its outline", () => {
    render(<PageSection title="Appearance">theme</PageSection>);
    expect(screen.getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
  });

  it("renders no heading row when the section is untitled", () => {
    render(<PageSection>just content</PageSection>);
    expect(screen.queryByRole("heading")).toBeNull();
  });

  /*
   * `fill` makes a scroll port. Caught by the a11y suite on the FillHeight
   * story (axe `scrollable-region-focusable`) rather than by review: a scroll
   * port with no focusable descendant cannot be scrolled from the keyboard at
   * all. The schedule's calendar hides this because it is full of buttons; a
   * long read-only list does not. Asserted here so the tab stop cannot be
   * dropped without a unit test failing first.
   */
  it("makes the fill scroll port keyboard reachable", () => {
    render(
      <PageSection fill scrollLabel="Schedule entries">
        <span>long list</span>
      </PageSection>,
    );
    const region = screen.getByRole("region", { name: "Schedule entries" });
    expect(region).toHaveAttribute("tabindex", "0");
  });

  it("names the scroll port after the title when no scrollLabel is given", () => {
    render(
      <PageSection fill title="Entries">
        <span>long list</span>
      </PageSection>,
    );
    expect(screen.getByRole("region", { name: "Entries" })).toBeInTheDocument();
  });

  it("leaves the scroll port unnamed rather than announcing a bare region", () => {
    render(
      <PageSection fill>
        <span>long list</span>
      </PageSection>,
    );
    expect(screen.queryByRole("region")).toBeNull();
    expect(document.querySelector('[data-slot="page-section"] > [tabindex="0"]')).not.toBeNull();
  });

  it("renders the description and the action alongside the title", () => {
    render(
      <PageSection title="Language" description="Interface language and region." action={<button>Reset</button>}>
        body
      </PageSection>,
    );
    expect(screen.getByText("Interface language and region.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset" })).toBeInTheDocument();
  });
});
