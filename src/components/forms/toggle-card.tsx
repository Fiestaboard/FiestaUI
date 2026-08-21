"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import {
  SelectableItemRoot,
  type SelectionGroupBaseProps,
  type SelectionGroupNameProps,
  SelectionGroupRoot,
} from "./selection-group";

/* ------------------------------------------------------------------ *
 * Selection semantics — the one decision this file exists to settle.
 *
 * A "selectable option" has TWO different accessibility contracts and the
 * apps consuming this package currently mix them for the same visual:
 *
 *   • One of N (pick a device type, a page, an animation preset) is a RADIO
 *     GROUP: role="radiogroup" wrapping role="radio" + aria-checked, ONE tab
 *     stop for the whole group (roving tabindex), arrow keys move AND select,
 *     and the selection can never be emptied by the keyboard.
 *   • A standalone on/off control (a filter chip, "show previews") is a
 *     TOGGLE BUTTON: aria-pressed on a plain button, its own tab stop, Space
 *     or Enter flips it.
 *
 * `aria-pressed` on twelve tiles that behave as one-of-N is the bug: screen
 * readers announce twelve independent toggles with no group, no position
 * ("2 of 4"), and twelve tab stops. So the mode here is structural, not a
 * prop: an item rendered inside `ToggleCardGroup` / `SegmentedControl` is a
 * radio; the same item rendered on its own with `pressed` is a toggle
 * button. Nothing at a call site can pick the wrong one.
 *
 * The radio behaviour (roving tabindex, arrow-key wrap, focus/selection
 * sync, hidden inputs for form submission) comes from Base UI's
 * RadioGroup/Radio rather than a hand-rolled keydown handler.
 *
 * Multi-select ("any of N") is deliberately NOT a group: render standalone
 * `pressed` items inside your own `<fieldset>`/`role="group"` container —
 * each one is then correctly its own toggle with its own tab stop.
 * ------------------------------------------------------------------ */

/**
 * The radiogroup root and the radio-or-toggle item root now live in
 * `./selection-group` — SwatchGroup (#245) is the third family that needs
 * them, so they are shared internal machinery rather than module-private
 * here. The two prop types are re-exported so the public surface (and
 * `toggle.tsx`'s import) is unchanged.
 */
export type { SelectionGroupBaseProps, SelectionGroupNameProps };

/* ------------------------------------------------------------------ *
 * ToggleCard — the large selectable tile.
 * ------------------------------------------------------------------ */

const toggleCardGroupVariants = cva("gap-3", {
  variants: {
    columns: {
      "1": "flex flex-col",
      "2": "grid grid-cols-1 sm:grid-cols-2",
      "3": "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    },
  },
  defaultVariants: {
    columns: "1",
  },
});

const toggleCardVariants = cva(
  [
    // `group/toggle-card` is what lets the icon and the check indicator react
    // to the root's checked state in CSS, so neither branch of
    // SelectableItemRoot has to thread a boolean down.
    "group/toggle-card relative flex w-full cursor-pointer flex-col border border-input bg-transparent",
    // box-shadow rides the transition so the focus ring eases in rather than
    // snapping — the timing Button and Input already declare (issue #165).
    "transition-[color,background-color,border-color,box-shadow] duration-control outline-none",
    // Hover is scoped to UNCHECKED cards (`not-data-[checked]:`) so it can
    // never dim or recolour the selected one — same guard Tabs uses.
    "not-data-[checked]:hover:border-primary/50 not-data-[checked]:hover:bg-accent/50",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    // --primary is this system's single "this control is on" pigment, shared
    // with Checkbox, Switch and the Slider indicator (issue #159). The apps
    // spell selection three ways — primary/5, primary/10 and brand/10 — and
    // this is the one that wins; --brand stays a marketing/emphasis colour.
    "data-[checked]:border-primary data-[checked]:bg-primary/5",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      size: {
        sm: "gap-1.5 rounded-md p-2 text-xs",
        md: "gap-2 rounded-lg p-3 text-sm",
        lg: "gap-2.5 rounded-xl px-4 py-3.5 text-sm",
      },
      align: {
        start: "text-left",
        center: "text-center",
      },
    },
    defaultVariants: {
      size: "md",
      align: "start",
    },
  },
);

const toggleCardHeaderVariants = cva("flex w-full min-w-0", {
  variants: {
    align: {
      start: "flex-row items-start gap-3",
      center: "flex-col items-center gap-1.5",
    },
  },
  defaultVariants: {
    align: "start",
  },
});

type ToggleCardSize = NonNullable<VariantProps<typeof toggleCardVariants>["size"]>;
type ToggleCardAlign = NonNullable<VariantProps<typeof toggleCardVariants>["align"]>;

