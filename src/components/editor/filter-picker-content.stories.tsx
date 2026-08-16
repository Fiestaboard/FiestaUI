import type { Meta, StoryObj } from "@storybook/react";

import { FilterPickerContent } from "./filter-picker-content";

const meta = {
  title: "Editor/FilterPickerContent",
  component: FilterPickerContent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    filters: { control: "object", description: "Filter names as the template engine declares them." },
    editor: {
      control: false,
      description:
        "Live TipTap editor. With one attached the picker applies the filter to the variable under the caret; with `null` it falls back to `onInsert`.",
    },
    onInsert: { control: false, description: "Receives `|filterName` when there is nothing to apply the filter to." },
    labels: { control: "object", description: "Localized filter descriptions and the example line." },
  },
  args: {
    // No editor attached: every click falls through to onInsert, which is the
    // path a host that only wants text insertion takes.
    editor: null,
    onInsert: () => {},
  },
} satisfies Meta<typeof FilterPickerContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    filters: ["wrap", "pad:3", "truncate:10"],
  },
};

/** Nothing declared — the picker says so rather than rendering an empty list. */
export const Empty: Story = {
  args: {
    filters: [],
  },
};
