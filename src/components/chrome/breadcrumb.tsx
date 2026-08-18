import { useRender } from "@base-ui/react/use-render";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/*
 * Breadcrumb trail per the WAI-ARIA breadcrumb pattern (#228, item 4).
 *
 * Keyboard / screen-reader contract:
 * - `Breadcrumb` is a <nav> landmark, so AT users can jump straight to the
 *   trail from a landmark list. The accessible name is a REQUIRED prop — this
 *   repo never hardcodes user-facing strings (the same principle as
 *   Sidebar's `labels` object), so there is no baked-in "Breadcrumb" default
 *   that an es/fr consumer would have to remember to override.
 * - The trail is an <ol>, not a <div> of links: an ordered list is what makes
 *   a screen reader announce "list, 4 items" and give per-item position,
 *   which IS the breadcrumb's information ("you are 4 levels deep").
 * - Separators are rendered OUTSIDE the li text as `aria-hidden`
 *   presentation-only <li>s: the chevron is purely visual, the order is
 *   already conveyed by list semantics, and letting AT read "greater than"
 *   between every crumb is noise.
 * - The current page is a <span aria-current="page">, not a link: it
 *   navigates nowhere, so making it focusable would add a tab stop that does
 *   nothing. shadcn's `role="link" aria-disabled="true"` was rejected — a
 *   non-operable element claiming the link role is exactly the mismatch the
 *   role attribute exists to prevent, and aria-current on plain text is the
 *   pattern the ARIA Authoring Practices actually specify.
 *
 * Colour: this rides the PAGE tokens, because its primary consumer is the
 * docs site's DocBreadcrumbs swizzle — a page surface, not the rail. Links
 * are muted-foreground (documented in theme.css as 8.32:1 light / 8.10:1
 * dark on --background, both comfortably AA) hover-lifting to foreground,
 * the current page is foreground; no new colour relationship is introduced.
 */

function Breadcrumb({
  className,
  ...props
}: Omit<React.ComponentProps<"nav">, "aria-label"> & {
  /**
   * Localized accessible name for the landmark (e.g. "Breadcrumb"). Required:
   * an unnamed nav is indistinguishable from the site nav in a landmark list,
   * and the repo does not ship English defaults for consumers to forget.
   */
  "aria-label": string;
}) {
  return <nav data-slot="breadcrumb" className={className} {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        // break-words + flex-wrap: deep trails on a 390px docs page wrap to a
        // second line instead of forcing the page to scroll sideways.
        "text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm break-words sm:gap-2.5",
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="breadcrumb-item" className={cn("inline-flex items-center gap-1.5", className)} {...props} />;
}

/**
 * A crumb that navigates. `asChild` (same useRender mechanics as Badge) lets
 * the docs site pass Docusaurus's `<Link>` — router-aware prefetch and
 * base-path handling — while this component keeps owning the look.
 */
function BreadcrumbLink({
  className,
  asChild = false,
  children,
  ref,
  ...props
}: React.ComponentProps<"a"> & { asChild?: boolean }) {
  return useRender({
    defaultTagName: "a",
    ref: ref as React.Ref<HTMLAnchorElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "breadcrumb-link",
      // No rest-state underline, unlike TextLink: WCAG 1.4.1 needs a non-colour
      // cue only for links INSIDE prose; a nav landmark of list items is its
      // own cue, and every breadcrumb idiom (including the docs site today)
      // renders bare. focus-ring is the unified two-tone recipe — the
      // ring-ring/50 shorthand was rejected because #228 documents it going
      // sub-contrast (1.36:1) the moment --ring changed.
      className: cn("focus-ring rounded-sm transition-colors hover:text-foreground", className),
      ...(asChild ? {} : { children }),
      ...props,
    },
  });
}

/** The trail's final entry: where you are, so it announces but never navigates. */
function BreadcrumbPage({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn("text-foreground font-normal", className)}
      {...props}
    />
  );
}

/**
 * Visual divider between crumbs. Children override the glyph (the docs site
 * may want `/`); the default chevron reads as "descends into" in LTR.
 */
function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<"li">) {
  return (
    // Its own li, aria-hidden: hiding a list item from AT undercounts the
    // list by the number of separators, but "3 items" for a 3-crumb trail is
    // the truthful count — the alternative (separator inside the crumb's li)
    // makes every item's accessible name end in ">".
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden="true"
      className={cn("[&>svg]:size-3.5", className)}
      {...props}
    >
      {children ?? <ChevronRight />}
    </li>
  );
}

/**
 * Collapsed-middle marker for deep trails. Static by design: expand/collapse
 * behaviour belongs to the consumer (wrap it in a DropdownMenu trigger via
 * that component's own mechanics); baking a disclosure in here would force a
 * hook — and "use client" — onto every static docs page for a control most
 * trails never show.
 */
function BreadcrumbEllipsis({
  label,
  className,
  ...props
}: Omit<React.ComponentProps<"span">, "children"> & {
  /**
   * Localized sr-only announcement (e.g. "More pages"). Required, and NOT
   * `aria-hidden` on the wrapper like shadcn's version — hiding the whole
   * span silences the sr-only text inside it, leaving AT users with no hint
   * that levels were elided. Only the glyph is hidden.
   */
  label: string;
}) {
  return (
    <span data-slot="breadcrumb-ellipsis" className={cn("flex items-center justify-center", className)} {...props}>
      <MoreHorizontal className="size-4" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
