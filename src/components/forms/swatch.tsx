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
 * SwatchGroup / Swatch — the colour-only one-of-N picker (#245).
 *
 * WHAT IT IS. A row of round filled circles where the swatch IS the option:
 * no label beside it, the fill is the choice. FiestaBoard hand-rolls three
 * copies of this (page-builder, display-settings, wizard/step-board-setup),
 * differing only in diameter and ring width.
 *
 * WHY IT IS NOT ToggleCard OR SegmentedControl. Those two are the shipped
 * one-of-N controls and this deliberately does not extend either, because
 * they express selection by recolouring the option's own border and fill —
 * `data-[checked]:border-primary data-[checked]:bg-primary/5` on a tile,
 * `bg-primary/10` on a pill. A swatch has NO content and its fill IS the
 * payload: wash `--primary` over it and you have destroyed the thing the
 * user is picking. So the selected state has to live entirely OUTSIDE the
 * fill, which is a different structural contract, not a variant of theirs.
 * (It is still a selection control, so it lives in `forms/` beside them and
 * shares their radiogroup machinery — see `./selection-group`.)
 *
 * ACCESSIBILITY CONTRACT. Identical to ToggleCard's, and inherited from the
 * same primitives rather than re-argued: grouped is `role="radiogroup"` of
 * `role="radio"` with one tab stop, arrows that move AND select with wrap,
 * and Home/End; standalone with `pressed` is an `aria-pressed` button with
 * its own tab stop. The mode is structural, never a prop. All three
 * hand-rolled copies get this wrong in the same way — `aria-pressed` on a
 * one-of-N choice, so a screen reader hears N unrelated toggles with no
 * group and no "1 of 3", and every swatch is its own tab stop.
 *
 * Because the control has no text at all, `label` is REQUIRED and is the
 * swatch's only accessible name. It is not derivable: "#0d0d0d" is a value,
 * not a name, and `title` is not an accessible name a keyboard user can
 * reach. Per the package's i18n rule this package ships no copy of its own,
 * so the caller supplies the already-localized string.
 *
 * THREE ELEMENTS, THREE JOBS — the layout is the design, not decoration:
 *
 *   <button>      the target. transparent, p-1 gutter, carries `.focus-ring`.
 *     <span fill> the payload. background = the caller's `color`; carries
 *                 the selection ring, which sits outside its edge.
 *       <span>    the check disc — the non-colour cue.
 *
 * The split is load-bearing and must not be collapsed: Tailwind's `ring-*`
 * compiles to `box-shadow` and `.focus-ring` sets `box-shadow` directly, so
 * on one element the two silently erase each other. On two elements, one
 * gutter apart, both survive and neither is mistaken for the fill.
 *
 * COLOUR DECISIONS, with numbers:
 *
 *   • Selection ring is `--foreground`, NOT `--primary`, which is this
 *     package's usual "this control is on" pigment (#159). `--ring` IS
 *     `--primary`, so a `--primary` selection ring would be the same
 *     pigment as the focus ring, 4px away, on the same circle — one thicker
 *     orange band meaning two different things. `--primary` is also 1.83:1
 *     on a light page, which is why `theme.css` restricts it to fills and
 *     icons and why it cannot carry a state at hairline weight.
 *     `--foreground` is unambiguous against every surface and against every
 *     arbitrary caller-supplied fill, and stays distinguishable from the
 *     orange focus band in greyscale. The pigment link to the rest of the
 *     system is preserved by the check disc below.
 *   • The check disc IS `--primary` with a `--primary-foreground` glyph
 *     (board ink, 8.84:1 — measured in theme.css). Its contrast is against
 *     itself, so it is legal over ANY colour the caller passes, which no
 *     fill-relative choice would be. `ring-1 ring-background` separates it
 *     from an orange or white fill. It is what stops selection being
 *     carried by "which one has a ring" alone.
 *   • The fill keeps a permanent 1px `--input` boundary in EVERY state.
 *     Permanent twice over: `#fafafa` on `--card` is otherwise invisible
 *     and SC 1.4.11 needs the control's extent legible (`--input` is the
 *     3:1 control-boundary token — 3.55/3.62 light, 3.51/3.56 dark against
 *     `--background`/`--card`), and a boundary that appeared only when
 *     selected would read as the selected state.
 *
 * TARGET SIZE. #245 proposes sm 20px / md 24px / lg 32px. Taken as target
 * sizes, `sm` fails WCAG 2.2 SC 2.5.8 (24×24 minimum) and `md` only ties
 * it. Those numbers ship here as FILL DIAMETERS inside a padded button: the
 * `p-1` gutter yields 28 / 32 / 40px targets, all clear of the floor, and
 * the same gutter is where `ring-offset-2 ring-2` draws. The visible circle
 * is the size the issue asked for; the thing a finger has to hit is bigger.
 *
 * REJECTED: a `ring` size/width prop to reconcile the three copies'
 * `ring-1` vs `ring-2`. That divergence is the bug, not an API — one ring
 * weight, chosen once.
 * ------------------------------------------------------------------ */

