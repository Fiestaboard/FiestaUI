"use client";

import { ChevronLeft, ChevronRight, Menu, Sparkles, X } from "lucide-react";
import { Fragment, memo, useEffect, useRef, useState } from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../overlays/tooltip";
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

// The AI row is a <button> in a column of <a>s: links fill the column as
// flex items, a button shrinks to fit, so its base carries the one class the
// link base doesn't need — w-full. Everything else matches the item classes
// exactly: the row reads as just another destination, which is the point.
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

const NAV_LABEL_BASE = "whitespace-nowrap overflow-hidden transition-opacity duration-fast";
const NAV_LABEL_COLLAPSED = cn(NAV_LABEL_BASE, "opacity-0 max-w-0");
const NAV_LABEL_EXPANDED = cn(NAV_LABEL_BASE, "opacity-100 max-w-48 delay-150");

const MOBILE_BACKDROP_BASE =
  "lg:hidden fixed inset-0 z-[var(--z-mobile-backdrop)] bg-black/25 backdrop-blur-[2px] transition-opacity duration-base pointer-events-none";
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

// Everything the mobile menu can contain that takes keyboard focus. Used by
// the aria-modal focus trap below; kept dependency-free (no focus-trap lib)
// to match the rest of the chrome, and computed per keydown so items added
// or removed while the menu is open (e.g. slot content) are always current.
const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

// The "no items" stand-in. Shared rather than a fresh `[]` per render purely
// to skip the allocation — nothing downstream cares about its identity (memo
// compares INCOMING props, and `[].map()` reconciles the same either way), so
// this is tidiness, not a render optimisation like the class hoisting above.
const EMPTY_ITEMS: SidebarNavItem[] = [];

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
  /**
   * @deprecated No longer rendered. The rail has one nav landmark, named by
   * `primaryNavigation`; there is no second list left to label.
   */
  secondaryNavigation?: string;
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
  /**
   * The nav list, top to bottom — one flat array rendered into one <nav>.
   * Order is entirely the app's: put help, settings and sign-out at the end
   * of it like any other destination.
   */
  items?: SidebarNavItem[];
  /**
   * @deprecated Use `items`. Renders as the head of the single nav list.
   */
  primaryItems?: SidebarNavItem[];
  /**
   * @deprecated Use `items`. Renders after `primaryItems` (and after the AI
   * row, which keeps its old position at the seam) in the same single list.
   */
  secondaryItems?: SidebarNavItem[];
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
  /** Click handler for the logo. When present, the lockup renders as a button. */
  onLogoClick?: (e: React.MouseEvent) => void;
  /**
   * AI assistant nav entry; omit to hide. Renders as a row of the one nav
   * list — visually identical to the items around it, scrolling with them.
   * It used to be its own one-row section between two hairlines below the
   * list; a single entry fenced off by dividers read as a stranded
   * mini-menu, and every hairline it added shrank the space the list had
   * before it needed to scroll.
   *
   * With `items` it is the last row before `renderAccount`. With the
   * deprecated primary/secondary pair it sits at the seam between them —
   * where it rendered when those were two separate lists — so consumers
   * migrating on their own schedule see the merge, not a reshuffle.
   */
  ai?: { active: boolean; onOpen: () => void };
  /** Board switcher slots (rendered only when provided). */
  boardSelector?: React.ReactNode;
  mobileBoardSelector?: React.ReactNode;
  /** Account row; renders as the last row of the nav list, scrolling with it. */
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

