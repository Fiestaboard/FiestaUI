import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import tacoLoader from "./assets/taco-loader.png?inline";
import tacoSprite from "./assets/taco-loader-sprite.webp?inline";

/**
 * Size scale is pinned to the button heights it sits inside, so a spinner
 * never has to be hand-sized at the call site:
 *
 *   sm  14px  Button size="sm"  / "icon-sm"  (h-8)
 *   md  16px  Button size="default" / "icon" (h-9) — matches the 16px icon
 *             slot every other Button icon lands in
 *   lg  20px  Button size="lg"  / "icon-lg"  (h-10)
 */
const spinnerVariants = cva("inline-block shrink-0 align-middle", {
  variants: {
    size: {
      sm: "size-3.5",
      md: "size-4",
      lg: "size-5",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface SpinnerProps
  extends Omit<React.ComponentProps<"span">, "children">, VariantProps<typeof spinnerVariants> {
  /**
   * Text announced to assistive technology via `role="status"`. Pass `null`
   * for a purely decorative spinner — used when an ancestor already carries
   * the busy semantics (e.g. `<Button loading>`, which owns `aria-busy` and
   * whose accessible name must stay stable).
   */
  label?: string | null;
}

/**
 * Indeterminate progress indicator.
 *
 * CSS plays the original taco frames and timing. Reduced motion, `.reduce-motion`, or
 * an ancestor's `data-motion="off"` replaces it with a still pose. Both marks
 * are decorative; the status announcement is unchanged. Keeping motion in
 * CSS also makes the component safe to render on the server.
 *
 * The image is embedded by the library build, so hosts need no public asset
 * path or copy step. Import theme.css for the animation and motion switches.
 */
function Spinner({ className, size = "md", label = "Loading", ...props }: SpinnerProps) {
  const decorative = label === null;
  return (
    <span
      data-slot="spinner"
      role={decorative ? undefined : "status"}
      aria-hidden={decorative || undefined}
      className={cn(spinnerVariants({ size }), className)}
      {...props}
    >
      <span
        aria-hidden
        data-slot="spinner-mark"
        className="fiesta-spinner-hop block size-full motion-reduce:hidden"
        style={{ backgroundImage: `url(${tacoSprite})` }}
      />
      <img
        src={tacoLoader}
        alt=""
        aria-hidden
        draggable={false}
        data-slot="spinner-mark-static"
        className="hidden size-full object-contain motion-reduce:block"
      />
      {decorative ? null : <span className="sr-only">{label}</span>}
    </span>
  );
}

export { Spinner, spinnerVariants };
