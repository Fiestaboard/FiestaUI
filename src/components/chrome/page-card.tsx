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
 * BLOCKS, NOT CHILDREN THAT PAD THEMSELVES. The padding lives here, on every
 * direct child, rather than in each child component. That is what keeps the
 * three block types interchangeable — a `PageHeader`, a `PageSection` and a
 * bare `<div>` are all just blocks, and a route picks whichever fits without
 * restating 24 anywhere. It also means the divider rule has exactly one home:
 * every block after the first takes a top hairline, full-bleed against the
 * card's edges while its content stays on the inset column.
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
        // Card's own rhythm is off: the blocks below own it, so that padding
        // and dividers are decided in one place rather than two.
        "gap-0 overflow-hidden py-0",
        // Every direct child is a block. Full-bleed rule, inset content.
        "[&>*]:px-6 [&>*]:py-6 [&>*+*]:border-t",
        // A block that has not migrated still carries its free-floating
        // bottom margin; inside the card the block padding supplies it.
        "[&>[data-slot=page-header]]:mb-0 [&>[data-slot=page-toolbar]]:mb-0",
        fillHeight && "min-h-0 flex-1",
        className,
      )}
    >
      {children}
    </Card>
  );
});

interface PageSectionProps {
  children: React.ReactNode;
  /** Renders a `CardTitle` at the settings-card scale (#274). */
  title?: React.ReactNode;
  /** Sits under the title, in `CardDescription`'s tone. */
  description?: React.ReactNode;
  /** Right-aligned slot on the title row — a section-level action. */
  action?: React.ReactNode;
  /**
   * Makes this the block that scrolls under `PageCard fillHeight`. Exactly one
   * section per card should take it.
   */
  fill?: boolean;
  className?: string;
}

/**
 * A BLOCK INSIDE A `PageCard`, optionally titled. This is what a content
 * `Card` becomes once the route itself is the card — the same heading and the
 * same words, with the border replaced by the divider `PageCard` draws above
 * every block after the first.
 *
 * IT CARRIES NO PADDING. `PageCard` supplies it, for the reason described
 * there. Standing one up outside a `PageCard` therefore looks unpadded, and
 * that is the correct signal rather than a bug — this component only means
 * something inside one.
 *
 * REPLACES `PageInset`. That component existed to put bare body content on the
 * content column of a route that had no card to explain the column. A route
 * that IS a card does not need it: the block padding here does the same 24 and
 * draws the rule as well.
 */
export const PageSection = memo(function PageSection({
  children,
  title,
  description,
  action,
  fill,
  className,
}: PageSectionProps) {
  const hasHeading = title != null || description != null || action != null;
  return (
    <div data-slot="page-section" className={cn(fill && "flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {hasHeading && (
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {title != null && <CardTitle size="base">{title}</CardTitle>}
            {description != null && <CardDescription className="mt-1.5">{description}</CardDescription>}
          </div>
          {action}
        </div>
      )}
      {fill ? <div className="min-h-0 flex-1 overflow-auto">{children}</div> : children}
    </div>
  );
});
