"use client";

import * as React from "react";

import { cn } from "../../lib/utils";
import {
  SegmentedControl,
  SegmentedControlItem,
  type SegmentedControlItemProps,
  type SegmentedControlProps,
} from "../forms/toggle-card";

/**
 * WeekStrip and DayChip: the Schedule's day picker (slice 1.8d, C24).
 *
 * The web goalpost (07d Schedule · Day `322:19169`) draws the strip as a
 * row of touch-size SegmentedControl pills labelled "Thu 5", so these are
 * that radiogroup, not a new look: one tab stop, arrow keys, the shared
 * selected pigment. The strip stays on one line and scrolls sideways when
 * the week does not fit.
 *
 * The one thing borrowed from native 06 (`FB / Day chip` `31:115`) is the
 * **gap dot**: a day with a stretch no entry covers gets a small warning
 * dot, and its name gains ", has a gap" so the state is never colour alone.
 * 06's stacked weekday over a date disc is the native drawing (Jev
 * `segmented_07d`, p 0.97; DD-W53).
 */

type WeekStripProps = SegmentedControlProps;

function WeekStrip({ size = "touch", className, ...props }: WeekStripProps) {
  return (
    <SegmentedControl
      data-week-strip=""
      size={size}
      layout="inline"
      wrap={false}
      // p-1 / -m-1: room inside the scroller for the 3px focus ring.
      className={cn("-m-1 max-w-[calc(100%+0.5rem)] overflow-x-auto p-1", className)}
      {...props}
    />
  );
}

interface DayChipProps extends SegmentedControlItemProps {
  /** Marks a day with a gap: a warning dot, and `gapLabel` in its name. */
  hasGap?: boolean;
  /** Appended to the name of a gap day. @default "has a gap" */
  gapLabel?: string;
}

function DayChip({ hasGap = false, gapLabel = "has a gap", children, ...props }: DayChipProps) {
  return (
    <SegmentedControlItem data-gap={hasGap ? "" : undefined} {...props}>
      {children}
      {hasGap ? (
        <>
          <span data-slot="day-chip-gap" aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
          <span className="sr-only">, {gapLabel}</span>
        </>
      ) : null}
    </SegmentedControlItem>
  );
}

export { DayChip, WeekStrip };
export type { DayChipProps, WeekStripProps };