interface ToggleCardGroupContextValue {
  size?: ToggleCardSize;
  align?: ToggleCardAlign;
  indicator?: boolean;
}

const ToggleCardGroupContext = React.createContext<ToggleCardGroupContextValue | null>(null);

export type ToggleCardGroupProps = SelectionGroupBaseProps &
  SelectionGroupNameProps &
  VariantProps<typeof toggleCardGroupVariants> & {
    /** Size applied to every card in the group; a card may override it. */
    size?: ToggleCardSize;
    /** Content alignment applied to every card in the group. */
    align?: ToggleCardAlign;
    /** Show the selected-check on every card in the group. @default true */
    indicator?: boolean;
    className?: string;
    children?: React.ReactNode;
  } & Omit<React.ComponentProps<"div">, "defaultValue" | "onChange">;

/**
 * Single-select group of {@link ToggleCard}s — a real `radiogroup`.
 *
 * One tab stop for the whole group; arrow keys move the selection and wrap.
 * Cards inside it take their state from the group's `value`, so they need a
 * `value` of their own and must NOT be given `pressed`.
 */
function ToggleCardGroup({ className, columns, size, align, indicator, children, ...props }: ToggleCardGroupProps) {
  const context = React.useMemo<ToggleCardGroupContextValue>(
    () => ({ size, align, indicator }),
    [size, align, indicator],
  );

  return (
    <ToggleCardGroupContext.Provider value={context}>
      <SelectionGroupRoot
        slot="toggle-card-group"
        className={cn(toggleCardGroupVariants({ columns }), className)}
        {...props}
      >
        {children}
      </SelectionGroupRoot>
    </ToggleCardGroupContext.Provider>
  );
}

export type ToggleCardProps = Omit<React.ComponentProps<"button">, "value" | "title"> &
  VariantProps<typeof toggleCardVariants> & {
    /** Identifies the card inside a {@link ToggleCardGroup}. */
    value?: string;
    /** Standalone toggle state — only outside a group. Pair with `onPressedChange`. */
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
    /** Leading icon (a lucide element); sized to 16px unless it sets its own. */
    icon?: React.ReactNode;
    /** Primary label. Provides the card's accessible name. */
    title?: React.ReactNode;
    /** Secondary line under the title. */
    description?: React.ReactNode;
    /** Trailing content on the title row — a badge, a size indicator, a price. */
    meta?: React.ReactNode;
    /**
     * Render a check in the corner when selected, so selection is not carried
     * by hue alone. @default true
     */
    indicator?: boolean;
    /** Extra body content below the title row — a preview, a thumbnail row. */
    children?: React.ReactNode;
  };

/**
 * A large selectable tile: optional icon, title, description and preview
 * body.
 *
 * Inside a {@link ToggleCardGroup} it is a `radio` (`aria-checked`, roving
 * tabindex, arrow-key navigation). On its own, with `pressed`, it is a
 * toggle button (`aria-pressed`). See the note at the top of this file.
 */
