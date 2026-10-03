"use client";

import { ChevronsUpDown, Ellipsis } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Avatar } from "../containment/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "../overlays/tooltip";

/**
 * The button that opens the rail's account menu — avatar, name, chevrons.
 *
 * It replaces `SidebarSettingsTrigger`, which was a gear and a name in a
 * hairline box. That shape said "settings" twice (the glyph and, on an
 * install with auth off, the word) while the thing behind it was never only
 * settings: it is who is signed in, the theme, the version, About and
 * sign-out. A person is the honest handle for that menu, and the gear is
 * now free to be what a gear usually is — a direct link to settings, which
 * the Sidebar renders beside this as its own chip (`settings` prop).
 *
 * No border and no fill at rest, unlike the trigger it replaces. The avatar
 * already draws the left edge of the control, and a hairline box around an
 * avatar reads as a form field. It takes the same hover fill as everything
 * else on the rail and fills its container, so the footer decides how wide
 * it is; collapsed it is the avatar alone, on the same centre line as the
 * nav icons above and the chips stacked below it.
 *
 * When nobody is signed in (`anonymous`) there is no person to draw, and a
 * blank silhouette is not neutral — it is what every sign-in button looks
 * like, on an install that has nothing to sign in to. So the avatar gives
 * way to an ellipsis and the app labels the trigger with its word for
 * "More": a menu of further things, which is exactly what is left behind it.
 */
export interface SidebarAccountTriggerProps extends Omit<React.ComponentProps<"button">, "children"> {
  /**
   * The signed-in username, or — when nobody is signed in — the app's word
   * for the menu ("More"). Doubles as the accessible name and the tooltip
   * when collapsed, where the avatar is all that renders.
   */
  label: string;
  /**
   * Nobody is signed in, so `label` is a description rather than a name.
   * An ellipsis is drawn in the avatar's place: initials of the label would
   * be a monogram for someone who does not exist.
   */
  anonymous?: boolean;
  /** Avatar-only, to match the 64px rail. */
  collapsed?: boolean;
}

export const SidebarAccountTrigger = React.forwardRef<HTMLButtonElement, SidebarAccountTriggerProps>(
  function SidebarAccountTrigger({ label, anonymous = false, collapsed = false, className, ...props }, ref) {
    const button = (
      <button
        ref={ref}
        type="button"
        aria-label={collapsed ? label : undefined}
        className={cn(
          "focus-ring flex h-9 items-center rounded-lg text-sm font-medium text-sidebar-foreground transition-colors",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          // Base UI marks an open trigger; keep it looking pressed while its
          // menu is on screen so the pair reads as one object.
          "data-[popup-open]:bg-sidebar-accent data-[popup-open]:text-sidebar-accent-foreground",
          // ps-3 + gap-2.5 are not free choices: they put the 24px avatar's
          // centre on the nav icons' column and the name on the nav labels'
          // leading edge. Anything else and the avatar jumps sideways when
          // the rail collapses (where it is centred) while the icons above
          // it stay put. Collapsed it fills the rail like a nav row does, so
          // its hover fill is the same 48×36 tile.
          collapsed ? "w-full justify-center" : "w-full min-w-0 gap-2.5 ps-3 pe-2",
          className,
        )}
        {...props}
        // After the spread, deliberately. Base UI's Trigger stamps its own
        // `data-slot` through `render`, and whichever lands last wins — this
        // marker has to survive being used as one, because it is how the
        // rail's own footer control is found in the app's tests and e2e.
        data-slot="sidebar-account-trigger"
      >
        {anonymous ? (
          // A 24px box around a 20px glyph: the same footprint as the avatar
          // it stands in for, so the label starts on the same edge either
          // way, and the same glyph size as the nav icons it lines up under.
          <span className="flex size-6 shrink-0 items-center justify-center" aria-hidden="true">
            <Ellipsis className="h-5 w-5" />
          </span>
        ) : (
          // Neutral, not brand: on the rail the brand colour means "current
          // route", and an orange disc beside a lit gear is two selections.
          <Avatar size="sm" name={label} />
        )}
        {!collapsed && (
          // The name and its chevrons travel together, 4px apart, instead
          // of the chevrons being pushed to the far edge. Out there they
          // sat as close to the gear as the gear does to the assistant and
          // read as a third icon in that row.
          <span className="flex min-w-0 items-center gap-1">
            {/* min-w-0 + truncate: a long username shortens rather than
                pushing the chevrons or the chips off the rail. `title` is
                what makes the shortened name recoverable without opening
                the menu. */}
            <span data-slot="sidebar-account-name" title={label} className="min-w-0 truncate text-start">
              {label}
            </span>
            {/* Both ways, not down: the menu flies UP out of the footer, and
                a down chevron on a menu that opens upward is a small lie the
                eye notices before it can say why. The paired chevrons make
                no claim about direction — only that there is a menu.

                Not when anonymous: an ellipsis and the word "More" have
                each already said "menu", and a third signal is noise. */}
            {!anonymous && <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden="true" />}
          </span>
        )}
      </button>
    );

    // Expanded, the name is on screen and a tooltip would only repeat it.
    if (!collapsed) return button;

    // Collapsed, this is an icon-only control like every other tile on the
    // 64px rail, and every one of those names itself on hover and focus.
    // The tooltip lives here rather than in the app because the trigger is
    // normally handed to a menu as its `render` element: the menu's props
    // arrive on this component, land on the button above, and the tooltip
    // wraps the result — no extra nesting for the consumer to get right.
    //
    // It stands down while the menu is open (`aria-expanded`, set by the
    // menu trigger). Without that, moving the pointer back over the avatar
    // hangs a tooltip beside the open menu: two popups for one control,
    // the second repeating the name the menu's header already shows.
    const menuOpen = props["aria-expanded"] === true || props["aria-expanded"] === "true";
    return (
      <Tooltip disabled={menuOpen}>
        {/* `id` is load-bearing. Base UI finds a tooltip's trigger by id,
            and a menu trigger stamps its OWN id onto this button through
            the props above — which silently overrode the tooltip's, so it
            opened and lost its anchor in the same frame. Handing the
            tooltip the id the button already has makes the two agree. */}
        <TooltipTrigger asChild id={props.id}>
          {button}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  },
);
