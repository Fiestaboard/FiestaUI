import type { Meta, StoryObj } from "@storybook/react";

import { PLUGIN_CATEGORIES, PluginCategoryBadge } from "./plugin-category-badge";

const CATEGORY_LABELS: Record<string, string> = {
  art: "Display Art",
  data: "Data & Information",
  entertainment: "Entertainment",
  home: "Smart Home",
  transit: "Transportation",
  utility: "Utilities",
  weather: "Weather & Environment",
};

const meta = {
  title: "App/Plugin/PluginCategoryBadge",
  component: PluginCategoryBadge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    category: {
      control: "select",
      options: [...PLUGIN_CATEGORIES],
      description: "Manifest category id",
    },
    label: {
      control: "text",
      description: "Localized display name; defaults to the raw category id",
    },
  },
} satisfies Meta<typeof PluginCategoryBadge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    category: "weather",
    label: CATEGORY_LABELS.weather,
  },
};

export const AllCategories: Story = {
  args: { category: "weather" },
  render: () => (
    <div className="flex max-w-md flex-wrap gap-2">
      {PLUGIN_CATEGORIES.map((category) => (
        <PluginCategoryBadge key={category} category={category} label={CATEGORY_LABELS[category]} />
      ))}
    </div>
  ),
};

/** An unrecognised category falls back to the neutral badge rather than going untinted. */
export const UnknownCategory: Story = {
  args: {
    category: "cryptozoology",
    label: "Cryptozoology",
  },
};
