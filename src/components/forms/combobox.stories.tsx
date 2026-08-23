import type { Meta, StoryObj } from "@storybook/react";
import { useMemo, useState } from "react";

import { Text } from "../typography/text";
import { Combobox, type ComboboxOption, defaultComboboxFilter } from "./combobox";
import { Label } from "./label";

/**
 * Home Assistant entities, the shape `HomeAssistantEntityPicker` picks from:
 * an id the user is likely to type, a friendly name they are likely to read,
 * and a current reading that must be visible but must NOT be searchable.
 */
const entities: ComboboxOption[] = [
  {
    value: "sensor.living_room_temperature",
    label: "Living room",
    meta: "21.5°C",
    keywords: ["thermostat", "climate"],
  },
  { value: "sensor.kitchen_temperature", label: "Kitchen", meta: "19.0°C", keywords: ["thermostat", "climate"] },
  { value: "sensor.bedroom_temperature", label: "Bedroom", meta: "18.5°C", keywords: ["thermostat", "climate"] },
  { value: "sensor.outdoor_temperature", label: "Outdoors", meta: "7.2°C", keywords: ["weather"] },
  { value: "binary_sensor.front_door", label: "Front door", meta: "closed", keywords: ["contact"] },
  { value: "light.hallway", label: "Hallway light", meta: "unavailable", disabled: true },
  { value: "person.alex", label: "Alex", meta: "home", keywords: ["presence"] },
];

const meta = {
  title: "Forms/Combobox",
  component: Combobox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  args: {
    options: entities,
    "aria-label": "Entity",
  },
  argTypes: {
    options: {
      control: false,
      description:
        "The rows to offer: `value` (the identity, and part of the search haystack), `label` (a node), " +
        "`meta` (right-aligned preview text, deliberately not searched), `keywords`, `disabled`.",
    },
    value: {
      control: "text",
      description: 'Selected option value, controlled. `""` means unset — pair with `onValueChange`.',
    },
    defaultValue: { control: "text", description: "Initial selected value (uncontrolled)" },
    onValueChange: {
      control: false,
      description: "Fired with the new value. One argument, not Base UI's `(value, eventDetails)` pair.",
    },
    query: {
      control: false,
      description:
        "Controlled query text, for callers that own the input — the caret-token case, where the query is a " +
        "slice of a textarea rather than the whole field. Pair with `onQueryChange`.",
    },
    onQueryChange: { control: false, description: "Fired with the new query text" },
    filter: {
      control: false,
      description:
        "Replaces the default token-AND substring match. Receives every option and returns the ones to show, " +
        "ALREADY ORDERED — a per-item predicate could not re-rank.",
    },
    maxVisible: {
      control: "number",
      description:
        "Cap on rendered rows; the overflow is announced through `labels.showingFirst`. Default 100; `-1` " +
        "renders every match.",
    },
    portal: {
      control: "boolean",
      description: "Render the panel into document.body so it escapes an ancestor's `overflow: hidden`. Default true.",
    },
    anchor: {
      control: false,
      description:
        "What the panel is positioned against. An element, a ref, or a virtual element — which is how a panel " +
        "follows the caret inside a textarea instead of the field box.",
    },
    emptyMessage: {
      control: false,
      description: "Rich empty state. Plain copy belongs in `labels.empty`, which renders when this is omitted.",
    },
    labels: {
      control: false,
      description: "Placeholder, trigger name, listbox name, empty copy and the overflow line — all with defaults",
    },
    disabled: { control: "boolean", description: "Disables the input and prevents opening the list" },
    readOnly: { control: "boolean", description: "Keeps the value readable but rejects edits" },
    required: { control: "boolean", description: "Marks the underlying form control required" },
    name: { control: "text", description: "Submits the selected value under this name when inside a form" },
    id: { control: "text", description: "Forwarded to the input so an external `<Label htmlFor>` can name it" },
    "aria-label": { control: "text", description: "Accessible name when no visible label is associated" },
    "aria-invalid": {
      control: "boolean",
      description:
        "Passed straight through, never derived — a combobox that flips to “invalid” mid-word announces an " +
        "error the user is still in the middle of fixing.",
    },
    defaultOpen: { control: "boolean", description: "Open the list on first render (uncontrolled)" },
    open: { control: false, description: "Controlled open state; pair with onOpenChange" },
    onOpenChange: { control: false, description: "Callback fired when the list opens or closes" },
    className: { control: "text", description: "Additional CSS classes for the input" },
    contentClassName: { control: "text", description: "Additional CSS classes for the popup surface" },
  },
} satisfies Meta<typeof Combobox>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The everyday shape: a labelled field whose stored value is the id, not the
 * text in the box. Type `bed`, `sensor.bed` or `thermostat` — all three reach
 * the bedroom sensor, because the query is matched against the value and the
 * keywords as well as the label.
 *
 * The `<Label htmlFor>` names the input natively, so no `aria-label` is needed.
 */
