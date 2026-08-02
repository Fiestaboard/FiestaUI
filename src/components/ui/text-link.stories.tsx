import type { Meta, StoryObj } from "@storybook/react";

import { Text } from "./text";
import { TextLink } from "./text-link";

const meta = {
  title: "UI/TextLink",
  component: TextLink,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Read the setup guide",
    href: "https://example.com",
  },
};

export const InSentence: Story = {
  render: () => (
    <Text size="base">
      Get an API key from the <TextLink href="https://example.com">provider dashboard</TextLink> first.
    </Text>
  ),
};
