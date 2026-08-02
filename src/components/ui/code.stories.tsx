import type { Meta, StoryObj } from "@storybook/react";

import { Code } from "./code";
import { Text } from "./text";

const meta = {
  title: "UI/Code",
  component: Code,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Code>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "npm run vrt:update",
  },
};

export const InSentence: Story = {
  render: () => (
    <Text size="base">
      Set <Code>{"{{weather.temp}}"}</Code> in the template, then save.
    </Text>
  ),
};
