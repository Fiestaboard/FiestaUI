"use client";

import type { LucideIcon } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Optional illustration (e.g. SVG) shown instead of icon when provided */
  illustration?: React.ReactNode;
  /**
   * Announce the empty state to assistive technology when it appears (applies
   * `role="status"`). Opt in only when the empty state mounts as the result of
   * a data change; a statically rendered empty state should stay the default
   * plain labelled region so it is not announced on page load.
   */
  announce?: boolean;
  className?: string;
}

/**
 * Consistent empty state for lists and grids (e.g. no pages, no collections).
 * Use with an icon, title, optional description, optional CTA, and optional illustration.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration,
  announce = false,
  className,
}: EmptyStateProps) {
  const titleId = React.useId();
  return (
    <div
      data-slot="empty-state"
      className={cn("flex flex-col items-center justify-center text-center py-8 px-4", className)}
      role={announce ? "status" : "region"}
      aria-labelledby={titleId}
    >
      {illustration ? (
        <div
          data-slot="empty-state-media"
          className="mb-3 flex items-center justify-center [&_svg]:max-w-[120px] [&_svg]:max-h-[80px] [&_svg]:text-muted-foreground"
          aria-hidden
        >
          {illustration}
        </div>
      ) : (
        <div data-slot="empty-state-media" className="rounded-full bg-brand/10 p-4 mb-3">
          <Icon className="h-8 w-8 text-brand" aria-hidden />
        </div>
      )}
      <h3 data-slot="empty-state-title" id={titleId} className="text-sm font-medium text-foreground">
        {title}
      </h3>
      {description && (
        <p data-slot="empty-state-description" className="text-sm text-muted-foreground mt-1 max-w-sm leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div data-slot="empty-state-action" className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
