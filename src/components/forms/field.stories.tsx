import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Stack } from "../layout/stack";
import { Text } from "../typography/text";
import { Combobox } from "./combobox";
import { Field } from "./field";
import { Input } from "./input";
import { SecretInput } from "./secret-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { TimePicker } from "./time-picker";
import { TimezonePicker } from "./timezone-picker";

/**
 * Pinned rather than derived, for the same reason the inventory page pins
 * them: `TimezonePicker` defaults to the runtime's whole IANA table with
 * offsets computed for *now*, and these stories are photographed by VRT —
 * `+02:00` would become `+01:00` the night the clocks change.
 */
const ZONES = [
  { id: "Europe/Berlin", offset: "+02:00" },
  { id: "Europe/London", offset: "+01:00" },
  { id: "America/New_York", offset: "-04:00" },
];

const meta = {
  title: "Forms/Field",
  component: Field,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    label: "Board name",
    children: <Input placeholder="Kitchen" />,
  },
  argTypes: {
    label: { control: "text", description: "Localized label text. Rendered as `<Label htmlFor={id}>`." },
    description: {
      control: "text",
      description: "Helper line, wired to the control through `aria-describedby`.",
    },
    error: {
      control: "text",
      description:
        "Validation message. REPLACES the description in the description chain, sets `aria-invalid` on the " +
        "control, and renders in `--destructive`. The description still renders — it usually explains the fix.",
    },
    required: {
      control: "boolean",
      description:
        "Renders the asterisk inside the label, adds `requiredLabel` to the accessible name, and sets " +
        "`required` on the control.",
    },
    requiredLabel: {
      control: "text",
      description:
        "Screen-reader text appended to the label when `required` is set. Default `“(required)”` — " +
        "user-facing copy, so it is a prop; the package resolves no i18n.",
    },
    id: {
      control: "text",
      description: "Id for the control. Generated with `useId()` when omitted; a child's own id is adopted.",
    },
    descriptionPlacement: {
      control: "inline-radio",
      options: ["above", "below"],
      description: "Where the description sits relative to the control. Default `below`.",
    },
    orientation: {
      control: "inline-radio",
      options: ["stacked", "inline"],
      description: "`stacked` is the settings default; `inline` is label-left from the `sm` breakpoint up.",
    },
    children: {
      control: false,
      description:
        "Exactly one control element. Receives `id`, `aria-describedby`, `aria-invalid` and `required` — the " +
        "caller never threads them by hand.",
    },
    className: { control: "text", description: "Additional CSS classes for the row wrapper" },
  },
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The everyday row: a name, a control, and a helper line the control is
 * actually described by. Inspect the input — it carries an `id` matching the
 * label's `htmlFor` and an `aria-describedby` pointing at the helper text,
 * neither of which the call site wrote.
 */
export const Default: Story = {
  args: {
    label: "Board name",
    description: "Shown in the device list and in the mobile app.",
  },
  render: (args) => (
    <div className="w-[360px]">
      <Field {...args} />
    </div>
  ),
};

/** Label and control only. Nothing is described, so no `aria-describedby` is emitted at all. */
export const LabelOnly: Story = {
  render: (args) => (
    <div className="w-[360px]">
      <Field {...args} />
    </div>
  ),
};

/**
 * Required. The asterisk is INSIDE the label rather than floating beside it,
 * the glyph itself is `aria-hidden` (a bare "*" announces as "star"), and the
 * word travels in the accessible name: "Board name (required)". `required` is
 * set on the control too, so the platform's own validation still fires.
 */
export const Required: Story = {
  args: {
    label: "Board name",
    description: "Shown in the device list and in the mobile app.",
    required: true,
  },
  render: (args) => (
    <div className="w-[360px]">
      <Field {...args} />
    </div>
  ),
};

/**
 * Invalid. The error sets `aria-invalid` on the control — which is what draws
 * the destructive border, since every kit control already styles
 * `aria-invalid:` — and REPLACES the description in the announcement chain.
 * The helper still renders: it is usually the sentence that explains the fix.
 */
export const WithError: Story = {
  args: {
    label: "Refresh interval",
    description: "Seconds between board updates. Between 10 and 3600.",
    error: "Must be at least 10 seconds.",
    required: true,
    children: <Input type="number" defaultValue={5} />,
  },
  render: (args) => (
    <div className="w-[360px]">
      <Field {...args} />
    </div>
  ),
};

/**
 * `descriptionPlacement="above"` puts the helper between the label and the
 * control. Both orders exist downstream — `update-intervals` explains the
 * setting before showing it, `silence-schedule` after — and neither is wrong,
 * which is why this is a prop rather than a house rule.
 */
export const DescriptionAbove: Story = {
  args: {
    label: "Quiet hours",
    description: "The board dims and stops polling between these times.",
    descriptionPlacement: "above",
    children: <TimePicker defaultValue="22:00" />,
  },
  render: (args) => (
    <div className="w-[360px]">
      <Field {...args} />
    </div>
  ),
};

/**
 * `orientation="inline"` is label-left: the settings-page shape where a column
 * of names lines up against a column of controls. It collapses to stacked
 * below the `sm` breakpoint — a two-column row at 360px leaves the control
 * about 90px wide.
 */
export const Inline: Story = {
  args: {
    label: "Refresh interval",
    description: "Seconds between board updates.",
    orientation: "inline",
    children: <Input type="number" defaultValue={60} />,
  },
  render: (args) => (
    <div className="w-[560px]">
      <Field {...args} />
    </div>
  ),
};

