import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Button } from "../forms/button";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-ring aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary-hover",
        // The tile survives here and dies on Button, deliberately. A Badge is
        // not an operable component, so SC 1.4.11 does not reach it — it is
        // content, governed by its 8.84:1 board-ink label. The `border-primary`
        // rim is gone: post-split it would draw a rim of the fill's own colour.
        brand: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary-hover",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "border-transparent bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        variable:
          "bg-tag-variable/15 border-tag-variable/30 text-tag-variable-foreground font-mono [a&]:hover:bg-tag-variable/25",
        success:
          "bg-tag-success/15 border-tag-success/40 text-tag-success-foreground font-mono [a&]:hover:bg-tag-success/25",
        formula:
          "bg-tag-formula/15 border-tag-formula/30 text-tag-formula-foreground font-mono [a&]:hover:bg-tag-formula/25",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    /**
     * Renders a trailing dismiss button that the badge owns (#249).
     *
     * The badge itself stays non-interactive — it is content — so this
     * nests exactly one control inside it and the call site nests none.
     * That is the point: the three FiestaBoard sites this replaces each put
     * their own `X` button inside a `Badge`, which is what #240 catalogued
     * and what the overflow note below is about.
     *
     * Incompatible with `asChild`, which hands the rendered element to the
     * caller and leaves nowhere to put the button.
     */
    onDismiss?: () => void;
    /**
     * Localized accessible name for the dismiss button, e.g. "Remove Weather".
     * REQUIRED with `onDismiss`: an X glyph names nothing, and per the
     * package's i18n rule this ships no copy of its own.
     */
    dismissLabel?: string;
  };

function Badge({ className, variant, asChild = false, children, onDismiss, dismissLabel, ref, ...props }: BadgeProps) {
  const dismissible = onDismiss !== undefined && !asChild;

  return useRender({
    defaultTagName: "span",
    ref: ref as React.Ref<HTMLSpanElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "badge",
      className: cn(
        badgeVariants({ variant }),
        dismissible && [
          // `overflow-hidden` on the root is what clipped both the nested
          // button (taller than its 20px host) and `.focus-ring`, whose
          // indicator is an outward box-shadow and is therefore erased
          // entirely by an overflow-hidden ancestor. It is lifted here and
          // re-applied to the LABEL below, so long tag text still clips to
          // the pill — the reason it was there — while the button's ring
          // escapes.
          "overflow-visible",
          // 24px button in a 20px pill does not fit. py-1 at text-xs gives
          // 26px, the same geometry Chip uses for the same SC 2.5.8 reason.
          // The trailing padding shrinks because the button brings its own.
          "py-1 pe-1 gap-1",
        ],
        className,
      ),
      ...(asChild
        ? {}
        : {
            children: dismissible ? (
              <>
                {/* Carries the clipping the root gave up. min-w-0 so it can
                    actually shrink inside the flex row rather than pushing
                    the button out of the pill. */}
                <span data-slot="badge-label" className="min-w-0 overflow-hidden text-ellipsis">
                  {children}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  data-slot="badge-dismiss"
                  aria-label={dismissLabel}
                  onClick={onDismiss}
                  // The badge's own palette already sets the ink; the ghost
                  // fill would otherwise wash a coloured pill with --accent.
                  className="hover:bg-black/10 dark:hover:bg-white/15 -me-px shrink-0 text-current"
                >
                  <X aria-hidden="true" />
                </Button>
              </>
            ) : (
              children
            ),
          }),
      ...props,
    },
  });
}

export { Badge, badgeVariants };
