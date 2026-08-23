import { useRender } from "@base-ui/react/use-render";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/*
 * TopNav — the horizontal site navbar (#228, item 2).
 *
 * WHY THIS EXISTS. The docs site's navbar is still 100% Infima: the bar's
 * height, surface and border come from `--ifm-navbar-*` bridged by hand to DS
 * tokens, and the dropdown panel is a hand-rolled `.dropdown__menu` rule set
 * that re-implements the popover surface this package already ships. Nothing
 * in the package rendered a horizontal nav row at all — `NavList` is the
 * vertical vocabulary, `Sidebar` is one specific `lg:fixed` rail (654 lines of
 * rail plus mobile sheet plus focus trap), and `PageToolbar`/`PageHeader` are
 * page furniture that sits *below* the chrome, not the chrome itself.
 *
 * COMPOSED, NOT RE-IMPLEMENTED. Half the navbar already existed and none of it
 * is rebuilt here:
 * - the dropdown panel is `DropdownMenu`, which already renders on `--popover`
 *   with the package's shadow, radius and enter/exit animation. This file
 *   contributes only {@link TopNavMenuTrigger} — the trigger that has to match
 *   the links beside it — and it is a plain `<button>` you hand to
 *   `DropdownMenuTrigger asChild`, so Base UI keeps owning `aria-haspopup`,
 *   `aria-expanded`, the typeahead, the arrow keys and the focus return.
 * - trailing icon links are `Button` `size="icon"` `asChild`, dropped into
 *   {@link TopNavActions}.
 * - search and `ThemeToggle` are slots — the caller's children — because the
 *   search box belongs to whoever owns the index (Algolia, in the docs site's
 *   case) and the theme state belongs to the app.
 *
 * DECISION 1 — IT DOES NOT OWN THE `<nav>` LANDMARK, and for the same reason
 * `NavList` does not, plus one of its own.
 *
 *   The requester swizzles Docusaurus's `Navbar/Content`, which renders INSIDE
 *   `Navbar/Layout`'s `<nav class="navbar" aria-label="Main">`. A `<nav>` here
 *   would nest a nav in a nav and put two indistinguishable entries in every
 *   landmark list — the exact failure NavList's comment describes. The same is
 *   true of this package's own shell, where `Sidebar` already renders
 *   `<nav aria-label={labels.primaryNavigation}>`.
 *
 *   The bar's own contents argue for it too. A navbar row holds a brand link,
 *   a search field and a theme toggle; a search field and a theme switch are
 *   not navigation, so wrapping the whole row in `<nav>` mislabels most of it.
 *   The honest decomposition is a `banner` region containing a `<nav>` — and a
 *   region that broad is the page's, not a component's.
 *
 *   So the landmark is opt-in, in one line and with no extra DOM node:
 *   `<TopNav asChild><nav aria-label={t("Main")}>…</nav></TopNav>` (or
 *   `<header>` for the banner). The label has to come from the caller anyway —
 *   this package ships no user-facing copy, so a baked-in "Main" would be an
 *   English string every es/fr consumer had to remember to override.
 *
 * DECISION 2 — IT DOES NOT OWN ITS POSITIONING. No `fixed`, no `sticky`, no
 * `z-index`, no stacking context. It is a flex row that is `w-full` and
 * nothing more.
 *
 *   The whole point of the component is that a docs site can swizzle
 *   `Navbar/Content` and drop it into a shell someone else positions.
 *   Docusaurus's `.navbar` is already `sticky` under `navbar--fixed-top` and
 *   already carries `hideOnScroll`'s transform; a child that re-declares
 *   `position: fixed` leaves that flow entirely and lands somewhere its host
 *   never reserved space for. A component that cannot be dropped into the one
 *   slot it was requested for is not the component that was requested.
 *
 *   Position also implies knowledge this component does not have: what to
 *   reserve on the scroll container, what `scroll-margin-top` in-page anchors
 *   need to clear the bar, and — once a `z-index` is planted — where the bar
 *   sits on theme.css's documented z-ladder relative to its host's own
 *   overlays. `Sidebar` legitimately owns `lg:fixed` and `--z-sidebar` because
 *   it IS the app's rail and the app hands it the whole ladder. A navbar meant
 *   for other people's shells is the opposite case.
 *
 *   Pinning it is one line at the call site, and `cn()` puts `className` last
 *   so it wins: `<TopNav className="sticky top-0 z-[var(--z-mobile-header)]" />`.
 *   The `Pinned` story does exactly that.
 *
 * SURFACE, THOUGH — YES. The bar owns `bg-background`, the bottom hairline and
 * its height, because a bar with no ground is not a bar: pinned over scrolling
 * content, a transparent one lets the article run underneath it. Where the
 * host already paints its own (a `Navbar/Content` swizzle still inside
 * Infima's `.navbar`), `className="border-0 bg-transparent"` un-paints it —
 * or the site swizzles `Navbar/Layout`, which is a two-line component, and
 * lets this own the shell outright.
 *
 * COLOUR. No new tokens and no new classes. The active row is the EXISTING
 * `.nav-active` and the resting hover the EXISTING `.nav-active-hover`, the
 * same pair `NavList` and the rail use, both surface-relative since #235 and
 * both measured in theme.css. Forking a `top-nav-active` would mean two active
 * treatments to retune whenever that pill moves — and the hover tint's real
 * numbers (1.35:1 on a light page) are being argued in one place on purpose.
 *
 * WRAPS, NOT SCROLLS. The row is `flex-wrap`, like the rail's mobile header:
 * a narrow viewport gets a second line rather than a horizontally scrolling
 * page. It is deliberately NOT `overflow-x-auto` — `.focus-ring` is a
 * box-shadow painted 4px OUTSIDE the row, and an ancestor's overflow clips a
 * descendant's box-shadow, so a scroller here would shave the focus ring off
 * the first and last link. A site that wants the phone layout Docusaurus ships
 * hides the list below its breakpoint (`className="hidden md:flex"`) and puts
 * the links in a `Sheet`; that is a call-site decision about which links
 * matter on a phone, which this component cannot make.
 */

