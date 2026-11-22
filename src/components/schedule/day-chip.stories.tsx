import type { Meta, StoryObj } from "@storybook/react";
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
 * `variant="pills"`: a full week in a phone-width slot stays on one line and
 * scrolls sideways.
 *
 * Base UI's composite root scrolls the checked chip into view on mount. It
 * measures the chip with `offsetLeft` summed up to the nearest positioned
 * ancestor (here `<body>`, as the scroller is not positioned), so the offset
 * includes the strip's page position, and that differs by Storybook's 16px
 * body padding depending on whether the padding is in effect at mount (a VRT
 * flake). The play waits for the fonts and realigns the checked chip to the
 * scroller's end from the final layout using rects, which do not depend on
 * where the strip sits on the page, so every capture starts from the same
 * offset.
 */
export const FullWeekNarrow: Story = {
  play: async ({ canvasElement }) => {
    await document.fonts.ready;
    const strip = canvasElement.querySelector<HTMLElement>("[data-week-strip]")!;
    const checked = strip.querySelector<HTMLElement>('[aria-checked="true"]')!;
    // The checked chip's right edge in the scroller's content, plus the
    // scroller's own padding (room for the focus ring).
    const right = checked.getBoundingClientRect().right - strip.getBoundingClientRect().left + strip.scrollLeft;
    const pad = parseFloat(getComputedStyle(strip).paddingRight);
    strip.scrollTo({ left: Math.max(0, right + pad - strip.clientWidth), behavior: "instant" });
    // The checked day is fully inside the visible strip.
    const s = strip.getBoundingClientRect();
    const c = checked.getBoundingClientRect();
    await expect(c.left).toBeGreaterThanOrEqual(s.left);
    await expect(c.right).toBeLessThanOrEqual(s.right);
  },
  render: (args) => (
    <div className="w-[320px] max-w-full">
      <WeekStrip {...args} variant="pills" defaultValue="wed">
        {WEEK.map((day) => (
          <DayChip key={day.value} value={day.value} hasGap={day.gap}>
            {day.label}
          </DayChip>
        ))}
      </WeekStrip>
    </div>
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
