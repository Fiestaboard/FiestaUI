"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Check } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import type { SelectionGroupBaseProps, SelectionGroupNameProps } from "./selection-group";
import { SegmentedControl, SegmentedControlItem } from "./toggle-card";

/* ------------------------------------------------------------------ *
 * DurationChipGroup — "how long should this stay up?" (C15, WEB-11).
 *
 * CANON: one DurationChipGroup everywhere — 15 min · 1 hr · Until 9:00 PM ·
 * Until I cancel — shared by Compose a message and Change Page, paired with
 * the outcome line ("Holds until 9:00 PM, then Schedule resumes").
 *
 * Built ON SegmentedControl: the radiogroup, roving tabindex, arrow keys and
 * Home/End are SegmentedControl's, untouched. Only the chip's skin differs,
 * because Figma draws the duration chip as its own component (07a
 * `Web / Duration chip` 302:1954): a 44 px pill, card fill with the input
 * border at rest, and when selected the foreground fill with background ink
 * and a check glyph — "inverted like the nav active pill". That skin lives
 * here as an exported recipe (`durationChipVariants`) and is handed to
 * SegmentedControlItem through `className`, which `cn` merges over the stock
 * classes; no call site restyles a chip.
 * ------------------------------------------------------------------ */

/** One chip. `durationMs` is set for the fixed timed chips; the rest are resolved by the caller. */
export interface DurationOption {
  value: string;
  label: React.ReactNode;
  /** Length of a fixed timed chip, for callers that compute `endsAt`. */
  durationMs?: number;
  disabled?: boolean;
}

export interface DurationOptionLabels {
  fifteenMinutes: string;
  oneHour: string;
  untilCancel: string;
}

export const DEFAULT_DURATION_OPTION_LABELS: DurationOptionLabels = {
  fifteenMinutes: "15 min",
  oneHour: "1 hr",
  untilCancel: "Until I cancel",
};

/**
 * CANON's chip set. `nextChange` is the label of the chip that holds until
 * the Schedule's next change (H2), e.g. "Until 9:00 PM"; it is left out when
 * the Schedule has nothing next. Values are stable: `15m`, `1h`,
 * `next-change`, `until-cancel`.
 */
export function buildDurationOptions({
  nextChange,
  labels,
}: { nextChange?: React.ReactNode; labels?: Partial<DurationOptionLabels> } = {}): DurationOption[] {
  const l = { ...DEFAULT_DURATION_OPTION_LABELS, ...labels };
  const options: DurationOption[] = [
    { value: "15m", label: l.fifteenMinutes, durationMs: 15 * 60_000 },
    { value: "1h", label: l.oneHour, durationMs: 60 * 60_000 },
  ];
  if (nextChange != null && nextChange !== false) options.push({ value: "next-change", label: nextChange });
  options.push({ value: "until-cancel", label: l.untilCancel });
  return options;
}

/**
 * Layout of the chips (Figma `Layout=Row|Grid`):
 *   • row — one row of hugging pills (the desktop dialog), wrapping if needed;
 *   • grid — 2 × 2, chips fill their cell (the phone sheet, 350 wide);
 *   • auto — grid below `sm`, row from `sm` up. A viewport breakpoint, not a
 *     container query: `container-type` collapses the group inside a
 *     shrink-to-fit parent (the 1.7a StatusBanner lesson).
 */
const durationChipGroupVariants = cva("gap-2", {
  variants: {
    layout: {
      row: "flex flex-wrap items-center",
      grid: "grid w-full grid-cols-2",
      auto: "flex flex-wrap items-center max-sm:grid max-sm:w-full max-sm:grid-cols-2",
    },
  },
  defaultVariants: { layout: "auto" },
});

/**
 * The Duration chip skin, merged over SegmentedControlItem's stock classes.
 * Height binds to the 44 px touch token (`--control-h-touch`, 1.1): Figma
 * draws the chip at 44 on every breakpoint. Padding is Figma's 16 / 18.
 */
