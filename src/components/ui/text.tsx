import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

const textVariants = cva("", {
  variants: {
    size: {
      xs: "text-xs",
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
    },
    tone: {
      default: "text-foreground",
      muted: "text-muted-foreground",
      destructive: "text-destructive",
      info: "text-info",
      success: "text-success",
      warning: "text-warning",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
    },
  },
  defaultVariants: {
    size: "sm",
    tone: "default",
    weight: "normal",
  },
});

interface TextProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof textVariants> {
  /** Rendered element. `p` (default) for block copy, `span` for inline fragments. */
  as?: "p" | "span";
}

/**
 * Body text primitive — the design-system replacement for raw `<p>`/`<span>`.
 *
 * `size` defaults to `"sm"`, the dominant body size in FiestaBoard's dense
 * UI (the same reasoning as `Stack`'s `gap="2"` default). `tone` draws from
 * the status token set so message coloring stays on-token.
 */
function Text({ as = "p", className, size, tone, weight, ...props }: TextProps) {
  const Component = as;
  return <Component data-slot="text" className={cn(textVariants({ size, tone, weight }), className)} {...props} />;
}

export { Text, textVariants };
