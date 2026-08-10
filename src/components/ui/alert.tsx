import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";

// Status variants carry a tinted surface as well as a coloured border and
// text (issue #174). Without a fill, the only status signal is hue — exactly
// the channel a colour-blind reader loses — so the tint is a redundant cue
// alongside the icon callers pass as the first child. This is `Badge`'s
// `tag-*` recipe (`bg-…/15 border-…/40 text-…`) at alert scale, with two
// deliberate departures:
//
//   * 8% rather than 15% fill. An alert is an order of magnitude more surface
//     than a pill, so the same alpha reads as a solid colour block. At 8%
//     every status text/surface pair still measures 6.1:1–9.0:1 in both
//     themes (worst case: light `destructive` on `--background`), well clear
//     of the 4.5:1 floor.
//   * The border stays at full strength instead of dropping to /40. Measured
//     over the new tint, a /40 border falls to 1.8:1–2.2:1 — that is the same
//     invisible-boundary failure issue #161 was filed about, and this
//     component is named in it. Full strength keeps the edge at 6.1:1–9.0:1.
const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground [&>svg~*]:pl-7",
  {
    variants: {
      variant: {
        // `bg-muted`, not `bg-background`: the default alert used to have no
        // fill difference from the page it sat on and a 1.23:1 edge, so it
        // did not read as a container at all (issue #161). `bg-muted` also
        // separates from `--card`, which `bg-card` would not.
        default: "bg-muted text-foreground",
        destructive: "border-destructive bg-destructive/8 text-destructive [&>svg]:text-destructive",
        info: "border-info bg-info/8 text-info [&>svg]:text-info",
        success: "border-success bg-success/8 text-success [&>svg]:text-success",
        warning: "border-warning bg-warning/8 text-warning [&>svg]:text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />;
}

// `leading-tight`, not `leading-none`: at line-height 1 a title that wraps to
// a second line has its ascenders and descenders touching (issue #167).
function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return (
    <h5
      data-slot="alert-title"
      className={cn("mb-1 font-semibold leading-tight tracking-tight", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="alert-description" className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />;
}

export { Alert, AlertDescription, AlertTitle, alertVariants };
