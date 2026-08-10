import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-control disabled:pointer-events-none disabled:opacity-50 data-[loading]:cursor-progress [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        brand:
          "bg-brand-emphasis text-brand-foreground shadow-sm hover:bg-brand-emphasis/85 focus-visible:ring-brand/30",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
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
