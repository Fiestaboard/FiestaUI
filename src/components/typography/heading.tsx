import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

// `leading-tight` (1.25), not `leading-none`: Heading is the general-purpose
// h2-h4 primitive, so any title long enough to wrap — most of them at size="sm"
// in a narrow column, any of them on mobile — needs descender clearance.
//
// It rides on each `size` step rather than on the base (#199). Tailwind's
// `text-<size>` utilities set line-height as well as font-size, so tailwind-
// merge treats a *following* `text-*` as superseding a *preceding* `leading-*`
// — `cn("leading-tight text-base") === "text-base"`. Because cva emits base
// classes before variant classes, a base-declared `leading-*` was stripped from
// every composed heading, and headings rendered at Tailwind's default 1.5. That
// is why #167's `leading-none` -> `leading-tight` swap changed nothing: both
// were being dropped. Pairing the leading with the size it belongs to also
// leaves room for the ramp to vary leading per step, which is usually what a
// type scale eventually wants.
const headingVariants = cva("font-semibold tracking-tight", {
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
    // `Object.keys(variants)` order, so `text-foreground` lands ahead of the
    // size step exactly where the base used to put it. Order matters here —
    // see the `leading-*` note above for what happens when it does not.
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
    },
    size: {
      sm: "text-sm leading-tight",
      base: "text-base leading-tight",
      lg: "text-lg leading-tight",
      xl: "text-xl leading-tight",
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
