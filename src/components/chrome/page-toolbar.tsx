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
   * replaces the slot layout entirely; the chrome and its padding stay.
   */
  children?: React.ReactNode;
  className?: string;
}

/**
 * A SURFACE, NOT A BARE ROW. The toolbar used to be transparent, so its
 * controls sat on `PageLayout`'s gutter — the same vertical as every card's
 * BORDER, 24px outboard of the words inside those cards. Once `PageHeader`
 * moved its title onto the card content column, the toolbar was the last
 * thing on a route still using the old edge, and a search field starting
 * further left than both the page title above it and the table below it read
 * as broken rather than as full-bleed.
 *
 * Card chrome fixes that by construction rather than by a matching magic
 * number: the toolbar's border lands on the gutter alongside every other
 * card's, and its own `px-6` puts its controls on the content column with
 * everything else. One column for content, one for chrome.
 *
 * `py-4` rather than Card's `py-6` — this is a row of controls, not a section
 * of prose, and the taller pad made it the heaviest object on a page whose
 * actual content sat below it.
 *
 * NOT FOR A LONE ACTION. A toolbar holding one right-aligned button renders
 * as a wide empty bar with a button in the corner — tested on Collections,
 * and it looks like a mistake. A single action belongs in `PageHeader`'s
 * action slot, which puts it on the header row where it reads as the page's
 * primary verb. Reach for this when there is genuinely a row of controls.
 */
export const PageToolbar = memo(function PageToolbar({ left, right, children, className }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "bg-card mb-4 rounded-xl border px-6 py-4 shadow-card transition-[box-shadow,border-color] duration-base",
        "animate-card-fade-in",
        className,
      )}
      style={TOOLBAR_STYLE}
    >
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
