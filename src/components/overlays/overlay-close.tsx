"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * One dismiss affordance for every overlay surface: a filled circular chip
 * pinned to the top-right of the popup. Sizes are a scale on this single
 * design, not separate designs — `md` (40px) for roomy surfaces like Sheet,
 * `sm` (32px) for the denser Dialog header. Both clear the WCAG 2.2 SC 2.5.8
 * 24x24 minimum, which the pre-unification 16px bare Dialog icon did not.
 */
const overlayCloseVariants = cva(
  "absolute right-4 top-4 flex items-center justify-center rounded-full bg-muted/80 transition-colors hover:bg-muted outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      size: {
        sm: "size-8 [&_svg]:size-4",
        md: "size-10 [&_svg]:size-5",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

interface OverlayCloseProps
  extends
    Omit<React.ComponentProps<typeof DialogPrimitive.Close>, "children">,
    VariantProps<typeof overlayCloseVariants> {
  /** Visually hidden accessible name for the button. Never render it empty. */
  label?: string;
  /** Overlay-specific slot hook (`dialog-close`, `sheet-close`, ...). */
  "data-slot"?: string;
}

/**
 * Internal — not exported from the package barrel. It renders a Base UI
 * `Dialog.Close`, so it only works inside a Dialog/Sheet root, and its
 * `absolute right-4 top-4` placement assumes an overlay popup as the
 * positioned ancestor. Overlays compose it; consumers use the overlay.
 */
function OverlayClose({ size, className, label = "Close", ...props }: OverlayCloseProps) {
  return (
    <DialogPrimitive.Close className={cn(overlayCloseVariants({ size }), className)} {...props}>
      <X />
      <span className="sr-only">{label}</span>
    </DialogPrimitive.Close>
  );
}

export { OverlayClose, overlayCloseVariants };