// One row geometry, shared by the link and the menu trigger. They sit side by
// side in the same bar — a trigger a pixel off the links beside it is how a
// navbar starts looking assembled from parts. Horizontal, so: no `w-full`,
// and `whitespace-nowrap`, because a two-word label breaking mid-row would
// change the height of the bar.
const TOP_NAV_ROW = [
  "inline-flex min-h-9 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap",
  "transition-[color,background-color,border-color,box-shadow] duration-control focus-ring",
  "[&>svg]:size-4 [&>svg]:shrink-0",
];

// font-semibold is the non-colour second signal, exactly as NavList carries
// it: state is never hue alone.
const TOP_NAV_ROW_ACTIVE = "nav-active font-semibold";
const TOP_NAV_ROW_RESTING = "text-muted-foreground nav-active-hover hover:text-foreground";

/* ------------------------------------------------------------------ *
 * TopNav — the bar.
 * ------------------------------------------------------------------ */

export type TopNavProps = React.ComponentProps<"div"> & {
  /**
   * Render the caller's own element instead of the default `<div>`. This is
   * how the bar becomes a landmark when it should be one —
   * `<TopNav asChild><nav aria-label={t("Main")}>…</nav></TopNav>` — without
   * adding a wrapper element, and without this package guessing at either the
   * landmark or its localized name. See DECISION 1 above.
   */
  asChild?: boolean;
};

function TopNav({ className, asChild = false, children, ref, ...props }: TopNavProps) {
  return useRender({
    defaultTagName: "div",
    ref: ref as React.Ref<HTMLDivElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "top-nav",
      className: cn(
        // min-h-14 (56px) is the rail's mobile header height, so a page that
        // shows both never steps between two chrome heights.
        "flex min-h-14 w-full flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-background px-4 py-2",
        className,
      ),
      ...(asChild ? {} : { children }),
      ...props,
    },
  });
}

/* ------------------------------------------------------------------ *
 * TopNavBrand — the logo / home slot.
 * ------------------------------------------------------------------ */

export type TopNavBrandProps = React.ComponentProps<"a"> & {
  /** Render the caller's own element — a router `Link`, usually. */
  asChild?: boolean;
};

/**
 * The bar's leading identity: a `FiestaLogo`, a wordmark, an icon plus a
 * title. It is a link because it goes home; when it should not navigate,
 * `asChild` a `<span>` and the geometry still applies.
 *
 * It is NOT `aria-current`-aware. The brand is the site's mark, not a row of
 * the nav — painting a current-page pill on it (on the home page, where every
 * visitor starts) would put two active-looking things in one bar.
 */
function TopNavBrand({ className, asChild = false, children, ref, ...props }: TopNavBrandProps) {
  return useRender({
    defaultTagName: "a",
    ref: ref as React.Ref<HTMLAnchorElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "top-nav-brand",
      className: cn(
        "focus-ring mr-1 flex shrink-0 items-center gap-2 rounded-md px-1 py-1 font-semibold text-foreground",
        "transition-[color,background-color,border-color,box-shadow] duration-control",
        className,
      ),
      ...(asChild ? {} : { children }),
      ...props,
    },
  });
}

/* ------------------------------------------------------------------ *
 * TopNavList — the horizontal link list.
 * ------------------------------------------------------------------ */

/**
 * The row of destinations. A real `<ul>` of `<li>`s, exactly like `NavList`:
 * that is what makes a screen reader announce "list, 5 items" and give
 * per-item position, and it costs nothing visually.
 *
 * No landmark of its own — see DECISION 1 on {@link TopNav}.
 */
function TopNavList({ className, ...props }: React.ComponentProps<"ul">) {
  return (
    // role="list" is NOT redundant despite the lint rule: Safari/VoiceOver
    // strips the implicit list role from any ul styled `list-style: none`,
    // and `list-none` is required here because nav rows are pills, not
    // bullets. Documented WebKit behaviour (bug 170179), same as nav-list.tsx.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul
      role="list"
      data-slot="top-nav-list"
      className={cn("flex list-none flex-wrap items-center gap-1 p-0", className)}
      {...props}
    />
  );
}

