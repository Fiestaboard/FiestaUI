import type { Meta, StoryObj } from "@storybook/react";

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

/** A full week in a phone-width slot stays on one line and scrolls sideways. */
export const FullWeekNarrow: Story = {
  render: (args) => (
    <div className="w-[320px] max-w-full">
      <WeekStrip {...args} defaultValue="wed">
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
