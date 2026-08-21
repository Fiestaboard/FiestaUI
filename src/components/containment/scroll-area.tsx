"use client";

import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * The viewport is a real tab stop (`tabIndex={0}` — a scrollable region has to
 * be keyboard-operable), so it needs a visible focus indicator. It cannot draw
 * its own: the Root is `overflow-hidden` and the Viewport is an `h-full w-full`
 * direct child filling it exactly, so ANY outset ring on the Viewport — the
 * `.focus-ring` box-shadow, or the `focus-visible:ring-[3px]` this used to
 * spell — paints entirely inside the clipped region and is never seen. That is
 * the same clipping that keeps `media-frame.tsx` and `time-picker.tsx` pinned
 * in the theme-contrast guard, and it made this control's indicator invisible
 * long before the ring recipe changed (SC 2.4.7).
 *
 * So the ring is drawn on the ROOT, which clips its descendants but not its own
 * box-shadow, and it is keyed to the Viewport's focus with `has-*`. The value
 * comes from `--focus-ring-shadow` (#228 item 5) rather than a re-spelling of
 * the three stops, so a retune of the ring tracks here by construction — the
 * same move `plugin-card.tsx` will make for its `::after` overlay.
 */
function ScrollArea({ className, children, ...props }: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn(
        "relative overflow-hidden has-[[data-slot=scroll-area-viewport]:focus-visible]:shadow-[var(--focus-ring-shadow)]",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        // outline-none only: the indicator for this tab stop lives on the Root
        // (see above). Do not add `.focus-ring` here — it would be clipped.
        className="h-full w-full rounded-[inherit] outline-none"
        tabIndex={0}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none opacity-0 transition-[colors,opacity] duration-control data-[hovering]:opacity-100 data-[scrolling]:opacity-100",
        orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent p-[1px]",
        orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent p-[1px]",
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className="relative flex-1 rounded-full bg-border" />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
