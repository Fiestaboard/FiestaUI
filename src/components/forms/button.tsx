import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Spinner } from "../feedback/spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-control disabled:pointer-events-none disabled:opacity-50 data-[loading]:cursor-progress [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-ring aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        // No rim, no border, no ring standing in for one. --primary is the
        // literal #f5a623 tile with a board-ink label at 8.84:1 — better than
        // the white-on-#8f5d00 it replaces (5.63:1) — so the label carries the
        // control and the fill carries the brand.
        //
        // The hover is a stated token, not `bg-primary/90`. An alpha hover
        // composites toward the page, which measured 5.40 -> 4.46 on the field
        // and 5.97 -> 4.94 on the label, i.e. BELOW AA on hover. This one goes
        // the other way: the label reads 10.78:1 hovered, 7.04:1 pressed.
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active",
        // DEPRECATED — alias of `default` for one minor, then removed.
        // This existed to put the literal tile on a button while --primary was
        // a mustard. --primary IS the tile now, so `brand` and `default` are
        // the same button, and the `ring-1 ring-inset ring-primary` rim that
        // used to bound it would be a rim of the fill's own colour.
        brand: "bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active",
        destructive:
          // The destructive focus ring was ring-destructive/20 light and /40
          // dark, which composite to 1.34:1 and 1.97:1 — the control where a
          // mis-click costs most had the weakest focus indicator in the system.
          // It now uses the shared two-tone ring like everything else.
          "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        // The dark fill is a SURFACE token, not --input. --input now means
        // "control boundary" and carries a real 3:1 value (#161); reusing it
        // as a translucent fill both muddies that meaning and — at the new
        // lightness — roughly doubles the fill's weight. `dark:border-input`
        // is the legitimate use and stays. With a boundary that is actually
        // visible the fill no longer has to do the outlining, so it drops to
        // the plain surface token and the hover step does the lifting:
        // bg-card (oklch L .16) → bg-muted (L .20), a slightly LARGER step
        // than the translucent pair it replaces (L .179 → .209).
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-card dark:border-input dark:hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      // The second `has-…px-*` rule in each padded size is the loading mirror
      // of the first. While loading, the children move inside the label slot,
      // so `has-[>svg]` (a DIRECT svg child) stops matching and an icon+label
      // button would widen by 8px mid-interaction. The mirror looks through
      // the wrapper at the ORIGINAL children only — never at the spinner,
      // which sits in a sibling slot — so a text-only button keeps its wider
      // padding and an icon button keeps its tighter padding.
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3 has-[>[data-slot=button-loading]>[data-slot=button-label]>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5 has-[>[data-slot=button-loading]>[data-slot=button-label]>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4 has-[>[data-slot=button-loading]>[data-slot=button-label]>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>["size"]>;
type SpinnerSize = NonNullable<React.ComponentProps<typeof Spinner>["size"]>;

const SPINNER_SIZE_BY_BUTTON_SIZE: Record<ButtonSize, SpinnerSize> = {
  default: "md",
  icon: "md",
  sm: "sm",
  "icon-sm": "sm",
  lg: "lg",
  "icon-lg": "lg",
};

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  loading = false,
  children,
  onClick,
  ref,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /**
     * Busy state. Renders a {@link Spinner} over the label and marks the
     * button `aria-busy` + `aria-disabled` — deliberately NOT `disabled`,
     * which drops the button out of the tab order and silently moves focus
     * to <body> at the exact moment the user is waiting for feedback.
     *
     * With `asChild` the rendered element's content belongs to the caller, so
     * no spinner is injected; the busy semantics and the activation guard
     * still apply.
     */
    loading?: boolean;
  }) {
  // `aria-disabled` is advisory only: unlike `disabled` it does NOT stop the
  // element from being activated. Without this guard a second click — or
  // Enter/Space, or an implicit form submit, all of which dispatch a click —
  // would run the handler again and double-submit. preventDefault() also
  // cancels the implicit submit for a `type="submit"` button, and
  // stopPropagation() stops delegated ancestor handlers from seeing it.
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (loading) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  // The label stays in the DOM at `opacity-0` rather than `visibility:hidden`
  // or being replaced: it reserves its own width so nothing beside the button
  // shifts, AND — unlike a visibility-hidden or removed label — it stays in
  // the accessibility tree, so the button keeps its accessible name instead of
  // silently renaming itself to "Loading" mid-interaction.
  const content =
    loading && !asChild ? (
      <span
        data-slot="button-loading"
        className="grid grid-cols-1 grid-rows-1 items-center justify-items-center [gap:inherit]"
      >
        <span
          data-slot="button-label"
          className="col-start-1 row-start-1 inline-flex items-center [gap:inherit] opacity-0"
        >
          {children}
        </span>
        <span data-slot="button-spinner" className="col-start-1 row-start-1 inline-flex items-center">
          <Spinner size={SPINNER_SIZE_BY_BUTTON_SIZE[size ?? "default"]} label={null} />
        </span>
      </span>
    ) : (
      children
    );

  return useRender({
    defaultTagName: "button",
    ref: ref as React.Ref<HTMLButtonElement>,
    render: asChild ? (React.Children.only(children) as React.ReactElement) : undefined,
    props: {
      "data-slot": "button",
      "data-variant": variant,
      "data-size": size,
      className: cn(buttonVariants({ variant, size }), className),
      ...(asChild ? {} : { children: content }),
      ...props,
      ...(loading ? { "aria-busy": true, "aria-disabled": true, "data-loading": "" } : {}),
      onClick: handleClick,
    },
  });
}

export { Button, buttonVariants };
