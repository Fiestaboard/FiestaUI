"use client";

import { useRender } from "@base-ui/react/use-render";
import { ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../containment/collapsible";

/*
 * NavList — the vertical navigation list, with collapsible sections (#228,
 * item 3).
 *
 * WHY THIS EXISTS. Three surfaces already render the same row and none of
 * them shares an implementation: the docs sidebar's page list, the docs table
 * of contents, and the mobile navbar's dropdown. `sidebar.tsx` has the row
 * closest to correct, but it is a monolithic rail — its rows are internal
 * closures over hoisted class constants (`NAV_ITEM_ACTIVE`,
 * `DESKTOP_LINK_BASE`), reachable only by rendering the whole fixed-position
 * rail with its `labels` object, its tooltips and its mobile menu. Nothing
 * outside that file can render one nav row. This is the primitive Sidebar
 * should have been built on; Sidebar is deliberately NOT refactored onto it
 * here (that is a behavioural change to shipping chrome, and this PR is the
 * missing piece, not the migration).
 *
 * WHAT IT IS NOT.
 * - Not `Sidebar`: that is one specific rail, this is the row vocabulary.
 * - Not `Accordion`: an accordion is a set of disclosure panels holding
 *   arbitrary content, with its own single/multiple selection model. A nav
 *   section is a list item whose sublist happens to fold — its content is
 *   always more rows, and its state is per-section (routers open the section
 *   containing the current route and leave the rest alone), so an
 *   accordion's group value would fight the router.
 * - Not `Breadcrumb`: that is where you have been; this is where you can go.
 * - Not a `<nav>` landmark. NavList renders a `<ul>` and nothing else, on
 *   purpose: all three consumers already sit inside a landmark (the rail's
 *   `<nav aria-label={labels.primaryNavigation}>`, the mobile menu, the docs
 *   TOC's own nav). Owning the landmark here would nest a nav in a nav and
 *   put two indistinguishable entries in every landmark list. The caller
 *   wraps and names it — which is also how the localized name stays the
 *   consumer's (§ the no-user-facing-copy rule), with no required label prop
 *   on a list role that ARIA does not name anyway.
 *
 * ACCESSIBILITY CONTRACT.
 * - A real `<ul>`/`<li>` tree, and sub-rows nest in a `<ul>` INSIDE their
 *   section's `<li>` — so AT announces "list, 2 items" for a subtree instead
 *   of flattening the hierarchy into one long list. `role="list"` is set
 *   explicitly because `list-none` makes Safari/VoiceOver drop the implicit
 *   role (WebKit bug 170179), same as `bar-list.tsx`.
 * - The current row is `aria-current`, which is the single thing the rail
 *   does not do today: `sidebar.tsx` signals the active route with a class
 *   and nothing else, so a screen-reader user hears an ordinary link. The
 *   value is a prop defaulting to `"page"`; a TOC passes `"location"`,
 *   because an in-page anchor is a position on the current page, not a
 *   different page.
 * - No roving tabindex, deliberately. These are links to independent
 *   destinations, not a composite widget, so each takes its own tab stop —
 *   the APG's own guidance for a link list, and the opposite of ToggleGroup.
 *   A collapsed section removes its rows from the DOM (Base UI's panel
 *   unmounts), so the tab order and the accessibility tree agree; a hidden
 *   row that still takes a tab stop is the classic collapsed-menu trap.
 * - The section trigger is Base UI's `Collapsible.Trigger`, so
 *   `aria-expanded` and the `aria-controls` wiring to the panel come from the
 *   primitive rather than being hand-rolled. The caret is `aria-hidden`: it
 *   duplicates `aria-expanded`, and putting it in the tree would append noise
 *   to the trigger's accessible name.
 * - Rows are 36px tall (`min-h-9`) — over WCAG 2.2 SC 2.5.8's 24×24 floor,
 *   and matching the rail's existing `py-2 + text-sm` row.
 *
 * COLOUR. No new tokens and no new classes: the active pill is the EXISTING
 * `.nav-active` and the resting hover is the EXISTING `.nav-active-hover`,
 * both of which #235 already made surface-relative (they mix the local
 * `--foreground`, and `.sidebar-gradient` re-declares it from
 * `--sidebar-foreground`). Their measured numbers are in theme.css and are
 * inherited wholesale: the pill is 16.78:1 against the light rail and 8.12:1
 * against the dark one, with an 8.84:1 label; the hover tint is 3.07:1 on the
 * dark rail and 1.15:1 on the light. Resting rows use `text-muted-foreground`
 * lifting to `text-foreground` on hover — both surface-relative for the same
 * reason, so one row implementation serves a page surface and the rail
 * without a `variant` prop. Defining a `nav-list-active` class instead would
 * fork a state that theme.css deliberately tunes in one place.
 *
 * NO SIZE AXIS. The mobile menu's 48px rows are the same row with more
 * padding, and the docs TOC's are the same row with less; a `size` union
 * would promise that every consumer's row is one of N heights, and the first
 * one that is not would be back to hand-rolling. `className` is the escape
 * hatch, and `cn()` puts it last so it wins.
 */

// One row geometry shared by the link and the section trigger. They are the
// same object at the same indent level — a trigger that is a pixel off the
// links beside it is how a nav starts looking assembled from parts.
const NAV_LIST_ROW = [
  "flex min-h-9 w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium",
  "transition-[color,background-color,border-color,box-shadow] duration-control focus-ring",
  "[&>svg]:size-4 [&>svg]:shrink-0",
];

// font-semibold is the non-colour second signal for the active row, exactly
// as the rail carries it today: state is never hue alone.
const NAV_LIST_ROW_ACTIVE = "nav-active font-semibold";
const NAV_LIST_ROW_RESTING = "text-muted-foreground nav-active-hover hover:text-foreground";

/* ------------------------------------------------------------------ *
 * NavList — the list itself.
 * ------------------------------------------------------------------ */

function NavList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    // role="list" is NOT redundant despite the lint rule: Safari/VoiceOver
    // strips the implicit list role from any ul styled `list-style: none`,
    // and `list-none` is required here because nav rows are pills, not
    // bullets. Documented WebKit behaviour (bug 170179), not a hypothetical.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul role="list" data-slot="nav-list" className={cn("flex list-none flex-col gap-0.5 p-0", className)} {...props} />
  );
}

