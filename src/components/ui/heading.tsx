import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

// `leading-tight` (1.25), not `leading-none`: Heading is the general-purpose
// h2-h4 primitive, so any title long enough to wrap — most of them at size="sm"
// in a narrow column, any of them on mobile — needs descender clearance.
const headingVariants = cva("font-semibold leading-tight tracking-tight text-foreground", {
  variants: {
    size: {
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
      xl: "text-xl",
    },
  },
  defaultVariants: {
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
 */
function Heading({ level = 2, size, className, ...props }: HeadingProps) {
  const Component = `h${level}` as "h2" | "h3" | "h4";
  return <Component data-slot="heading" className={cn(headingVariants({ size }), className)} {...props} />;
}

export { Heading, headingVariants };
