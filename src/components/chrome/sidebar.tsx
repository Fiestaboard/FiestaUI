"use client";

import { ChevronLeft, ChevronRight, Menu, Sparkles, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";

import type { Season } from "../../lib/seasons";
import { cn } from "../../lib/utils";
import { SidebarAurora } from "../seasons/sidebar-aurora";
import { SidebarAuroraHorizontal } from "../seasons/sidebar-aurora-horizontal";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { FIESTA_ICON_DATA_URI } from "./fiesta-icon";
import { FiestaLogo } from "./fiesta-logo";

// Static class strings are hoisted and their active/collapsed variants are
// merged once at import (via cn, so twMerge dedup matches the per-render form
// byte-for-byte) instead of on every Sidebar render — which happens on each
// resize tick. Selecting a precomputed constant replaces the per-item cn()
// call in the mobile/desktop nav loops with a plain ternary.
const NAV_ITEM_ACTIVE = "nav-active font-semibold";
const NAV_ITEM_INACTIVE = "text-sidebar-foreground nav-active-hover";

const MOBILE_ITEM_BASE = "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium min-h-[48px]";
const MOBILE_ITEM_ACTIVE = cn(MOBILE_ITEM_BASE, NAV_ITEM_ACTIVE);
const MOBILE_ITEM_INACTIVE = cn(MOBILE_ITEM_BASE, NAV_ITEM_INACTIVE);

const MOBILE_AI_BASE = "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium min-h-[48px]";
const MOBILE_AI_ACTIVE = cn(MOBILE_AI_BASE, NAV_ITEM_ACTIVE);
const MOBILE_AI_INACTIVE = cn(MOBILE_AI_BASE, NAV_ITEM_INACTIVE);

const DESKTOP_LINK_BASE =
  "flex items-center gap-3 py-2 pl-[14px] pr-3 rounded-lg text-sm font-medium transition-colors";
const DESKTOP_LINK_ACTIVE = cn(DESKTOP_LINK_BASE, NAV_ITEM_ACTIVE);
const DESKTOP_LINK_INACTIVE = cn(DESKTOP_LINK_BASE, NAV_ITEM_INACTIVE);

const DESKTOP_AI_BASE =
  "flex w-full items-center gap-3 py-2 pl-[14px] pr-3 rounded-lg text-sm font-medium transition-colors";
const DESKTOP_AI_ACTIVE = cn(DESKTOP_AI_BASE, NAV_ITEM_ACTIVE);
const DESKTOP_AI_INACTIVE = cn(DESKTOP_AI_BASE, NAV_ITEM_INACTIVE);

const NAV_LABEL_BASE = "whitespace-nowrap overflow-hidden transition-opacity duration-100";
const NAV_LABEL_COLLAPSED = cn(NAV_LABEL_BASE, "opacity-0 max-w-0");
const NAV_LABEL_EXPANDED = cn(NAV_LABEL_BASE, "opacity-100 max-w-48 delay-150");

const MOBILE_BACKDROP_BASE =
  "lg:hidden fixed inset-0 z-[var(--z-mobile-backdrop)] bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 pointer-events-none";
const MOBILE_BACKDROP_OPEN = cn(MOBILE_BACKDROP_BASE, "opacity-100 pointer-events-auto");
const MOBILE_BACKDROP_CLOSED = cn(MOBILE_BACKDROP_BASE, "opacity-0");

const MOBILE_MENU_BASE =
  "lg:hidden fixed top-[calc(var(--mobile-header-height,56px)+16px)] left-3 right-3 z-[var(--z-mobile-menu)] flex max-h-[calc(100dvh-var(--mobile-header-height,56px)-2rem)] flex-col overflow-hidden sidebar-gradient-horizontal";
const MOBILE_MENU_OPEN = cn(MOBILE_MENU_BASE, "opacity-100");
const MOBILE_MENU_CLOSED = cn(MOBILE_MENU_BASE, "opacity-0 pointer-events-none");

// The clip-path/transition style object is otherwise reallocated every render.
const MOBILE_MENU_TRANSITION =
  "clip-path var(--motion-duration-slower) var(--motion-ease-spring), opacity var(--motion-duration-exit) var(--motion-ease-standard)";
const MOBILE_MENU_STYLE_OPEN: React.CSSProperties = {
  clipPath: "inset(0 0 0 0 round var(--radius-chrome-mobile, 16px))",
  transition: MOBILE_MENU_TRANSITION,
};
const MOBILE_MENU_STYLE_CLOSED: React.CSSProperties = {
  clipPath: "inset(0 0 100% 0 round var(--radius-chrome-mobile, 16px))",
  transition: MOBILE_MENU_TRANSITION,
};

export interface SidebarNavItem {
  key: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Localized display name (the app resolves i18n). */
  label: string;
  external?: boolean;
  /** Active-route state (the app derives this from its router). */
  active?: boolean;
  /** Optional data-prefetch handler fired on hover/focus. */
  onPrefetch?: () => void;
}

export interface SidebarLinkProps {
  href: string;
  className?: string;
  "aria-label"?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  children: React.ReactNode;
}

export interface SidebarLabels {
  mainNavigation: string;
  primaryNavigation: string;
  secondaryNavigation: string;
  navigationMenu: string;
  openMenu: string;
  closeMenu: string;
  expandSidebar: string;
  collapseSidebar: string;
  aiAssistant: string;
  logoButtonAriaLabel?: string;
}

export interface SidebarProps {
  labels: SidebarLabels;
  primaryItems: SidebarNavItem[];
  secondaryItems: SidebarNavItem[];
  /**
   * Renders internal navigation links — inject your router's Link here
   * (FiestaBoard passes its ViewTransitionLink). External items render a
   * plain <a target="_blank"> internally and never hit this.
   */
  renderLink: (props: SidebarLinkProps, item: SidebarNavItem) => React.ReactNode;
  collapsed: boolean;
  transitioning?: boolean;
  onToggleCollapsed: () => void;
  onTransitionEnd?: () => void;
  /**
   * src for the 32×32 brand icon next to the logo. Defaults to the
   * embedded pixel-taco brand mark; apps may override (e.g. base-path
   * aware asset URLs).
   */
  logoIconSrc?: string;
  /** Active season: auroras render in its colors and the logo becomes a button. */
  season?: Season | null;
  /** Click handler for the seasonal logo button (celebration lives in the app). */
  onLogoClick?: (e: React.MouseEvent) => void;
  /** AI assistant nav entry; omit to hide. */
  ai?: { active: boolean; onOpen: () => void };
  /** Board switcher slots (rendered only when provided). */
  boardSelector?: React.ReactNode;
  mobileBoardSelector?: React.ReactNode;
  /** Account row inside the secondary nav. */
  renderAccount?: (ctx: { variant: "mobile" | "desktop"; collapsed: boolean }) => React.ReactNode;
  /** Version indicator in the footer row. */
  versionSlot?: React.ReactNode;
  /** Theme toggle in the footer row. */
  themeToggleSlot?: React.ReactNode;
  /** App max width in px — the sidebar centers itself against it. */
  maxWidth: number;
  /** Gap between the app edge and the sidebar in px. */
  sidebarInset: number;
}

export function Sidebar({
  labels,
  primaryItems,
  secondaryItems,
  renderLink,
  collapsed,
  transitioning = false,
  onToggleCollapsed,
  onTransitionEnd,
  logoIconSrc = FIESTA_ICON_DATA_URI,
  season = null,
  onLogoClick,
  ai,
  boardSelector,
  mobileBoardSelector,
  renderAccount,
  versionSlot,
  themeToggleSlot,
  maxWidth,
  sidebarInset,
}: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appInset, setAppInset] = useState(0);
  const headerRef = useRef<HTMLElement>(null);

  // The mobile header wraps on narrow viewports, so its height is dynamic.
  // Publish it as --mobile-header-height for the mobile menu and
  // MainContent to offset against (both fall back to the unwrapped 56px).
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    let rafId: number | null = null;
    let last = "";
    const publish = () => {
      rafId = null;
      const next = `${header.offsetHeight}px`;
      // Skip the write when the height is unchanged (the common case — the
      // header only changes height when it wraps): the CSS-var write on
      // <html> invalidates style for the whole document.
      if (next === last) return;
      last = next;
      document.documentElement.style.setProperty("--mobile-header-height", next);
    };
    // Coalesce ResizeObserver callbacks via rAF — the header can fire dozens
    // of events per second while the viewport is dragged, and each callback
    // reads offsetHeight (forced layout). One write per frame is plenty.
    const recompute = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(publish);
    };
    const ro = new ResizeObserver(recompute);
    ro.observe(header);
    publish();
    return () => {
      ro.disconnect();
      if (rafId !== null) cancelAnimationFrame(rafId);
      document.documentElement.style.removeProperty("--mobile-header-height");
    };
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let rafId: number | null = null;
    const update = () => {
      rafId = null;
      const next = Math.max(0, (document.body.clientWidth - maxWidth) / 2);
      // Bail before re-rendering when the inset is unchanged — it's 0
      // whenever the viewport is at or below maxWidth (the common case on
      // laptop screens). update reads body.clientWidth (forced layout).
      setAppInset((prev) => (prev === next ? prev : next));
    };
    // Coalesce resize events via rAF — a window drag fires dozens per second.
    const recompute = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [maxWidth]);

  function renderMobileNavItem(item: SidebarNavItem) {
    const Icon = item.icon;
    const mobileClassName = item.active ? MOBILE_ITEM_ACTIVE : MOBILE_ITEM_INACTIVE;

    if (item.external) {
      return (
        <a
          key={item.key}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMobileMenuOpen(false)}
          className={mobileClassName}
        >
          <Icon className="h-5 w-5" />
          {item.label}
        </a>
      );
    }

    return (
      <span key={item.key} className="contents">
        {renderLink(
          {
            href: item.href,
            onClick: () => setMobileMenuOpen(false),
            onMouseEnter: item.onPrefetch,
            onFocus: item.onPrefetch,
            className: mobileClassName,
            children: (
              <>
                <Icon className="h-5 w-5" />
                {item.label}
              </>
            ),
          },
          item,
        )}
      </span>
    );
  }

  function renderDesktopNavItem(item: SidebarNavItem) {
    const Icon = item.icon;
    const linkClassName = item.active ? DESKTOP_LINK_ACTIVE : DESKTOP_LINK_INACTIVE;

    const inner = (
      <>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span className={collapsed ? NAV_LABEL_COLLAPSED : NAV_LABEL_EXPANDED}>{item.label}</span>
      </>
    );

    const link = item.external ? (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClassName}
        aria-label={collapsed ? item.label : undefined}
      >
        {inner}
      </a>
    ) : (
      renderLink(
        {
          href: item.href,
          onMouseEnter: item.onPrefetch,
          onFocus: item.onPrefetch,
          className: linkClassName,
          "aria-label": collapsed ? item.label : undefined,
          children: inner,
        },
        item,
      )
    );

    // Expanded items render no TooltipContent, so the Tooltip state machine and
    // its React.Children.only walk provide zero UI — return the bare link and
    // only pay for tooltip machinery when collapsed (where the label tooltip
    // actually shows). A keyed Fragment adds no DOM node, matching the
    // asChild trigger which also renders the link directly.
    if (!collapsed) {
      return <Fragment key={item.key}>{link}</Fragment>;
    }

    return (
      <Tooltip key={item.key}>
        <TooltipTrigger asChild>{link as React.ReactElement}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  const logoBlock = (variant: "mobile" | "desktop") => {
    const logo =
      variant === "mobile" ? (
        <FiestaLogo size="sm" className="logo-on-gradient whitespace-nowrap" />
      ) : (
        <FiestaLogo
          className={cn(
            "logo-on-gradient whitespace-nowrap overflow-hidden transition-opacity duration-100",
            collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-48 delay-150",
          )}
        />
      );
    const icon = <img src={logoIconSrc} alt="" width={32} height={32} className="flex-shrink-0" />;
    const wrapperClass =
      variant === "mobile"
        ? // No min-w-0: the logo keeps its intrinsic width so a tight header
          // wraps the board selector to a second row instead of clipping
          // the wordmark under it.
          "flex items-center gap-3 flex-1 ml-2"
        : "flex items-center gap-2 overflow-hidden px-4 py-4";

    if (season) {
      return (
        <button
          type="button"
          onClick={onLogoClick}
          aria-label={labels.logoButtonAriaLabel}
          className={cn(wrapperClass, "cursor-pointer text-left", variant === "desktop" && "w-full")}
        >
          {icon}
          {logo}
        </button>
      );
    }
    return (
      <div className={wrapperClass}>
        {icon}
        {logo}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Header — wraps on narrow viewports (the board selector drops
          to a second row at ~320px); its measured height feeds the
          --mobile-header-height var that the menu and MainContent offset by. */}
      <header
        ref={headerRef}
        className="lg:hidden fixed top-2 left-3 right-3 z-[var(--z-mobile-header)] overflow-hidden sidebar-gradient-horizontal"
      >
        {/* Compositor-driven gradient scroll — see .sidebar-gradient-layer in theme.css (#57) */}
        <div aria-hidden className="sidebar-gradient-layer" />
        {season && <SidebarAuroraHorizontal colors={season.colors} />}
        <div className="relative z-[1] flex min-h-14 flex-wrap items-center gap-y-2 px-4 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 -ml-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? labels.closeMenu : labels.openMenu}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
          {logoBlock("mobile")}
          {mobileBoardSelector && <div className="ml-auto pl-2 flex-shrink-0">{mobileBoardSelector}</div>}
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      <div
        data-testid="mobile-backdrop"
        className={mobileMenuOpen ? MOBILE_BACKDROP_OPEN : MOBILE_BACKDROP_CLOSED}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu */}
      <div
        className={mobileMenuOpen ? MOBILE_MENU_OPEN : MOBILE_MENU_CLOSED}
        role={mobileMenuOpen ? "dialog" : undefined}
        aria-modal={mobileMenuOpen ? true : undefined}
        aria-label={mobileMenuOpen ? labels.navigationMenu : undefined}
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen ? true : undefined}
        style={mobileMenuOpen ? MOBILE_MENU_STYLE_OPEN : MOBILE_MENU_STYLE_CLOSED}
      >
        <div aria-hidden className="sidebar-gradient-layer" />
        <nav aria-label={labels.primaryNavigation} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {primaryItems.map(renderMobileNavItem)}
          {ai && (
            <button
              type="button"
              onClick={() => {
                ai.onOpen();
                setMobileMenuOpen(false);
              }}
              className={ai.active ? MOBILE_AI_ACTIVE : MOBILE_AI_INACTIVE}
            >
              <Sparkles className="h-5 w-5" />
              {labels.aiAssistant}
            </button>
          )}
        </nav>
        <div className="shrink-0 border-t border-sidebar-border mx-3" />
        <div className="shrink-0 px-3 py-3 text-sidebar-foreground">
          <nav aria-label={labels.secondaryNavigation} className="space-y-1">
            {secondaryItems.map(renderMobileNavItem)}
            {renderAccount?.({ variant: "mobile", collapsed: false })}
          </nav>
          <div className="mt-2 flex items-center justify-between gap-2 border-t border-sidebar-border/80 px-4 pt-3">
            {versionSlot}
            {themeToggleSlot}
          </div>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <TooltipProvider delayDuration={0}>
        <aside
          aria-label={labels.mainNavigation}
          className={cn(
            "hidden lg:fixed lg:top-3 lg:bottom-3 lg:z-[var(--z-sidebar)] lg:block sidebar-gradient sidebar-transition",
            collapsed ? "lg:w-16" : "lg:w-64",
            transitioning && "is-transitioning",
          )}
          style={{ left: appInset + sidebarInset }}
          onTransitionEnd={(e) => {
            if (e.target === e.currentTarget && e.propertyName === "width") {
              onTransitionEnd?.();
            }
          }}
        >
          {/* Compositor-driven gradient scroll — the layer (not the aside) clips,
              because the edge toggle button below overhangs the aside (#57) */}
          <div aria-hidden className="sidebar-gradient-layer" />
          {season && <SidebarAurora colors={season.colors} />}
          {/* Edge toggle button -- sits on the sidebar border, Jira-style */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapsed}
                aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar}
                className="absolute -right-3.5 top-[51px] z-[var(--z-sidebar-toggle)] flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-accent hover:text-foreground transition-colors"
              >
                {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? labels.expandSidebar : labels.collapseSidebar}</TooltipContent>
          </Tooltip>

          <div className="relative z-[1] flex h-full flex-col overflow-hidden">
            {/* Header */}
            {logoBlock("desktop")}

            <div className="mx-2 border-t border-sidebar-border" />

            {/* Board context switcher — first thing under the logo: it scopes
                every destination below it, so it leads the menu. */}
            {boardSelector && (
              <>
                <div className="shrink-0 px-2 pb-3 pt-3">{boardSelector}</div>
                <div className="mx-2 border-t border-sidebar-border" />
              </>
            )}

            {/* Primary Navigation — flex-1 pins secondary + version row to the bottom */}
            <nav aria-label={labels.primaryNavigation} className="min-h-0 flex-1 space-y-1 overflow-y-auto py-4 px-2">
              {primaryItems.map(renderDesktopNavItem)}
            </nav>

            {ai && (
              <>
                <div className="mx-2 border-t border-sidebar-border" />
                <div className="shrink-0 px-2 py-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={ai.onOpen}
                        aria-label={labels.aiAssistant}
                        className={ai.active ? DESKTOP_AI_ACTIVE : DESKTOP_AI_INACTIVE}
                      >
                        <Sparkles className="h-5 w-5 flex-shrink-0" />
                        <span className={collapsed ? NAV_LABEL_COLLAPSED : NAV_LABEL_EXPANDED}>
                          {labels.aiAssistant}
                        </span>
                      </button>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" className="font-medium">
                        {labels.aiAssistant}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
              </>
            )}

            <div className="mx-2 border-t border-sidebar-border" />

            <div className="shrink-0 px-2 pt-2 pb-3">
              <nav aria-label={labels.secondaryNavigation} className="space-y-1">
                {secondaryItems.map(renderDesktopNavItem)}
                {renderAccount?.({ variant: "desktop", collapsed })}
              </nav>
              {/* Footer: expanded = version | toggle side by side; collapsed =
                  toggle stacked over a centered version on the rail line. */}
              <div
                className={cn(
                  "mt-2 border-t border-sidebar-border/80 py-2",
                  collapsed
                    ? "flex flex-col items-center gap-1"
                    : "flex items-center justify-between gap-2 pl-[14px] pr-3",
                )}
              >
                <div
                  className={cn(
                    "min-w-0 overflow-hidden whitespace-nowrap",
                    collapsed ? "order-2 w-full truncate text-center" : "order-1",
                  )}
                >
                  {versionSlot}
                </div>
                <div className={cn("flex-shrink-0", collapsed ? "order-1" : "order-2")}>{themeToggleSlot}</div>
              </div>
            </div>
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
}
