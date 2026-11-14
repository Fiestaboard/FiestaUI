import type { Meta, StoryObj } from "@storybook/react";
import { ChevronRight, Trash2 } from "lucide-react";
import * as React from "react";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";

import { StaticBoardDisplay } from "../board/static-board-display";
import { Button } from "../forms/button";
import { WeekCalendar, type WeekCalendarDay, type WeekCalendarEntry } from "./week-calendar";
import { WeekCalendarInspector } from "./week-calendar-inspector";

/**
 * 08 P8 `65:31684` — "WeekCalendar (read + tap) + inspector pane; drag-to-create: pointer only".
 * The web goalpost is 07d `322:9978` (Schedule · Week · Conflict): Maya's Kitchen board, Nov 9–15,
 * with Happy birthday Sam selected and in conflict with Weekend brunch.
 */
const meta = {
  title: "Schedule/WeekCalendar",
  component: WeekCalendar,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { onSelect: fn() },
} satisfies Meta<typeof WeekCalendar>;

export default meta;
type Story = StoryObj<typeof meta>;

const H = 60;
const DAYS: WeekCalendarDay[] = [
  { id: "mon", label: "MON 9", name: "Monday, November 9" },
  { id: "tue", label: "TUE 10", name: "Tuesday, November 10" },
  { id: "wed", label: "WED 11", name: "Wednesday, November 11" },
  { id: "thu", label: "THU 12", name: "Thursday, November 12" },
  { id: "fri", label: "FRI 13", name: "Friday, November 13" },
  { id: "sat", label: "SAT 14", name: "Saturday, November 14" },
  { id: "sun", label: "SUN 15", name: "Sunday, November 15" },
];

const WEEKDAYS = [0, 1, 2, 3, 4];
const ALL = [0, 1, 2, 3, 4, 5, 6];

function each(days: number[], make: (day: number) => Omit<WeekCalendarEntry, "id" | "day">, key: string) {
  return days.map((day) => ({ id: `${key}-${day}`, day, ...make(day) }));
}

/** 07d `322:14121`, entry for entry. */
const WEEK: WeekCalendarEntry[] = [
  ...each(WEEKDAYS, () => ({ start: 6 * H, end: 9 * H, title: "Weekday mornings", meta: "Collection" }), "mornings"),
  ...each(WEEKDAYS, () => ({ start: 9 * H, end: 12 * H, title: "Market open", meta: "Page" }), "market"),
  ...each(
    WEEKDAYS,
    () => ({ start: 12 * H, end: 17 * H, title: "Gap · Good morning, Maya", meta: "Default page", kind: "gap" }),
    "gap",
  ),
  ...each(WEEKDAYS, () => ({ start: 17 * H, end: 21 * H, title: "Evening commute", meta: "Page" }), "commute"),
  ...each(ALL, () => ({ start: 21 * H, end: 22 * H, title: "Good night" }), "night"),
  ...each(ALL, () => ({ start: 22 * H, end: 24 * H, title: "Silence", kind: "silence" }), "silence"),
  ...each([5, 6], () => ({ start: 9 * H, end: 13 * H, title: "Weekend brunch", meta: "Page" }), "brunch"),
  { id: "birthday", day: 5, start: 12 * H, end: 15 * H, title: "Happy birthday Sam", meta: "Page", conflict: true },
];

const RAINBOW = "{63}{64}{65}{66}{67}{68}".repeat(4).slice(0, 22 * 4);
const BIRTHDAY = `\n\n   HAPPY BIRTHDAY\n        SAM!\n\n${RAINBOW}`;

/**
 * Stand-in for the inspector's Page / Display / Repeat rows (07d `322:14772`) until ListRow (#389)
 * is on `alpha`; hosts compose `ListRowGroup` + `ListRow` with a chevron. TODO(#389): swap.
 */
function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      className="focus-ring flex min-h-11 w-full items-center gap-3 rounded-md py-2 pr-2.5 pl-3.5 text-left text-sm hover:bg-accent"
    >
      <span className="min-w-0 flex-1 font-semibold">{label}</span>
      <span className="text-muted-foreground">{value}</span>
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
    </button>
  );
}

