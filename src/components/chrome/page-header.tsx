import type { LucideIcon } from "lucide-react";
import { memo } from "react";

import { cn } from "../../lib/utils";

// Render-invariant styles, hoisted so re-renders reuse one object each.
const ICON_GRADIENT_STYLE: React.CSSProperties = { stroke: "url(#page-icon-gradient)" };
const DEFS_SVG_STYLE: React.CSSProperties = { position: "absolute" };

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string | React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  animationDelay?: string;
}

/**
 * The icon stroke references the `page-icon-gradient` SVG gradient.
 * Mount <PageIconGradientDefs /> once near the app root (FiestaBoard does
 * this in root.tsx) or the icon falls back to an unstroked glyph.
 *
 * A HEADER, NOT A CARD (#231). This used to render
 * `rounded-xl border bg-card px-6 py-4` — the identical recipe to every
 * content card below it. Ten routes therefore opened with two peer cards and
 * no focal point, and because `.page-title` was smaller than `CardTitle`, a
 * section heading nested inside a sibling card optically outranked the page's
 * own H1. The title is now type on the page background, which is the only
 * change that lets anything on a settings screen outrank anything else.
 *
 * `children` is an ACTION SLOT and now renders beside the title rather than
 * below the description, so a route can put its primary action on the header
 * row without hand-writing a float.
 */
export const PageHeader = memo(function PageHeader({
  icon: Icon,
  title,
  description,
  children,
  className,
  animationDelay = "0ms",
}: PageHeaderProps) {
  return (
    <div
      className={cn("mb-6 flex flex-wrap items-start justify-between gap-x-6 gap-y-3 animate-card-fade-in", className)}
      style={{ animationDelay }}
    >
      <div className="min-w-0">
        <h1 className="page-title flex items-center gap-3">
          <Icon className="h-6 w-6 flex-shrink-0" style={ICON_GRADIENT_STYLE} aria-hidden="true" />
          {title}
        </h1>
        <p className="page-description">{description}</p>
      </div>
      {children}
    </div>
  );
});

/**
 * Global SVG defs for the page-icon gradient. Stops read the --icon-g1..6
 * custom properties from theme.css, so the gradient follows the theme
 * (including the pride-month rainbow override). Render exactly once,
 * anywhere in the document.
 */
export const PageIconGradientDefs = memo(function PageIconGradientDefs() {
  return (
    <svg width="0" height="0" aria-hidden="true" style={DEFS_SVG_STYLE}>
      <defs>
        <linearGradient id="page-icon-gradient" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="24" y2="24">
          <stop offset="0%" stopColor="var(--icon-g1)" />
          <stop offset="20%" stopColor="var(--icon-g2)" />
          <stop offset="40%" stopColor="var(--icon-g3)" />
          <stop offset="60%" stopColor="var(--icon-g4)" />
          <stop offset="80%" stopColor="var(--icon-g5)" />
          <stop offset="100%" stopColor="var(--icon-g6)" />
        </linearGradient>
      </defs>
    </svg>
  );
});
