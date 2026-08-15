import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const listVariants = cva("", {
  variants: {
    marker: {
      none: "list-none",
      disc: "list-disc pl-5",
      decimal: "list-decimal pl-5",
    },
    gap: {
      "0": "space-y-0",
      "1": "space-y-1",
      "2": "space-y-2",
      "3": "space-y-3",
      "4": "space-y-4",
    },
  },
  defaultVariants: {
    marker: "none",
    gap: "1",
  },
});

interface ListProps
  extends React.HTMLAttributes<HTMLUListElement | HTMLOListElement>, VariantProps<typeof listVariants> {
  /** Rendered element: unordered (default) or ordered. */
  as?: "ul" | "ol";
  /** `React.HTMLAttributes` has no `ref` prop; React 19 forwards it through the spread. */
  ref?: React.Ref<HTMLUListElement | HTMLOListElement>;
}

/**
 * Semantic list container — replaces raw `<ul>`/`<ol>` + space-y wrappers.
 *
 * `marker` controls the list-style (`"none"` default, or `"disc"`/`"decimal"`
 * for real bulleted/numbered content). `gap` sets the vertical space between
 * items and defaults to `"1"` (non-zero) — migrators replacing a bare
 * `<ul>`/`<ol>` should pass `gap="0"` to keep spacing identical to the
 * un-primitived markup.
 */
function List({ as = "ul", className, marker, gap, ...props }: ListProps) {
  const Component = as as React.ElementType;
  return <Component data-slot="list" className={cn(listVariants({ marker, gap }), className)} {...props} />;
}

/** Semantic list item — unstyled; compose Flex/Text inside as needed. */
function ListItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="list-item" className={className} {...props} />;
}

export { List, ListItem, listVariants };
