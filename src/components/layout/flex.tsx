import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const flexVariants = cva("flex", {
  variants: {
    direction: {
      row: "flex-row",
      col: "flex-col",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      baseline: "items-baseline",
      stretch: "items-stretch",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
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
    wrap: {
      true: "flex-wrap",
    },
    inline: {
      true: "inline-flex",
    },
  },
  defaultVariants: {
    direction: "row",
  },
});

/**
 * Generic flexbox container — the workhorse layout primitive.
 *
 * `Flex` also covers what dedicated `HAlign`/`VAlign` components would do:
 * in the default `direction="row"`, `align` positions children vertically and
 * `justify` positions them horizontally; with `direction="col"` the axes swap.
 * So `<Flex align="center" justify="center">` fully centers its children, and
 * `<Flex align="center" justify="between">` is the classic toolbar row.
 *
 * `gap` is an enumerated spacing scale (Tailwind units), so every emitted
 * class exists statically for the Tailwind v4 scanner.
 */
function Flex({
  className,
  direction,
  align,
  justify,
  gap,
  wrap,
  inline,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof flexVariants>) {
  return (
    <div
      data-slot="flex"
      className={cn(flexVariants({ direction, align, justify, gap, wrap, inline }), className)}
      {...props}
    />
  );
}

export { Flex, flexVariants };
