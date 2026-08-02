import type { Meta, StoryObj } from "@storybook/react";

import { Box } from "./box";
import { Text } from "./text";

const meta = {
  title: "UI/Box",
  component: Box,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["div", "section", "main", "nav", "header", "footer", "form", "aside"],
      description: "Rendered element — semantic choice only, Box adds no styling",
    },
  },
} satisfies Meta<typeof Box>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Box className="relative h-24 w-48 rounded-md border">
      <Box className="absolute right-2 top-2 size-3 rounded-full bg-success" />
      <Text tone="muted" className="p-2">
        Positioned overlay host — the kind of custom layout Box exists for.
      </Text>
    </Box>
  ),
};