/** One row's list item. Wraps a {@link NavListLink} — or anything else a row needs to be. */
function NavListItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="nav-list-item" className={cn("min-w-0", className)} {...props} />;
}

/* ------------------------------------------------------------------ *
 * NavListLink — the destination row, and its active pill.
 * ------------------------------------------------------------------ */

export type NavListLinkProps = React.ComponentProps<"a"> & {
  /**
   * Render the caller's own element instead of an `<a>` — the same
   * `useRender` mechanics as {@link "./breadcrumb".BreadcrumbLink}. This is
   * how a router Link (Docusaurus's `<Link>`, FiestaBoard's
   * ViewTransitionLink) gets prefetch and base-path handling while this
   * component keeps owning the row's look and its ARIA.
   */
  asChild?: boolean;
  /**
   * Marks this row as the current destination: paints the pill AND sets
   * `aria-current`. The app derives it from its router — the design system
   * never guesses at routes.
   */
  active?: boolean;
  /**
   * Which kind of "current" this row is, when `active`. Defaults to `"page"`;
   * pass `"location"` for a table of contents, where the row points at a
   * position inside the page you are already on.
   * @default "page"
   */
  current?: "page" | "step" | "location" | "date" | "time";
};

function NavListLink({
  className,
  asChild = false,
  active = false,
  current = "page",
  children,
  ref,
  ...props
}: NavListLinkProps) {
  return useRender({
    defaultTagName: "a",
    ref: ref as React.Ref<HTMLAnchorElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "nav-list-link",
      // Present-when-true, the house form: `[data-active]` is a stable
      // styling hook for consumers that decorate the current row further.
      "data-active": active ? "" : undefined,
      "aria-current": active ? current : undefined,
      className: cn(NAV_LIST_ROW, active ? NAV_LIST_ROW_ACTIVE : NAV_LIST_ROW_RESTING, className),
      ...(asChild ? {} : { children }),
      ...props,
    },
  });
}

/* ------------------------------------------------------------------ *
 * NavListSection — a row whose sublist folds.
 * ------------------------------------------------------------------ */

