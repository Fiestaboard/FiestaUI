import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type * as React from "react";

import { cn } from "../../lib/utils";
import { buttonVariants } from "../forms/button";

/*
 * Pagination — the numbered pager, with prev/next and an elided middle
 * (#228, item 7).
 *
 * WHY THIS EXISTS. The docs site's blog paginates and has no component to do
 * it with; the issue lists it beside the rest of the blog chrome ("post
 * cards, tag rows, pagination"). It sits in `chrome/` for the same reason
 * `Breadcrumb` does: it is page-level navigation furniture, a `<nav>`
 * landmark whose job is moving the reader between routes. It is explicitly
 * NOT `data/` — that family is quantitative READOUTS (BarList, StatStrip),
 * and "page 4 of 12" is a position in a route list, not a measured value.
 *
 * ROUTER-AGNOSTIC THE HOUSE WAY: `renderLink`, not `<a>` children.
 * The two consumers use different routers (Docusaurus `<Link>`, the app's
 * ViewTransitionLink), so the component cannot emit anchors itself without
 * full-page-reloading inside an SPA — the trap PluginCard, Sidebar and
 * BarList all document. The signature is Sidebar's exactly: spreadable DOM
 * props first, the semantic item second, so a caller writes
 * `renderLink={(props, { page }) => <Link to={hrefFor(page)} {...props} />}`.
 *
 * `asChild` (Breadcrumb's and NavListLink's convention) was rejected HERE and
 * only here: those components are handed one child each and pass it through.
 * This one GENERATES its children — it decides how many links exist, which
 * numbers they carry and where the ellipses fall — so there is no child for
 * the caller to hand over. That is precisely the split BarList's `renderLabel`
 * doc draws, and the reason the package has both patterns rather than one.
 *
 * TRUNCATION is `paginationRange()`, exported because it is a pure function
 * and a consumer building a different pager shape should not have to
 * re-derive it. `boundaryCount` fixes how many pages pin to each end and
 * `siblingCount` how many flank the current one; the width of the rendered
 * strip is therefore CONSTANT across pages, which is what stops the pager
 * jittering sideways as the reader walks through it. A gap of exactly one
 * page is never eliding: rendering "…" in place of a single number costs the
 * same width and takes a destination away, so that slot renders the number.
 *
 * ACCESSIBILITY CONTRACT.
 * - A `<nav>` landmark with a REQUIRED localized name (`labels.navigation`).
 *   An unnamed nav is indistinguishable from the site nav in a landmark list,
 *   and this package ships no English defaults — the same rule Breadcrumb and
 *   Sidebar state. All four strings live in one `labels` object, Sidebar's
 *   shape, so there is one place to look rather than an `aria-label` prop
 *   plus three others.
 * - A real `<ul>`/`<li>`, so AT announces the pager's length instead of
 *   reading a run of loose links. `role="list"` is explicit because
 *   `list-none` makes Safari/VoiceOver drop the implicit role (WebKit bug
 *   170179), same as BarList and NavList.
 * - The current page is a link carrying `aria-current="page"` — it IS a real
 *   destination (reload, share, back), unlike a breadcrumb's tail, which is
 *   why this one stays focusable where BreadcrumbPage is a span.
 * - Every link's accessible name comes from `labels.page(n)` ("Page 4"),
 *   which CONTAINS its visible text ("4"). SC 2.5.3 (Label in Name) requires
 *   exactly that containment, so voice-control users can still say "click 4".
 * - Prev/next render as bare chevrons and take their names from
 *   `labels.previous` / `labels.next`; the glyphs are `aria-hidden`, so the
 *   name is the label and not "chevron left". `rel="prev"`/`rel="next"` go on
 *   the anchors as the machine-readable half of the same relationship.
 * - At the ends, prev/next render as an `aria-hidden` span rather than
 *   disappearing or becoming an `aria-disabled` link. Keeping the box holds
 *   the strip's width steady; hiding it from AT is the honest description of
 *   a control that goes nowhere — the same reasoning Breadcrumb gives for not
 *   shipping a `role="link" aria-disabled` non-control. The reader still
 *   learns they are at the start, from `aria-current` on page 1.
 * - Targets are 36px (`size-9` / `h-9 min-w-9`), over WCAG 2.2 SC 2.5.8's
 *   24×24 floor.
 *
 * LOOK: `buttonVariants`, not a new recipe. The current page is `outline`,
 * every other control is `ghost` — so the pager inherits the system's hover,
 * active and (critically) `focus-ring` treatments, and a retune of any of the
 * three reaches it for free. AlertDialog already borrows `buttonVariants` the
 * same way. No new tokens and no new classes.
 */

