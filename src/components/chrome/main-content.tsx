"use client";

import { cn } from "../../lib/utils";

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
  /** Fired when the padding-left transition completes. */
  onTransitionEnd?: () => void;
}

/**
 * The app's main landmark. Layout math is presentational; collapse/AI-panel
 * state and route awareness are injected by the app shell.
 */
export function MainContent({
  children,
  collapsed,
  transitioning = false,
  aiPanelOpen = false,
  isAuthScreen = false,
  maxWidth,
  onTransitionEnd,
}: MainContentProps) {
  return (
    <main
      id="main-content"
      className={cn(
        "min-h-dvh flex flex-col w-full mx-auto",
        !isAuthScreen && "pt-[calc(var(--mobile-header-height,56px)+16px)] lg:pt-0 sidebar-transition",
        !isAuthScreen && (collapsed ? "lg:pl-[76px]" : "lg:pl-[268px]"),
        !isAuthScreen && (aiPanelOpen ? "lg:pr-[384px]" : "lg:pr-0"),
        !isAuthScreen && transitioning && "is-transitioning",
      )}
      style={{ maxWidth: isAuthScreen ? undefined : maxWidth }}
      onTransitionEnd={(e) => {
        if (e.target === e.currentTarget && e.propertyName === "padding-left") {
          onTransitionEnd?.();
        }
      }}
    >
      {children}
    </main>
  );
}
