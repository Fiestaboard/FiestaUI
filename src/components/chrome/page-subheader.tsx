import { Fragment, memo, useEffect, useRef, useState } from "react";

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
  /** The item's name — the h2, and the trail's current entry. */
  title: string;
  description?: React.ReactNode;
  /** Right-aligned slot on the heading row — the item's own actions. */
  action?: React.ReactNode;
  /** Crumbs BEFORE the item, outermost first. Usually one: the section. */
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
 * knows which tile was opened.
 */
export const PageSubheader = memo(function PageSubheader({
  detail,
  breadcrumbLabel,
  renderLink,
  className,
}: PageSubheaderProps) {
  // Derive-during-render rather than an effect: the collapse must paint the
  // last item on the very frame `detail` goes null.
  const [last, setLast] = useState(detail);
  if (detail && detail !== last) setLast(detail);
  const shown = detail ?? last;
  const open = detail != null;

  const headingRef = useRef<HTMLHeadingElement>(null);
  const title = detail?.title ?? null;
  const previousTitle = useRef(title);
  useEffect(() => {
    if (title != null && title !== previousTitle.current) {
      // preventScroll: scroll position on navigation is the router's call.
      headingRef.current?.focus({ preventScroll: true });
    }
    previousTitle.current = title;
  }, [title]);

  return (
    <div data-slot="page-subheader" data-state={open ? "open" : "closed"} className={className}>
      <Reveal open={open}>
        {shown && (
          // Padding and the rule live INSIDE the reveal, so a closed block
          // leaves neither a gap nor a second hairline against the section
          // below it.
          <div className="border-t px-6 pt-5 pb-6">
            <Breadcrumb aria-label={breadcrumbLabel}>
              <BreadcrumbList>
                {shown.crumbs.map((crumb) => (
                  <Fragment key={crumb.href}>
                    <BreadcrumbItem>
                      {renderLink ? (
                        <BreadcrumbLink asChild>
                          {renderLink({ href: crumb.href, children: crumb.label })}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </Fragment>
                ))}
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage>{shown.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
              <div className="min-w-0">
                <Heading
                  ref={headingRef}
                  level={2}
                  size="xl"
                  tabIndex={-1}
                  className="outline-none [overflow-wrap:anywhere] [text-wrap:balance]"
                >
                  {shown.title}
                </Heading>
                {shown.description != null && (
                  <p className="text-muted-foreground mt-1 text-sm">{shown.description}</p>
                )}
              </div>
              {shown.action}
            </div>
          </div>
        )}
      </Reveal>
    </div>
  );
});
