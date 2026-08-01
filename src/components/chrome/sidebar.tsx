"use client";

import { ChevronLeft, ChevronRight, Menu, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { Season } from "../../lib/seasons";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { FIESTA_ICON_DATA_URI } from "./fiesta-icon";
import { FiestaLogo } from "./fiesta-logo";
import { SidebarAurora } from "./sidebar-aurora";
import { SidebarAuroraHorizontal } from "./sidebar-aurora-horizontal";

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
    const update = () => setAppInset(Math.max(0, (document.body.clientWidth - maxWidth) / 2));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [maxWidth]);

  function renderMobileNavItem(item: SidebarNavItem) {
    const Icon = item.icon;
    const mobileClassName = cn(
      "flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium min-h-[48px]",
      item.active ? "nav-active font-semibold" : "text-sidebar-foreground nav-active-hover",
    );

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
    const linkClassName = cn(
      "flex items-center gap-3 py-2 pl-[14px] pr-3 rounded-lg text-sm font-medium transition-colors",
      item.active ? "nav-active font-semibold" : "text-sidebar-foreground nav-active-hover",
    );

    const inner = (
      <>
        <Icon className="h-5 w-5 flex-shrink-0" />
        <span
          className={cn(
            "whitespace-nowrap overflow-hidden transition-opacity duration-100",
            collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-48 delay-150",
          )}
        >
          {item.label}
        </span>
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

    return (
      <Tooltip key={item.key}>
        <TooltipTrigger asChild>{link as React.ReactElement}</TooltipTrigger>
        {collapsed && (
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        )}
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
        ? "flex items-center gap-3 min-w-0 flex-1 ml-2"
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
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-2 left-3 right-3 z-[100] overflow-hidden sidebar-gradient-horizontal">
        {season && <SidebarAuroraHorizontal colors={season.colors} />}
        <div className="relative z-[1] flex items-center px-4 h-14">
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
          {mobileBoardSelector && <div className="ml-2 flex-shrink-0">{mobileBoardSelector}</div>}
        </div>
      </header>

      {/* Mobile Menu Backdrop */}
      <div
        data-testid="mobile-backdrop"
        className={cn(
          "lg:hidden fixed inset-0 z-[90] bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 pointer-events-none",
          mobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0",
        )}
        onClick={() => setMobileMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Menu */}
      <div
        className={cn(
          "lg:hidden fixed top-[72px] left-3 right-3 z-[95] flex max-h-[calc(100dvh-5.5rem)] flex-col overflow-hidden sidebar-gradient-horizontal",
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        role={mobileMenuOpen ? "dialog" : undefined}
        aria-modal={mobileMenuOpen ? true : undefined}
        aria-label={mobileMenuOpen ? labels.navigationMenu : undefined}
        aria-hidden={!mobileMenuOpen}
        inert={!mobileMenuOpen ? true : undefined}
        style={{
          clipPath: mobileMenuOpen ? "inset(0 0 0 0 round 16px)" : "inset(0 0 100% 0 round 16px)",
          transition: "clip-path 350ms cubic-bezier(0.16, 1, 0.3, 1), opacity 250ms ease",
        }}
      >
        <nav aria-label={labels.primaryNavigation} className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {primaryItems.map(renderMobileNavItem)}
          {ai && (
            <button
              type="button"
              onClick={() => {
                ai.onOpen();
                setMobileMenuOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base font-medium min-h-[48px]",
                ai.active ? "nav-active font-semibold" : "text-sidebar-foreground nav-active-hover",
              )}
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
            "hidden lg:fixed lg:top-3 lg:bottom-3 lg:z-50 lg:block sidebar-gradient sidebar-transition",
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
          {season && <SidebarAurora colors={season.colors} />}
          {/* Edge toggle button -- sits on the sidebar border, Jira-style */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onToggleCollapsed}
                aria-label={collapsed ? labels.expandSidebar : labels.collapseSidebar}
                className="absolute -right-3.5 top-[51px] z-[51] flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md hover:bg-accent hover:text-foreground transition-colors"
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
                        className={cn(
                          "flex w-full items-center gap-3 py-2 pl-[14px] pr-3 rounded-lg text-sm font-medium transition-colors",
                          ai.active ? "nav-active font-semibold" : "text-sidebar-foreground nav-active-hover",
                        )}
                      >
                        <Sparkles className="h-5 w-5 flex-shrink-0" />
                        <span
                          className={cn(
                            "whitespace-nowrap overflow-hidden transition-opacity duration-100",
                            collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-48 delay-150",
                          )}
                        >
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
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-sidebar-border/80 py-2 pl-[14px] pr-3">
                <div
                  className={cn(
                    "min-w-0 overflow-hidden whitespace-nowrap transition-opacity duration-100",
                    collapsed ? "max-w-0 opacity-0" : "max-w-[min(200px,100%)] opacity-100 delay-150",
                  )}
                >
                  {versionSlot}
                </div>
                <div className="flex-shrink-0">{themeToggleSlot}</div>
              </div>
            </div>
          </div>
        </aside>
      </TooltipProvider>
    </>
  );
}
