import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const stackVariants = cva("flex flex-col", {
  variants: {
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
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
  },
  defaultVariants: {
    gap: "2",
  },
});

/**
 * Vertical layout shorthand — a `Flex` column with a gap.
 *
 * The design-system replacement for ad-hoc `space-y-*` wrappers: children
 * stack top-to-bottom separated by the enumerated `gap` scale (defaults to
 * `"2"`, the most common spacing in the app). Use `align` to control
 * horizontal alignment of children; the default stretches them full width.
 */
function Stack({ className, gap, align, ...props }: React.ComponentProps<"div"> & VariantProps<typeof stackVariants>) {
  return <div data-slot="stack" className={cn(stackVariants({ gap, align }), className)} {...props} />;
}

export { Stack, stackVariants };
