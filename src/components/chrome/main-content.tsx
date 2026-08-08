"use client";

import { memo, useLayoutEffect, useRef } from "react";

import { cn } from "../../lib/utils";

/** lg: left padding of the content root — must match the classes below. */
const EXPANDED_PL = 268;
const COLLAPSED_PL = 76;

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
}: MainContentProps) {
  const rootRef = useRef<HTMLElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const prevCollapsed = useRef(collapsed);

  useLayoutEffect(() => {
    if (prevCollapsed.current === collapsed) return;
    prevCollapsed.current = collapsed;
    const root = rootRef.current;
    const shift = shiftRef.current;
    if (!root || !shift || isAuthScreen) return;
    // Below lg the sidebar padding doesn't apply, so there is nothing to slide.
    if (!window.matchMedia("(min-width: 1024px)").matches) return;
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
  }, [collapsed, isAuthScreen]);

  return (
    <main
      ref={rootRef}
      id="main-content"
      className={cn(
        "min-h-dvh flex flex-col w-full mx-auto",
        !isAuthScreen && "pt-[calc(var(--mobile-header-height,56px)+16px)] lg:pt-0 content-root",
        !isAuthScreen && (collapsed ? "lg:pl-[76px]" : "lg:pl-[268px]"),
        !isAuthScreen && (aiPanelOpen ? "lg:pr-[384px]" : "lg:pr-0"),
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