/** Inline, with the error under the control rather than under the whole row. */
export const InlineWithError: Story = {
  args: {
    label: "Webhook URL",
    description: "Called whenever the board finishes rendering.",
    error: "Must start with https://",
    orientation: "inline",
    required: true,
    children: <Input defaultValue="http://example.com/hook" />,
  },
  render: (args) => (
    <div className="w-[560px]">
      <Field {...args} />
    </div>
  ),
};

/**
 * The claim the component rests on: cloning the child is enough, and no
 * control had to change to be wired by a `Field`.
 *
 * `Select` is the one arrangement worth reading twice. Its root renders no DOM
 * of its own, so the root wraps the `Field` and the `Field` wraps the trigger
 * — the part that actually takes focus and can carry an id.
 */
export const AcrossTheKit = () => (
  <Stack gap="5" className="w-[380px]">
    <Field label="Board name" description="Shown in the device list.">
      <Input placeholder="Kitchen" />
    </Field>
    <Field label="Welcome message" description="Rendered on the board when it wakes.">
      <Textarea rows={3} placeholder="Good morning" />
    </Field>
    <Field label="API key" description="Found under Integrations → API." required>
      <SecretInput defaultValue="fb_live_51H8xQ2eZvKYlo2C" />
    </Field>
    <Select defaultValue="dark">
      <Field label="Theme" description="Applies to this board only.">
        <SelectTrigger>
          <SelectValue placeholder="Pick a theme" />
        </SelectTrigger>
      </Field>
      <SelectContent>
        <SelectItem value="dark">Dark</SelectItem>
        <SelectItem value="light">Light</SelectItem>
      </SelectContent>
    </Select>
    <Field label="Time zone" description="Used for scheduled updates.">
      <TimezonePicker timezones={ZONES} defaultValue="Europe/Berlin" />
    </Field>
    <Field label="Quiet hours start" description="The board dims from this time.">
      <TimePicker defaultValue="22:00" />
    </Field>
    <Field label="Data source" description="The entity the tile reads from." error="That entity no longer exists.">
      <Combobox
        options={[
          { value: "sensor.living_room_temperature", label: "Living room", meta: "21.5°C" },
          { value: "sensor.kitchen_temperature", label: "Kitchen", meta: "19.0°C" },
        ]}
        defaultValue="sensor.attic"
      />
    </Field>
  </Stack>
);

/**
 * The shape #283 was filed about: a settings panel where every row is the same
 * four parts, and not one of them is threaded by hand. Type into the interval
 * to watch the error appear and take the description's place in the chain
 * while the description itself stays on screen.
 */
export const SettingsPanel = () => {
  const [interval, setInterval] = useState("5");
  const numeric = Number(interval);
  const error =
    interval === "" || Number.isNaN(numeric)
      ? "Enter a number of seconds."
      : numeric < 10
        ? "Must be at least 10 seconds."
        : undefined;

  return (
    <Stack gap="5" className="w-[420px] rounded-lg border bg-card p-5">
      <Text size="base" weight="semibold">
        Board settings
      </Text>
      <Field label="Board name" description="Shown in the device list and in the mobile app." required>
        <Input defaultValue="Kitchen" />
      </Field>
      <Field
        label="Refresh interval"
        description="Seconds between board updates. Between 10 and 3600."
        error={error}
        required
      >
        <Input type="number" value={interval} onChange={(event) => setInterval(event.target.value)} />
      </Field>
      <Field label="Time zone" description="Used for scheduled updates." descriptionPlacement="above">
        <TimezonePicker timezones={ZONES} defaultValue="Europe/Berlin" />
      </Field>
    </Stack>
  );
};

/**
 * Localized copy, including the required wording. The package resolves no i18n
 * and renders no string an app cannot replace — `requiredLabel` is the only
 * string `Field` produces on its own, and it defaults to "(required)".
 */
export const LocalizedRequiredWording: Story = {
  args: {
    label: "Anzeigename",
    description: "Erscheint in der Geräteliste.",
    error: "Bitte einen Namen eingeben.",
    required: true,
    requiredLabel: "(Pflichtfeld)",
    children: <Input defaultValue="" />,
  },
  render: (args) => (
    <div className="w-[360px]">
      <Field {...args} />
    </div>
  ),
};

/**
 * Hostile content. A long label wraps rather than pushing the asterisk off the
 * row, and a long description and error wrap under the control instead of
 * widening it — in both orientations.
 */
export const LongCopy = () => (
  <Stack gap="6" className="w-[420px]">
    <Field
      label="Automatically re-render every board in this workspace after a plugin upgrade"
      description="Applies to every board this account can see, including boards shared with you by other members of the workspace."
      error="This workspace has too many boards for an automatic re-render; upgrade the plan or re-render them in batches."
      required
    >
      <Input defaultValue="" />
    </Field>
    <Field
      label="Automatically re-render every board in this workspace after a plugin upgrade"
      description="Applies to every board this account can see, including boards shared with you."
      orientation="inline"
      required
    >
      <Input defaultValue="" />
    </Field>
  </Stack>
);

/**
 * A raw `<input>` — not a kit control at all — is wired exactly the same way.
 * That is the argument for cloning the child rather than passing the wiring
 * through a context each control would have to opt into: a plugin-authored
 * control, or a third-party date picker, gets the association for free.
 */
export const AnyElementNotJustKitControls: Story = {
  args: {
    label: "Serial number",
    description: "Printed on the back of the board.",
    children: <input className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm" />,
  },
  render: (args) => (
    <div className="w-[360px]">
      <Field {...args} />
    </div>
  ),
};
