import type { Meta, StoryObj } from "@storybook/react";

import { StatStrip, StatStripItem } from "./stat-strip";

const meta = {
  title: "Data/StatStrip",
  component: StatStrip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    items: {
      control: "object",
      description:
        "Array of `{ value, label, key? }` pairs rendered in order. Ignored when children are provided instead.",
    },
    tone: {
      control: "select",
      options: ["default", "brand"],
      description:
        "Colour of every value in the strip — `default` is `text-foreground`, `brand` is the docs-header orange. " +
        "Strip-level on purpose: a summary strip is one statement, so its values share one colour.",
    },
    children: {
      control: false,
      description: "Composition form — `StatStripItem` elements, for when a value or label needs custom markup",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof StatStrip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The shape it was promoted for: a page-header summary of two or three headline numbers. */
export const Default: Story = {
  args: {
    items: [
      { value: "52", label: "plugins" },
      { value: "5,612", label: "unique cloners (last 14 days)" },
    ],
  },
};

/**
 * The docs stats header verbatim: brand-coloured values. The tone lives on
 * the strip, not the item — every value in a summary shares one colour.
 */
export const BrandTone: Story = {
  args: {
    tone: "brand",
    items: [
      { value: "52", label: "plugins" },
      { value: "5,612", label: "unique cloners (last 14 days)" },
    ],
  },
};

/**
 * Composition form for when a value needs real markup — here a unit that
 * should not sit at headline size. `StatStripItem` owns the dt/dd ordering
 * so custom markup cannot break the description-list semantics.
 */
export const Composed = () => (
  <StatStrip>
    <StatStripItem
      value={
        <>
          99.4<span className="text-base font-normal text-muted-foreground">%</span>
        </>
      }
      label="uptime"
    />
    <StatStripItem
      value={
        <>
          1.2<span className="text-base font-normal text-muted-foreground">s</span>
        </>
      }
      label="median publish"
    />
    <StatStripItem value="14" label="boards online" />
  </StatStrip>
);

/**
 * Four stats in a narrow column: the strip wraps with a tighter cross-axis
 * gap instead of overflowing, and every row keeps its own value/label
 * baseline. This is the 390px phone rendering — resize to watch the
 * inter-stat gap step from 1.25rem up to 2rem at the `sm` breakpoint.
 */
export const Wrapping = () => (
  <div className="w-full sm:w-[420px]">
    <StatStrip
      tone="brand"
      items={[
        { value: "52", label: "plugins" },
        { value: "5,612", label: "unique cloners (last 14 days)" },
        { value: "943", label: "top plugin clones" },
        { value: "12", label: "categories" },
      ]}
    />
  </div>
);
