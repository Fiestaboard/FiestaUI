import { memo } from "react";

import { cn } from "../../lib/utils";
import { Card, CardDescription, CardTitle } from "../containment/card";

interface PageCardProps {
  children: React.ReactNode;
  className?: string;
  /**
   * Pins the card to its parent's height so one section can scroll inside it
   * rather than the page scrolling as a whole — the schedule calendar's shape.
   * Pair with `PageLayout`'s own `fillHeight`, and mark the scrolling block
   * with `<PageSection fill>`.
   */
  fillHeight?: boolean;
}

/**
 * THE WHOLE ROUTE, IN ONE CARD. The page title, the toolbar and the content
 * are blocks inside a single surface whose border sits on `PageLayout`'s
 * gutter.
 *
 * WHY, given that the three of them already shared a column. `Card` puts its
 * border on the gutter and its words 24px inboard of it, and #270/#272 moved
 * `PageHeader`, `PageToolbar` and bare content onto that same 24. The column
 * was right. What was missing is that nothing DREW the border explaining it —
 * so a reader met words indented from the page edge for no visible reason, and
 * a route had two left edges of which only one was ever justified by something
 * you could see. Three passes tried to align blocks to an invisible landmark.
 * This makes the landmark visible instead, which is the one move that ends the
 * argument rather than relocating it.
 *
 * BLOCKS THAT PAD THEMSELVES. The padding and the divider live on
 * `PageSection`, not on a `[&>*]` rule here. That was the first shape and
 * adoption killed it within a day: a settings route wraps its sections in
 * `TabsContent`, an expandable one wraps its section in `Collapsible`, and a
 * conditional wraps one in nothing at all — none of which are direct children,
 * so every one of them lost its inset and its rule. A child selector can only
 * see one level, and real routes nest.
 *
 * So this styles only what it must: `PageHeader` and `PageToolbar` predate the
 * component and space themselves with a bottom margin, which is right on a
 * page background and wrong inside a card. Those two get their margin swapped
 * for block padding here, by slot. Everything else pads itself and composes to
 * any depth.
 *
 * WHAT KEEPS ITS BORDER INSIDE. Sections flatten; items do not. A settings
 * group or a Setup/Preview panel is a region of the page, so it loses its
 * border and becomes a `PageSection`. A page tile, a collection tile or a
 * plugin card is a thing you click to open, and its border IS the click
 * target — flattening those removes the affordance, so they stay bordered
 * inside whatever section holds them. That is a call-site judgement rather
 * than a prop: a route swaps `Card`/`CardHeader`/`CardTitle` for
 * `PageSection title=…` and leaves its tile grids alone.
 *
 * ADDITIVE ON PURPOSE. FiestaUI reaches FiestaBoard through npm, so the two
 * repos cannot turn over in one commit. `PageHeader` and `PageToolbar` keep
 * the standalone bottom margins they carry today and this zeroes them through
 * their `data-slot`s, so a route that has not migrated renders exactly as it
 * does now.
 */
export const PageCard = memo(function PageCard({ children, className, fillHeight }: PageCardProps) {
  return (
    <Card
      data-slot="page-card"
      className={cn(
        // Card's own rhythm is off — the blocks own it.
        "gap-0 overflow-hidden py-0",
        // `PageHeader` and `PageToolbar` predate this component and pad
        // themselves horizontally but not vertically, spacing with a bottom
        // margin instead. Inside a card they are blocks: swap the margin for
        // block padding, and give the toolbar the rule above it.
        "[&>[data-slot=page-header]]:mb-0 [&>[data-slot=page-header]]:py-6",
        "[&>[data-slot=page-toolbar]]:mb-0 [&>[data-slot=page-toolbar]]:py-6",
        "[&>[data-slot=page-toolbar]]:border-t",
        fillHeight && "min-h-0 flex-1",
        className,
      )}
    >
      {children}
    </Card>
  );
});

/**
 * Standard div props come along so a section can take an `id` (the settings
 * screens deep-link to one), an `aria-*`, a `style`. `title` is omitted
 * because the HTML attribute of that name is a string tooltip and this one is
 * a heading node — leaving both in scope would let a typo silently render a
 * browser tooltip instead of a heading.
 */
