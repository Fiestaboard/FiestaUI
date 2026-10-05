"use client";

import { ChevronLeft, ChevronRight, Menu, Settings, Sparkles, X } from "lucide-react";
import { Fragment, memo, useEffect, useId, useRef, useState } from "react";

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

// The footer's icon chips: the settings shortcut and the assistant. Neither
// borrows the nav row's shape while the rail is expanded — they are 36px
// squares that sit beside the account trigger (rail footer), and the
// assistant alone beside the board selector (mobile header). Both keep `nav-active` for their on state, and
// the two states mean different things: the gear is lit because /settings
// IS the current route (it has no row in the list to say so), the assistant
// because its panel is open. A route and a panel can both be true at once,
// which is why they are two chips and not two rows of one list.
//
// `focus-ring` is the system's two-tone recipe, not the solid
// `ring-sidebar-ring` these used to carry. That one was the brand orange
// alone: 1.56:1 against the light rail, and 1:1 against a LIT chip's own
// orange fill, where focus did nothing but make the chip 2px bigger. The
// ink hairlines in the shared recipe are what hold the boundary there.
// The hamburger's notice gap, as SidebarAccountTrigger's NOTICE_CUTOUT is the
// avatar's. The glyph renders at 16px (Button sizes unsized svgs), offset 10px
// in the 36px button, so the `end-2 top-2` dot's centre is (14, 2) in the
// glyph's own box — just past the end of its top bar. Mirrored for RTL.
const HAMBURGER_NOTICE_CUTOUT =
  "[mask-image:radial-gradient(circle_at_14px_2px,transparent_6px,#000_6.5px)] rtl:[mask-image:radial-gradient(circle_at_2px_2px,transparent_6px,#000_6.5px)]";

const FOOTER_CHIP_BASE = "focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors";
const FOOTER_CHIP_ACTIVE = cn(FOOTER_CHIP_BASE, NAV_ITEM_ACTIVE);
const FOOTER_CHIP_INACTIVE = cn(FOOTER_CHIP_BASE, NAV_ITEM_INACTIVE);
// On the collapsed rail a chip is one more tile in the column of nav tiles
// above it, so it takes their shape — the rail's full 48px, not a 36px
// square. Otherwise the lit gear is a visibly smaller tile than the lit
// Home row it is stacked under, and the two read as different kinds of "on".
const FOOTER_CHIP_FILL_ACTIVE = cn(FOOTER_CHIP_ACTIVE, "w-full");
const FOOTER_CHIP_FILL_INACTIVE = cn(FOOTER_CHIP_INACTIVE, "w-full");

function footerChipClass(active: boolean, fill: boolean) {
  if (fill) return active ? FOOTER_CHIP_FILL_ACTIVE : FOOTER_CHIP_FILL_INACTIVE;
  return active ? FOOTER_CHIP_ACTIVE : FOOTER_CHIP_INACTIVE;
}

const DESKTOP_LINK_BASE =
  "flex items-center gap-3 py-2 pl-[14px] pr-3 rounded-lg text-sm font-medium transition-colors";
