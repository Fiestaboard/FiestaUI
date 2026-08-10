"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import * as React from "react";

import { cn } from "../../lib/utils";

// Static — hoisted so the thumb skips a per-render cn() pass over a
// 200+ char literal (scripts/ci/tests/cn-equivalence.test.mjs proves the
// hoist is byte-identical).
//
// The thumb stays a constant light colour in both states so the *track*
// carries the on/off signal, exactly as light mode already did. Inverting the
// thumb made on and off indistinguishable in dark (issue #158).
//
// border-input is what keeps the thumb legible now that the off-track is a
// surface token: in light a near-white thumb on --muted is only 1.09:1, so the
// thumb needs its own boundary. In dark the border is a translucent white over
// an already near-white thumb, so it disappears — inert exactly where it is
// not needed.
const thumbClassName =
  "bg-background dark:bg-foreground pointer-events-none block size-5 rounded-full border border-input ring-0 transition-transform data-[checked]:translate-x-[calc(100%+2px)] data-[unchecked]:translate-x-0";

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      // Render a real <button> like Radix did: keeps `disabled:` styles
      // working and lets an explicit aria-label win over a sibling label.
      render={<button type="button" />}
      nativeButton
      data-slot="switch"
      className={cn(
        // h-6 (24px) meets WCAG 2.2 SC 2.5.8; w-11 keeps the track's original
        // aspect ratio at the larger height (issue #164).
        //
        // The off-track fill is --muted (a surface), matching the Slider track,
        // and its boundary is --input (a boundary). --input is no longer used
        // as a fill here: it is now a 3:1 control boundary, and a surface fill
        // alone would leave the off-track at 1.09:1 against the page.
        // aria-invalid:data-[unchecked]: re-asserts the destructive border so
        // it cannot lose the specificity tie with data-[unchecked]:border-input.
        "peer data-[checked]:bg-primary data-[unchecked]:bg-muted data-[unchecked]:border-input focus-visible:border-ring focus-visible:ring-ring/50 enabled:hover:ring-ring/30 enabled:hover:ring-[3px] aria-invalid:border-destructive aria-invalid:data-[unchecked]:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-[color,background-color,border-color,box-shadow] duration-150 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={thumbClassName} />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
