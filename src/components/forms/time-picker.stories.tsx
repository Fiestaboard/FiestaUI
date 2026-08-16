import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Text } from "../typography/text";
import { Label } from "./label";
import { TimePicker } from "./time-picker";

const meta = {
  title: "Forms/TimePicker",
  component: TimePicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    defaultValue: "20:00",
  },
  argTypes: {
    value: {
      control: "text",
      description: "Current time as `HH:MM` (24-hour), controlled. Empty string means unset",
    },
    defaultValue: {
      control: "text",
      description: "Initial `HH:MM` value (uncontrolled)",
    },
    onValueChange: {
      control: false,
      description: "Fired with the new `HH:MM` value when an hour, minute, or preset is chosen",
    },
    placeholder: {
      control: "text",
      description: "Trigger text while the value is empty",
    },
    hourCycle: {
      control: "inline-radio",
      options: ["12", "24"],
      description: "Display format of the trigger and the hour list",
    },
    minuteStep: {
      control: { type: "number", min: 1, max: 60 },
      description: "Granularity of the minute list, in minutes",
    },
    presets: {
      control: false,
      description: "Preset chips. Pass `[]` to drop the section",
    },
    labels: {
      control: false,
      description: "Panel copy — every string optional with an English default",
    },
    disabled: {
      control: "boolean",
      description: "Disables the trigger and prevents opening the panel",
    },
    defaultOpen: {
      control: "boolean",
      description: "Open the panel on first render (uncontrolled)",
    },
    open: {
      control: false,
      description: "Controlled open state; pair with onOpenChange",
    },
    onOpenChange: {
      control: false,
      description: "Callback fired when the panel opens or closes",
    },
    id: {
      control: "text",
      description: "Forwarded to the trigger so an external `<Label htmlFor>` can name it",
    },
    "aria-label": {
      control: "text",
      description: "Accessible name when no visible label is associated",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the trigger button",
    },
    contentClassName: {
      control: "text",
      description: "Additional CSS classes for the popover panel",
    },
  },
} satisfies Meta<typeof TimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Live picker: pick an hour, a minute, or a preset and watch the value update.
 *
 * The label is wired with both `htmlFor` (so clicking it focuses the trigger)
 * and `aria-labelledby` (so the accessible name stays "Start time 8:00 PM"
 * instead of collapsing to just the label text).
 */
export const Default = () => {
  const [value, setValue] = useState("20:00");

  return (
    <div className="w-[240px] space-y-2">
      <Label id="time-default-label" htmlFor="time-default">
        Start time
      </Label>
      <TimePicker id="time-default" aria-labelledby="time-default-label" value={value} onValueChange={setValue} />
      <Text size="xs" tone="muted">
        Stored value: {value || "(unset)"}
      </Text>
    </div>
  );
};

/** No value yet — the trigger shows the placeholder in the muted tone. */
export const Empty: Story = {
  args: {
    defaultValue: "",
    placeholder: "Pick a time",
    "aria-label": "Start time",
  },
  render: (args) => (
    <div className="w-[240px]">
      <TimePicker {...args} />
    </div>
  ),
};

/** The panel as it opens: hour listbox, minute listbox, preset chips. */
export const Open: Story = {
  args: {
    defaultOpen: true,
    "aria-label": "Start time",
  },
  render: (args) => (
    <div className="w-[240px]">
      <TimePicker {...args} />
    </div>
  ),
};

/** `hourCycle="24"` drops AM/PM from both the trigger and the hour list. */
export const TwentyFourHour: Story = {
  args: {
    defaultValue: "18:30",
    hourCycle: "24",
    minuteStep: 30,
    defaultOpen: true,
    "aria-label": "Departure time",
  },
  render: (args) => (
    <div className="w-[240px]">
      <TimePicker {...args} />
    </div>
  ),
};