const durationChipVariants = cva([
  "h-(--control-h-touch) rounded-full pl-4 pr-4.5 gap-1.5 text-sm font-medium",
  "border-input bg-card text-foreground",
  "data-[checked]:border-foreground data-[checked]:bg-foreground data-[checked]:text-background",
]);

type DurationChipGroupLayout = NonNullable<VariantProps<typeof durationChipGroupVariants>["layout"]>;

export type DurationChipGroupProps = SelectionGroupBaseProps &
  SelectionGroupNameProps & {
    /** The chips, in order. Use {@link buildDurationOptions} for CANON's set. */
    options: DurationOption[];
    /** @default "auto" */
    layout?: DurationChipGroupLayout;
    /**
     * The outcome sentence for the current choice, e.g. "Holds until 9:00 PM
     * (2h 44m), then Schedule resumes with Good night." It renders under the
     * chips as a polite live region, so a new choice is read out, and it
     * describes the radiogroup. The caller writes it: the web never computes
     * the Schedule client-side (H2).
     */
    outcome?: React.ReactNode;
    "aria-describedby"?: string;
    className?: string;
    /** Classes for the radiogroup row itself. */
    groupClassName?: string;
  };

function DurationChipGroup({
  options,
  layout = "auto",
  outcome,
  value,
  defaultValue = null,
  onValueChange,
  className,
  groupClassName,
  "aria-describedby": describedBy,
  ...props
}: DurationChipGroupProps) {
  const outcomeId = React.useId();
  const [uncontrolled, setUncontrolled] = React.useState<string | null>(defaultValue);
  const controlled = value !== undefined;
  const selected = controlled ? value : uncontrolled;
  const hasOutcome = outcome != null && outcome !== false;
  const describedByIds = [describedBy, hasOutcome ? outcomeId : undefined].filter(Boolean).join(" ") || undefined;

  const handleValueChange = (next: string) => {
    if (!controlled) setUncontrolled(next);
    onValueChange?.(next);
  };

  return (
    <div data-slot="duration-chip-group" data-layout={layout} className={cn("flex flex-col gap-3", className)}>
      <SegmentedControl
        {...props}
        value={selected}
        onValueChange={handleValueChange}
        aria-describedby={describedByIds}
        className={cn(durationChipGroupVariants({ layout }), groupClassName)}
      >
        {options.map((option) => (
          <SegmentedControlItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            className={durationChipVariants()}
          >
            {option.value === selected && <Check data-slot="duration-chip-check" aria-hidden="true" />}
            {option.label}
          </SegmentedControlItem>
        ))}
      </SegmentedControl>
      {hasOutcome && (
        <OutcomeLine id={outcomeId} size="sm" aria-live="polite">
          {outcome}
        </OutcomeLine>
      )}
    </div>
  );
}

const outcomeLineVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      /** 14/20: under the chips in the Change Page dialog (07a 310:27278). */
      sm: "text-sm leading-5",
      /** 16/24: on the Home card under the countdown (07a 303:22566). */
      md: "text-base leading-6",
    },
  },
  defaultVariants: { size: "md" },
});

export type OutcomeLineProps = React.ComponentProps<"p"> & VariantProps<typeof outcomeLineVariants>;

/**
 * The outcome sentence: what happens, and what happens after. CANON copy is
 * "Holds until 9:00 PM, then Schedule resumes" ("Holds…" with no subject);
 * "Until I cancel" reads "Holds until you cancel or Change Page again".
 * Static by default; DurationChipGroup makes its own copy a live region.
 */
function OutcomeLine({ className, size = "md", ...props }: OutcomeLineProps) {
  return (
    <p data-slot="outcome-line" data-size={size} className={cn(outcomeLineVariants({ size }), className)} {...props} />
  );
}

export { DurationChipGroup, durationChipGroupVariants, durationChipVariants, OutcomeLine, outcomeLineVariants };
