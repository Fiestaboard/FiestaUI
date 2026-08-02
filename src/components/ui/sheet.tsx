"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

const Sheet = SheetPrimitive.Root;

function SheetTrigger({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger> & { asChild?: boolean }) {
  return (
    <SheetPrimitive.Trigger
      data-slot="sheet-trigger"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

function SheetClose({
  asChild = false,
  children,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close> & { asChild?: boolean }) {
  return (
    <SheetPrimitive.Close
      data-slot="sheet-close"
      {...(asChild ? { render: React.Children.only(children) as React.ReactElement } : { children })}
      {...props}
    />
  );
}

const SheetPortal = SheetPrimitive.Portal;

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Backdrop>) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-[var(--z-sheet)] bg-overlay", className)}
      style={{
        animation: "sheet-overlay-in var(--motion-duration-slow) var(--motion-ease-out)",
      }}
      {...props}
    />
  );
}

const sheetVariants = cva("fixed z-[var(--z-sheet)] gap-4 bg-background p-6 shadow-modal", {
  variants: {
    side: {
      top: "inset-x-0 top-0 border-b",
      bottom: "inset-x-0 bottom-0 border-t",
      left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
      right: "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
    },
  },
  defaultVariants: {
    side: "right",
  },
});

interface SheetContentProps
  extends React.ComponentProps<typeof SheetPrimitive.Popup>, VariantProps<typeof sheetVariants> {
  /**
   * Radix-compat: called on Escape while the sheet is open; call
   * `event.preventDefault()` to keep the sheet open. Implemented by stopping
   * the event before Base UI's document-level dismiss handler sees it.
   */
  onEscapeKeyDown?: (event: React.KeyboardEvent) => void;
}

function SheetContent({
  side = "right",
  className,
  children,
  onEscapeKeyDown,
  onKeyDown,
  ...props
}: SheetContentProps) {
  const getAnimation = (side: string) => {
    const timing = "var(--motion-duration-slowest) var(--motion-ease-standard)";
    switch (side) {
      case "right":
        return `sheet-slide-in-right ${timing}`;
      case "left":
        return `sheet-slide-in-left ${timing}`;
      case "top":
        return `sheet-slide-in-top ${timing}`;
      case "bottom":
        return `sheet-slide-in-bottom ${timing}`;
      default:
        return `sheet-slide-in-right ${timing}`;
    }
  };

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        onKeyDown={(event) => {
          onKeyDown?.(event);
          if (event.key === "Escape" && onEscapeKeyDown) {
            onEscapeKeyDown(event);
            if (event.defaultPrevented) {
              event.stopPropagation();
            }
          }
        }}
        style={{
          animation: getAnimation(side || "right"),
          willChange: "transform",
          backfaceVisibility: "hidden",
          // CSS containment for better perf - isolate this from rest of page
          contain: "layout style paint",
        }}
        {...props}
      >
        {children}
        <SheetPrimitive.Close
          data-slot="sheet-close"
          className="absolute right-4 top-4 h-10 w-10 flex items-center justify-center rounded-full bg-muted/80 hover:bg-muted transition-colors outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
        >
          <X className="h-5 w-5" />
          <span className="sr-only">Close</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col space-y-2 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
