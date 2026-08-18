"use client";

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle";
import { ToggleGroup as ToggleGroupPrimitive } from "@base-ui/react/toggle-group";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import type { SelectionGroupNameProps } from "./toggle-card";

/* ------------------------------------------------------------------ *
 * Toggle / ToggleGroup — the toolbar's "button that can be ON" (#218).
 *
 * How this differs from SegmentedControl / ToggleCardGroup, which look
 * similar and already exist (see the manifesto in toggle-card.tsx):
 *
 *   • Those are RADIOGROUPS: arrow keys move AND select, and the selection
 *     can never be emptied. Right for "pick a device type".
 *   • These are TOGGLE BUTTONS (`aria-pressed`): the ARIA toolbar model.
 *     In a group, arrow keys only MOVE the roving focus — Space/Enter/click
 *     commits — so a keyboard user can traverse an editor toolbar without
 *     re-aligning the document at every stop. A single-select group may
 *     also become empty (press the pressed item again), which a radiogroup
 *     cannot express, and `multiple` allows any-of-N (bold + italic).
 *
 * If your control is one-of-N where something must ALWAYS be selected,
 * use SegmentedControl; if deselection or multi-select is meaningful,
 * use ToggleGroup. Both are deliberate, per the toggle-card manifesto.
 *
 * Base UI supplies the behaviour: `aria-pressed` and a native <button> on
 * every Toggle, `role="group"` + roving tabindex (one tab stop, arrow keys
 * with wrap, all four arrows) on ToggleGroup, and group→item disabled
 * inheritance. The wrapper adds what the twelve hand-rolled call sites kept
 * forgetting: the focus ring, disabled styling, a pressed fill that cannot
 * be omitted, and — via the required name props — a group that cannot ship
 * without an accessible name.
 *
 * Both components live in one file (like ToggleCard + SegmentedControl) so
 * the group→item styling context below stays module-private instead of
 * becoming exported API surface.
 * ------------------------------------------------------------------ */

