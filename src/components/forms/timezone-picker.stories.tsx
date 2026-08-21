import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Text } from "../typography/text";
import { Button } from "./button";
import { Label } from "./label";
import { type TimezoneOption, TimezonePicker } from "./timezone-picker";

/**
 * A pinned zone table.
 *
 * `TimezonePicker` defaults to `listTimezones()`, which asks the runtime for
 * every IANA zone and derives each offset for the current instant — right in
 * an app, fatal in a VRT baseline, where `+02:00` silently becomes `+01:00`
 * the night Europe puts the clocks back. Every story below supplies its own
 * zones with the offsets frozen at 2026-07-01 (northern summer), so the
 * screenshots are the same in January.
 */
const zones: TimezoneOption[] = [
  { id: "Pacific/Auckland", offset: "+12:00" },
  { id: "Australia/Sydney", offset: "+10:00" },
  { id: "Asia/Tokyo", offset: "+09:00" },
  { id: "Asia/Kolkata", offset: "+05:30" },
  { id: "Europe/Berlin", offset: "+02:00" },
  { id: "Europe/Madrid", offset: "+02:00" },
  { id: "Europe/London", offset: "+01:00" },
  { id: "UTC", offset: "+00:00" },
  { id: "America/New_York", offset: "-04:00" },
  { id: "America/Chicago", offset: "-05:00" },
  { id: "America/Denver", offset: "-06:00" },
  { id: "America/Los_Angeles", offset: "-07:00" },
];

const meta = {
  title: "Forms/TimezonePicker",
  component: TimezonePicker,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    timezones: zones,
    "aria-label": "Time zone",
  },
  argTypes: {
    value: {
      control: "text",
      description: 'Selected IANA id, controlled. `""` means unset — pair with `onValueChange`',
    },
    defaultValue: {
      control: "text",
      description: "Initial IANA id (uncontrolled)",
    },
    onValueChange: {
      control: false,
      description:
        "Fired with the new IANA id — never the display label, which is presentation and may be localized " +
        "per consumer. One argument, not Base UI's `(value, eventDetails)` pair.",
    },
    timezones: {
      control: false,
      description:
        "Zones to offer. Defaults to every zone the runtime's ICU build knows, labelled by id. Pass a list to " +
        "shorten it, to localize the labels, or to pin the offsets so a story does not move at the next DST change.",
    },
    referenceDate: {
      control: false,
      description:
        "Instant the offsets are computed for when they are derived rather than supplied. Defaults to now; a " +
        "zone's offset is a function of the date, so pass a fixed one wherever the rendering must be deterministic.",
    },
    onValidityChange: {
      control: false,
      description:
        "Fired when the answer to “does the text in the input name a known zone?” flips, and once on mount. An " +
        "empty input reports `true` — emptiness is required-ness, which the form already models via `value`.",
    },
    limit: {
      control: "number",
      description:
        "Maximum matches rendered at once. Defaults to 100 so an unfiltered open does not mount ~400 rows; " +
        "`-1` renders every match.",
    },
    labels: {
      control: false,
      description: "Placeholder, empty-state and listbox copy — every string optional with an English default",
    },
    disabled: {
      control: "boolean",
      description: "Disables the input and prevents opening the list",
    },
    readOnly: {
      control: "boolean",
      description: "Keeps the value readable and selectable but rejects edits",
    },
    required: {
      control: "boolean",
      description: "Marks the underlying form control required",
    },
    name: {
      control: "text",
      description: "Submits the selected IANA id under this name when inside a form",
    },
    id: {
      control: "text",
      description: "Forwarded to the input so an external `<Label htmlFor>` can name it",
    },
    "aria-label": {
      control: "text",
      description: "Accessible name when no visible label is associated",
    },
    "aria-invalid": {
      control: "boolean",
      description:
        "Passed straight through. The picker never derives it from the validity check — a combobox that flips " +
        "to “invalid” mid-word announces an error the user is still in the middle of fixing.",
    },
    defaultOpen: {
      control: "boolean",
      description: "Open the list on first render (uncontrolled)",
    },
    open: {
      control: false,
      description: "Controlled open state; pair with onOpenChange",
    },
    onOpenChange: {
      control: false,
      description: "Callback fired when the list opens or closes",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    contentClassName: {
      control: "text",
      description: "Additional CSS classes for the popup surface",
    },
  },
} satisfies Meta<typeof TimezonePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The real consumer's shape: a labelled field whose stored value is the IANA
 * id, not the text in the box. Type `berlin`, `Europe/` or `+02:00` — all
 * three reach Berlin, which is the whole point of the control.
 *
 * The `<Label htmlFor>` names the input natively, so no `aria-label` is needed
 * here; the combobox already announces its own value.
 */
export const Default = () => {
  const [value, setValue] = useState("Europe/Berlin");

  return (
    <div className="w-[280px] space-y-2">
      <Label htmlFor="tz-default">Time zone</Label>
      <TimezonePicker id="tz-default" timezones={zones} value={value} onValueChange={setValue} />
      <Text size="xs" tone="muted">
        Stored value: {value || "(unset)"}
      </Text>
    </div>
  );
};

