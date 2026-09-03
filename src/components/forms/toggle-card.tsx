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

/**
 * The selected-check, in both of its placements. `absolute` corner vs in-flow
 * trailing is the only difference, so the pigment recipe, the size and the
 * `group-data-[checked]` reveal live here once rather than twice.
 */
const toggleCardIndicatorClassName =
  "pointer-events-none flex size-4 items-center justify-center rounded-full border border-input text-primary-foreground opacity-0 transition-[color,background-color,border-color,opacity] duration-control group-data-[checked]/toggle-card:border-primary group-data-[checked]/toggle-card:bg-primary group-data-[checked]/toggle-card:opacity-100";

type ToggleCardSize = NonNullable<VariantProps<typeof toggleCardVariants>["size"]>;
type ToggleCardAlign = NonNullable<VariantProps<typeof toggleCardVariants>["align"]>;
type ToggleCardIndicator = boolean | "corner" | "trailing";

/** `true` is the corner check the family shipped with; `false` is no check. */
function resolveIndicatorPlacement(indicator: ToggleCardIndicator): "corner" | "trailing" | null {
  if (indicator === true) return "corner";
  if (indicator === false) return null;
  return indicator;
}

interface ToggleCardGroupContextValue {
  size?: ToggleCardSize;
  align?: ToggleCardAlign;
  indicator?: ToggleCardIndicator;
}

const ToggleCardGroupContext = React.createContext<ToggleCardGroupContextValue | null>(null);

export type ToggleCardGroupProps = SelectionGroupBaseProps &
  SelectionGroupNameProps &
  VariantProps<typeof toggleCardGroupVariants> & {
    /** Size applied to every card in the group; a card may override it. */
    size?: ToggleCardSize;
    /** Content alignment applied to every card in the group. */
    align?: ToggleCardAlign;
    /**
     * Selected-check placement for every card in the group; a card may
     * override it. `false` removes it. @default true
     */
    indicator?: ToggleCardIndicator;
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
     * Where the selected-check goes, so selection is never carried by hue
     * alone. `"corner"` (=== `true`) floats it over the tile's top-right and
     * reserves the space a long title would otherwise slide under;
     * `"trailing"` puts it in flow at the end of the title row, which is the
     * shape a full-width picker row wants. `false` removes it — only do that
     * when the tile shows its own selected artwork. @default true
     */
    indicator?: ToggleCardIndicator;
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
  const indicatorPlacement = resolveIndicatorPlacement(indicator ?? group?.indicator ?? true);

  const indicatorNode = indicatorPlacement && (
    <span
      data-slot="toggle-card-indicator"
      data-placement={indicatorPlacement}
      aria-hidden="true"
      className={cn(
        toggleCardIndicatorClassName,
        // A trailing check is a row participant, so it needs no absolute
        // position and no reserved corner; `mt-0.5` puts it on the title's
        // optical baseline, matching the leading icon.
        indicatorPlacement === "corner" ? "absolute right-2 top-2" : "mt-0.5 shrink-0",
      )}
    >
      <Check className="size-3" />
    </span>
  );

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
        // padding only the right would push its content off-centre. A
        // trailing check is in flow and takes its own room, so it reserves
        // nothing.
        indicatorPlacement === "corner" && (resolvedAlign === "center" ? "px-6" : "pr-8"),
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
        {indicatorPlacement === "trailing" && indicatorNode}
      </span>
      {children}
      {indicatorPlacement === "corner" && indicatorNode}
    </SelectableItemRoot>
  );
}

/* ------------------------------------------------------------------ *
 * SegmentedControl — the compact pill/toolbar flavour of the same idea.
 * ------------------------------------------------------------------ */

