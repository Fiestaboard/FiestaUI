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
const thumbClassName =
  "bg-background dark:bg-foreground pointer-events-none block size-5 rounded-full ring-0 transition-transform data-[checked]:translate-x-[calc(100%+2px)] data-[unchecked]:translate-x-0";

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
        "peer data-[checked]:bg-primary data-[unchecked]:bg-input focus-visible:border-ring focus-visible:ring-ring/50 dark:data-[unchecked]:bg-input/80 enabled:hover:ring-ring/30 enabled:hover:ring-[3px] aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-[color,background-color,border-color,box-shadow] duration-150 outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className={thumbClassName} />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