/**
 * The list as it opens, unfiltered: display label on the left, UTC offset on
 * the right in tabular figures so the signs and colons line up into a column
 * the eye can scan. The offset is not decoration — it is one of the three
 * things the query matches against.
 */
export const Open: Story = {
  args: {
    defaultValue: "Europe/Berlin",
    defaultOpen: true,
  },
  render: (args) => (
    <div className="h-[380px] w-[280px]">
      <TimezonePicker {...args} />
    </div>
  ),
};

/** No zone chosen yet — the placeholder carries the affordance. */
export const Unset: Story = {
  args: {
    defaultValue: "",
  },
  render: (args) => (
    <div className="w-[280px]">
      <TimezonePicker {...args} />
    </div>
  ),
};

/**
 * The reason the list is portalled. This card clips its own content
 * (`overflow-hidden`, the standard recipe for keeping a rounded corner
 * rounded), and an in-flow dropdown would be sliced off at the bottom edge.
 * The panel renders at the document root and is positioned against the input,
 * so it escapes the clip and still tracks the field.
 */
export const InsideAClippingCard: Story = {
  args: {
    defaultValue: "Asia/Tokyo",
    defaultOpen: true,
  },
  render: (args) => (
    <div className="h-[380px] w-[320px]">
      <div className="overflow-hidden rounded-lg border bg-card p-4">
        <Text size="sm" weight="medium" className="mb-2 block">
          Schedule
        </Text>
        <TimezonePicker {...args} />
      </div>
    </div>
  ),
};

/**
 * `onValidityChange` is what lets a form refuse a typo. Clear the field and
 * type `Europe/Berlim`: the value never changes (nothing was selected), the
 * input picks up `data-unknown-zone`, and Save goes disabled.
 *
 * Note what does *not* happen: `aria-invalid` is never set from this. It would
 * flip on every keystroke of a zone being typed out, and a live combobox
 * announcing "invalid" mid-word is worse than no error at all. Escalating to
 * `aria-invalid` on blur or on submit is the form's call — here the form makes
 * it by disabling the button instead.
 */
export const ValidityGate = () => {
  const [value, setValue] = useState("Europe/Berlin");
  const [valid, setValid] = useState(true);

  return (
    <div className="w-[280px] space-y-2">
      <Label htmlFor="tz-validity">Time zone</Label>
      <TimezonePicker
        id="tz-validity"
        timezones={zones}
        value={value}
        onValueChange={setValue}
        onValidityChange={setValid}
      />
      <Text size="xs" tone="muted">
        {valid ? `Stored value: ${value || "(unset)"}` : "Not a time zone"}
      </Text>
      <Button size="sm" disabled={!valid}>
        Save
      </Button>
    </div>
  );
};

/**
 * The package ships English defaults and no i18n runtime, so both halves of
 * the copy are handed in: `labels` for the strings the picker renders itself,
 * and `timezones[].label` for the zone names, which are data.
 */
export const LocalizedLabels: Story = {
  args: {
    defaultValue: "Europe/Berlin",
    defaultOpen: true,
    "aria-label": "Zeitzone",
    labels: {
      placeholder: "Zeitzonen durchsuchen",
      empty: "Keine passende Zeitzone",
      list: "Zeitzonen",
    },
    timezones: [
      { id: "Europe/Berlin", label: "Berlin", offset: "+02:00" },
      { id: "Europe/Vienna", label: "Wien", offset: "+02:00" },
      { id: "Europe/Zurich", label: "Zürich", offset: "+02:00" },
      { id: "Europe/London", label: "London", offset: "+01:00" },
    ],
  },
  render: (args) => (
    <div className="h-[240px] w-[280px]">
      <TimezonePicker {...args} />
    </div>
  ),
};

/**
 * Hostile content. IANA ids run long — `America/Argentina/ComodRivadavia` is a
 * real one — and a zone name is not allowed to shove the offset column off the
 * row: the label truncates, the offset keeps its width, and the field itself
 * shows the head of the name rather than growing.
 */
export const LongLabelTruncation: Story = {
  args: {
    defaultValue: "America/Argentina/ComodRivadavia",
    defaultOpen: true,
    timezones: [
      { id: "America/Argentina/ComodRivadavia", offset: "-03:00" },
      { id: "America/North_Dakota/New_Salem", offset: "-05:00" },
      { id: "America/Indiana/Indianapolis", offset: "-04:00" },
      { id: "Antarctica/DumontDUrville", offset: "+10:00" },
    ],
  },
  render: (args) => (
    <div className="h-[240px] w-[240px]">
      <TimezonePicker {...args} />
    </div>
  ),
};

/** Disabled: the value stays readable, the list cannot be opened. */
export const Disabled: Story = {
  args: {
    defaultValue: "America/Los_Angeles",
    disabled: true,
  },
  render: (args) => (
    <div className="w-[280px]">
      <TimezonePicker {...args} />
    </div>
  ),
};