interface PageSectionProps extends Omit<React.ComponentProps<"div">, "title"> {
  children: React.ReactNode;
  /** Renders a `CardTitle` at the settings-card scale (#274). */
  title?: React.ReactNode;
  /**
   * Leading glyph for the title, forwarded to `CardTitle`'s icon slot — so it
   * is decorative and never announced, the title's text being the name.
   *
   * Exists because the settings screens this component replaces had already
   * converged on it: 24 of FiestaBoard's section headers spell out
   * `flex items-center gap-2 text-base` with an `h-4 w-4` glyph by hand, which
   * is the exact pattern #274 added the slot for.
   */
  icon?: React.ReactNode;
  /** Sits under the title, in `CardDescription`'s tone. */
  description?: React.ReactNode;
  /** Right-aligned slot on the title row — a section-level action. */
  action?: React.ReactNode;
  /**
   * Makes this the block that scrolls under `PageCard fillHeight`. Exactly one
   * section per card should take it.
   */
  fill?: boolean;
  /**
   * Accessible name for the scroll region `fill` creates. Only read when
   * `fill` is set. Defaults to the section's `title` when that is a string.
   */
  scrollLabel?: string;
  className?: string;
  /**
   * Classes for the CONTENT region, below the heading.
   *
   * This exists because the collapse costs something: `Card` split its
   * heading and its body into two components a consumer could class
   * separately, and `PageSection` is one node doing both. Nearly every
   * settings section it replaces carries a `space-y-*` that belongs to the
   * body alone — put on the root it would also space the heading away from
   * the body, on top of the heading's own margin.
   */
  contentClassName?: string;
}

/**
 * A BLOCK INSIDE A `PageCard`, optionally titled. This is what a content
 * `Card` becomes once the route itself is the card — the same heading and the
 * same words, with its border traded for the hairline above it.
 *
 * IT PADS ITSELF, and draws its own top rule when it is not the first thing in
 * its container. That is what lets it sit inside a `TabsContent`, a
 * `Collapsible` or a bare conditional and still land on the content column —
 * the arrangement every real settings route turns out to need, and the one a
 * parent's `[&>*]` rule cannot reach.
 *
 * REPLACES `PageInset`. That component existed to put bare body content on the
 * content column of a route that had no card to explain the column. A route
 * that IS a card does not need it: the block padding here does the same 24 and
 * draws the rule as well.
 */
export const PageSection = memo(function PageSection({
  children,
  title,
  icon,
  description,
  action,
  fill,
  scrollLabel,
  className,
  contentClassName,
  ...rest
}: PageSectionProps) {
  const hasHeading = title != null || description != null || action != null;
  // `fill` makes this div a scroll port, and a scroll port that contains no
  // focusable element is unreachable by keyboard — axe's
  // `scrollable-region-focusable`, and a real one: the schedule's calendar
  // happens to be full of buttons, but a long read-only list would strand a
  // keyboard user with no way to scroll it. `tabIndex={0}` is axe's own
  // remedy. The region role plus a name is what stops that tab stop from
  // being an unlabelled one a screen reader announces as nothing.
  const label = scrollLabel ?? (typeof title === "string" ? title : undefined);
  return (
    <div
      data-slot="page-section"
      className={cn(
        // The content column, and the rule that separates this block from
        // whatever precedes it. `:not(:first-child)` rather than a sibling
        // combinator on the parent, so a section nested one level down still
        // divides correctly against its own neighbours.
        "px-6 py-6 [&:not(:first-child)]:border-t",
        fill && "flex min-h-0 flex-1 flex-col overflow-hidden",
        className,
      )}
      {...rest}
    >
      {hasHeading && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title != null && (
              <CardTitle size="base" icon={icon}>
                {title}
              </CardTitle>
            )}
            {description != null && <CardDescription className="mt-1.5">{description}</CardDescription>}
          </div>
          {action}
        </div>
      )}
      {fill ? (
        <div
          className={cn("min-h-0 flex-1 overflow-auto", contentClassName)}
          tabIndex={0}
          // Only a NAMED region is worth announcing as one. Without a label
          // the role would add a landmark a screen reader reads as bare
          // "region", which is noise; the tab stop is the part that matters.
          role={label ? "region" : undefined}
          aria-label={label}
        >
          {children}
        </div>
      ) : contentClassName ? (
        // Only wrap when asked to — an unstyled section stays one node.
        <div className={contentClassName}>{children}</div>
      ) : (
        children
      )}
    </div>
  );
});
