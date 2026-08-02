import * as React from "react";

import { cn } from "../../lib/utils";

interface BoxProps extends React.HTMLAttributes<HTMLElement> {
  /** Rendered element — a semantic choice only; Box never styles itself. */
  as?: "div" | "section" | "main" | "nav" | "header" | "footer" | "form" | "aside";
  /** `React.HTMLAttributes` has no `ref` prop; React 19 forwards it through the spread. */
  ref?: React.Ref<HTMLElement>;
}

/**
 * The typed escape hatch. When no styled primitive fits (positioned
 * overlays, portal hosts, canvas wrappers), use Box instead of raw HTML —
 * it keeps the no-raw-elements lint rule honest without styling opinions.
 * If a Box pattern recurs across the app, promote it to a real primitive.
 *
 * `as` is not discriminated against `props`: element-specific attributes
 * beyond the shared `HTMLAttributes` (e.g. `action`/`method` on `form`,
 * `start` on `ol`) aren't typed. If you need those, use the real element
 * via an allowlisted exception or extend Box into a dedicated primitive.
 */
function Box({ as = "div", className, ...props }: BoxProps) {
  const Component = as as React.ElementType;
  return <Component data-slot="box" className={cn(className)} {...props} />;
}

export { Box };
