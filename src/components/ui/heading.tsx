import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

// `leading-tight` (1.25), not `leading-none`: Heading is the general-purpose
// h2-h4 primitive, so any title long enough to wrap — most of them at size="sm"
// in a narrow column, any of them on mobile — needs descender clearance.
const headingVariants = cva("font-semibold leading-tight tracking-tight", {
  variants: {
    // Token names are copied verbatim from `textVariants` so the two ramps stay
    // in lockstep — a `tone` that means one colour on Text and another on
    // Heading is the drift this exists to prevent.
    //
    // Scoped to `muted | destructive` (#195). `info` / `success` / `warning`
    // headings are hypothetical, and shipping all five invites decorative
    // coloured section titles, which is a hierarchy problem rather than a
    // feature. Add the rest on a real call site, not speculatively.
    //
    // Declared before `size` deliberately: cva emits variant classes in
    // `Object.keys(variants)` order, so the default composition is still
    // `font-semibold leading-tight tracking-tight text-foreground text-base`
    // — byte-identical to the pre-tone output, which keeps every existing
    // heading render and VRT baseline untouched.
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
    },
    size: {
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    },
  },
  defaultVariants: {
    tone: "default",
    size: "base",
  },
});

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof headingVariants> {
  /** Semantic heading element. h1 is reserved for PageHeader. */
  level?: 2 | 3 | 4;
  /** `React.HTMLAttributes` has no `ref` prop; React 19 forwards it through the spread. */
  ref?: React.Ref<HTMLHeadingElement>;
}

/**
 * Section heading primitive for h2–h4, carrying the unified title
 * typography (semibold + tight leading/tracking). Semantic `level` and
 * visual `size` are independent so document outline never fights layout.
 *
 * `tone` draws from the same status token set as `Text`, so a status section
 * title stays on-token instead of reaching for a raw `text-destructive`.
 */
function Heading({ level = 2, size, tone, className, ...props }: HeadingProps) {
  const Component = `h${level}` as "h2" | "h3" | "h4";
  return <Component data-slot="heading" className={cn(headingVariants({ size, tone }), className)} {...props} />;
}

export { Heading, headingVariants };