/** One slot in the rendered strip: a page number, or an elided run. */
export type PaginationSlot = number | "ellipsis";

/** Inclusive integer range. Empty when `end < start`. */
function range(start: number, end: number): number[] {
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}

export interface PaginationRangeOptions {
  /** The 1-based current page. Clamped into `[1, totalPages]`. */
  page: number;
  /** How many pages exist. `<= 0` yields an empty range. */
  totalPages: number;
  /** Pages shown either side of the current one. @default 1 */
  siblingCount?: number;
  /** Pages pinned to each end of the strip. @default 1 */
  boundaryCount?: number;
}

/**
 * The slots to render for one page of a list: boundary pages, the current
 * page and its siblings, and `"ellipsis"` wherever a run of two or more pages
 * is elided.
 *
 * The returned length is stable for a given `totalPages`/`siblingCount`/
 * `boundaryCount` (until the range is short enough to fit whole), which is
 * what keeps the pager from resizing under the reader's cursor.
 */
export function paginationRange({
  page,
  totalPages,
  siblingCount = 1,
  boundaryCount = 1,
}: PaginationRangeOptions): PaginationSlot[] {
  if (totalPages <= 0) return [];
  const current = Math.min(Math.max(Math.trunc(page), 1), totalPages);

  const startPages = range(1, Math.min(boundaryCount, totalPages));
  const endPages = range(Math.max(totalPages - boundaryCount + 1, boundaryCount + 1), totalPages);

  // Slide the sibling window so it never overlaps a boundary block and never
  // shrinks near the ends — walking to page 1 widens the window rightwards
  // rather than leaving a short strip.
  const siblingsStart = Math.max(
    Math.min(current - siblingCount, totalPages - boundaryCount - siblingCount * 2 - 1),
    boundaryCount + 2,
  );
  const siblingsEnd = Math.min(
    Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2),
    endPages.length > 0 ? endPages[0] - 2 : totalPages - 1,
  );

  return [
    ...startPages,
    // A one-page gap renders as that page: "…" is not narrower than "4" and
    // an ellipsis nobody can click is strictly worse than the number.
    ...(siblingsStart > boundaryCount + 2
      ? (["ellipsis"] as PaginationSlot[])
      : boundaryCount + 1 < totalPages - boundaryCount
        ? [boundaryCount + 1]
        : []),
    ...range(siblingsStart, siblingsEnd),
    ...(siblingsEnd < totalPages - boundaryCount - 1
      ? (["ellipsis"] as PaginationSlot[])
      : totalPages - boundaryCount > boundaryCount
        ? [totalPages - boundaryCount]
        : []),
    ...endPages,
  ];
}

/** Localized copy. Required in full — the package ships no English defaults. */
export interface PaginationLabels {
  /** Accessible name for the `<nav>` landmark, e.g. "Blog pages". */
  navigation: string;
  /** Accessible name for the previous-page chevron, e.g. "Previous page". */
  previous: string;
  /** Accessible name for the next-page chevron, e.g. "Next page". */
  next: string;
  /** Accessible name for a numbered link, e.g. `(n) => \`Page ${n}\``. */
  page: (page: number) => string;
  /** Screen-reader-only announcement for an elided run, e.g. "More pages". */
  ellipsis: string;
}

/** Which control `renderLink` is being asked for, and where it goes. */
export interface PaginationLinkItem {
  /** The 1-based page this control navigates to. */
  page: number;
  kind: "page" | "previous" | "next";
  /** True only for the numbered link the reader is currently on. */
  current: boolean;
}

/** Spread these onto your router's Link. `className` MUST land on it. */
export interface PaginationLinkProps {
  className: string;
  children: React.ReactNode;
  "data-slot": string;
  "aria-label": string;
  "aria-current"?: "page";
  rel?: "prev" | "next";
}

