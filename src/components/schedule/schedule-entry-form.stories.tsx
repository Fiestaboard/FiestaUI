import type { Meta, StoryObj } from "@storybook/react";
import { expect, userEvent, within } from "storybook/test";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../overlays/sheet";
import { DEFAULT_SCHEDULE_ENTRY, ScheduleEntryForm, type ScheduleEntryValue } from "./schedule-entry-form";

/*
 * ScheduleEntryForm (slice 1.9a, C27). Web goalpost: 07d Schedule · Entry
 * sheet `322:20318`. What 07d does not draw (sun times, end modes, yearly
 * and one-off repeats, Entry is on, the consequence line) follows 06 Edit
 * entry `37:21884` and 08 C27 `75:12238`. Fields are the hub's ScheduleEntry.
 */

const TARGETS = [
  { value: "collection-morning", label: "Weekday mornings", kind: "collection" as const },
  { value: "page-brunch", label: "Weekend brunch", kind: "page" as const },
  { value: "page-happy-hour", label: "Happy hour specials", kind: "page" as const },
  { value: "page-birthday", label: "Happy birthday Sam", kind: "page" as const },
];

const noop = () => {};

const meta = {
  title: "Schedule/ScheduleEntryForm",
  component: ScheduleEntryForm,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "inline-radio", options: ["touch", "default"] },
    layout: { control: "inline-radio", options: ["default", "compact"] },
    targets: { control: false },
    value: { control: false },
    defaultValue: { control: false },
    labels: { control: false },
  },
  args: {
    targets: TARGETS,
    onSubmit: noop,
    display: "Kitchen board",
  },
  decorators: [
    (Story) => (
      <div className="w-full rounded-xl border bg-card p-4 sm:w-[390px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ScheduleEntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

const weekend: ScheduleEntryValue = {
  ...DEFAULT_SCHEDULE_ENTRY,
  page_id: "page-brunch",
  start_time: "09:00",
  end_time: "13:00",
  day_pattern: "weekends",
};

/** 07d `322:20318`: editing Weekend brunch on Kitchen board. */
export const EditEntry: Story = {
  args: { defaultValue: weekend, onDelete: noop },
};

/** A new entry: nothing picked yet. */
export const NewEntry: Story = {
  args: { defaultValue: DEFAULT_SCHEDULE_ENTRY },
};

/** 06 `37:21884`: Happy hour, Thu–Sat, with the consequence line. */
export const CustomDays: Story = {
  args: {
    defaultValue: {
      ...DEFAULT_SCHEDULE_ENTRY,
      page_id: "page-happy-hour",
      start_time: "17:00",
      end_time: "18:30",
      day_pattern: "custom",
      custom_days: ["thursday", "friday", "saturday"],
    },
    summary: "Shows Thu, Fri and Sat, 5:00–6:30 PM on Kitchen board. Outside these times the board shows Default.",
    onDelete: noop,
  },
};

/** Starts 30 min before sunset and runs to midnight; the hub's resolved time shows under the offset. */
export const SunsetOpenEnded: Story = {
  args: {
    defaultValue: {
      ...DEFAULT_SCHEDULE_ENTRY,
      page_id: "page-happy-hour",
      start_type: "sunset",
      start_sun_offset: -30,
      end_time: null,
    },
    resolvedStartTime: "4:22 PM",
  },
};

/** Every year on Nov 7, for three days. */
export const EveryYear: Story = {
  args: {
    defaultValue: {
      ...DEFAULT_SCHEDULE_ENTRY,
      page_id: "page-birthday",
      recurrence_type: "annual_date",
      annual_date: "11-07",
      annual_end_date: "11-09",
    },
  },
};

/** Once, on Sat Nov 7 2026, from the Shows on view (the target is fixed). */
export const OnceFromShowsOn: Story = {
  args: {
    targetReadOnly: true,
    defaultValue: {
      ...DEFAULT_SCHEDULE_ENTRY,
      page_id: "page-birthday",
      start_time: "11:00",
      end_time: "14:00",
      recurrence_type: "one_off_date",
      one_off_date: "2026-11-07",
    },
  },
};

/** Save with nothing picked: each field says what is missing, in words. */
export const Errors: Story = {
  args: {
    defaultValue: { ...DEFAULT_SCHEDULE_ENTRY, day_pattern: "custom", custom_days: [], end_time: "09:00" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByRole("combobox", { name: /Page or Collection/ })).toHaveFocus();
    await expect(canvas.getByText("Pick a page or collection.")).toBeInTheDocument();
    await expect(canvas.getByText("Ends when it starts. Pick another end time.")).toBeInTheDocument();
    await expect(canvas.getByText("Pick at least one day.")).toBeInTheDocument();
  },
};

/** The desktop sizes, for a page pane beside the week grid. */
export const DefaultSize: Story = {
  args: { size: "default", defaultValue: weekend, onDelete: noop },
};

/** Invalid stored fallbacks stay repairable while the schedule keeps its sun modes. */
export const SunFallbackErrors: Story = {
  args: {
    defaultValue: {
      ...DEFAULT_SCHEDULE_ENTRY,
      page_id: "page-happy-hour",
      start_type: "sunset",
      start_time: "",
      end_type: "sunrise",
      end_time: "",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(canvas.getByLabelText("Start fallback time")).toHaveFocus();
    await expect(canvas.getByLabelText("Start fallback time")).toHaveAttribute("aria-invalid", "true");
    await expect(canvas.getByLabelText("End fallback time")).toHaveAttribute("aria-invalid", "true");
  },
};

/** Existing schedules may store any integer minute offset, beyond the preset grid. */
export const StoredCustomOffsets: Story = {
  args: {
    defaultValue: { ...weekend, start_type: "sunset", start_sun_offset: 7, end_type: "sunrise", end_sun_offset: 240 },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("combobox", { name: "Offset from sunset" })).toHaveTextContent("7 min after sunset");
    await expect(canvas.getByRole("combobox", { name: "Offset from sunrise" })).toHaveTextContent("4 h after sunrise");
  },
};

/*
 * Compact layout (BB-C-5): 07d's phone entry sheet as drawn. The common
 * weekly fixed-time entry is inline; Starts, Ends, Repeat and Entry is on sit
 * behind More options. .storybook/schedule-entry-form-regression.ts checks
 * the phone-sheet stories at 390×844 in a real browser: Save is above the fold.
 */

function PhoneSheet(args: React.ComponentProps<typeof ScheduleEntryForm>) {
  return (
    <Sheet defaultOpen>
      <SheetContent side="bottom" grabber>
        <SheetHeader className="min-h-12 justify-center pr-12 text-left sm:text-left">
          <SheetTitle>Edit entry</SheetTitle>
          <SheetDescription>Kitchen board · repeats on weekends</SheetDescription>
        </SheetHeader>
        <ScheduleEntryForm {...args} />
      </SheetContent>
    </Sheet>
  );
}

/** 07d `322:20318` at 390: page, start "to" end, Days, Save and Delete entry… in the sheet, no scrolling. */
export const CompactPhoneSheet: Story = {
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile" } },
  globals: { viewport: { value: "mobile" } },
  args: { layout: "compact", defaultValue: weekend, onDelete: noop },
  render: (args) => <PhoneSheet {...args} />,
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    // The sheet portals in after its open transition starts; wait for it.
    const more = await body.findByRole("button", { name: "More options" });
    await expect(more).toHaveAttribute("aria-expanded", "false");
    await expect(body.getByLabelText("Start time")).toHaveValue("09:00");
    await expect(body.getByLabelText("End time")).toHaveValue("13:00");
    await expect(body.getByRole("radio", { name: "Weekends" })).toHaveAttribute("aria-checked", "true");
    await expect(body.getByRole("button", { name: "Save" })).toBeVisible();
  },
};

/** Custom days add the seven-day row; Save still shows at 390×844. */
export const CompactPhoneSheetCustomDays: Story = {
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "mobile" } },
  globals: { viewport: { value: "mobile" } },
  args: {
    layout: "compact",
    defaultValue: { ...weekend, day_pattern: "custom", custom_days: ["thursday", "friday", "saturday"] },
    summary: "Shows Thu, Fri and Sat, 9:00 AM–1:00 PM on Kitchen board.",
    onDelete: noop,
  },
  render: (args) => <PhoneSheet {...args} />,
};

/** An entry that starts at sunset and runs to midnight: More options opens by itself. */
export const CompactMoreOptions: Story = {
  args: {
    layout: "compact",
    defaultValue: { ...weekend, start_type: "sunset", start_sun_offset: -30, end_time: null },
    resolvedStartTime: "4:22 PM",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "More options" })).toHaveAttribute("aria-expanded", "true");
    await expect(
      within(canvas.getByRole("radiogroup", { name: "Starts" })).getByRole("radio", { name: "Sunset" }),
    ).toHaveAttribute("aria-checked", "true");
    await userEvent.click(canvas.getByRole("button", { name: "More options" }));
    // Closed, it still says what it holds.
    await expect(canvas.getByRole("button", { name: "More options" })).toHaveAccessibleDescription(
      "Starts at sunset · Open-ended",
    );
  },
};