/*
 * The layout axis (#241). Two shapes for one radiogroup:
 *
 *   • "inline" — a row of pills that hug their labels. The toolbar shape, and
 *     the default: changing it would re-flow every shipped call site.
 *   • "grid" — equal-width cells that stretch to fill the row. What a settings
 *     panel wants, where two-to-four options of unequal label length otherwise
 *     produce a ragged row of differently-sized targets and the pill an eye
 *     lands on is whichever word is longest.
 *
 * `columns` uses FIXED `grid-cols-N`, deliberately NOT ToggleCardGroup's
 * responsive `grid-cols-1 sm:grid-cols-2` collapse: these cells hold two or
 * three words inside an already-narrow settings panel, so a one-up stack at
 * phone width would be a full-width button per option — the shape the grid
 * exists to avoid. Do not "unify" the two.
 */
const segmentedControlVariants = cva("gap-2", {
  variants: {
    layout: {
      inline: "flex items-center",
      grid: "grid w-full items-stretch",
    },
    // `columns` and `wrap` each belong to exactly one layout, so both are
    // carried by the compound variants below rather than emitting a class
    // string the other layout would silently ignore: `grid-cols-*` does
    // nothing to a flex row and `flex-wrap` does nothing to a grid.
    columns: {
      "2": "",
      "3": "",
      "4": "",
    },
    wrap: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { layout: "grid", columns: "2", class: "grid-cols-2" },
    { layout: "grid", columns: "3", class: "grid-cols-3" },
    { layout: "grid", columns: "4", class: "grid-cols-4" },
    { layout: "inline", wrap: true, class: "flex-wrap" },
    { layout: "inline", wrap: false, class: "flex-nowrap" },
  ],
  defaultVariants: {
    layout: "inline",
    columns: "2",
    wrap: true,
  },
});

const segmentedControlItemVariants = cva(
  [
    "group/segmented-item cursor-pointer items-center justify-center gap-1.5",
    "border border-input bg-transparent font-medium text-foreground",
    "transition-[color,background-color,border-color,box-shadow] duration-control outline-none",
    "not-data-[checked]:hover:border-primary/50 not-data-[checked]:hover:bg-accent",
    "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    // Selected pills carry a little more fill than a ToggleCard (primary/10 vs
    // primary/5): the tinted area is a tenth the size, so the lighter wash
    // reads as "no fill at all" at pill scale.
    //
    // The LABEL is --brand, not --primary, and the difference is not cosmetic
    // (#304). --primary is the literal #f5a623 tile: theme.css calls it "legal
    // as a field, illegal as a link", and over this tint it composited to
    // 1.72:1 on a light page against SC 1.4.3's 4.5:1 (axe measures the same
    // pixels at 1.71). --brand is the same hue at the ink plateau, so the pill
    // looks the same and reads at 4.78:1 light / 8.39:1 dark. The border and
    // the fill stay --primary — a boundary and a field are graphics, and 1.4.3
    // does not reach them. Measured in both themes by
    // scripts/ci/tests/theme-contrast.test.mjs section 5.
    "data-[checked]:border-primary data-[checked]:bg-primary/10 data-[checked]:text-brand",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      // Height is a compound of size x layout below: an inline pill is a fixed
      // h-*, a grid cell is a min-h-* floor so a two-line label can grow.
      size: {
        sm: "rounded-md px-2.5 text-xs",
        md: "rounded-md px-3 text-sm",
        lg: "rounded-md px-4 text-sm",
      },
      layout: {
        inline: "inline-flex whitespace-nowrap",
        // A cell fills its grid column, so the label has to be allowed to wrap
        // (no `whitespace-nowrap`) and centred as text, not just as a flex line.
        grid: "flex w-full text-center",
      },
    },
    compoundVariants: [
      // 28/32/36px. h-7 (28px) clears WCAG 2.2 SC 2.5.8's 24x24 target minimum
      // even at the compact size (issue #164).
      { layout: "inline", size: "sm", class: "h-7" },
      { layout: "inline", size: "md", class: "h-8" },
      { layout: "inline", size: "lg", class: "h-9" },
      // Same rank values as a floor rather than a height, plus the vertical
      // padding a wrapped second line needs — a stretched cell that kept `h-8`
      // would clip its own label the moment the grid narrowed.
      { layout: "grid", size: "sm", class: "min-h-7 py-1.5" },
      { layout: "grid", size: "md", class: "min-h-8 py-1.5" },
      { layout: "grid", size: "lg", class: "min-h-9 py-2" },
    ],
    defaultVariants: {
      size: "md",
      layout: "inline",
    },
  },
);