export interface PaginationProps extends Omit<React.ComponentProps<"nav">, "aria-label" | "children"> {
  /** The 1-based current page. Clamped into `[1, totalPages]`. */
  page: number;
  /** How many pages exist. `<= 1` renders nothing at all. */
  totalPages: number;
  labels: PaginationLabels;
  /**
   * Renders one navigating control — inject your router's Link here. Receives
   * spreadable DOM props first and the semantic item second, the same
   * signature as {@link "./sidebar".Sidebar}'s `renderLink`. There is
   * deliberately no `href` shortcut: a bare string href renders a plain `<a>`
   * that full-page-reloads inside an SPA, which is exactly the trap this prop
   * exists to avoid.
   */
  renderLink: (props: PaginationLinkProps, item: PaginationLinkItem) => React.ReactNode;
  /** Pages shown either side of the current one. @default 1 */
  siblingCount?: number;
  /** Pages pinned to each end of the strip. @default 1 */
  boundaryCount?: number;
}

const PAGE_CONTROL = "h-9 w-auto min-w-9 px-2 tabular-nums";

function Pagination({
  page,
  totalPages,
  labels,
  renderLink,
  siblingCount = 1,
  boundaryCount = 1,
  className,
  ...props
}: PaginationProps) {
  // One page is not a pager. Rendering the landmark anyway would put an empty,
  // named nav in every AT landmark list on a blog with a single page of posts.
  if (totalPages <= 1) return null;

  const current = Math.min(Math.max(Math.trunc(page), 1), totalPages);
  const slots = paginationRange({ page: current, totalPages, siblingCount, boundaryCount });

  const stepClass = buttonVariants({ variant: "ghost", size: "icon" });

  /** Prev/next: a link when there is somewhere to go, dead furniture when not. */
  const step = (kind: "previous" | "next") => {
    const target = kind === "previous" ? current - 1 : current + 1;
    const glyph = kind === "previous" ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />;
    const slot = `pagination-${kind}`;

    if (target < 1 || target > totalPages) {
      return (
        <span data-slot={slot} aria-hidden="true" className={cn(stepClass, "pointer-events-none opacity-50")}>
          {glyph}
        </span>
      );
    }

    return renderLink(
      {
        className: stepClass,
        children: glyph,
        "data-slot": slot,
        "aria-label": kind === "previous" ? labels.previous : labels.next,
        rel: kind === "previous" ? "prev" : "next",
      },
      { page: target, kind, current: false },
    );
  };

  return (
    <nav data-slot="pagination" aria-label={labels.navigation} className={className} {...props}>
      {/*
       * role="list" is NOT redundant despite the lint rule: Safari/VoiceOver
       * strips the implicit list role from any ul styled `list-style: none`,
       * and `list-none` is required here because the slots are pills, not
       * bullets. Documented WebKit behaviour (bug 170179).
       */}
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul role="list" data-slot="pagination-list" className="flex list-none flex-wrap items-center gap-1 p-0">
        <li>{step("previous")}</li>
        {slots.map((slot, index) =>
          slot === "ellipsis" ? (
            // Keyed by position: two ellipses can coexist and neither is a
            // page number, so there is no stabler identity than where it sits.
            <li key={`ellipsis-${index}`}>
              <span
                data-slot="pagination-ellipsis"
                className="flex h-9 min-w-9 items-center justify-center text-muted-foreground"
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
                {/*
                 * Named, not aria-hidden — hiding the span outright would
                 * silence the fact that pages were elided, leaving a reader
                 * who hears "3" then "8" with no explanation. Breadcrumb's
                 * ellipsis makes the same call.
                 */}
                <span className="sr-only">{labels.ellipsis}</span>
              </span>
            </li>
          ) : (
            <li key={slot}>
              {renderLink(
                {
                  className: cn(
                    buttonVariants({ variant: slot === current ? "outline" : "ghost", size: "icon" }),
                    PAGE_CONTROL,
                  ),
                  children: slot,
                  "data-slot": "pagination-link",
                  "aria-label": labels.page(slot),
                  ...(slot === current ? { "aria-current": "page" as const } : {}),
                },
                { page: slot, kind: "page", current: slot === current },
              )}
            </li>
          ),
        )}
        <li>{step("next")}</li>
      </ul>
    </nav>
  );
}

export { Pagination };
