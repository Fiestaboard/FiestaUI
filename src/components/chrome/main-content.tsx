"use client";

import { memo, useEffect, useLayoutEffect, useRef } from "react";

import { isDevBuild } from "../../lib/dev";
import { cn } from "../../lib/utils";

/** Rail-side left padding of the content root — must match the classes below. */
const EXPANDED_PL = 268;
const COLLAPSED_PL = 76;

/**
 * Where the rail takes over from the phone chrome (slice 1.4b). Must match the
 * Sidebar's `railBreakpoint`: the two read the same prop so the padding and
 * the rail switch on the same pixel.
 *
 * Every class is spelled out in full, per breakpoint, because Tailwind only
 * compiles class names it can find verbatim in the source.
 */
const RAIL_LAYOUT = {
  lg: {
    query: "(min-width: 1024px)",
    pt: "lg:pt-0",
    plExpanded: "lg:pl-[268px]",
    plCollapsed: "lg:pl-[76px]",
    pb: "lg:pb-0",
  },
  md: {
    query: "(min-width: 768px)",
    pt: "md:pt-0",
    plExpanded: "md:pl-[268px]",
    plCollapsed: "md:pl-[76px]",
    pb: "md:pb-0",
  },
} as const;

/**
 * Room for the bottom tab bar (slice 1.4a): `--bottom-nav-offset`, which the
 * Sidebar publishes (88px: the bar's 64, the 12 it floats and 12 of air)
 * only while its bar is on screen — plus the home-indicator inset on phones
 * that have one. No bar, no variable, no gap.
 */
const BOTTOM_NAV_PB = "pb-[calc(var(--bottom-nav-offset,0px)+env(safe-area-inset-bottom))]";

interface MainContentProps {
  children: React.ReactNode;
  /** Sidebar collapse state (drives left padding). */
  collapsed: boolean;
  /** True while the sidebar width transition is running. */
  transitioning?: boolean;
  /** Whether the app-wide AI panel is open (drives right padding). */
  aiPanelOpen?: boolean;
  /** Auth screens render edge-to-edge with no chrome padding. */
  isAuthScreen?: boolean;
  /** App max width in px (FiestaBoard passes MAX_APP_WIDTH). */
  maxWidth?: number;
  /** Fired when the collapse/expand slide completes. */
  onTransitionEnd?: () => void;
  /**
   * The breakpoint from which the rail is shown, and so from which the
   * content is padded for it instead of for the mobile header. Pass the same
   * value as the Sidebar's `railBreakpoint`. Defaults to `lg` (1024px).
   */
  railBreakpoint?: "lg" | "md";
  /**
   * The Sidebar is `variant="bottom-nav"`: below the rail breakpoint, pad the
   * bottom so the last of the page clears the tab bar. Off by default.
   */
  bottomNav?: boolean;
}

/**
 * The app's main landmark. Layout math is presentational; collapse/AI-panel
 * state and route awareness are injected by the app shell.
 *
 * Sidebar collapse/expand (#92): the paddings on <main> snap instantly (one
 * layout pass) and an inner wrapper FLIPs — it starts translated at the old
 * visual offset and slides to identity via a compositor-only transform
 * transition — instead of transitioning padding-left, which relayouted the
 * entire content subtree on every animation frame. The settled state carries
 * no transform (the inline style is cleared, so computed transform is none).
 */