const toggleVariants = cva(
  [
    "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    "transition-[color,background-color,border-color,box-shadow] duration-control focus-ring",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    // ON is Button `default`, verbatim: the same bg-primary/board-ink pair
    // (8.84:1) and the same STATED hover/active tokens (label 10.78:1
    // hovered, 7.04:1 pressed) — inherited from button.tsx, where the
    // ratios were measured and an alpha hover was rejected for compositing
    // below AA. Living in the base rather than per-variant is the point of
    // the component: no variant can exist without a pressed fill.
    "data-[pressed]:bg-primary data-[pressed]:text-primary-foreground",
    "data-[pressed]:hover:bg-primary-hover data-[pressed]:active:bg-primary-active",
  ],
  {
    variants: {
      // OFF-state chrome only; the ON fill above is shared. Hovers are
      // guarded with `not-data-[pressed]:` (the guard Tabs and ToggleCard
      // already use) so the unpressed hover can never fight the pressed
      // hover for cascade order.
      variant: {
        // Button `ghost` — a toolbar toggle is flat until it is on.
        default: [
          "bg-transparent",
          "not-data-[pressed]:hover:bg-accent not-data-[pressed]:hover:text-accent-foreground",
          "dark:not-data-[pressed]:hover:bg-accent/50",
        ],
        // Button `outline`, including its dark surface/boundary treatment.
        // The pressed rim adopts the fill's own colour: keeping --input
        // would draw a grey halo around the orange tile, and dropping the
        // border would shift the box size by 1px between states.
        outline: [
          "border bg-background shadow-xs",
          "not-data-[pressed]:hover:bg-accent not-data-[pressed]:hover:text-accent-foreground",
          "dark:border-input dark:not-data-[pressed]:bg-card dark:not-data-[pressed]:hover:bg-muted",
          "data-[pressed]:border-primary",
        ],
      },
      // Narrower paddings than Button (px-2 vs px-4 at the default size):
      // toggles are icon-first toolbar controls, and Button's label paddings
      // balloon a 16px glyph into a pill. `min-w` mirrors the height so a
      // lone icon stays square, and every size clears WCAG 2.2 SC 2.5.8's
      // 24×24 target minimum (smallest is 32px).
      size: {
        default: "h-9 min-w-9 px-2",
        sm: "h-8 min-w-8 px-1.5",
        lg: "h-10 min-w-10 px-2.5",
        icon: "size-9",
        "icon-sm": "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export type ToggleProps = Omit<React.ComponentProps<typeof TogglePrimitive>, "onPressedChange"> &
  VariantProps<typeof toggleVariants> & {
    /**
     * Fired with the next pressed state. Base UI passes `(pressed,
     * eventDetails)`; the extra argument is dropped here for the same
     * reason toggle-card.tsx drops it — it leaks into
     * `onPressedChange={setState}` call sites.
     */
    onPressedChange?: (pressed: boolean) => void;
  };

/** Segmented-frame geometry the group hands each item. Module-private. */
interface ToggleGroupStyleContextValue {
  segmented: boolean;
  orientation: "horizontal" | "vertical";
}

const ToggleGroupStyleContext = React.createContext<ToggleGroupStyleContextValue | null>(null);

/**
 * A two-state button — `aria-pressed`, pressed fill and focus ring included,
 * so none of them can be forgotten at a call site (#218).
 *
 * Standalone it owns its pressed state (`pressed`/`defaultPressed`); inside a
 * {@link ToggleGroup} it is driven by the group's `value` and MUST carry a
 * `value` prop of its own (Base UI warns in dev if it doesn't).
 */
function Toggle({ className, variant = "default", size = "default", onPressedChange, ...props }: ToggleProps) {
  const group = React.useContext(ToggleGroupStyleContext);

  return (
    <TogglePrimitive
      data-slot="toggle"
      data-variant={variant}
      data-size={size}
      onPressedChange={(pressed) => onPressedChange?.(pressed)}
      className={cn(
        toggleVariants({ variant, size }),
        // Inside a segmented frame the item surrenders its own chrome — the
        // FRAME carries the border and radius. cn()'s tailwind-merge makes
        // these later classes drop the conflicting earlier ones
        // deterministically, instead of leaving two same-specificity
        // utilities to a stylesheet-order coin toss.
        //
        // `focus-visible:z-10` lifts the focused item's ring above its
        // siblings (flex items honour z-index without `position`); the
        // group's `isolate` keeps that above-ness inside the frame.
        //
        // End caps are the frame radius minus its 1px border, so the
        // pressed fill follows the inner curve instead of squaring off the
        // frame's corners.
        //
        // Divider hairlines are drawn by the item's leading edge in --input
        // — the 3:1 control-boundary token, not decorative --border,
        // because the edge between two segments is exactly the "where does
        // one control end" information SC 1.4.11 protects. Measured over
        // the pressed --primary fill (scratchpad script, sRGB compositing):
        // light 3.04:1, dark 1.26:1 — in dark the near-white hairline all
        // but vanishes on the orange, and that is fine, because there the
        // fill itself bounds the segment at 9.03:1 against the frame's
        // bg-card. In light the roles swap: fill vs card is only 2.00:1
        // (the same field-vs-page ratio every default Button has), and the
        // 3.04:1 hairline carries the edge. Each theme keeps one boundary
        // cue above 3:1; `aria-pressed` carries the state regardless.
        // `rounded-[0px]`, not `rounded-none`: the radius-role lint bans
        // off-scale corners but deliberately leaves arbitrary values open for
        // true one-offs, and a segment seam is one — zero is the ABSENCE of a
        // corner, not an off-scale one, and the outer corners rejoin the
        // control role below at radius-md minus the frame's border.
        group?.segmented && [
          "rounded-[0px] border-0 shadow-none focus-visible:z-10",
          group.orientation === "vertical"
            ? [
                "not-first:border-t not-first:border-input",
                "first:rounded-t-[calc(var(--radius-md)-1px)] last:rounded-b-[calc(var(--radius-md)-1px)]",
              ]
            : [
                "not-first:border-l not-first:border-input",
                "first:rounded-l-[calc(var(--radius-md)-1px)] last:rounded-r-[calc(var(--radius-md)-1px)]",
              ],
        ],
        className,
      )}
      {...props}
    />
  );
}

const toggleGroupVariants = cva("flex w-fit items-center", {
  variants: {
    segmented: {
      // The loose default: independent toggles that happen to sit together.
      false: "gap-1",
      // The joined toolbar look the two alignment clusters hand-build today
      // out of `rounded-md border overflow-hidden` + per-child `border-x`
      // fixups. The frame wears Button-outline's surface treatment
      // (bg-background light / bg-card dark, --input boundary) so it reads
      // as one control on any surface. No `overflow-hidden` — it would clip
      // the focus ring's outward box-shadow; the items round their own end
      // caps instead.
      true: "isolate rounded-md border border-input bg-background shadow-xs dark:bg-card",
    },
    orientation: {
      horizontal: "flex-row",
      vertical: "flex-col items-stretch",
    },
  },
  defaultVariants: {
    segmented: false,
    orientation: "horizontal",
  },
});

export type ToggleGroupProps = Omit<React.ComponentProps<typeof ToggleGroupPrimitive>, "onValueChange"> &
  // A `role="group"` of controls needs a name just as much as the
  // radiogroups do — reuse toggle-card's "cannot ship nameless" contract.
  SelectionGroupNameProps &
  VariantProps<typeof toggleGroupVariants> & {
    /** Fired with the values of all pressed items (eventDetails dropped). */
    onValueChange?: (groupValue: string[]) => void;
    /**
     * Joined toolbar look: one shared border, hairline dividers, items
     * stripped of their own chrome. Off, items sit loose with a small gap.
     */
    segmented?: boolean;
  };

/**
 * Shared state for a set of {@link Toggle}s — one tab stop, roving focus.
 *
 * The value model is Base UI's: always an array of the pressed items'
 * values, single-select by default (`multiple` opts into any-of-N). The
 * issue sketched Radix's `type="single" | "multiple"` with a
 * `string | string[]` value instead; that union forks every controlled call
 * site into runtime narrowing, and the empty single-selection ("none of
 * these") falls out of the array shape for free, so Base UI's model stands.
 *
 * Single-select here CAN be emptied by pressing the pressed item again. If
 * your group must always have a selection, that is a radiogroup — use
 * SegmentedControl (toggle-card.tsx).
 */
function ToggleGroup({
  className,
  segmented = false,
  orientation = "horizontal",
  onValueChange,
  ...props
}: ToggleGroupProps) {
  const context = React.useMemo<ToggleGroupStyleContextValue>(
    () => ({ segmented, orientation }),
    [segmented, orientation],
  );

  return (
    <ToggleGroupStyleContext.Provider value={context}>
      <ToggleGroupPrimitive
        data-slot="toggle-group"
        data-segmented={segmented ? "" : undefined}
        orientation={orientation}
        onValueChange={(groupValue) => onValueChange?.(groupValue)}
        className={cn(toggleGroupVariants({ segmented, orientation }), className)}
        {...props}
      />
    </ToggleGroupStyleContext.Provider>
  );
}

export { Toggle, ToggleGroup, toggleGroupVariants, toggleVariants };