type SegmentedControlSize = NonNullable<VariantProps<typeof segmentedControlItemVariants>["size"]>;
type SegmentedControlLayout = NonNullable<VariantProps<typeof segmentedControlVariants>["layout"]>;
type SegmentedControlColumns = NonNullable<VariantProps<typeof segmentedControlVariants>["columns"]>;

interface SegmentedControlContextValue {
  size?: SegmentedControlSize;
  layout?: SegmentedControlLayout;
}

const SegmentedControlContext = React.createContext<SegmentedControlContextValue | null>(null);

export type SegmentedControlProps = SelectionGroupBaseProps &
  SelectionGroupNameProps &
  // `layout` and `columns` are re-declared below so they can carry their own
  // documentation; VariantProps supplies the rest of the axis (`wrap`).
  Omit<VariantProps<typeof segmentedControlVariants>, "layout" | "columns"> & {
    /** Size applied to every item; an item may override it. */
    size?: SegmentedControlSize;
    /**
     * `"inline"` is a row of pills that hug their labels — the toolbar shape.
     * `"grid"` gives equal-width cells that stretch to fill the row, so the
     * options read as one control instead of a ragged row of differently
     * sized targets. Set per group, never per item. @default "inline"
     */
    layout?: SegmentedControlLayout;
    /**
     * Column count for `layout="grid"`, fixed at every viewport (the cells do
     * not collapse to one-up on a phone). Ignored — and unstamped — in the
     * inline row. @default "2"
     */
    columns?: SegmentedControlColumns;
    className?: string;
    children?: React.ReactNode;
  } & Omit<React.ComponentProps<"div">, "defaultValue" | "onChange">;

/**
 * Compact single-select pill row — the toolbar-scale sibling of
 * {@link ToggleCardGroup}, with the same `radiogroup` semantics.
 *
 * `layout="grid"` swaps the hugging row for equal-width cells; it is a layout
 * axis only. Selection semantics, the roving tabindex, the selected pigment
 * and the focus ring are identical in both shapes.
 */
function SegmentedControl({
  className,
  size,
  layout = "inline",
  columns = "2",
  wrap,
  children,
  ...props
}: SegmentedControlProps) {
  const context = React.useMemo<SegmentedControlContextValue>(() => ({ size, layout }), [size, layout]);

  return (
    <SegmentedControlContext.Provider value={context}>
      <SelectionGroupRoot
        slot="segmented-control"
        data-layout={layout}
        // Only meaningful under the grid; a column count on a hugging row
        // would advertise a structure the row does not have.
        data-columns={layout === "grid" ? columns : undefined}
        className={cn(segmentedControlVariants({ layout, columns, wrap }), className)}
        {...props}
      >
        {children}
      </SelectionGroupRoot>
    </SegmentedControlContext.Provider>
  );
}

export type SegmentedControlItemProps = Omit<React.ComponentProps<"button">, "value"> &
  // `layout` is deliberately not a per-item prop: one cell opting out of the
  // grid breaks the equal-width row it sits in. It comes from the group.
  Omit<VariantProps<typeof segmentedControlItemVariants>, "layout"> & {
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
  // A standalone pill (a filter chip) has no grid to fill, so it stays inline.
  const resolvedLayout = group?.layout ?? "inline";

  return (
    <SelectableItemRoot
      grouped={group !== null}
      value={value}
      pressed={pressed}
      onPressedChange={onPressedChange}
      data-slot="segmented-control-item"
      data-size={resolvedSize}
      data-layout={resolvedLayout}
      className={cn(segmentedControlItemVariants({ size: resolvedSize, layout: resolvedLayout }), className)}
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