export type NavListSectionProps = React.ComponentProps<"li"> & {
  /** Open on first render, uncontrolled — a router opens the section holding the current route. */
  defaultOpen?: boolean;
  /** Controlled open state; pair with {@link NavListSectionProps.onOpenChange}. */
  open?: boolean;
  /**
   * Fired with the next open state. One argument, not Base UI's
   * `(open, eventDetails)` pair, so `onOpenChange={setOpen}` behaves.
   */
  onOpenChange?: (open: boolean) => void;
};

function NavListSection({ className, children, defaultOpen, open, onOpenChange, ...props }: NavListSectionProps) {
  return (
    // The disclosure lives INSIDE the <li>, so the section stays one item of
    // the parent list and its sublist stays nested under that item.
    <li data-slot="nav-list-section" className={cn("min-w-0", className)} {...props}>
      <Collapsible
        className="flex flex-col gap-0.5"
        defaultOpen={defaultOpen}
        open={open}
        onOpenChange={onOpenChange ? (nextOpen) => onOpenChange(nextOpen) : undefined}
      >
        {children}
      </Collapsible>
    </li>
  );
}

/**
 * The section's header row: a real `<button>` from Base UI's Collapsible, so
 * `aria-expanded` and the panel wiring are the primitive's. Children are the
 * section's localized label (plus an optional leading icon); the caret is
 * appended and hidden from AT.
 */
function NavListSectionTrigger({ className, children, ...props }: React.ComponentProps<"button">) {
  return (
    <CollapsibleTrigger
      data-slot="nav-list-section-trigger"
      className={cn(NAV_LIST_ROW, NAV_LIST_ROW_RESTING, "group/nav-list-section-trigger justify-between", className)}
      {...props}
    >
      {children}
      {/*
       * Rotated rather than swapped for a second glyph: one element means the
       * transition is a transform, and `group-data` reads the trigger's own
       * `data-panel-open` — no state plumbed down to the icon. Pointing right
       * when closed and down when open is the LTR disclosure idiom, and it
       * matches the chevron Breadcrumb uses for "descends into".
       */}
      <ChevronRight
        aria-hidden="true"
        className="ml-auto transition-transform duration-control group-data-[panel-open]/nav-list-section-trigger:rotate-90"
      />
    </CollapsibleTrigger>
  );
}

/**
 * The section's sublist. Renders the Collapsible panel wrapping a nested
 * `<ul>` — children are {@link NavListItem}s, exactly as in the parent list.
 */
function NavListSectionContent({ className, children, ...props }: React.ComponentProps<"ul">) {
  return (
    <CollapsibleContent data-slot="nav-list-section-panel">
      {/*
       * No height animation. The only collapse keyframes in theme.css are the
       * accordion pair, and they animate to `var(--radix-accordion-content-
       * height, auto)` — a Radix variable Base UI never sets, so they resolve
       * to `auto` and animate nothing (theme.css documents this, issue #71).
       * Reaching for a real one means new CSS in theme.css, which this PR is
       * not touching; the caret's rotation carries the state change meanwhile.
       *
       * And NO `overflow-hidden` on the panel — the house rule ToggleGroup
       * states verbatim. `.focus-ring` is a box-shadow painted 4px OUTSIDE
       * the row, and an ancestor's `overflow: hidden` clips a descendant's
       * box-shadow. The sub-rows are `w-full` inside a `<ul>` with no right
       * gutter, so the panel edge IS the row's right edge: clipping here
       * erases the focus ring on the right entirely and shaves it above the
       * first row and below the last. Accordion can afford it because it is
       * paying for real collapse keyframes; this panel would be clipping for
       * a transition that does not exist. If a height animation ever lands,
       * the `overflow-hidden` belongs on a wrapper OUTSIDE the ring's reach,
       * with a matching gutter inside — not on the ring's own ancestor.
       */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul
        role="list"
        data-slot="nav-list-section-content"
        className={cn(
          // The rule is border-border, not border-input: this hairline is an
          // indent guide for the subtree, not the boundary of a control.
          "ml-4 flex list-none flex-col gap-0.5 border-l border-border py-0.5 pl-2",
          className,
        )}
        {...props}
      >
        {children}
      </ul>
    </CollapsibleContent>
  );
}

export { NavList, NavListItem, NavListLink, NavListSection, NavListSectionContent, NavListSectionTrigger };
