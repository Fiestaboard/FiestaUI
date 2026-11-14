import type { Meta, StoryObj } from "@storybook/react";

import { ListRowGroup } from "../containment/list-row";
import { AgendaRow } from "./agenda-row";
import { DayChip, WeekStrip } from "./day-chip";

/*
 * AgendaRow (slice 1.8d, C24). Web goalpost: 07d Schedule · List (M)
 * `322:16890` and Schedule · Day (S) `322:19169`. Conflict: 06 `FB / Agenda
 * entry` `31:89` (07d's list draws none). 08 C24 `65:30041`.
 */
const meta = {
  title: "Schedule/AgendaRow",
  component: AgendaRow,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    kind: { control: "inline-radio", options: ["entry", "now", "gap", "conflict"] },
    title: { control: "text" },
    time: { control: "text" },
    detail: { control: "text" },
    status: { control: "text" },
    trailing: { control: false },
    render: { control: false },
  },
  args: { title: "Good night", time: "9:00 PM – 10:00 PM", detail: "Page" },
} satisfies Meta<typeof AgendaRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <ListRowGroup aria-label="Sunday" className="w-full sm:w-[400px]">
      <AgendaRow {...args} />
    </ListRowGroup>
  ),
};

/** The four kinds, as one day would show them. */
export const Kinds: Story = {
  render: () => (
    <ListRowGroup aria-label="Saturday" className="w-full sm:w-[400px]">
      <AgendaRow kind="now" title="Weekend brunch" time="9:00 AM – 12:00 PM" detail="Page" />
      <AgendaRow kind="conflict" title="Happy birthday Sam" time="11:00 AM – 2:00 PM" detail="Page · One-off" />
      <AgendaRow kind="gap" title="Good morning, Maya" time="2:00 PM – 9:00 PM" detail="Default page" />
      <AgendaRow kind="entry" title="Good night" time="9:00 PM – 10:00 PM" detail="Page" />
    </ListRowGroup>
  ),
};

/** 07d Schedule · Day (Mobile Chrome 390, `322:19169`): the strip and the day's rows, times only. */
export const MobileDay: Story = {
  render: () => (
    <div className="flex w-full flex-col gap-3 sm:w-[358px]">
      <WeekStrip aria-label="Day" defaultValue="sun">
        <DayChip value="thu">Thu 5</DayChip>
        <DayChip value="fri">Fri 6</DayChip>
        <DayChip value="sat">Sat 7</DayChip>
        <DayChip value="sun" hasGap>
          Sun 8
        </DayChip>
        <DayChip value="mon">Mon 9</DayChip>
      </WeekStrip>
      <ListRowGroup aria-label="Sunday">
        {[
          { kind: "now", title: "Weekend brunch", time: "9:00 AM – 1:00 PM" },
          { kind: "gap", title: "Good morning, Maya", time: "1:00 PM – 9:00 PM" },
          { kind: "entry", title: "Good night", time: "9:00 PM – 10:00 PM" },
          { kind: "entry", title: "Silence Schedule", time: "10:00 PM – 7:00 AM" },
        ].map((row) => (
          <li key={row.title}>
            <AgendaRow
              // eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content
              render={<a href={`#${row.title}`} />}
              kind={row.kind as "now" | "gap" | "entry"}
              title={row.title}
              time={row.time}
            />
          </li>
        ))}
      </ListRowGroup>
    </div>
  ),
};

/** 07d Schedule · List (900, `322:16890`): one group per day, each row says what fills it. */
export const WeekList: Story = {
  render: () => (
    <div className="flex w-full flex-col gap-3 sm:w-[560px]">
      <h3 className="font-mono text-xs text-muted-foreground uppercase">Today · Sunday</h3>
      <ListRowGroup aria-label="Today, Sunday">
        <AgendaRow kind="now" title="Weekend brunch" time="9:00 AM – 1:00 PM" detail="Page" />
        <AgendaRow kind="gap" title="Good morning, Maya" time="1:00 PM – 9:00 PM" detail="Default page" />
        <AgendaRow title="Good night" time="9:00 PM – 10:00 PM" detail="Page" />
      </ListRowGroup>
      <h3 className="font-mono text-xs text-muted-foreground uppercase">Monday</h3>
      <ListRowGroup aria-label="Monday">
        <AgendaRow title="Weekday mornings" time="6:00 AM – 9:00 AM" detail="Collection · Time-based rotation" />
        <AgendaRow title="Market open" time="9:00 AM – 12:00 PM" detail="Page" />
      </ListRowGroup>
    </div>
  ),
};

/** Long names wrap; the status word and chevron keep their place. */
export const LongTitle: Story = {
  render: () => (
    <ListRowGroup aria-label="Sunday" className="w-full sm:w-[320px]">
      <AgendaRow
        kind="now"
        title="Saturday farmers market specials and opening hours"
        time="9:00 AM – 1:00 PM"
        detail="Collection · Rules"
      />
      <AgendaRow
        kind="conflict"
        title="Happy birthday Sam, from everyone at Rosa's café"
        time="11:00 AM – 2:00 PM"
        detail="Page"
      />
    </ListRowGroup>
  ),
};
