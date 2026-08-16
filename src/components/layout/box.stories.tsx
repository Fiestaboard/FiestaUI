import type { Meta, StoryObj } from "@storybook/react";

import { Text } from "../typography/text";
import { Box } from "./box";

const meta = {
  title: "Primitives/Layout/Box",
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

export const AsSection: Story = {
  render: () => (
    <Box as="section" className="w-64 rounded-md border p-3">
      <Text tone="muted">as="section" — a semantic non-div element with no added styling.</Text>
    </Box>
  ),
};