/** One destination's list item. */
function TopNavItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="top-nav-item" className={cn("shrink-0", className)} {...props} />;
}

/* ------------------------------------------------------------------ *
 * TopNavLink — the destination row, and its active pill.
 * ------------------------------------------------------------------ */

export type TopNavLinkProps = React.ComponentProps<"a"> & {
  /**
   * Render the caller's own element instead of an `<a>` — the same
   * `useRender` mechanics as {@link "./nav-list".NavListLink}. This is how
   * Docusaurus's `<Link>` (prefetch, base-path handling) or FiestaBoard's
   * ViewTransitionLink keeps its behaviour while this component keeps owning
   * the row's look and its ARIA.
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
   * a docs navbar whose row points at the section you are inside — rather
   * than at the page you are on — passes `"location"`.
   * @default "page"
   */
  current?: "page" | "step" | "location" | "date" | "time";
};

function TopNavLink({
  className,
  asChild = false,
  active = false,
  current = "page",
  children,
  ref,
  ...props
}: TopNavLinkProps) {
  return useRender({
    defaultTagName: "a",
    ref: ref as React.Ref<HTMLAnchorElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "top-nav-link",
      // Present-when-true, the house form: `[data-active]` is a stable
      // styling hook for consumers that decorate the current row further.
      "data-active": active ? "" : undefined,
      "aria-current": active ? current : undefined,
      className: cn(TOP_NAV_ROW, active ? TOP_NAV_ROW_ACTIVE : TOP_NAV_ROW_RESTING, className),
      ...(asChild ? {} : { children }),
      ...props,
    },
  });
}

/* ------------------------------------------------------------------ *
 * TopNavMenuTrigger — the dropdown's row.
 * ------------------------------------------------------------------ */

export type TopNavMenuTriggerProps = React.ComponentProps<"button"> & {
  /**
   * Paints the active pill when the current page lives inside this menu.
   *
   * It sets `data-active` and the fill, but NOT `aria-current`: the trigger
   * opens a menu, it is not the current page. The page's `aria-current` goes
   * on the item inside the menu that points at it.
   */
  active?: boolean;
};

/**
 * The bar's dropdown row — a plain `<button>` wearing the link geometry, made
 * to be handed to `DropdownMenuTrigger asChild`:
 *
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenuTrigger asChild>
 *     <TopNavMenuTrigger>Versions</TopNavMenuTrigger>
 *   </DropdownMenuTrigger>
 *   <DropdownMenuContent align="start">
 *     <DropdownMenuItem render={<a href="/v5" />}>v5</DropdownMenuItem>
 *   </DropdownMenuContent>
 * </DropdownMenu>
 * ```
 *
 * Everything that makes it a menu button — `aria-haspopup`, `aria-expanded`,
 * `aria-controls`, ArrowDown-to-open, typeahead, Escape-restores-focus — comes
 * from Base UI through that trigger. This contributes the look and the caret,
 * which is why it stays a bare button rather than a second Menu API.
 */
function TopNavMenuTrigger({ className, active = false, children, type = "button", ...props }: TopNavMenuTriggerProps) {
  return (
    <button
      type={type}
      data-slot="top-nav-menu-trigger"
      data-active={active ? "" : undefined}
      className={cn(
        TOP_NAV_ROW,
        active ? TOP_NAV_ROW_ACTIVE : TOP_NAV_ROW_RESTING,
        "group/top-nav-menu-trigger",
        className,
      )}
      {...props}
    >
      {children}
      {/*
       * Rotated rather than swapped for a second glyph, and aria-hidden: it
       * duplicates `aria-expanded`, so putting it in the tree would append
       * noise to the trigger's accessible name. `data-popup-open` is Base
       * UI's own attribute on the trigger element, so the caret reads the
       * menu's state with nothing plumbed down to it — and it still renders
       * (unrotated) when the button is used outside a menu.
       */}
      <ChevronDown
        aria-hidden="true"
        className="transition-transform duration-control group-data-[popup-open]/top-nav-menu-trigger:rotate-180"
      />
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * TopNavActions — the trailing group.
 * ------------------------------------------------------------------ */

/**
 * The bar's trailing slot: search, `ThemeToggle`, icon links (`Button`
 * `size="icon"` `asChild` around an `<a>`). `ml-auto` pushes it to the end, so
 * the caller never has to know that the row is a flex line.
 *
 * It is a plain `<div>`, not a list: these are controls of different kinds
 * that happen to share an edge, and calling them a list would announce a
 * "list, 3 items" that means nothing.
 */
function TopNavActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="top-nav-actions" className={cn("ml-auto flex shrink-0 items-center gap-1", className)} {...props} />
  );
}

export { TopNav, TopNavActions, TopNavBrand, TopNavItem, TopNavLink, TopNavList, TopNavMenuTrigger };
