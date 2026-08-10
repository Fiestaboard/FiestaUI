import * as React from "react";

import { cn } from "../../lib/utils";

export type CheckboxProps = Omit<React.ComponentProps<"input">, "type">;

function Checkbox({ className, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      data-slot="checkbox"
      className={cn(
        // accent-primary (not accent-brand): --primary is the system's single
        // "this control is on" pigment, shared with Switch and the Slider
        // indicator. See issue #159.
        "relative h-4 w-4 shrink-0 rounded-sm border border-input accent-primary",
        "shadow-sm transition-[color,background-color,border-color,box-shadow] duration-control cursor-pointer",
        // WCAG 2.2 SC 2.5.8 — a 24x24 hit target without touching the 16x16
        // visual box. The pseudo-element is transparent and absolutely
        // positioned, so it costs no layout and paints nothing (issue #164).
        "before:absolute before:top-1/2 before:left-1/2 before:size-6 before:-translate-x-1/2 before:-translate-y-1/2 before:content-['']",
        // A native (appearance:auto) checkbox ignores `border`, so hover and
        // invalid have to speak in rings — the same vocabulary the Slider
        // thumb already uses (issues #165, #163).
        "enabled:hover:ring-ring/30 enabled:hover:ring-[3px]",
        "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "aria-invalid:ring-[3px] aria-invalid:accent-destructive",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
