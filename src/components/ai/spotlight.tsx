"use client";

import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Spotlight — the visual language for "the assistant is working HERE".
 *
 * Three presentational parts an app positions itself (the package knows
 * nothing about the app's DOM, routes or which element is meant):
 *
 * - {@link SpotlightRing} — a ring drawn around a target rectangle, with a
 *   tone: `driving` (the assistant is acting on this), `landed` (the change
 *   arrived), `error`. `aria-hidden`: the ring is for sighted users; the
 *   caption and the app's own live regions carry the same information.
 * - {@link SpotlightCaption} — a small bubble that says what is happening
 *   ("Typing the name…"), a polite live region, with an optional slot for
 *   controls (Stop, Approve/Deny).
 * - {@link GhostValue} — a value being "typed into" a control the app must
 *   not actually mutate: renders the typed prefix with a caret at
 *   `progress`, or the whole value as a badge for controls with no text
 *   box (a switch, a select). `aria-hidden`: the real control keeps its
 *   accessible value; the caption narrates the change.
 *
 * The pulse and caret are `.ai-spotlight-pulse` / `.ai-caret` in
 * theme.css, each with a reduced-motion pose (a static ring, a solid
 * caret) rather than an arbitrary frozen frame.
 *
 * The app positions these with inline `style` (a measured rect), which is
 * why none of them carries a position of its own: they are `absolute`
 * boxes in whatever coordinate space the consumer puts them in.
 */

export type SpotlightTone = "driving" | "landed" | "error";

const spotlightRingVariants = cva(
  "pointer-events-none absolute rounded-lg ring-2 ring-offset-2 ring-offset-background transition-[top,left,width,height] duration-base",
  {
    variants: {
      tone: {
        driving: "ring-brand ai-spotlight-pulse",
        landed: "ring-success",
        error: "ring-destructive",
      },
    },
    defaultVariants: {
      tone: "driving",
    },
  },
);

export interface SpotlightRingProps extends React.ComponentProps<"div">, VariantProps<typeof spotlightRingVariants> {
  tone?: SpotlightTone;
}

function SpotlightRing({ className, tone = "driving", ...props }: SpotlightRingProps) {
  return (
    <div
      data-slot="spotlight-ring"
      data-tone={tone}
      aria-hidden="true"
      className={cn(spotlightRingVariants({ tone }), className)}
      {...props}
    />
  );
}

export interface SpotlightCaptionProps extends React.ComponentProps<"div"> {
  tone?: SpotlightTone;
  /** Controls rendered after the text: Stop, Approve, Deny. */
  controls?: React.ReactNode;
}

const CAPTION_TONES: Record<SpotlightTone, string> = {
  driving: "border-brand/40",
  landed: "border-success/50",
  error: "border-destructive/50",
};

function SpotlightCaption({ className, tone = "driving", controls, children, ...props }: SpotlightCaptionProps) {
  return (
    <div
      data-slot="spotlight-caption"
      data-tone={tone}
      role="status"
      aria-live="polite"
      className={cn(
        "absolute z-[var(--z-tooltip)] flex max-w-xs items-center gap-2 rounded-lg border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        CAPTION_TONES[tone],
        className,
      )}
      {...props}
    >
      <span data-slot="spotlight-caption-text" className="min-w-0">
        {children}
      </span>
      {controls ? (
        <span data-slot="spotlight-caption-controls" className="flex shrink-0 items-center gap-1">
          {controls}
        </span>
      ) : null}
    </div>
  );
}

export interface GhostValueProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** The full value being revealed. */
  value: string;
  /** 0..1 — how much of `value` is shown; 1 shows all of it. */
  progress?: number;
  /**
   * `replica` overlays a text box and shows the typed prefix with a caret;
   * `badge` sits beside a control with no text (a switch, a select) and
   * shows the whole value at once.
   */
  variant?: "replica" | "badge";
}

/** The number of characters visible at `progress`, never past the end. */
export function revealedLength(value: string, progress: number): number {
  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 1));
  return Math.min(value.length, Math.ceil(clamped * value.length));
}

function GhostValue({ className, value, progress = 1, variant = "replica", ...props }: GhostValueProps) {
  const shown = variant === "badge" ? value : value.slice(0, revealedLength(value, progress));
  const typing = variant === "replica" && shown.length < value.length;
  return (
    <span
      data-slot="ghost-value"
      data-variant={variant}
      data-typing={typing || undefined}
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute",
        variant === "replica" && "whitespace-pre text-foreground",
        variant === "badge" &&
          "inline-flex items-center rounded-md border border-brand/40 bg-popover px-2 py-0.5 text-xs font-medium text-foreground shadow-sm",
        className,
      )}
      {...props}
    >
      {variant === "badge" ? "→ " : null}
      {shown}
      {variant === "replica" ? <span data-slot="ghost-caret" className="ai-caret" /> : null}
    </span>
  );
}

export { GhostValue, SpotlightCaption, SpotlightRing, spotlightRingVariants };
