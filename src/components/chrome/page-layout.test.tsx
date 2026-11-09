import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageLayout } from "./page-layout";

/*
 * PageLayout's vertical rhythm follows the rail (review of #386, S4): it
 * pads 12px to match the rail's inset and, with `fillHeight`, pins to the
 * viewport minus the phone header — both from the breakpoint where the rail
 * takes over. Classes are the contract; the pixels are VRT's.
 */
function layout(props: Partial<React.ComponentProps<typeof PageLayout>> = {}) {
  const { container } = render(<PageLayout {...props}>page</PageLayout>);
  const outer = container.firstElementChild as HTMLElement;
  return {
    outer: outer.className.split(/\s+/),
    inner: (outer.firstElementChild as HTMLElement).className.split(/\s+/),
  };
}

describe("PageLayout", () => {
  it("keeps the container and its horizontal gutter at both breakpoints", () => {
    for (const railBreakpoint of ["lg", "md"] as const) {
      for (const fillHeight of [false, true]) {
        const { inner } = layout({ railBreakpoint, fillHeight });
        expect(inner).toEqual(expect.arrayContaining(["container", "mx-auto", "px-4", "md:px-6", "max-w-full"]));
      }
    }
  });

  it("aligns to the rail from lg by default", () => {
    const { outer, inner } = layout();
    expect(inner).toEqual(expect.arrayContaining(["md:py-8", "lg:py-3"]));
    expect(outer).toContain("min-h-full");
  });

  it("aligns to the rail from md with railBreakpoint md", () => {
    const { inner } = layout({ railBreakpoint: "md" });
    expect(inner).toContain("md:py-3");
    expect(inner).not.toContain("md:py-8");
    expect(inner).not.toContain("lg:py-3");
  });

  it("pins to the viewport, less the phone header and any bottom bar, below the rail", () => {
    const { outer, inner } = layout({ fillHeight: true });
    expect(outer).toEqual(
      expect.arrayContaining(["sm:h-[calc(100dvh-72px-var(--bottom-nav-offset,0px))]", "lg:h-dvh"]),
    );
    expect(inner).toContain("sm:overflow-hidden");
  });

  it("takes the full viewport from md with an md rail", () => {
    const { outer } = layout({ fillHeight: true, railBreakpoint: "md" });
    expect(outer).toContain("md:h-dvh");
    expect(outer).not.toContain("lg:h-dvh");
  });

  it("passes class names through", () => {
    const { outer, inner } = layout({ className: "inner-x", outerClassName: "outer-x" });
    expect(outer).toContain("outer-x");
    expect(inner).toContain("inner-x");
  });
});
