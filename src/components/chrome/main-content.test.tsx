import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MainContent } from "./main-content";

/*
 * MainContent is layout math: the padding that keeps the page clear of the
 * rail, the AI panel, the mobile header and (slice 1.4a) the bottom tab bar.
 * jsdom runs no media queries, so the contract is the breakpoint-prefixed
 * classes — the pixels are VRT's. The FLIP slide is exercised against a
 * matchMedia stub, since it is the one piece of behaviour here.
 */

function classesOf(el: HTMLElement) {
  return el.className.split(/\s+/);
}

function main() {
  return screen.getByRole("main");
}

function stubMatchMedia(matches: boolean) {
  const spy = vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList,
  );
  return spy;
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MainContent padding", () => {
  it("clears the rail from lg by default", () => {
    render(<MainContent collapsed={false}>page</MainContent>);
    expect(classesOf(main())).toEqual(expect.arrayContaining(["lg:pl-[268px]", "lg:pt-0", "lg:pr-0"]));
    expect(main().className).not.toMatch(/(^|\s)md:/);
    expect(main()).toHaveAttribute("data-rail-breakpoint", "lg");
  });

  it("clears the collapsed rail", () => {
    render(<MainContent collapsed>page</MainContent>);
    expect(classesOf(main())).toContain("lg:pl-[76px]");
  });

  it("moves the rail padding to md with railBreakpoint md", () => {
    const { rerender } = render(
      <MainContent collapsed={false} railBreakpoint="md">
        page
      </MainContent>,
    );
    expect(classesOf(main())).toEqual(expect.arrayContaining(["md:pl-[268px]", "md:pt-0"]));
    expect(classesOf(main())).not.toContain("lg:pl-[268px]");
    expect(main()).toHaveAttribute("data-rail-breakpoint", "md");

    rerender(
      <MainContent collapsed railBreakpoint="md">
        page
      </MainContent>,
    );
    expect(classesOf(main())).toContain("md:pl-[76px]");
  });

  it("reserves the AI panel's width on the right", () => {
    render(
      <MainContent collapsed={false} aiPanelOpen>
        page
      </MainContent>,
    );
    expect(classesOf(main())).toContain("lg:pr-[396px]");
  });

  it("drops all chrome padding on auth screens", () => {
    render(
      <MainContent collapsed={false} isAuthScreen bottomNav maxWidth={1200}>
        page
      </MainContent>,
    );
    expect(main().className).not.toMatch(/pl-|pt-|pb-|pr-/);
    expect(main().style.maxWidth).toBe("");
  });

  it("caps the width at maxWidth", () => {
    render(
      <MainContent collapsed={false} maxWidth={1200}>
        page
      </MainContent>,
    );
    expect(main().style.maxWidth).toBe("1200px");
  });

  it("leaves the bottom alone without a bottom nav", () => {
    render(<MainContent collapsed={false}>page</MainContent>);
    expect(main().className).not.toMatch(/(^|\s)pb-/);
  });

  it("clears the bottom tab bar below the rail breakpoint", () => {
    const { rerender } = render(
      <MainContent collapsed={false} bottomNav>
        page
      </MainContent>,
    );
    expect(classesOf(main())).toEqual(
      expect.arrayContaining(["pb-[calc(var(--bottom-nav-offset,0px)+env(safe-area-inset-bottom))]", "lg:pb-0"]),
    );

    rerender(
      <MainContent collapsed={false} bottomNav railBreakpoint="md">
        page
      </MainContent>,
    );
    expect(classesOf(main())).toContain("md:pb-0");
  });
});