export const MainContent = memo(function MainContent({
  children,
  collapsed,
  transitioning = false,
  aiPanelOpen = false,
  isAuthScreen = false,
  maxWidth,
  onTransitionEnd,
  railBreakpoint = "lg",
  bottomNav = false,
}: MainContentProps) {
  const layout = RAIL_LAYOUT[railBreakpoint];
  const rootRef = useRef<HTMLElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const prevCollapsed = useRef(collapsed);

  // The Sidebar and MainContent are siblings with no shared parent to hold
  // one value, so each takes `railBreakpoint`, and a mismatch is a layout bug
  // (content under the rail, or padded for a rail that is not there). The
  // rail marks its <aside> with its value; say so in development.
  useEffect(() => {
    if (!isDevBuild()) return;
    const rail = document.querySelector("aside[data-rail-breakpoint]")?.getAttribute("data-rail-breakpoint");
    if (rail && rail !== railBreakpoint) {
      console.warn(
        `[MainContent] railBreakpoint="${railBreakpoint}" but the Sidebar's is "${rail}". Pass the same value to both.`,
      );
    }
  }, [railBreakpoint]);

  useLayoutEffect(() => {
    if (prevCollapsed.current === collapsed) return;
    prevCollapsed.current = collapsed;
    const root = rootRef.current;
    const shift = shiftRef.current;
    if (!root || !shift || isAuthScreen) return;
    // Below the rail breakpoint the sidebar padding doesn't apply, so there
    // is nothing to slide.
    if (!window.matchMedia(layout.query).matches) return;
    // Reduced motion (media query or the app's .reduce-motion class) zeroes
    // the transition — the instant padding snap is the whole "animation".
    if (parseFloat(getComputedStyle(shift).transitionDuration) === 0) return;
    // FLIP: React has already snapped the padding to its final value, moving
    // the content in a single layout pass. Start the wrapper at the old
    // visual offset with the transition suppressed, flush, then release —
    // the .content-shift transition slides it to identity on the compositor.
    // Compound with any in-flight slide: if the user toggles again mid-
    // transition, the wrapper sits at some interpolated translateX — the new
    // start offset must add it, or the content teleports back to the full
    // ±delta before re-sliding (main's old padding transition retargeted
    // smoothly; this preserves that).
    const inFlight = new DOMMatrixReadOnly(getComputedStyle(shift).transform).e;
    const delta = (collapsed ? EXPANDED_PL - COLLAPSED_PL : COLLAPSED_PL - EXPANDED_PL) + inFlight;
    // Clip the in-flight overhang at the root's padding box so the slide
    // never grows the page's scrollable overflow; removed when it settles.
    root.style.overflowX = "clip";
    shift.style.transition = "none";
    shift.style.transform = `translateX(${delta}px)`;
    void shift.getBoundingClientRect();
    shift.style.transition = "";
    shift.style.transform = "";
  }, [collapsed, isAuthScreen, layout.query]);

  return (
    <main
      ref={rootRef}
      id="main-content"
      data-rail-breakpoint={railBreakpoint}
      className={cn(
        "min-h-dvh flex flex-col w-full mx-auto",
        !isAuthScreen && cn("pt-[calc(var(--mobile-header-height,56px)+16px)]", layout.pt, "content-root"),
        !isAuthScreen && (collapsed ? layout.plCollapsed : layout.plExpanded),
        !isAuthScreen && bottomNav && cn(BOTTOM_NAV_PB, layout.pb),
        // 396 = the 384-wide AI panel plus the 12px inset it sits on, mirroring
        // lg:pl-[268px] on the left (12px inset + a 256-wide rail). It was 384
        // while the panel ran edge-to-edge; once the panel is inset like the
        // rail, reserving only its width leaves the page card 12px short of
        // the gutter on the right and flush against it on the left.
        !isAuthScreen && (aiPanelOpen ? "lg:pr-[396px]" : "lg:pr-0"),
      )}
      style={{ maxWidth: isAuthScreen ? undefined : maxWidth }}
    >
      <div
        ref={shiftRef}
        className={cn("flex grow flex-col content-shift", !isAuthScreen && transitioning && "is-transitioning")}
        onTransitionEnd={(e) => {
          if (e.target === e.currentTarget && e.propertyName === "transform") {
            if (rootRef.current) rootRef.current.style.overflowX = "";
            onTransitionEnd?.();
          }
        }}
      >
        {children}
      </div>
    </main>
  );
});
