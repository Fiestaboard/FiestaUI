import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * `size` widens the native attribute rather than replacing it: `"touch"` is
 * the 44px touch size (slice 1.2), `"default"` the 36px field, and a NUMBER
 * still reaches the DOM as HTML's `size` (the visible character width), so
 * no existing call site changes meaning.
 */
export type InputSize = "default" | "touch";

export type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: InputSize | number;
};

function Input({ className, type, size, ...props }: InputProps) {
  const sizeKey: InputSize = size === "touch" ? "touch" : "default";

  return (
    <input
      type={type}
      data-slot="input"
      data-size={sizeKey}
      size={typeof size === "number" ? size : undefined}
      className={cn(
        // box-shadow is in the transition list so the focus ring eases in
        // rather than snapping — same timing Button declares (issue #165).
        "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-[color,background-color,border-color,box-shadow] duration-control",
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "placeholder:text-muted-foreground",
        "hover:border-ring/60",
        "outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        // W2: a 44px floor under the opted-in coarse-pointer layer.
        "coarse:min-h-touch",
        // 44px (--control-h-touch). 16px text, not 14: iOS Safari zooms the
        // page on focus into any field whose text is under 16px, which is
        // exactly the device this size is for.
        sizeKey === "touch" && "h-control-touch px-3.5 text-base",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