describe("MainContent collapse slide", () => {
  function shift() {
    return main().firstElementChild as HTMLElement;
  }

  it("does nothing on first render", () => {
    const mm = stubMatchMedia(true);
    render(<MainContent collapsed={false}>page</MainContent>);
    expect(mm).not.toHaveBeenCalled();
    expect(shift().style.transform).toBe("");
  });

  it("asks the media query that matches the rail breakpoint", () => {
    const mm = stubMatchMedia(false);
    const { rerender } = render(
      <MainContent collapsed={false} railBreakpoint="md">
        page
      </MainContent>,
    );
    rerender(
      <MainContent collapsed railBreakpoint="md">
        page
      </MainContent>,
    );
    expect(mm).toHaveBeenCalledWith("(min-width: 768px)");

    const { rerender: rerenderLg } = render(<MainContent collapsed={false}>page</MainContent>);
    rerenderLg(<MainContent collapsed>page</MainContent>);
    expect(mm).toHaveBeenCalledWith("(min-width: 1024px)");
  });

  it("skips the slide below the breakpoint", () => {
    stubMatchMedia(false);
    const { rerender } = render(<MainContent collapsed={false}>page</MainContent>);
    rerender(<MainContent collapsed>page</MainContent>);
    expect(main().style.overflowX).toBe("");
  });

  it("skips the slide on auth screens", () => {
    const mm = stubMatchMedia(true);
    const { rerender } = render(
      <MainContent collapsed={false} isAuthScreen>
        page
      </MainContent>,
    );
    rerender(
      <MainContent collapsed isAuthScreen>
        page
      </MainContent>,
    );
    expect(mm).not.toHaveBeenCalled();
  });

  it("skips the slide when motion is reduced to zero", () => {
    stubMatchMedia(true);
    const { rerender } = render(<MainContent collapsed={false}>page</MainContent>);
    shift().style.transitionDuration = "0s";
    rerender(<MainContent collapsed>page</MainContent>);
    expect(main().style.overflowX).toBe("");
  });

  it("starts the content at its old offset and releases it, clipping the overhang until it lands", () => {
    stubMatchMedia(true);
    // jsdom has no DOMMatrix; the slide only reads `.e` (the in-flight x).
    vi.stubGlobal(
      "DOMMatrixReadOnly",
      class {
        e = 0;
      },
    );
    const onTransitionEnd = vi.fn();
    const { rerender } = render(
      <MainContent collapsed={false} onTransitionEnd={onTransitionEnd}>
        page
      </MainContent>,
    );
    shift().style.transitionDuration = "0.2s";
    rerender(
      <MainContent collapsed onTransitionEnd={onTransitionEnd}>
        page
      </MainContent>,
    );
    expect(main().style.overflowX).toBe("clip");
    // Released: the inline transform is cleared so the transition carries it home.
    expect(shift().style.transform).toBe("");

    fireEvent.transitionEnd(shift(), { propertyName: "opacity" });
    expect(onTransitionEnd).not.toHaveBeenCalled();
    fireEvent.transitionEnd(shift(), { propertyName: "transform" });
    expect(onTransitionEnd).toHaveBeenCalledTimes(1);
    expect(main().style.overflowX).toBe("");

    // Expanding again slides the other way, still clipped while in flight.
    rerender(
      <MainContent collapsed={false} onTransitionEnd={onTransitionEnd}>
        page
      </MainContent>,
    );
    expect(main().style.overflowX).toBe("clip");
  });

  it("marks the wrapper while the rail is transitioning", () => {
    render(
      <MainContent collapsed={false} transitioning>
        page
      </MainContent>,
    );
    expect(classesOf(shift())).toContain("is-transitioning");
  });

  it("tolerates a transition end with no handler", () => {
    render(<MainContent collapsed={false}>page</MainContent>);
    fireEvent.transitionEnd(shift(), { propertyName: "transform" });
    expect(main().style.overflowX).toBe("");
  });
});

describe("MainContent railBreakpoint agreement (S4)", () => {
  function rail(bp: string) {
    const aside = document.createElement("aside");
    aside.setAttribute("data-rail-breakpoint", bp);
    document.body.appendChild(aside);
    return aside;
  }

  it("warns in development when the Sidebar's breakpoint disagrees", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const aside = rail("md");
    render(<MainContent collapsed={false}>page</MainContent>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/railBreakpoint/);
    aside.remove();
  });

  it("stays quiet when they agree, or when there is no rail", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(<MainContent collapsed={false}>page</MainContent>);
    const aside = rail("md");
    render(
      <MainContent collapsed={false} railBreakpoint="md">
        page
      </MainContent>,
    );
    expect(warn).not.toHaveBeenCalled();
    aside.remove();
  });
});