function BirthdayInspector({ className }: { className?: string }) {
  return (
    <WeekCalendarInspector
      className={className}
      title="Happy birthday Sam"
      description="Sat Nov 14 · 12:00 – 3:00 PM · Kitchen board"
      conflict="Overlaps Weekend brunch from 12:00 to 1:00 PM. Happy birthday Sam is a one-off for Sat Nov 14, and a one-off date beats a weekly entry, so it shows; Weekend brunch ends at 12:00 PM that day."
      conflictActions={
        <>
          <Button size="sm">Start at 1:00 PM instead</Button>
          <Button size="sm" variant="secondary">
            Edit entry
          </Button>
        </>
      }
      preview={<StaticBoardDisplay size="sm" deviceType="flagship" message={BIRTHDAY} />}
      actions={
        <Button variant="ghost">
          <Trash2 aria-hidden="true" />
          Delete…
        </Button>
      }
    >
      <FieldRow label="Page" value="Happy birthday Sam" />
      <FieldRow label="Display" value="Kitchen board" />
      <FieldRow label="Repeat" value="Once · Sat Nov 14" />
    </WeekCalendarInspector>
  );
}

function WeekWithInspectorDemo(args: React.ComponentProps<typeof WeekCalendar>) {
  const [selectedId, setSelectedId] = React.useState(args.selectedId);
  return (
    <div className="flex flex-col items-start gap-5 p-4 lg:flex-row lg:p-8">
      <WeekCalendar
        {...args}
        selectedId={selectedId}
        onSelect={(entry) => {
          setSelectedId(entry.id);
          args.onSelect?.(entry);
        }}
        className="w-full lg:w-[640px] lg:shrink-0"
      />
      <BirthdayInspector className="w-full lg:w-auto lg:min-w-0 lg:flex-1" />
    </div>
  );
}

/** The 07d body: the week beside the inspector. Below `lg` they stack, inspector second. */
export const WeekWithInspector: Story = {
  args: { "aria-label": "Week of November 9–15", days: DAYS, entries: WEEK, selectedId: "birthday" },
  parameters: { layout: "fullscreen" },
  render: (args) => <WeekWithInspectorDemo {...args} />,
};

/** The grid alone, nothing selected. */
export const Default: Story = {
  args: { "aria-label": "Week of November 9–15", days: DAYS, entries: WEEK.map((e) => ({ ...e, conflict: false })) },
  render: (args) => (
    <div className="w-full max-w-[640px]">
      <WeekCalendar {...args} />
    </div>
  ),
};

/** A selected entry with no conflict: the 2px primary border (06 `39:50028`). */
export const Selected: Story = {
  args: { ...Default.args, selectedId: "market-2" },
  render: Default.render,
};

/** Selected and in conflict: 2px destructive border, tint, red title (07d `322:14363`). */
export const ConflictSelected: Story = {
  args: { ...Default.args, entries: WEEK, selectedId: "birthday" },
  render: Default.render,
};

/** The now line on today's column, 9:41 AM Friday (06 `39:50112`). */
export const NowLine: Story = {
  args: { ...Default.args, now: { day: 4, minute: 9 * H + 41 } },
  render: Default.render,
};

/** A turned-off entry (faded, muted title), a gap and the silence schedule; the states are in each block's description. */
export const KindsAndStates: Story = {
  args: {
    "aria-label": "Thursday and Friday",
    days: DAYS.slice(3, 5),
    entries: [
      { id: "m", day: 0, start: 9 * H, end: 12 * H, title: "Market open", meta: "Page" },
      { id: "l", day: 0, start: 12 * H, end: 14 * H, title: "Lunch specials", meta: "Page", off: true },
      {
        id: "g",
        day: 1,
        start: 12 * H,
        end: 17 * H,
        title: "Gap · Good morning, Maya",
        meta: "Default page",
        kind: "gap",
      },
      { id: "c", day: 1, start: 9 * H, end: 12 * H, title: "Happy hour", meta: "Page", conflict: true },
      { id: "s0", day: 0, start: 22 * H, end: 23 * H, title: "Silence", kind: "silence" },
      { id: "s1", day: 1, start: 22 * H, end: 23 * H, title: "Silence", kind: "silence" },
    ],
  },
  render: (args) => (
    <div className="w-full max-w-[320px]">
      <WeekCalendar {...args} />
    </div>
  ),
};

/** No entries yet: the empty grid. With `onCreate`, a mouse drag on it proposes the first entry. */
export const Empty: Story = {
  args: { "aria-label": "Week of November 9–15", days: DAYS, entries: [], onCreate: fn() },
  render: Default.render,
};

/**
 * Drag to create, pointer only: press on an empty part of Saturday at 4 PM and drag to 6 PM. The
 * dashed draft follows in 15-minute steps; this story stops mid-drag so the draft is visible.
 */
