import type { Meta, StoryObj } from "@storybook/react";

import { BarList } from "./bar-list";

const meta = {
  title: "Data/BarList",
  component: BarList,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    items: {
      control: false,
      description:
        "Rows to render, in the order given (the component never sorts). Each carries `key`, `label` (any " +
        "ReactNode), `value`, and an optional `renderLabel` render prop for router links.",
    },
    max: {
      control: "number",
      description:
        "Value that fills the track completely. Defaults to the largest item value (a ranking's natural scale); " +
        "pass explicitly when rows share an external scale. Values beyond it clamp to a full bar.",
    },
    formatValue: {
      control: false,
      description: 'Formats the visible value text. Defaults to `toLocaleString()`, so 5612 reads as "5,612".',
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof BarList>;

export default meta;
type Story = StoryObj<typeof meta>;

const ranking = [
  { key: "clock", label: "clock", value: 943 },
  { key: "weather", label: "weather", value: 611 },
  { key: "countdown", label: "countdown", value: 380 },
  { key: "stocks", label: "stocks", value: 214 },
  { key: "guest-message", label: "guest-message", value: 97 },
];

/** The docs "Popularity ranking" shape: rows pre-sorted by the caller, leader spanning the full track. */
export const Default: Story = {
  render: (args) => (
    <div className="w-full sm:w-[480px]">
      <BarList {...args} />
    </div>
  ),
  args: {
    items: ranking,
  },
};

/**
 * Labels as links via `renderLabel` — the `renderLink` house pattern (Sidebar,
 * PluginCard). The className must land on the link so truncation clips the
 * anchor itself; apps pass their router's Link in place of this `<a>`.
 */
export const LinkedLabels: Story = {
  render: (args) => (
    <div className="w-full sm:w-[480px]">
      <BarList {...args} />
    </div>
  ),
  args: {
    items: ranking.map((item) => ({
      ...item,
      renderLabel: ({ className, children }: { className: string; children: React.ReactNode }) => (
        <a href={`#${item.key}`} className={`${className} hover:underline`}>
          {children}
        </a>
      ),
    })),
  },
};

/**
 * The edge geometry, all on one explicit `max={500}` scale: a value at max
 * fills the track exactly, a value beyond max clamps to a full bar while the
 * text reports the real number, a small value keeps a 2px sliver, and a true
 * zero renders no fill at all — "none" and "almost none" must not look alike.
 */
export const ZeroMaxAndOverflow: Story = {
  render: (args) => (
    <div className="w-full sm:w-[480px]">
      <BarList {...args} />
    </div>
  ),
  args: {
    max: 500,
    items: [
      { key: "over", label: "beyond max (clamped)", value: 742 },
      { key: "at-max", label: "exactly max", value: 500 },
      { key: "half", label: "half", value: 250 },
      { key: "sliver", label: "almost none", value: 1 },
      { key: "zero", label: "zero", value: 0 },
    ],
  },
};

/**
 * The label column is capped at 40% of the list width, so a long label
 * truncates with an ellipsis instead of starving the track; short labels keep
 * the column narrow because it auto-sizes to content across all rows.
 */
export const LongLabelTruncation: Story = {
  render: (args) => (
    <div className="w-full sm:w-[480px]">
      <BarList {...args} />
    </div>
  ),
  args: {
    items: [
      {
        key: "long",
        label: "an-unreasonably-long-plugin-name-that-must-truncate-not-squeeze-the-track",
        value: 522,
      },
      { key: "short", label: "clock", value: 943 },
      { key: "medium", label: "guest-message", value: 97 },
    ],
  },
};

/** `formatValue` reshapes the text column — here a shared-scale percentage breakdown summing to 100. */
export const CustomValueFormat: Story = {
  render: (args) => (
    <div className="w-full sm:w-[480px]">
      <BarList {...args} />
    </div>
  ),
  args: {
    max: 100,
    formatValue: (value: number) => `${value}%`,
    items: [
      { key: "flagship", label: "Flagship", value: 62 },
      { key: "mini", label: "Mini", value: 27 },
      { key: "custom", label: "Custom build", value: 11 },
    ],
  },
};
