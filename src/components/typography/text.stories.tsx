import type { Meta, StoryObj } from "@storybook/react";

import { Stack } from "../layout/stack";
import { Text } from "./text";

const meta = {
  title: "Primitives/Typography/Text",
  component: Text,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    as: {
      control: "select",
      options: ["p", "span"],
      description: "Rendered element (block paragraph or inline span)",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "base", "lg"],
      description: "Font size step",
    },
    tone: {
      control: "select",
      options: ["default", "muted", "destructive", "info", "success", "warning"],
      description: "Text color from the status token set",
    },
    weight: {
      control: "select",
      options: ["normal", "medium", "semibold"],
      description: "Font weight",
    },
  },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Body copy rendered as a paragraph at the app's default text-sm.",
  },
};

export const Tones: Story = {
  render: () => (
    <Stack gap="1">
      <Text>default — primary body copy</Text>
      <Text tone="muted">muted — secondary description text</Text>
      <Text tone="destructive">destructive — error message</Text>
      <Text tone="info">info — informational note</Text>
      <Text tone="success">success — confirmation</Text>
      <Text tone="warning">warning — caution</Text>
    </Stack>
  ),
};

export const Sizes: Story = {
  render: () => (
    <Stack gap="1">
      <Text size="xs">size="xs" — fine print, timestamps</Text>
      <Text size="sm">size="sm" — the app default body size</Text>
      <Text size="lg">size="lg" — emphasized body copy</Text>
      <Text weight="medium">weight="medium" — emphasized default-size copy</Text>
    </Stack>
  ),
};

export const InlineSpan: Story = {
  render: () => (
    <Text size="base">
      Sentence with an{" "}
      <Text as="span" weight="semibold">
        inline emphasized
      </Text>{" "}
      fragment.
    </Text>
  ),
};