function ToggleCard({
  className,
  size,
  align,
  value,
  pressed,
  onPressedChange,
  icon,
  title,
  description,
  meta,
  indicator,
  children,
  ...props
}: ToggleCardProps) {
  const group = React.useContext(ToggleCardGroupContext);
  const resolvedSize = size ?? group?.size ?? "md";
  const resolvedAlign = align ?? group?.align ?? "start";
  const showIndicator = indicator ?? group?.indicator ?? true;

  return (
    <SelectableItemRoot
      grouped={group !== null}
      value={value}
      pressed={pressed}
      onPressedChange={onPressedChange}
      data-slot="toggle-card"
      data-size={resolvedSize}
      className={cn(
        toggleCardVariants({ size: resolvedSize, align: resolvedAlign }),
        // Reserve the corner the indicator floats in so a long title cannot
        // slide under it. A centred tile reserves the space on BOTH sides —
        // padding only the right would push its content off-centre.
        showIndicator && (resolvedAlign === "center" ? "px-6" : "pr-8"),
        className,
      )}
      {...props}
    >
      <span data-slot="toggle-card-header" className={toggleCardHeaderVariants({ align: resolvedAlign })}>
        {icon != null && (
          <span
            data-slot="toggle-card-icon"
            className={cn(
              "flex shrink-0 items-center text-muted-foreground transition-colors duration-control group-data-[checked]/toggle-card:text-primary",
              resolvedAlign === "start" && "mt-0.5",
            )}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        {(title != null || description != null) && (
          <span data-slot="toggle-card-body" className="flex min-w-0 flex-1 flex-col gap-1">
            {title != null && (
              <span data-slot="toggle-card-title" className="font-medium">
                {title}
              </span>
            )}
            {description != null && (
              <span data-slot="toggle-card-description" className="text-xs font-normal text-muted-foreground">
                {description}
              </span>
            )}
          </span>
        )}
        {meta != null && (
          <span data-slot="toggle-card-meta" className="shrink-0 text-muted-foreground">
            {meta}
          </span>
        )}
      </span>
      {children}
      {showIndicator && (
        <span
          data-slot="toggle-card-indicator"
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-2 flex size-4 items-center justify-center rounded-full border border-input text-primary-foreground opacity-0 transition-[color,background-color,border-color,opacity] duration-control group-data-[checked]/toggle-card:border-primary group-data-[checked]/toggle-card:bg-primary group-data-[checked]/toggle-card:opacity-100"
        >
          <Check className="size-3" />
        </span>
      )}
    </SelectableItemRoot>
  );
}

/* ------------------------------------------------------------------ *
 * SegmentedControl — the compact pill/toolbar flavour of the same idea.
 * ------------------------------------------------------------------ */

const segmentedControlVariants = cva("flex items-center gap-2", {
  variants: {
    wrap: {
      true: "flex-wrap",
      false: "flex-nowrap",
    },
  },
  defaultVariants: {
    wrap: true,
  },
});

const segmentedControlItemVariants = cva(
  [
    "group/segmented-item inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap",
    "border border-input bg-transparent font-medium text-foreground",
    "transition-[color,background-color,border-color,box-shadow] duration-control outline-none",
    "not-data-[checked]:hover:border-primary/50 not-data-[checked]:hover:bg-accent",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    // Selected pills carry a little more fill than a ToggleCard (primary/10 vs
    // primary/5): the tinted area is a tenth the size, so the lighter wash
    // reads as "no fill at all" at pill scale.
    "data-[checked]:border-primary data-[checked]:bg-primary/10 data-[checked]:text-primary",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      size: {
        // h-7 (28px) clears WCAG 2.2 SC 2.5.8's 24x24 target minimum even at
        // the compact size (issue #164).
        sm: "h-7 rounded-md px-2.5 text-xs",
        md: "h-8 rounded-md px-3 text-sm",
        lg: "h-9 rounded-md px-4 text-sm",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type SegmentedControlSize = NonNullable<VariantProps<typeof segmentedControlItemVariants>["size"]>;

interface SegmentedControlContextValue {
  size?: SegmentedControlSize;
}

const SegmentedControlContext = React.createContext<SegmentedControlContextValue | null>(null);

export type SegmentedControlProps = SelectionGroupBaseProps &
  SelectionGroupNameProps &
  VariantProps<typeof segmentedControlVariants> & {
    /** Size applied to every item; an item may override it. */
    size?: SegmentedControlSize;
    className?: string;
    children?: React.ReactNode;
  } & Omit<React.ComponentProps<"div">, "defaultValue" | "onChange">;

/**
 * Compact single-select pill row — the toolbar-scale sibling of
 * {@link ToggleCardGroup}, with the same `radiogroup` semantics.
 */
function SegmentedControl({ className, size, wrap, children, ...props }: SegmentedControlProps) {
  const context = React.useMemo<SegmentedControlContextValue>(() => ({ size }), [size]);

  return (
    <SegmentedControlContext.Provider value={context}>
      <SelectionGroupRoot
        slot="segmented-control"
        className={cn(segmentedControlVariants({ wrap }), className)}
        {...props}
      >
        {children}
      </SelectionGroupRoot>
    </SegmentedControlContext.Provider>
  );
}

export type SegmentedControlItemProps = Omit<React.ComponentProps<"button">, "value"> &
  VariantProps<typeof segmentedControlItemVariants> & {
    /** Identifies the item inside a {@link SegmentedControl}. */
    value?: string;
    /** Standalone toggle state — only outside a SegmentedControl. */
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
  };

/**
 * One pill. Inside a {@link SegmentedControl} it is a `radio`; on its own
 * with `pressed` it is an `aria-pressed` toggle (a filter chip).
 */
function SegmentedControlItem({
  className,
  size,
  value,
  pressed,
  onPressedChange,
  children,
  ...props
}: SegmentedControlItemProps) {
  const group = React.useContext(SegmentedControlContext);
  const resolvedSize = size ?? group?.size ?? "md";

  return (
    <SelectableItemRoot
      grouped={group !== null}
      value={value}
      pressed={pressed}
      onPressedChange={onPressedChange}
      data-slot="segmented-control-item"
      data-size={resolvedSize}
      className={cn(segmentedControlItemVariants({ size: resolvedSize }), className)}
      {...props}
    >
      {children}
    </SelectableItemRoot>
  );
}

export {
  SegmentedControl,
  SegmentedControlItem,
  segmentedControlItemVariants,
  segmentedControlVariants,
  ToggleCard,
  ToggleCardGroup,
  toggleCardGroupVariants,
  toggleCardVariants,
};
