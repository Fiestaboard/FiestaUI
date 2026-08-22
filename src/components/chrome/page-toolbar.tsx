import { memo } from "react";

import { cn } from "../../lib/utils";

// Render-invariant: hoisted so the shell's frequent re-renders reuse one object.
const TOOLBAR_STYLE: React.CSSProperties = { animationDelay: "50ms" };

interface PageToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  /**
   * Escape hatch for a toolbar whose row is not a left/right split — a grid
   * that lets a search field take the remaining track, say. Supplying it
   * replaces the slot layout entirely; the inset stays.
   */
  children?: React.ReactNode;
  className?: string;
}

/**
 * INSET, NOT A SURFACE. The toolbar takes the same `px-6` as `PageHeader`, so
 * its controls land on the card content column with the page title above them
 * and every card's words below.
 *
 * Before this it had no padding at all, which put its controls on
 * `PageLayout`'s gutter — the same vertical as every card's BORDER, 24px
 * outboard of the words inside those cards. That was invisible while the
 * header sat on the gutter too; once the header moved onto the content
 * column, the toolbar was the last thing on a route still using the old edge,
 * and a search field starting further left than both the title above it and
 * the table below it read as broken rather than as full-bleed.
 *
 * NOT A CARD, though card chrome was tried here first and does solve the same
 * problem — the border lands on the gutter, the padding puts the contents on
 * the content column. It was rejected for weight: it adds a third surface to
 * the top of every route that has a toolbar, and on a route whose toolbar is
 * a single action it renders as a wide empty bar. Bare type and bare controls
 * on a shared column is the lighter way to get the same alignment, and it
 * keeps the page background as the thing the header sits on.
 */
export const PageToolbar = memo(function PageToolbar({ left, right, children, className }: PageToolbarProps) {
  return (
    <div className={cn("mb-4 px-6 animate-card-fade-in", className)} style={TOOLBAR_STYLE}>
      {children ?? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3",
            left && right ? "justify-between" : right ? "justify-end" : "justify-start",
          )}
        >
          {left && <div className="flex items-center gap-3">{left}</div>}
          {right && <div className="flex items-center gap-3">{right}</div>}
        </div>
      )}
    </div>
  );
});
