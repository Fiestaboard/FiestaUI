import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-ring aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary-hover",
        // The tile survives here and dies on Button, deliberately. A Badge is
        // not an operable component, so SC 1.4.11 does not reach it — it is
        // content, governed by its 8.84:1 board-ink label. The `border-primary`
        // rim is gone: post-split it would draw a rim of the fill's own colour.
        brand: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary-hover",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        variable:
          "bg-tag-variable/15 border-tag-variable/30 text-tag-variable-foreground font-mono [a&]:hover:bg-tag-variable/25",
        success:
          "bg-tag-success/15 border-tag-success/40 text-tag-success-foreground font-mono [a&]:hover:bg-tag-success/25",
        formula:
          "bg-tag-formula/15 border-tag-formula/30 text-tag-formula-foreground font-mono [a&]:hover:bg-tag-formula/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  children,
  ref,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  return useRender({
    defaultTagName: "span",
    ref: ref as React.Ref<HTMLSpanElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "badge",
      className: cn(badgeVariants({ variant }), className),
      ...(asChild ? {} : { children }),
      ...props,
    },
  });
}

export { Badge, badgeVariants };
