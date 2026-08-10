import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Inline code chip — the replacement for raw `<code>` with ad-hoc
 * bg/rounded/font-mono classes. Block-level snippets keep raw `<pre>`
 * (allowlisted downstream).
 */
function Code({ className, ...props }: React.ComponentProps<"code">) {
  return (
    <code
      data-slot="code"
      className={cn("rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground", className)}
      {...props}
    />
  );
}

export { Code };