export const Sidebar = memo(function Sidebar({
  labels,
  items,
  primaryItems,
  secondaryItems,
  renderLink,
  collapsed,
  transitioning = false,
  onToggleCollapsed,
  onTransitionEnd,
  logoIconSrc = FIESTA_ICON_DATA_URI,
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
  // The nav list, split only by where the AI row goes. `items` is the whole
  // list (AI last, then the account row); the deprecated pair renders
  // primary -> AI -> secondary, preserving the AI row's old position. Two
  // nullish coalesces and no allocation — `items={[]}` is honoured as an
  // explicitly empty list rather than falling through to `primaryItems`.
  const itemsBeforeAi = items ?? primaryItems ?? EMPTY_ITEMS;
  const itemsAfterAi = items ? EMPTY_ITEMS : (secondaryItems ?? EMPTY_ITEMS);

  // `items` wins outright over the deprecated pair, and it has to: appending
  // them instead would render every row twice — with duplicate React keys —
  // for anyone who COPIED a list into `items` rather than moving it. But
  // dropping them is silent, and all three props are optional, so a
  // half-finished migration that moves `primaryItems` across and forgets
  // `secondaryItems` loses help, settings and sign-out off the rail with a
  // clean typecheck and a clean build. Say so out loud instead.
  const ignoringDeprecatedItems = Boolean(items && (primaryItems || secondaryItems));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [appInset, setAppInset] = useState(0);
  const headerRef = useRef<HTMLElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  // The element that opened the menu (the hamburger button), captured at open
  // so focus can be restored to it when the menu closes (issue #59).
  const menuTriggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!ignoringDeprecatedItems) return;
    console.warn(
      "[Sidebar] `items` was passed alongside `primaryItems`/`secondaryItems`. " +
        "The deprecated props are being IGNORED — fold their entries into `items`, which is one flat list.",
    );
  }, [ignoringDeprecatedItems]);

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

  // aria-modal contract for the mobile menu (issue #59): move focus in on
  // open, restore it to the hamburger trigger on close, and close on Escape
  // no matter where focus sits (a tap on the menu's padding can drop focus to
  // <body>, so the listener lives on the document, not the menu). Focus only
  // ever moves in response to the open-state change — nothing autofocuses in
  // the default closed state, keeping VRT screenshots untouched.
  useEffect(() => {
    if (mobileMenuOpen) {
      const menu = mobileMenuRef.current;
      const first = menu?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      (first ?? menu)?.focus();
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileMenuOpen(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
    const trigger = menuTriggerRef.current;
    menuTriggerRef.current = null;
    trigger?.focus();
  }, [mobileMenuOpen]);

  // Focus trap while the menu is open: Tab from the last focusable wraps to
  // the first and Shift+Tab from the first wraps to the last, so keyboard
  // focus can never escape the "modal" into the inert-free page behind the
  // backdrop. The menu itself gets `inert` when closed; this covers open.
  function handleMobileMenuKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "Tab") return;
    const menu = mobileMenuRef.current;
    if (!menu) return;
    const focusable = menu.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || active === menu) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  }

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
            "logo-on-gradient whitespace-nowrap overflow-hidden transition-opacity duration-fast",
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

    if (onLogoClick) {
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
        {/* px-3, not px-4: the pill is already inset 12px by `left-3`, so a
            16px pad put its contents at 28 while the page's own title sat at
            16 — the bar and the page below it shared no vertical. At 12 the
            menu trigger's -ml-2 lands its box on 16, the same line PageLayout
            gives the H1 and the cards. */}
        <div className="relative z-[1] flex min-h-14 flex-wrap items-center gap-y-2 px-3 py-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 flex-shrink-0 -ml-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={(e) => {
              // Capture the trigger before opening so close (Escape, backdrop,
              // nav click, or this same toggle) can restore focus to it.
              if (!mobileMenuOpen) menuTriggerRef.current = e.currentTarget;
              setMobileMenuOpen(!mobileMenuOpen);
            }}
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
        ref={mobileMenuRef}
        className={mobileMenuOpen ? MOBILE_MENU_OPEN : MOBILE_MENU_CLOSED}
        role={mobileMenuOpen ? "dialog" : undefined}
        aria-modal={mobileMenuOpen ? true : undefined}
        aria-label={mobileMenuOpen ? labels.navigationMenu : undefined}
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen ? true : undefined}
        // Focus fallback target when the menu has no focusable children;
        // also lets the Shift+Tab trap treat container-focus as "at first".
        tabIndex={mobileMenuOpen ? -1 : undefined}
        onKeyDown={handleMobileMenuKeyDown}
        style={mobileMenuOpen ? MOBILE_MENU_STYLE_OPEN : MOBILE_MENU_STYLE_CLOSED}
      >
        {/* One list and one hairline, mirroring the desktop rail: every
            destination — help, settings, the AI row, the account row —
            scrolls together in this nav, and the only thing pinned below it
            is the version/theme footer. */}
        <nav aria-label={labels.primaryNavigation} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {itemsBeforeAi.map(renderMobileNavItem)}
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
          {itemsAfterAi.map(renderMobileNavItem)}
          {renderAccount?.({ variant: "mobile", collapsed: false })}
        </nav>
        <div className="shrink-0 border-t border-sidebar-border mx-3" />
        {/* px-7 = the nav's px-3 plus a row's own px-4, putting the version
            on the rows' content line — the same x as every icon above it,
            which is exactly where it sat when a nested block supplied the
            two paddings separately. */}
        <div className="shrink-0 flex items-center justify-between gap-2 px-7 py-3 text-sidebar-foreground">
          {versionSlot}
          {themeToggleSlot}
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
          {/* Edge toggle button -- sits on the sidebar border, Jira-style */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapsed}
                aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar}
                // Painted in the RAIL's vocabulary, not the page's. This used
                // to be `bg-background text-muted-foreground`, which took its
                // fill from the page and its glyph from whatever
                // --muted-foreground resolved to INSIDE .sidebar-gradient —
                // two different surfaces for one control. Once the rail became
                // a fixture that is dark in both themes, that mismatch went
                // from fragile to invisible: a white circle with a white
                // chevron on it in light mode. The toggle is a knob on the
                // rail, so it uses --sidebar/--sidebar-foreground and reads
                // identically in both themes.
                className="absolute -right-3.5 top-[51px] z-[var(--z-sidebar-toggle)] flex h-7 w-7 items-center justify-center rounded-full border border-sidebar-border bg-sidebar text-sidebar-foreground shadow-md transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? labels.expandSidebar : labels.collapseSidebar}</TooltipContent>
          </Tooltip>

          {/* ONE list. TOP is pinned context (logo, board switcher); then a
              single nav that owns all remaining height and scrolls inside
              itself; BOTTOM is the version/theme footer and nothing else.

              This was two nav landmarks fenced by three hairlines — a
              "primary" list, then a "secondary" one holding help, settings
              and the account row. The split asked the reader to learn a
              distinction that was never real: both halves were the same rows
              in the same vocabulary, differing only in how far down the rail
              they had drifted. It cost two props and two aria labels to
              express one menu, and each hairline stole height from the one
              list that actually had to scroll. Now help, settings, the AI row
              and the account row are just the last destinations in the list,
              and the app orders them via `items`. */}
          <div className="relative z-[1] flex h-full flex-col overflow-hidden">
            {/* Header — logo and the board context switcher are one pinned
                block: the switcher scopes every destination below it, so it
                stays visible while the list scrolls. */}
            {logoBlock("desktop")}
            {boardSelector && <div className="shrink-0 px-2 pb-3">{boardSelector}</div>}

            <div className="mx-2 border-t border-sidebar-border" />

            {/* The nav list — flex-1 gives it every pixel the pinned blocks
                don't use; min-h-0 lets it actually shrink so overflow-y
                scrolls the LIST, never the sidebar. */}
            <nav aria-label={labels.primaryNavigation} className="min-h-0 flex-1 space-y-1 overflow-y-auto py-4 px-2">
              {itemsBeforeAi.map(renderDesktopNavItem)}
              {ai &&
                (collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={ai.onOpen}
                        aria-label={labels.aiAssistant}
                        className={ai.active ? DESKTOP_AI_ACTIVE : DESKTOP_AI_INACTIVE}
                      >
                        <Sparkles className="h-5 w-5 flex-shrink-0" />
                        <span className={NAV_LABEL_COLLAPSED}>{labels.aiAssistant}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium">
                      {labels.aiAssistant}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  // Expanded rows pay no tooltip machinery — same reasoning as
                  // renderDesktopNavItem above.
                  <button
                    type="button"
                    onClick={ai.onOpen}
                    className={ai.active ? DESKTOP_AI_ACTIVE : DESKTOP_AI_INACTIVE}
                  >
                    <Sparkles className="h-5 w-5 flex-shrink-0" />
                    <span className={NAV_LABEL_EXPANDED}>{labels.aiAssistant}</span>
                  </button>
                ))}
              {itemsAfterAi.map(renderDesktopNavItem)}
              {renderAccount?.({ variant: "desktop", collapsed })}
            </nav>

            <div className="mx-2 border-t border-sidebar-border" />

            <div className="shrink-0 px-2 pt-2 pb-3">
              {/* Footer: expanded = version | toggle side by side; collapsed =
                  the toggle alone. The 64px rail cannot fit a version string,
                  and the old centered-with-truncate treatment did not degrade
                  to an ellipsis — the slot's own flex layout clipped it
                  mid-glyph, so "v8.32.10 (dev)" read as the plausible-but-wrong
                  "v8.32.1". A number that can only render wrongly is better
                  dropped; the expanded rail and the mobile menu keep it. The
                  hairline above is the block's own separator now, so this row
                  no longer draws a second one of its own. */}
              <div
                className={cn(
                  "py-2",
                  collapsed ? "flex justify-center" : "flex items-center justify-between gap-2 pl-[14px] pr-3",
                )}
              >
                {!collapsed && <div className="min-w-0 overflow-hidden whitespace-nowrap">{versionSlot}</div>}
                <div className="flex-shrink-0">{themeToggleSlot}</div>
              </div>
            </div>
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
});
