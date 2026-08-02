import * as React from "react";

import { cn } from "../../lib/utils";

interface BoxProps extends React.HTMLAttributes<HTMLElement> {
  /** Rendered element — a semantic choice only; Box never styles itself. */
  as?: "div" | "section" | "main" | "nav" | "header" | "footer" | "form" | "aside";
}

/**
 * The typed escape hatch. When no styled primitive fits (positioned
 * overlays, portal hosts, canvas wrappers), use Box instead of raw HTML —
 * it keeps the no-raw-elements lint rule honest without styling opinions.
 * If a Box pattern recurs across the app, promote it to a real primitive.
 */
function Box({ as = "div", className, ...props }: BoxProps) {
  const Component = as;
  return <Component data-slot="box" className={cn(className)} {...props} />;
}

export { Box };
