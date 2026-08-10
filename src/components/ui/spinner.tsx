import { cva, type VariantProps } from "class-variance-authority";
import { Circle, LoaderCircle } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

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
 * Reduced motion — the rotation is not merely stopped, it is REPLACED. The
 * default mark is a three-quarter arc whose entire meaning is carried by the
 * rotation; frozen, it reads as a rendering glitch rather than "pending". So
 * under `prefers-reduced-motion: reduce` the arc is swapped for a complete,
 * dimmed ring: a still frame that is legible as a deliberate placeholder,
 * matching the visual language of the equally static `Skeleton`. The swap is
 * pure CSS (`motion-reduce:`), so it is SSR-safe and cannot hydrate wrong,
 * and the announcement is unaffected — `role="status"` carries the state for
 * assistive technology in both cases, which is what makes dropping the
 * animation acceptable rather than merely quieter.
 *
 * Removing the infinite rotation is also what settles WCAG 2.2.2 (Pause,
 * Stop, Hide): nothing here moves for more than five seconds.
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
      <LoaderCircle data-slot="spinner-mark" aria-hidden className="size-full animate-spin motion-reduce:hidden" />
      <Circle data-slot="spinner-mark-static" aria-hidden className="hidden size-full opacity-60 motion-reduce:block" />
      {decorative ? null : <span className="sr-only">{label}</span>}
    </span>
  );
}

export { Spinner, spinnerVariants };
