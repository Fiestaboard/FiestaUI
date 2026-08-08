import { memo } from "react";

import { cn } from "../../lib/utils";

// Render-invariant: hoisted so the shell's frequent re-renders reuse one object.
const TOOLBAR_STYLE: React.CSSProperties = { animationDelay: "50ms" };

interface PageToolbarProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}

export const PageToolbar = memo(function PageToolbar({ left, right, className }: PageToolbarProps) {
  return (
    <div
      className={cn(
        "mb-4 flex items-center animate-card-fade-in",
        left && right ? "justify-between" : right ? "justify-end" : "justify-start",
        className,
      )}
      style={TOOLBAR_STYLE}
    >
      {left && <div className="flex items-center gap-3">{left}</div>}
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
});
