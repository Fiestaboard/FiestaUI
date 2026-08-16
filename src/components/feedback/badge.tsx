import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        // Same tile treatment as Button's brand variant — see the note there.
        // Board-ink label, never white (2.03:1), and a --primary rim for the
        // boundary the 1.83:1 field cannot provide on a light page.
        brand: "border-primary bg-brand-tile text-brand-tile-foreground [a&]:hover:bg-brand-tile/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
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