const swatchGroupVariants = cva(
  [
    // gap-2 (8px) is the floor, not a default: at anything tighter the
    // selection ring of one swatch and the focus ring of its neighbour
    // touch, and two different signals merge into one band.
    "flex items-center gap-2",
  ],
  {
    variants: {
      wrap: {
        true: "flex-wrap",
        false: "flex-nowrap",
      },
    },
    defaultVariants: {
      wrap: true,
    },
  },
);

const swatchVariants = cva(
  [
    // `group/swatch` is how the fill and the check disc read the root's
    // checked state in CSS, so neither branch of SelectableItemRoot has to
    // thread a boolean down (same trick as toggle-card).
    "group/swatch inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full",
    // The button itself is invisible: it is a hit target and a focus-ring
    // carrier, nothing else. `p-1` is the 4px gutter the selection ring and
    // its offset draw into.
    "bg-transparent p-1",
    // `focus-ring` (never a hand-rolled ring-*): this element must keep its
    // box-shadow free for the shared two-tone focus recipe.
    "focus-ring transition-[box-shadow,opacity] duration-control",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      size: {
        // Target sizes, all ≥ 24×24 (WCAG 2.2 SC 2.5.8): fill + 2 × 4px.
        sm: "size-7",
        md: "size-8",
        lg: "size-10",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const swatchFillVariants = cva(
  [
    "pointer-events-none flex items-center justify-center rounded-full",
    // Permanent control boundary — see the header note; a white swatch on a
    // light card has no other edge.
    "border border-input",
    // The selection ring, outside the fill and never recolouring it. Offset
    // against --background so the ring reads as separate from the payload.
    "ring-offset-2 ring-offset-background transition-[box-shadow] duration-control",
    "group-data-[checked]/swatch:ring-2 group-data-[checked]/swatch:ring-foreground",
  ],
  {
    variants: {
      size: {
        sm: "size-5",
        md: "size-6",
        lg: "size-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const swatchIndicatorVariants = cva(
  [
    // --primary disc + board-ink glyph: contrast is against itself, so it is
    // legal over any colour the caller supplies. ring-1 ring-background
    // keeps it off an orange or white fill.
    "pointer-events-none flex items-center justify-center rounded-full bg-primary text-primary-foreground",
    "ring-1 ring-background opacity-0 transition-opacity duration-control",
    "group-data-[checked]/swatch:opacity-100",
  ],
  {
    variants: {
      size: {
        sm: "size-3 [&_svg]:size-2",
        md: "size-3.5 [&_svg]:size-2.5",
        lg: "size-4 [&_svg]:size-3",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

type SwatchSize = NonNullable<VariantProps<typeof swatchVariants>["size"]>;

interface SwatchGroupContextValue {
  size?: SwatchSize;
}

const SwatchGroupContext = React.createContext<SwatchGroupContextValue | null>(null);

export type SwatchGroupProps = SelectionGroupBaseProps &
  SelectionGroupNameProps &
  VariantProps<typeof swatchGroupVariants> & {
    /** Diameter applied to every swatch in the group; a swatch may override it. */
    size?: SwatchSize;
    className?: string;
    children?: React.ReactNode;
  } & Omit<React.ComponentProps<"div">, "defaultValue" | "onChange">;

/**
 * Single-select group of {@link Swatch}es — a real `radiogroup`.
 *
 * One tab stop for the whole group; arrow keys move the selection and wrap,
 * Home/End jump to the ends, and the selection can never be emptied (a board
 * always has a colour). Swatches inside it take their state from the group's
 * `value`, so they need a `value` of their own and must NOT be given
 * `pressed`.
 *
 * The group needs its own accessible name ("Board colour") and the type
 * requires it: swatch labels do not compose into one, and a nameless
 * radiogroup fails axe.
 *
 * A wrapped group keeps Base UI's LINEAR arrow-key order — Up/Down step by
 * one, not by the column count. Row-aware movement is only correct with a
 * fixed column count, which a `flex-wrap` palette does not have; a ±1
 * Up/Down that pretends otherwise is the half-measure `editor/color-picker-
 * content.tsx` already regretted. Use a fixed-column grid via `className`
 * only if you are prepared to own that arithmetic.
 */
function SwatchGroup({ className, size, wrap, children, ...props }: SwatchGroupProps) {
  const context = React.useMemo<SwatchGroupContextValue>(() => ({ size }), [size]);

  return (
    <SwatchGroupContext.Provider value={context}>
      <SelectionGroupRoot slot="swatch-group" className={cn(swatchGroupVariants({ wrap }), className)} {...props}>
        {children}
      </SelectionGroupRoot>
    </SwatchGroupContext.Provider>
  );
}

export type SwatchProps = Omit<React.ComponentProps<"button">, "aria-label" | "children" | "color" | "value"> &
  VariantProps<typeof swatchVariants> & {
    /**
     * The colour being picked, as ANY CSS colour — a board-surface token
     * (`var(--color-board-surface-dark)`), a plugin colour-rule hue, or a
     * raw hex. It is applied as an inline `background-color`, which is the
     * only way an arbitrary runtime value can reach the DOM; Tailwind cannot
     * compile a class for a value it never sees.
     */
    color: string;
    /**
     * Localized accessible name — e.g. "Black", "Board white". REQUIRED: the
     * swatch renders no text, so this is its only name. Name the colour, not
     * its value; "#0d0d0d" is not a name.
     */
    label: string;
    /** Identifies the swatch inside a {@link SwatchGroup}. */
    value?: string;
    /**
     * Standalone toggle state — only outside a group. Pair with
     * `onPressedChange`. Leave undefined for a swatch that merely opens a
     * picker: it then gets no `aria-pressed` at all.
     */
    pressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
  };

/**
 * One colour circle. Inside a {@link SwatchGroup} it is a `radio`
 * (`aria-checked`, roving tabindex, arrow keys). On its own with `pressed`
 * it is an `aria-pressed` toggle button.
 *
 * Fill diameters are 20 / 24 / 32px at `sm` / `md` / `lg`; the button around
 * them is 28 / 32 / 40px, so every target clears WCAG 2.2 SC 2.5.8's 24×24
 * minimum. Selection shows as a `--foreground` ring outside the fill plus a
 * `--primary` check disc over it — never as a change to the fill, which is
 * the thing being picked.
 */
function Swatch({ className, size, value, color, label, pressed, onPressedChange, ...props }: SwatchProps) {
  const group = React.useContext(SwatchGroupContext);
  const resolvedSize = size ?? group?.size ?? "md";

  return (
    <SelectableItemRoot
      grouped={group !== null}
      value={value}
      pressed={pressed}
      onPressedChange={onPressedChange}
      aria-label={label}
      data-slot="swatch"
      data-size={resolvedSize}
      className={cn(swatchVariants({ size: resolvedSize }), className)}
      {...props}
    >
      <span
        data-slot="swatch-fill"
        // Decorative: the button's aria-label is the whole name, and neither
        // the fill nor the check adds anything a screen reader should hear.
        aria-hidden="true"
        style={{ backgroundColor: color }}
        className={swatchFillVariants({ size: resolvedSize })}
      >
        <span data-slot="swatch-indicator" className={swatchIndicatorVariants({ size: resolvedSize })}>
          <Check />
        </span>
      </span>
    </SelectableItemRoot>
  );
}

export { Swatch, swatchFillVariants, SwatchGroup, swatchGroupVariants, swatchIndicatorVariants, swatchVariants };