const DESKTOP_LINK_ACTIVE = cn(DESKTOP_LINK_BASE, NAV_ITEM_ACTIVE);
const DESKTOP_LINK_INACTIVE = cn(DESKTOP_LINK_BASE, NAV_ITEM_INACTIVE);

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
  /** Set on whichever link is the current route — a nav row, or the settings shortcut. */
  "aria-current"?: "page";
  /** Stable hook for tests and e2e; set on the settings shortcut. */
  "data-slot"?: string;
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
   * Order is entirely the app's. Settings does not belong in it: pass
   * `settings` for the footer gear, and put sign-out in the account menu.
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
   *
   * It must return ONE element that puts every prop it is given on the
   * anchor, including a `ref` and props not listed in `SidebarLinkProps`:
   * collapsed rows and the settings shortcut are wrapped in a tooltip,
   * which attaches its ref and hover/focus handlers to whatever comes back.
   *
   * The settings shortcut (`settings`) is rendered through this too. Its
   * second argument is a synthetic item with `key: "settings"` — it is not
   * one of `items`, so do not look it up in your own list by key.
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
   * AI assistant entry; omit to hide (an install with no provider
   * configured). It renders as an icon action in the rail footer and in the
   * mobile header — NOT as a row of the nav list.
   *
   * It used to be a nav row, and that is the bug this shape fixes: the list
   * shows which ROUTE you are on, so opening the drawer over /pages lit two
   * rows at once, Pages and AI Assistant, and neither was wrong. A panel is
   * not a destination. Moved out of the list, its on state is the only
   * highlight the drawer can produce, and the route highlight stays true.
   */
  ai?: { active: boolean; onOpen: () => void };
  /** Board switcher slots (rendered only when provided). */
  boardSelector?: React.ReactNode;
  mobileBoardSelector?: React.ReactNode;
  /**
   * The account menu that anchors the footer: expanded it fills the width
   * the icon chips do not take, collapsed it is an avatar above them, and
   * in the mobile menu it is the whole footer row.
   *
   * A render function rather than a node because the trigger has two
   * shapes — avatar, name and chevrons at 256px, a bare avatar at 64px
   * (`SidebarAccountTrigger` draws both) — and only the app can build
   * either: the menu's CONTENTS are auth, router, theme and i18n, none of
   * which the design system knows about. FiestaUI owns where the trigger
   * sits and how much room it gets; the app owns what is inside it.
   *
   * The prop keeps its 7.0.0 name: the menu behind it still leads to
   * settings, it is only the trigger that stopped being a gear.
   *
   * Replaces `versionSlot` and `themeToggleSlot` (7.0.0). Both were footer
   * nodes that only ever held one control each; the version now lives in
   * the app's About dialog and the theme is a checked group in the menu.
   */
  renderSettingsMenu?: (ctx: {
    variant: "mobile" | "desktop";
    collapsed: boolean;
    /** `menuNotice`, passed through for the app's `SidebarAccountTrigger`. */
    notice?: string;
  }) => React.ReactNode;
  /**
   * A one-click shortcut to the settings route: a gear chip in the rail
   * footer, between the account menu and the assistant. Omit to hide.
   *
   * Settings is also an item of the account menu, and that is deliberate
   * rather than redundant — the menu is where you look for it, the gear is
   * where you reach for it. It is a LINK (rendered through `renderLink`, so
   * it navigates like any nav row), and `active` lights it while settings
   * is the current route: settings has no row in the list, so without this
   * nothing on the rail says where you are.
   *
   * Desktop rail only: the mobile header bar has no width to spare for a
   * second chip. On mobile the route to settings is the app's — an inline
   * row in what `renderSettingsMenu` returns for `variant: "mobile"` — so
   * do not pass this without also covering the drawer.
   */
  settings?: { href: string; label: string; active?: boolean; onPrefetch?: () => void };
  /**
   * Something inside the account menu is waiting to be acted on (an update
   * ready to install), in the app's words: "Update available".
   *
   * One prop, both breakpoints. On the desktop rail it is handed back to
   * `renderSettingsMenu` as `notice`, for the app to pass to its
   * `SidebarAccountTrigger`, which wears the dot on the avatar. In the
   * mobile drawer there is no trigger — the menu's rows render inline — so
   * the closed hamburger is the only thing on screen that can say the
   * drawer holds something, and the Sidebar puts the dot there itself.
   */
  menuNotice?: string;
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
  renderSettingsMenu,
  settings,
  menuNotice,
  maxWidth,
  sidebarInset,
}: SidebarProps) {
  // One list, no seam. The deprecated pair used to be spliced around the AI
  // row; the assistant left the list in 7.0.0, so primary+secondary is now
  // a plain concatenation. `items={[]}` is honoured as an explicitly empty
  // list rather than falling through to `primaryItems`.
  const navItems =
    items ??
    (primaryItems || secondaryItems
      ? [...(primaryItems ?? EMPTY_ITEMS), ...(secondaryItems ?? EMPTY_ITEMS)]
      : EMPTY_ITEMS);

  // `items` wins outright over the deprecated pair, and it has to: appending
  // them instead would render every row twice — with duplicate React keys —
  // for anyone who COPIED a list into `items` rather than moving it. But
  // dropping them is silent, and all three props are optional, so a
  // half-finished migration that moves `primaryItems` across and forgets
  // `secondaryItems` loses help, settings and sign-out off the rail with a
  // clean typecheck and a clean build. Say so out loud instead.
  const ignoringDeprecatedItems = Boolean(items && (primaryItems || secondaryItems));

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // An empty string is no notice, as on the trigger.
  const hamburgerNotice = !mobileMenuOpen && Boolean(menuNotice);
  const hamburgerNoticeId = useId();
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
            "aria-current": item.active ? "page" : undefined,
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
          // The fill says "you are here" to the eye; this says it to a
          // screen reader. Without it the settings shortcut was the only
          // link on the rail that ever announced itself as current.
          "aria-current": item.active ? "page" : undefined,
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

  /**
   * The assistant as an icon chip. Same control in both places it appears —
   * the rail footer and the mobile header — so its name, its on state and
   * its hit area are defined once, here, rather than twice at each site.
   *
   * `aria-pressed` rather than `aria-current`: it toggles a panel open and
   * shut, it does not mark a location. That distinction is the whole point
   * of moving it off the nav list.
   */
  const aiAction = (fill = false) =>
    ai ? (
      <button
        type="button"
        onClick={ai.onOpen}
        aria-label={labels.aiAssistant}
        aria-pressed={ai.active}
        data-slot="sidebar-ai"
        className={footerChipClass(ai.active, fill)}
      >
        <Sparkles className="h-5 w-5" aria-hidden="true" />
      </button>
    ) : null;

  /**
   * The settings shortcut as an icon chip. A link, not a button: it goes
   * somewhere, so it gets the app's router link, a real href (middle-click,
   * copy address) and `aria-current` rather than `aria-pressed`.
   *
   * The synthetic nav item only exists to satisfy `renderLink`'s second
   * argument, which apps use to tell rows apart.
   */
  const settingsAction = (fill = false) =>
    settings
      ? renderLink(
          {
            href: settings.href,
            "aria-label": settings.label,
            "aria-current": settings.active ? "page" : undefined,
            "data-slot": "sidebar-settings-link",
            onMouseEnter: settings.onPrefetch,
            onFocus: settings.onPrefetch,
            className: footerChipClass(Boolean(settings.active), fill),
            children: <Settings className="h-5 w-5" aria-hidden="true" />,
          },
          { key: "settings", href: settings.href, icon: Settings, label: settings.label, active: settings.active },
        )
      : null;

  /**
   * The footer strip: the app's account menu taking every pixel the chips
   * do not, then the settings gear, then the assistant. Collapsed, the 64px
   * rail has no width to share, so the three stack — account, settings,
   * assistant — which is also the order they read in expanded.
   *
   * Expanded, the two chips sit closer to each other (4px) than to the
   * account trigger (8px): they are a pair of the same kind of thing, and
   * the trigger is a different kind. Collapsed, that distinction gives way
   * to the column: all three are 48×36 tiles on the nav list's own 40px
   * pitch, so the footer continues the rhythm of the icons above it instead
   * of starting a second one.
   *
   * `data-orientation` is the contract the unit tests hold; the pixels are
   * VRT's job.
   */
  const footerBlock = (variant: "mobile" | "desktop", isCollapsed: boolean) => {
    const menu = renderSettingsMenu?.({ variant, collapsed: isCollapsed, notice: menuNotice || undefined });
    const shortcut = variant === "desktop" ? settingsAction(isCollapsed) : null;
    const assistant = variant === "desktop" ? aiAction(isCollapsed) : null;
    if (!menu && !shortcut && !assistant) return null;

    // Icon-only in both states, so unlike the nav rows the chips always earn
    // their tooltips. They point right off the collapsed rail and up out of
    // the expanded footer — the directions with room.
    const tooltipSide = isCollapsed ? "right" : "top";

    return (
      <div
        data-slot="sidebar-footer"
        data-orientation={isCollapsed ? "vertical" : "horizontal"}
        className={isCollapsed ? "flex flex-col items-stretch gap-1" : "flex items-center gap-2"}
      >
        {menu && (
          <div data-slot="sidebar-settings-menu" className={isCollapsed ? "shrink-0" : "min-w-0 flex-1"}>
            {menu}
          </div>
        )}
        {(shortcut || assistant) && (
          <div
            data-slot="sidebar-footer-actions"
            // ms-auto: with no account menu to push them, the chips still
            // hold the trailing edge rather than drifting to the leading one.
            className={
              isCollapsed ? "flex shrink-0 flex-col items-stretch gap-1" : "ms-auto flex shrink-0 items-center gap-1"
            }
          >
            {shortcut && (
              <Tooltip>
                <TooltipTrigger asChild>{shortcut as React.ReactElement}</TooltipTrigger>
                <TooltipContent side={tooltipSide} className="font-medium">
                  {settings?.label}
                </TooltipContent>
              </Tooltip>
            )}
            {assistant && (
              <Tooltip>
                <TooltipTrigger asChild>{assistant}</TooltipTrigger>
                <TooltipContent side={tooltipSide} className="font-medium">
                  {labels.aiAssistant}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    );
  };

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
            className="relative h-9 w-9 flex-shrink-0 -ml-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={(e) => {
              // Capture the trigger before opening so close (Escape, backdrop,
              // nav click, or this same toggle) can restore focus to it.
              if (!mobileMenuOpen) menuTriggerRef.current = e.currentTarget;
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            aria-label={mobileMenuOpen ? labels.closeMenu : labels.openMenu}
            aria-describedby={hamburgerNotice ? hamburgerNoticeId : undefined}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className={cn("h-6 w-6", hamburgerNotice && HAMBURGER_NOTICE_CUTOUT)} />
            )}
            {/* The account trigger's dot, cut out of the glyph the same way,
                so the two read as one signal across breakpoints. On the
                glyph's top bar end, not the button's corner, where it
                floated free of anything. Gone while the drawer is open: the
                glyph is an X then, and a notice on "Close" says nothing. */}
            {hamburgerNotice && (
              <>
                <span
                  data-slot="sidebar-menu-notice"
                  aria-hidden="true"
                  className="pointer-events-none absolute end-2 top-2 size-2 rounded-full bg-brand"
                />
                <span id={hamburgerNoticeId} hidden>
                  {menuNotice}
                </span>
              </>
            )}
          </Button>
          {logoBlock("mobile")}
          {/* Board selector then assistant, both pinned right. The assistant
              is here rather than in the hamburger menu because it is the one
              thing on a phone you reach for mid-task — two taps behind a
              menu that also has to close itself again is two too many. */}
          {(mobileBoardSelector || ai) && (
            <div className="ml-auto flex flex-shrink-0 items-center gap-1 pl-2">
              {mobileBoardSelector}
              {aiAction()}
            </div>
          )}
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
            destination scrolls together in this nav, and the only thing
            pinned below it is the settings menu. The assistant is not here
            at all — it lives in the header bar above, always reachable. */}
        <nav aria-label={labels.primaryNavigation} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map(renderMobileNavItem)}
        </nav>
        <div className="shrink-0 border-t border-sidebar-border mx-3" />
        {/* px-3 matches the nav's own gutter, so the trigger's left edge
            lands under the rows' rounded hit areas rather than under their
            glyphs — it is a control the width of the menu, not a row. */}
        <div className="shrink-0 px-3 py-3 text-sidebar-foreground">{footerBlock("mobile", false)}</div>
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
              {navItems.map(renderDesktopNavItem)}
            </nav>

            <div className="mx-2 border-t border-sidebar-border" />

            {/* Footer: the account menu, the settings gear and the
                assistant, and nothing else. It used to be the version string beside a theme toggle — two
                controls that between them said less than one menu does, and
                the version could only render wrongly at 64px anyway (the
                slot's flex layout clipped "v8.32.10 (dev)" mid-glyph into
                the plausible-but-wrong "v8.32.1"). Both facts moved inside
                the menu, where there is room to be right. */}
            {/* py-3: the same 12px above the strip as below it. At pt-2 the
                controls sat visibly closer to the hairline than to the
                rail's bottom edge. */}
            <div className="shrink-0 px-2 py-3">{footerBlock("desktop", collapsed)}</div>
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
});
