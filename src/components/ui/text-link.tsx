import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Inline text anchor with the canonical link treatment and the unified
 * 3px soft focus ring. For router navigation, keep using the router's
 * `Link` component; this primitive is for plain anchors.
 */
function TextLink({ className, ...props }: React.ComponentProps<"a">) {
  return (
    <a
      data-slot="text-link"
      className={cn(
        "rounded-sm text-primary underline-offset-4 hover:underline outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
      {...props}
    />
  );
}

export { TextLink };
