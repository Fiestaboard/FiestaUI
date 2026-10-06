import { Fragment, useEffect, useRef, useState } from "react";

import { Heading } from "../typography/heading";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";
import { Reveal } from "./reveal";

export interface PageSubheaderCrumb {
  label: string;
  href: string;
}

export interface PageSubheaderDetail {
  /**
   * Which item this is — a board id, a plugin id, a page id. Focus moves when
   * THIS changes, never when the title does: a route that binds the title to
   * its own name field would otherwise pull focus out of the field on every
   * keystroke.
   */
  id: string;
  /** The item's name — the h2, and the trail's current entry. */
  title: string;
  description?: React.ReactNode;
  /** Right-aligned slot on the heading row — the item's own actions. */
  action?: React.ReactNode;
  /**
   * Crumbs BEFORE the item, outermost first. Usually one: the section. The
   * href is the consumer's to choose — point it at where the reader came from
   * (a list's `?tab=`, a filter), not just the section root.
   */
  crumbs: PageSubheaderCrumb[];
}

export interface PageSubheaderProps {
  /**
   * The item the route has drilled into, or `null` at the hub (the section's
   * own list). Null collapses the block; it does not unmount it.
   */
  detail: PageSubheaderDetail | null;
  /** Localized accessible name for the breadcrumb `<nav>` (e.g. "Breadcrumb"). */
  breadcrumbLabel: string;
  /**
   * Renders a crumb's link, so the consumer's router owns navigation — the
   * same seam as `Sidebar`'s `renderLink`. Defaults to a plain `<a>`.
   */
  renderLink?: (props: { href: string; children: React.ReactNode }) => React.ReactElement;
  /**
   * `stacked` (default): the trail on its own row — `Displays › Living Room` —
   * with the h2 beneath it. `inline`: one row, the h2 IS the trail's last
   * entry — `Displays › Living Room` with the name set as the heading — so it
   * appears once. Both keep the destination in the breadcrumb.
   */
  layout?: "stacked" | "inline";
  className?: string;
}

/**
 * WHERE YOU ARE INSIDE A SECTION. Sits directly under a `PageHeader` in a
 * `PageCard`: the header names the section (the hub) and stays mounted while
 * this block expands to name the item (the spoke) — a breadcrumb back to the
 * hub, then an h2.
 *
 * WHY A BLOCK THAT STAYS MOUNTED. A route that rendered its own card for the
 * detail tore the section's header down and faded a new one in on every
 * drill-in, which read as the page reloading. Keeping header and sub-header in
 * the section's layout and only toggling `detail` turns the same navigation
 * into one block opening under a header that never moves.
 *
 * CLOSING SHOWS THE LAST ITEM. When `detail` goes null the block keeps
 * painting the item it last had while it collapses; an empty box shrinking
 * would read as a glitch, and the consumer has already unmounted the item by
 * then, so this component is the only one that still knows its name.
 *
 * FOCUS. Drilling in from the hub, or from one item straight to another,
 * moves focus to the h2 (`tabIndex=-1`) so a screen reader announces where
 * the reader landed — the same thing a full page load would have done. A
 * block that mounts already open (a deep link, a refresh) does not take
 * focus: nothing moved, and stealing it would skip the page's own landmarks.
 * Returning focus to the list on the way back is the consumer's: only it
 * knows which tile was opened, and it MUST: closing makes the block `inert`
 * synchronously, which drops focus from the crumb the reader just clicked —
 * left alone it lands on `<body>`.
 *
 * NOT MEMOIZED, on purpose: consumers build `detail` inline (its `action` is
 * JSX), so a `memo` would never hit — it would only add a comparison.
 */
export function PageSubheader({
  detail,
  breadcrumbLabel,
  renderLink,
  layout = "stacked",
  className,
}: PageSubheaderProps) {
  // Derive-during-render rather than an effect: the collapse must paint the
  // last item on the very frame `detail` goes null. State, not a ref written
  // in render — that trips react-hooks/refs; the cost is one cheap re-render
  // of this block per parent render.
  const [last, setLast] = useState(detail);
  if (detail && detail !== last) setLast(detail);
  const shown = detail ?? last;
  const open = detail != null;

  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = detail?.id ?? null;
  const previousId = useRef(id);
  useEffect(() => {
    if (id != null && id !== previousId.current) {
      // preventScroll: scroll position on navigation is the router's call.
      headingRef.current?.focus({ preventScroll: true });
    }
    previousId.current = id;
  }, [id]);

  const crumbs = shown?.crumbs.map((crumb) => (
    <Fragment key={crumb.href}>
      <BreadcrumbItem>
        {renderLink ? (
          <BreadcrumbLink asChild>{renderLink({ href: crumb.href, children: crumb.label })}</BreadcrumbLink>
        ) : (
          <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
        )}
      </BreadcrumbItem>
      {/* self-center: an svg's baseline is its bottom edge, which would sink
          the chevron under an items-baseline row. */}
      <BreadcrumbSeparator className="self-center" />
    </Fragment>
  ));
  const description = shown?.description != null && (
    <p className="text-muted-foreground mt-1 text-sm">{shown.description}</p>
  );
  // In the inline layout the heading is the trail's current entry, so it
  // carries aria-current itself (BreadcrumbPage's job in the stacked one).
  const heading = (current: boolean) => (
    <Heading
      ref={headingRef}
      level={2}
      size="xl"
      tabIndex={-1}
      aria-current={current ? "page" : undefined}
      // text-lg below sm: at the h1's mobile 24px, a 20px h2 read as its peer.
      // focus-ring, not outline-none: a keyboard user who lands here by
      // drilling in should see where they are.
      className="text-foreground focus-ring rounded-sm text-lg [overflow-wrap:anywhere] [text-wrap:balance] sm:text-xl"
    >
      {shown?.title}
    </Heading>
  );

  return (
    <div data-slot="page-subheader" data-state={open ? "open" : "closed"} className={className}>
      <Reveal open={open}>
        {shown && (
          // Padding and the rule live INSIDE the reveal, so a closed block
          // leaves neither a gap nor a second hairline against the section
          // below it.
          <div className="border-t px-6 py-6">
            {layout === "inline" ? (
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="min-w-0">
                  <Breadcrumb aria-label={breadcrumbLabel}>
                    {/* items-baseline: the muted crumbs sit on the heading's
                        baseline, the way an "owner / repo" title reads. */}
                    <BreadcrumbList className="items-baseline">
                      {crumbs}
                      <BreadcrumbItem className="min-w-0">{heading(true)}</BreadcrumbItem>
                    </BreadcrumbList>
                  </Breadcrumb>
                  {description}
                </div>
                {shown.action}
              </div>
            ) : (
              <>
                <Breadcrumb aria-label={breadcrumbLabel}>
                  <BreadcrumbList>
                    {crumbs}
                    <BreadcrumbItem className="min-w-0">
                      <BreadcrumbPage>{shown.title}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                  <div className="min-w-0">
                    {heading(false)}
                    {description}
                  </div>
                  {shown.action}
                </div>
              </>
            )}
          </div>
        )}
      </Reveal>
    </div>
  );
}