/** Presets are data: relabel them, replace them, or pass `[]` to hide the row. */
export const CustomPresets: Story = {
  args: {
    defaultValue: "07:30",
    defaultOpen: true,
    "aria-label": "Wake time",
    presets: [
      { value: "06:00", label: "Early" },
      { value: "07:30", label: "Usual" },
      { value: "09:00", label: "Late" },
    ],
  },
  render: (args) => (
    <div className="w-[240px]">
      <TimePicker {...args} />
    </div>
  ),
};

export const WithoutPresets: Story = {
  args: {
    defaultValue: "13:05",
    defaultOpen: true,
    presets: [],
    "aria-label": "Reminder time",
  },
  render: (args) => (
    <div className="w-[240px]">
      <TimePicker {...args} />
    </div>
  ),
};

/**
 * The package ships English defaults and no i18n runtime — apps hand localized
 * copy in through `labels` (Spanish here, in a 24-hour cycle).
 */
export const LocalizedLabels: Story = {
  args: {
    defaultValue: "16:20",
    hourCycle: "24",
    defaultOpen: true,
    "aria-label": "Hora de inicio",
    labels: {
      panel: "Elige una hora",
      hour: "Hora",
      minute: "Minuto",
      quickPresets: "Atajos",
    },
  },
  render: (args) => (
    <div className="w-[240px]">
      <TimePicker {...args} />
    </div>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
    "aria-label": "Start time",
  },
  render: (args) => (
    <div className="w-[240px]">
      <TimePicker {...args} />
    </div>
  ),
};

/** A malformed or out-of-range value falls back to the placeholder. */
export const InvalidValue: Story = {
  args: {
    defaultValue: "25:99",
    placeholder: "Invalid — pick a time",
    "aria-label": "Start time",
  },
  render: (args) => (
    <div className="w-[240px]">
      <TimePicker {...args} />
    </div>
  ),
};

/** The real FiestaBoard shape: a labelled pair inside a settings form. */
export const SilenceScheduleRow = () => {
  const [start, setStart] = useState("22:00");
  const [end, setEnd] = useState("07:00");

  return (
    <div className="grid w-full gap-4 sm:w-[420px] sm:grid-cols-2">
      <div className="space-y-2">
        <Label id="silence-start-label" htmlFor="silence-start">
          Start time
        </Label>
        <TimePicker id="silence-start" aria-labelledby="silence-start-label" value={start} onValueChange={setStart} />
        <Text size="xs" tone="muted">
          When quiet hours begin.
        </Text>
      </div>
      <div className="space-y-2">
        <Label id="silence-end-label" htmlFor="silence-end">
          End time
        </Label>
        <TimePicker id="silence-end" aria-labelledby="silence-end-label" value={end} onValueChange={setEnd} />
        <Text size="xs" tone="muted">
          When quiet hours end.
        </Text>
      </div>
    </div>
  );
};

export const AllStates: Story = {
  render: () => (
    <div className="w-[260px] space-y-6">
      <div className="space-y-2">
        <Text size="xs" weight="medium" tone="muted">
          With a value
        </Text>
        <TimePicker defaultValue="20:00" aria-label="With a value" />
      </div>
      <div className="space-y-2">
        <Text size="xs" weight="medium" tone="muted">
          Empty
        </Text>
        <TimePicker aria-label="Empty" />
      </div>
      <div className="space-y-2">
        <Text size="xs" weight="medium" tone="muted">
          24-hour
        </Text>
        <TimePicker defaultValue="00:15" hourCycle="24" aria-label="24 hour" />
      </div>
      <div className="space-y-2">
        <Text size="xs" weight="medium" tone="muted">
          Disabled
        </Text>
        <TimePicker defaultValue="12:00" disabled aria-label="Disabled" />
      </div>
      <div className="space-y-2">
        <Text size="xs" weight="medium" tone="muted">
          Invalid
        </Text>
        <TimePicker defaultValue="99:99" placeholder="--:--" aria-label="Invalid" />
      </div>
    </div>
  ),
};