export const Default = () => {
  const [value, setValue] = useState("sensor.living_room_temperature");

  return (
    <div className="w-[320px] space-y-2">
      <Label htmlFor="cbx-default">Entity</Label>
      <Combobox id="cbx-default" options={entities} value={value} onValueChange={setValue} />
      <Text size="xs" tone="muted">
        Stored value: {value || "(unset)"}
      </Text>
    </div>
  );
};

/**
 * The list as it opens. Label on the left, `meta` on the right, and a check in
 * the fixed-width gutter that marks the selected row — selection is a glyph
 * AND a weight change, never a tint alone (SC 1.4.1).
 *
 * "Hallway light" is `disabled`. It is still rendered and the arrow keys still
 * reach it: the APG asks for disabled options to stay discoverable, and what
 * matters is that Enter refuses to commit one.
 */
export const Open: Story = {
  args: {
    defaultValue: "sensor.kitchen_temperature",
    defaultOpen: true,
  },
  render: (args) => (
    <div className="h-[380px] w-[320px]">
      <Combobox {...args} />
    </div>
  ),
};

/** No option chosen yet — the placeholder carries the affordance, the chevron says a list exists. */
export const Unset: Story = {
  args: { defaultValue: "" },
  render: (args) => (
    <div className="w-[320px]">
      <Combobox {...args} />
    </div>
  ),
};

/**
 * The reason the panel is portalled by default. This card clips its own
 * content (`overflow-hidden`, the standard recipe for keeping a rounded corner
 * rounded), and an in-flow dropdown would be sliced off at the bottom edge.
 */
export const InsideAClippingCard: Story = {
  args: {
    defaultValue: "person.alex",
    defaultOpen: true,
  },
  render: (args) => (
    <div className="h-[380px] w-[340px]">
      <div className="overflow-hidden rounded-lg border bg-card p-4">
        <Text size="sm" weight="medium" className="mb-2 block">
          Data source
        </Text>
        <Combobox {...args} />
      </div>
    </div>
  ),
};

/**
 * Nothing matched. The empty message is a polite live region that stays
 * mounted and swaps its children (SC 4.1.3) — a conditionally rendered live
 * region is not announced by every screen reader.
 */
export const NoMatches: Story = {
  args: {
    defaultOpen: true,
    query: "zzz",
    labels: { empty: "No entity matches that" },
  },
  render: (args) => (
    <div className="h-[200px] w-[320px]">
      <Combobox {...args} />
    </div>
  ),
};

/**
 * `emptyMessage` takes a node, so "nothing matched" can offer the way out
 * instead of just reporting the dead end. Plain copy still belongs in
 * `labels.empty`; this is for when the empty state has an action in it.
 */
export const EmptyStateWithAnAction: Story = {
  args: {
    defaultOpen: true,
    query: "zzz",
    emptyMessage: (
      <div className="space-y-1 px-1 py-2">
        <Text size="sm" weight="medium" className="block">
          No entity matches that
        </Text>
        <Text size="xs" tone="muted" className="block">
          Check the integration is connected in Home Assistant.
        </Text>
      </div>
    ),
  },
  render: (args) => (
    <div className="h-[220px] w-[320px]">
      <Combobox {...args} />
    </div>
  ),
};

/**
 * Four hundred options is the case that makes this control necessary and the
 * case that must not mount four hundred rows. `maxVisible` caps the render and
 * the overflow is announced politely at the foot of the list — the only place
 * the user is told the list is not the whole truth.
 */
export const Truncated: Story = {
  args: {
    options: Array.from({ length: 400 }, (_, i) => ({
      value: `zone-${i}`,
      label: `Zone ${i}`,
      meta: `${i} tiles`,
    })),
    maxVisible: 5,
    defaultOpen: true,
  },
  render: (args) => (
    <div className="h-[320px] w-[320px]">
      <Combobox {...args} />
    </div>
  ),
};

/**
 * A custom `filter` receives the whole array and returns the rows to show, in
 * order — which is what lets it re-rank. Here exact prefix matches float to
 * the top, something a per-item predicate structurally cannot do.
 *
 * Compose it from the exported `defaultComboboxFilter` rather than restating
 * the matching rule to change the ordering.
 */
export const CustomRanking = () => {
  const [value, setValue] = useState("");
  const filter = useMemo(
    () => (options: readonly ComboboxOption[], query: string) => {
      const matches = defaultComboboxFilter(options, query);
      const q = query.trim().toLowerCase();
      if (q === "") return matches;
      return matches
        .slice()
        .sort(
          (a, b) =>
            Number(String(b.label).toLowerCase().startsWith(q)) - Number(String(a.label).toLowerCase().startsWith(q)),
        );
    },
    [],
  );

  return (
    <div className="w-[320px] space-y-2">
      <Label htmlFor="cbx-rank">Entity</Label>
      <Combobox id="cbx-rank" options={entities} value={value} onValueChange={setValue} filter={filter} />
      <Text size="xs" tone="muted">
        Type “k” — Kitchen ranks above the rows that only match on their id.
      </Text>
    </div>
  );
};

