"use client";

import { ChevronUp, Settings } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * The button that opens the rail's settings menu — gear, name, chevron.
 *
 * It lives here and not in the app for the same reason every other rail
 * pixel does: the app would otherwise be copying `--sidebar-*` class strings
 * into a component file and keeping them in sync by eye (which is exactly
 * what the old sign-out row did, comment and all).
 *
 * Deliberately NOT painted like a nav row. A row says "you are here"; this
 * says "there is more behind me", so it wears a hairline and no fill at
 * rest — the rail's filled treatment stays reserved for the one row that is
 * the current route. It fills its container, so the footer decides how wide
 * it is; collapsed it is a 36px square that lines up with the assistant chip
 * stacked below it.
 */
export interface SidebarSettingsTriggerProps extends Omit<React.ComponentProps<"button">, "children"> {
  /**
   * What the trigger is called: the signed-in username when there is one,
   * otherwise the app's word for settings. Doubles as the accessible name
   * when collapsed, where the gear is all that renders.
   */
  label: string;
  /** Icon-only, to match the 64px rail. */
  collapsed?: boolean;
}

export const SidebarSettingsTrigger = React.forwardRef<HTMLButtonElement, SidebarSettingsTriggerProps>(
  function SidebarSettingsTrigger({ label, collapsed = false, className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-slot="sidebar-settings-trigger"
        aria-label={collapsed ? label : undefined}
        className={cn(
          "flex h-9 items-center rounded-lg border border-sidebar-border text-sm font-medium text-sidebar-foreground transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
          // Base UI marks an open trigger; keep it looking pressed while its
          // menu is on screen so the pair reads as one object.
          "data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground",
          collapsed ? "w-9 justify-center" : "w-full min-w-0 gap-2 pl-2.5 pr-2",
          className,
        )}
        {...props}
      >
        <Settings className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
        {!collapsed && (
          <>
            {/* min-w-0 + truncate: a long username shortens rather than
                pushing the chevron off the rail. */}
            <span className="min-w-0 flex-1 truncate text-left">{label}</span>
            {/* Up, not down: the menu flies out of the footer towards the
                list. A down chevron on a menu that opens upward is a small
                lie the eye notices before it can say why. */}
            <ChevronUp className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
          </>
        )}
      </button>
    );
  },
);
