import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

// Each status sets `--status-dot-color` alongside its `bg-*` class. The fill
// could read the variable directly, but keeping the plain `bg-success` /
// `bg-destructive` class is what makes this component grep-compatible with the
// ~8 hand-rolled `h-2 w-2 rounded-full bg-*` dots it replaces; the variable
// exists so the OPTIONAL glow can color-mix the same token without every call
// site restating the colour twice (the bug the canonical ServiceStatus had:
// `bg-board-green` in a class and `--color-board-green` in a boxShadow string,
// free to drift apart).
//
// `--status-dot-color` deliberately points at the semantic tokens
// (--color-success/-warning/-destructive/-info/-muted-foreground), NOT the
// fixed board palette the app version used. Board colours are hardware ink
// values that do not flip between themes; a UI status dot must.
const statusDotVariants = cva(
  "inline-block shrink-0 rounded-full align-middle transition-[background-color,box-shadow] duration-control",
  {
    variants: {
      status: {
        success: "bg-success [--status-dot-color:var(--color-success)]",
        warning: "bg-warning [--status-dot-color:var(--color-warning)]",
        danger: "bg-destructive [--status-dot-color:var(--color-destructive)]",
        info: "bg-info [--status-dot-color:var(--color-info)]",
        neutral: "bg-muted-foreground [--status-dot-color:var(--color-muted-foreground)]",
      },
      // md (8px) is the size the app's inline dots are typed at today; lg
      // (12px) matches the standalone ServiceStatus indicator in the header,
      // which has no adjacent text to lend it presence.
      size: {
        sm: "size-1.5 [--status-dot-glow:4px]",
        md: "size-2 [--status-dot-glow:6px]",
        lg: "size-3 [--status-dot-glow:8px]",
      },
      // WCAG 2.2.2 (Pause, Stop, Hide) covers automatic motion that runs for
      // more than five seconds, and a status pulse runs indefinitely — so the
      // animation is off by default and always drops out under
      // `prefers-reduced-motion`. Same treatment as Skeleton. Nothing about
      // the dot's MEANING lives in the pulse; it is emphasis on a state the
      // colour and the label already carry.
      pulse: {
        true: "animate-pulse motion-reduce:animate-none",
        false: "",
      },
    },
    defaultVariants: {
      status: "neutral",
      size: "md",
      pulse: false,
    },
  },
);

// Hoisted so the glow does not reallocate a style object on every render (the
// dot is frequently rendered in lists). Both values are CSS variables set by
// the variant classes above, so the single string covers every status/size
// combination and re-resolves for free when the theme flips.
const GLOW_STYLE: React.CSSProperties = {
  boxShadow: "0 0 var(--status-dot-glow) color-mix(in oklch, var(--status-dot-color) 50%, transparent)",
};

export interface StatusDotProps
  extends Omit<React.ComponentProps<"span">, "children" | "color">, VariantProps<typeof statusDotVariants> {
  /**
   * Soft halo in the dot's own colour, colour-mixed to 50%. Purely
   * decorative emphasis — it is never the only signal of anything.
   */
  glow?: boolean;
  /**
   * Text announced to assistive technology.
   *
   * Defaults to `null` — a DECORATIVE dot, `aria-hidden`, for the common case
   * where the dot sits immediately beside text that already states the status
   * ("● Running"). Announcing it there would produce "Running Running", and a
   * bare unlabelled dot in the tree is worse than none.
   *
   * Pass a string for a STANDALONE dot that is the only carrier of the state
   * (a header service indicator, a cell in a dense table). The dot then gets
   * `role="status"` and an `sr-only` label, so the state is announced when it
   * changes — which is also what keeps it clear of WCAG 1.4.1 (Use of Colour),
   * since hue alone would otherwise be the entire message.
   *
   * There is deliberately no default label per status: "success" is not a
   * sentence, and the real one ("Service running", "3 boards offline") is
   * always the caller's to write.
   */
  label?: string | null;
}

/**
 * Small coloured state indicator.
 *
 * Two supported shapes, and the `label` prop is what selects between them:
 *
 *   <StatusDot status="success" /> Running          decorative, aria-hidden
 *   <StatusDot status="success" label="Running" />  standalone, role="status"
 *
 * `role="status"` is a polite live region: the label is announced when it
 * changes, which is the right behaviour for a dot tracking a connection. For
 * a dot describing something static (a legend swatch, a row that never
 * updates in place) pass `role="img"` — props spread over the computed
 * attributes, so the override lands.
 */
function StatusDot({
  className,
  status = "neutral",
  size = "md",
  pulse = false,
  glow = false,
  label = null,
  style,
  ...props
}: StatusDotProps) {
  const decorative = label == null;
  return (
    <span
      data-slot="status-dot"
      data-status={status}
      data-size={size}
      role={decorative ? undefined : "status"}
      aria-hidden={decorative || undefined}
      className={cn(statusDotVariants({ status, size, pulse }), className)}
      // Caller styles win over the glow rather than being dropped by it.
      style={glow ? { ...GLOW_STYLE, ...style } : style}
      {...props}
    >
      {/*
        The name is real text in an sr-only span, not `aria-label`. A live
        region announces its CONTENT; several screen readers do not re-announce
        a region whose aria-label changed while its (empty) content did not, so
        an aria-label-only dot would go silent at exactly the moment it had
        news. Real text also stays selectable/translatable by page translators.
      */}
      {decorative ? null : <span className="sr-only">{label}</span>}
    </span>
  );
}

export { StatusDot, statusDotVariants };
