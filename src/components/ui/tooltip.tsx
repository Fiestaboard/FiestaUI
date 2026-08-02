"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import * as React from "react";

import { cn } from "../../lib/utils";

function TooltipProvider({
  delayDuration,
  skipDelayDuration,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider> & {
  delayDuration?: number;
  skipDelayDuration?: number;
}) {
  return <TooltipPrimitive.Provider delay={delayDuration} timeout={skipDelayDuration} {...props} />;
}

const Tooltip = TooltipPrimitive.Root;

function TooltipTrigger({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  side = "top",
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Popup> & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className="z-[var(--z-tooltip)]">
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            "overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
            className,
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