/**
 * The two-step flow, which is deliberately two Comboboxes rather than a prop:
 * pick an entity, then one of THAT entity's attributes. The second field's
 * `options` are derived from the first's `value`, and choosing a new entity
 * clears the attribute rather than leaving a stale one behind.
 */
const attributes: Record<string, ComboboxOption[]> = {
  "sensor.living_room_temperature": [
    { value: "state", label: "State", meta: "21.5" },
    { value: "unit_of_measurement", label: "Unit", meta: "°C" },
    { value: "friendly_name", label: "Friendly name", meta: "Living room" },
  ],
  "binary_sensor.front_door": [
    { value: "state", label: "State", meta: "closed" },
    { value: "device_class", label: "Device class", meta: "door" },
  ],
};

export const TwoStep = () => {
  const [entity, setEntity] = useState("sensor.living_room_temperature");
  const [attribute, setAttribute] = useState("state");

  return (
    <div className="w-[320px] space-y-4">
      <div className="space-y-2">
        <Label htmlFor="cbx-entity">Entity</Label>
        <Combobox
          id="cbx-entity"
          options={entities}
          value={entity}
          onValueChange={(next) => {
            setEntity(next);
            setAttribute("");
          }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="cbx-attribute">Attribute</Label>
        <Combobox
          id="cbx-attribute"
          options={attributes[entity] ?? []}
          value={attribute}
          onValueChange={setAttribute}
          labels={{ empty: "This entity exposes no attributes" }}
        />
      </div>
      <Text size="xs" tone="muted">
        Template value: {entity && attribute ? `{{ ${entity}.${attribute} }}` : "(incomplete)"}
      </Text>
    </div>
  );
};

/**
 * The caret case, which is why `anchor` exists. `VariableAutocompleteTextarea`
 * filters `{{plugin.field}}` tokens against the word behind the caret in a
 * `<textarea>`, and the panel has to hang off the caret rather than off a
 * field box. The host owns the text (`query` is controlled) and hands the
 * component a virtual anchor — anything with `getBoundingClientRect`.
 *
 * The anchor here is a fixed rect so the story is deterministic; a real host
 * measures the caret.
 */
export const CaretAnchored = () => {
  const [query, setQuery] = useState("weather");
  const [inserted, setInserted] = useState("");
  const anchor = useMemo(
    () => ({
      getBoundingClientRect: () => new DOMRect(0, 0, 0, 0),
    }),
    [],
  );

  return (
    <div className="w-[360px] space-y-2">
      <Label htmlFor="cbx-caret">Token</Label>
      <Combobox
        id="cbx-caret"
        options={entities}
        query={query}
        onQueryChange={setQuery}
        onValueChange={setInserted}
        anchor={anchor}
      />
      <Text size="xs" tone="muted">
        Inserted: {inserted ? `{{ ${inserted} }}` : "(nothing yet)"}
      </Text>
    </div>
  );
};

/**
 * The package ships English defaults and no i18n runtime, so every string the
 * component renders itself is a key on `labels` — placeholder, trigger name,
 * listbox name, empty copy, and the overflow line, which is a FUNCTION so a
 * translation can reorder its two numbers instead of receiving fragments.
 */
export const LocalizedLabels: Story = {
  args: {
    defaultOpen: true,
    maxVisible: 3,
    "aria-label": "Entität",
    labels: {
      placeholder: "Entitäten durchsuchen",
      trigger: "Optionen anzeigen",
      list: "Entitäten",
      empty: "Keine Treffer",
      showingFirst: (shown, total) => `Erste ${shown} von ${total}`,
    },
  },
  render: (args) => (
    <div className="h-[280px] w-[320px]">
      <Combobox {...args} />
    </div>
  ),
};

/**
 * Hostile content. Entity ids run long, and a name is not allowed to shove the
 * `meta` column off the row: the label truncates, `meta` and the check gutter
 * keep their width, and the field shows the head of the name rather than
 * growing.
 */
export const LongLabelTruncation: Story = {
  args: {
    defaultValue: "sensor.basement_utility_room_dehumidifier_relative_humidity",
    defaultOpen: true,
    options: [
      {
        value: "sensor.basement_utility_room_dehumidifier_relative_humidity",
        label: "Basement utility room dehumidifier relative humidity",
        meta: "62%",
      },
      { value: "sensor.garage_door_position_percentage", label: "Garage door position percentage", meta: "0%" },
      { value: "sensor.attic", label: "Attic", meta: "11.0°C" },
    ],
  },
  render: (args) => (
    <div className="h-[240px] w-[260px]">
      <Combobox {...args} />
    </div>
  ),
};

/** Disabled: the value stays readable, the list cannot be opened. */
export const Disabled: Story = {
  args: {
    defaultValue: "sensor.outdoor_temperature",
    disabled: true,
  },
  render: (args) => (
    <div className="w-[320px]">
      <Combobox {...args} />
    </div>
  ),
};
