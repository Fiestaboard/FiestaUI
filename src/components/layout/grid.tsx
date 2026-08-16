import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const gridVariants = cva("grid", {
  variants: {
    cols: {
      "1": "grid-cols-1",
      "2": "grid-cols-2",
      "3": "grid-cols-3",
      "4": "grid-cols-4",
      "5": "grid-cols-5",
      "6": "grid-cols-6",
      "8": "grid-cols-8",
    },
    sm: {
      "1": "sm:grid-cols-1",
      "2": "sm:grid-cols-2",
      "3": "sm:grid-cols-3",
      "4": "sm:grid-cols-4",
      "5": "sm:grid-cols-5",
      "6": "sm:grid-cols-6",
      "8": "sm:grid-cols-8",
    },
    md: {
      "1": "md:grid-cols-1",
      "2": "md:grid-cols-2",
      "3": "md:grid-cols-3",
      "4": "md:grid-cols-4",
      "5": "md:grid-cols-5",
      "6": "md:grid-cols-6",
      "8": "md:grid-cols-8",
    },
    lg: {
      "1": "lg:grid-cols-1",
      "2": "lg:grid-cols-2",
      "3": "lg:grid-cols-3",
      "4": "lg:grid-cols-4",
      "5": "lg:grid-cols-5",
      "6": "lg:grid-cols-6",
      "8": "lg:grid-cols-8",
    },
    gap: {
      "0": "gap-0",
      "0.5": "gap-0.5",
      "1": "gap-1",
      "1.5": "gap-1.5",
      "2": "gap-2",
      "2.5": "gap-2.5",
      "3": "gap-3",
      "4": "gap-4",
      "5": "gap-5",
      "6": "gap-6",
      "8": "gap-8",
      "12": "gap-12",
    },
  },
  defaultVariants: {
    cols: "1",
  },
});

/**
 * CSS grid container with an enumerated column count and gap scale.
 *
 * `cols` sets the base (mobile-first) column count; `sm`, `md`, and `lg`
 * override it at the matching Tailwind breakpoints — e.g.
 * `<Grid cols="1" sm="2" lg="3" gap="4">` for a responsive card grid.
 * All values are enumerated so every emitted class exists statically for
 * the Tailwind v4 scanner.
 */
function Grid({
  className,
  cols,
  sm,
  md,
  lg,
  gap,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof gridVariants>) {
  return <div data-slot="grid" className={cn(gridVariants({ cols, sm, md, lg, gap }), className)} {...props} />;
}

export { Grid, gridVariants };
