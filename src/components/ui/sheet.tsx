"use client";

import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import { OverlayClose } from "./overlay-close";

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

const SHEET_OVERLAY_STYLE: React.CSSProperties = {
  animation: "sheet-overlay-in var(--motion-duration-slow) var(--motion-ease-out)",
};

function SheetOverlay({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Backdrop>) {
  return (
    <SheetPrimitive.Backdrop
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-[var(--z-sheet)] bg-overlay", className)}
      style={SHEET_OVERLAY_STYLE}
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

type SheetSide = "top" | "bottom" | "left" | "right";

const SHEET_SLIDE_TIMING = "var(--motion-duration-slowest) var(--motion-ease-standard)";

// Frozen per-side style lookup built once at module load. `willChange` is
// intentionally omitted: the `sheet-slide-in-*` keyframes animate `translate3d`,
// which already promotes the panel to a compositor layer for the duration of the
// entrance animation (see theme.css) — a permanent `willChange: transform` would
// keep a full-height panel on a GPU layer for its entire mounted lifetime.
const SHEET_STYLE_BY_SIDE: Record<SheetSide, React.CSSProperties> = {
  top: {
    animation: `sheet-slide-in-top ${SHEET_SLIDE_TIMING}`,
    backfaceVisibility: "hidden",
    contain: "layout style paint",
  },
  bottom: {
    animation: `sheet-slide-in-bottom ${SHEET_SLIDE_TIMING}`,
    backfaceVisibility: "hidden",
    contain: "layout style paint",
  },
  left: {
    animation: `sheet-slide-in-left ${SHEET_SLIDE_TIMING}`,
    backfaceVisibility: "hidden",
    contain: "layout style paint",
  },
  right: {
    animation: `sheet-slide-in-right ${SHEET_SLIDE_TIMING}`,
    backfaceVisibility: "hidden",
    contain: "layout style paint",
  },
};

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
  const handleKeyDown = React.useCallback(
    (event: Parameters<NonNullable<React.ComponentProps<typeof SheetPrimitive.Popup>["onKeyDown"]>>[0]) => {
      onKeyDown?.(event);
      if (event.key === "Escape" && onEscapeKeyDown) {
        onEscapeKeyDown(event);
        if (event.defaultPrevented) {
          event.stopPropagation();
        }
      }
    },
    [onKeyDown, onEscapeKeyDown],
  );

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        data-slot="sheet-content"
        className={cn(sheetVariants({ side }), className)}
        onKeyDown={handleKeyDown}
        style={SHEET_STYLE_BY_SIDE[side ?? "right"]}
        {...props}
      >
        {children}
        {/* 40px chip — the reference size of the shared OverlayClose design. */}
        <OverlayClose data-slot="sheet-close" size="md" />
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
