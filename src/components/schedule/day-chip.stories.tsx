import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { expect } from "storybook/test";

import { DayChip, WeekStrip } from "./day-chip";

/*
 * WeekStrip + DayChip (slice 1.8d, C24). Web goalpost: 07d Schedule · Day
 * `322:19169` (touch SegmentedControl pills). The gap dot is 06 `31:115`.
 * 08 C24 `65:30041`.
 */
const meta = {
  title: "Schedule/WeekStrip",
  component: WeekStrip,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { "aria-label": "Day" },
} satisfies Meta<typeof WeekStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

const WEEK = [
  { value: "sun", label: "Sun 8" },
  { value: "mon", label: "Mon 9", gap: true },
  { value: "tue", label: "Tue 10" },
  { value: "wed", label: "Wed 11", gap: true },
  { value: "thu", label: "Thu 12" },
  { value: "fri", label: "Fri 13" },
  { value: "sat", label: "Sat 14" },
];

/** 07d's five-day strip, Sunday selected. */
export const Default: Story = {
  render: (args) => (
    <div className="w-full sm:w-[358px]">
      <WeekStrip {...args} defaultValue="sun">
        <DayChip value="thu">Thu 5</DayChip>
        <DayChip value="fri">Fri 6</DayChip>
        <DayChip value="sat">Sat 7</DayChip>
        <DayChip value="sun">Sun 8</DayChip>
        <DayChip value="mon">Mon 9</DayChip>
      </WeekStrip>
    </div>
  ),
};

/** Days with a gap carry the dot (and ", has a gap" in their name), selected or not. */
export const WithGaps: Story = {
  render: (args) => (
    <div className="w-full sm:w-[560px]">
      <WeekStrip {...args} defaultValue="mon">
        {WEEK.map((day) => (
          <DayChip key={day.value} value={day.value} hasGap={day.gap}>
            {day.label}
          </DayChip>
        ))}
      </WeekStrip>
    </div>
  ),
};

/**
 * The phone frame (07d `322:19169`): five days on one tray in 358px — the
 * caller passes the days that fit; a tray does not scroll (BB-FC-4).
 */
export const FiveDaysPhone: Story = {
  render: (args) => (
    <div className="w-[358px] max-w-full">
      <WeekStrip {...args} defaultValue={WEEK[3].value}>
        {WEEK.slice(0, 5).map((day) => (
          <DayChip key={day.value} value={day.value} hasGap={day.gap}>
            {day.label}
          </DayChip>
        ))}
      </WeekStrip>
    </div>
  ),
};

/**
 * Keeps the checked chip of a pills strip aligned to the scroller's end, from
 * the strip's final layout, whenever that layout changes.
 *
 * Two things made the captured offset depend on timing (a VRT flake):
 * - Base UI's composite root scrolls the checked chip into view on mount. It
 *   sums `offsetLeft` up to the nearest positioned ancestor (`<body>`, as the
 *   scroller is not positioned), so its offset includes the strip's page
 *   position, which differs by Storybook's 16px body padding depending on
 *   whether that padding is in effect at mount.
 * - At a phone viewport the `max-w-full` slot is capped by the preview's
 *   padded `<main>` (311px at 390), and that cap can land after the first
 *   alignment, narrowing the strip under a fixed scroll offset (the checked
 *   chip then sat 9px past the edge).
 *
 * Aligning from rects on every resize of the strip (and once the fonts are in)
 * makes the resting offset a function of the final layout alone.
 */
function StripEndAligned({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const strip = ref.current!.querySelector<HTMLElement>("[data-week-strip]")!;
    const align = () => alignCheckedToEnd(strip);
    const observer = new ResizeObserver(align);
    observer.observe(strip);
    void document.fonts.ready.then(align);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="w-[320px] max-w-full">
      {children}
    </div>
  );
}

/** Scroll so the checked chip's right edge, plus the scroller's padding (room for the focus ring), meets the end. */
function alignCheckedToEnd(strip: HTMLElement) {
  const checked = strip.querySelector<HTMLElement>('[aria-checked="true"]');
  if (!checked) return;
  const right = checked.getBoundingClientRect().right - strip.getBoundingClientRect().left + strip.scrollLeft;
  const pad = parseFloat(getComputedStyle(strip).paddingRight);
  strip.scrollTo({ left: Math.max(0, right + pad - strip.clientWidth), behavior: "instant" });
}

/**
 * `variant="pills"`: a full week in a phone-width slot stays on one line and
 * scrolls sideways, with the checked day (Wed) at the end of the strip. See
 * StripEndAligned for why the story pins that offset.
 */
export const FullWeekNarrow: Story = {
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    const strip = canvasElement.querySelector<HTMLElement>("[data-week-strip]")!;
    alignCheckedToEnd(strip);
    // The checked day is fully inside the visible strip.
    const checked = strip.querySelector<HTMLElement>('[aria-checked="true"]')!;
    const s = strip.getBoundingClientRect();
    const c = checked.getBoundingClientRect();
    await expect(c.left).toBeGreaterThanOrEqual(s.left);
    await expect(c.right).toBeLessThanOrEqual(s.right);
  },
  render: (args) => (
    <StripEndAligned>
      <WeekStrip {...args} variant="pills" defaultValue="wed">
        {WEEK.map((day) => (
          <DayChip key={day.value} value={day.value} hasGap={day.gap}>
            {day.label}
          </DayChip>
        ))}
      </WeekStrip>
    </StripEndAligned>
  ),
};

/** The desktop toolbar size (`size="md"`), for a strip beside other controls. */
export const Compact: Story = {
  render: (args) => (
    <WeekStrip {...args} size="md" defaultValue="tue">
      {WEEK.map((day) => (
        <DayChip key={day.value} value={day.value} hasGap={day.gap}>
          {day.label}
        </DayChip>
      ))}
    </WeekStrip>
  ),
};
