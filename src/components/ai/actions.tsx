"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../overlays/tooltip";

/**
 * Actions — the small icon affordances under an assistant turn: copy,
 * retry, undo.
 *
 * Each {@link Action} is an icon-only button, so the `label` prop is
 * required: it is the accessible name AND the tooltip. The 24px `icon-xs`
 * size is the package's floor for a target (SC 2.5.8).
 */

function Actions({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="actions" className={cn("flex items-center gap-0.5", className)} {...props} />;
}

export interface ActionProps extends Omit<React.ComponentProps<typeof Button>, "aria-label"> {
  /** Accessible name and tooltip text. */
  label: string;
}

function Action({ className, label, children, ...props }: ActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          data-slot="action"
          type="button"
          variant="ghost"
          size="icon-xs"
          aria-label={label}
          className={cn("text-muted-foreground hover:text-foreground", className)}
          {...props}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export { Action, Actions };