export const DraggingToCreate: Story = {
  args: { ...Default.args, onCreate: fn() },
  render: Default.render,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const saturday = canvas.getByRole("group", { name: "Saturday, November 14" });
    const rect = saturday.getBoundingClientRect();
    const yAt = (hour: number) => rect.top + (hour - 6) * 34 + 2;
    const init = { pointerId: 7, pointerType: "mouse", button: 0, bubbles: true, clientX: rect.left + 20 };
    saturday.dispatchEvent(new PointerEvent("pointerdown", { ...init, clientY: yAt(16) }));
    saturday.dispatchEvent(new PointerEvent("pointermove", { ...init, clientY: yAt(17.8) }));
    await waitFor(() =>
      expect(canvasElement.querySelector('[data-slot="week-calendar-draft"]')).toHaveTextContent("4:00 PM – 6:00 PM"),
    );
  },
};

/** Releasing reports the range; touch never drags (the host's Add entry creates on touch). */
export const CreateReportsRange: Story = {
  args: { ...Default.args, onCreate: fn() },
  render: Default.render,
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const sunday = canvas.getByRole("group", { name: "Sunday, November 15" });
    const rect = sunday.getBoundingClientRect();
    const yAt = (hour: number) => rect.top + (hour - 6) * 34 + 2;
    const base = { bubbles: true, button: 0, clientX: rect.left + 20 };
    const touch = { ...base, pointerId: 3, pointerType: "touch" };
    sunday.dispatchEvent(new PointerEvent("pointerdown", { ...touch, clientY: yAt(14) }));
    sunday.dispatchEvent(new PointerEvent("pointerup", { ...touch, clientY: yAt(16) }));
    await expect(args.onCreate).not.toHaveBeenCalled();
    const mouse = { ...base, pointerId: 1, pointerType: "mouse" };
    sunday.dispatchEvent(new PointerEvent("pointerdown", { ...mouse, clientY: yAt(14) }));
    sunday.dispatchEvent(new PointerEvent("pointermove", { ...mouse, clientY: yAt(15.5) }));
    sunday.dispatchEvent(new PointerEvent("pointerup", { ...mouse, clientY: yAt(15.5) }));
    await waitFor(() => expect(args.onCreate).toHaveBeenCalledWith({ day: 6, start: 14 * H, end: 15 * H + 45 }));
  },
};

/** Keyboard: one tab stop; ← → move to the nearest block on the next day, ↑ ↓ within a day. */
export const KeyboardFocus: Story = {
  args: { ...Default.args, selectedId: "market-0" },
  render: Default.render,
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    const market = within(canvasElement).getAllByRole("button", { name: "Market open" })[0];
    await waitFor(() => expect(market).toHaveFocus());
    await userEvent.keyboard("{ArrowRight}{ArrowDown}");
    await waitFor(() => expect(canvasElement.ownerDocument.activeElement).toHaveAttribute("data-entry-id", "gap-1"));
  },
};

/** Three days on a phone-width column: the blocks truncate, the geometry holds. */
export const FewDays: Story = {
  args: { ...Default.args, "aria-label": "Friday to Sunday", days: DAYS.slice(4), entries: [] },
  render: (args) => (
    <div className="w-full max-w-[358px]">
      <WeekCalendar
        {...args}
        entries={WEEK.filter((e) => e.day >= 4).map((e) => ({ ...e, day: e.day - 4 }))}
        selectedId="birthday"
      />
    </div>
  ),
};

/** The inspector alone, with a conflict (07d `322:14371`). */
export const Inspector: Story = {
  args: Default.args,
  render: () => (
    <div className="w-full max-w-[458px]">
      <BirthdayInspector />
    </div>
  ),
};

/** The inspector for an entry with no conflict: no alert. */
export const InspectorNoConflict: Story = {
  args: Default.args,
  render: () => (
    <div className="w-full max-w-[458px]">
      <WeekCalendarInspector
        title="Market open"
        description="Weekdays · 9:00 AM – 12:00 PM · Kitchen board"
        preview={
          <StaticBoardDisplay
            size="sm"
            deviceType="flagship"
            message={"\n   MARKET OPEN\n   DOW  +0.4%\n   AAPL +1.2%"}
          />
        }
        actions={
          <Button variant="ghost">
            <Trash2 aria-hidden="true" />
            Delete…
          </Button>
        }
      >
        <FieldRow label="Page" value="Market open" />
        <FieldRow label="Display" value="Kitchen board" />
        <FieldRow label="Repeat" value="Mon–Fri" />
      </WeekCalendarInspector>
    </div>
  ),
};
