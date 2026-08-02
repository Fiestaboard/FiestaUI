import type { Meta, StoryObj } from "@storybook/react";

import { Heading } from "./heading";
import { Stack } from "./stack";

const meta = {
  title: "UI/Heading",
  component: Heading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    level: {
      control: "select",
      options: [2, 3, 4],
      description: "Semantic heading element (h2–h4); h1 belongs to PageHeader",
    },
    size: {
      control: "select",
      options: ["sm", "base", "lg", "xl"],
      description: "Visual size, decoupled from the semantic level",
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Section heading",
  },
};

export const Levels: Story = {
  render: () => (
    <Stack gap="3">
      <Heading level={2} size="xl">
        h2 rendered at size xl
      </Heading>
      <Heading level={3} size="lg">
        h3 rendered at size lg
      </Heading>
      <Heading level={3}>h3 at the default base size</Heading>
      <Heading level={4} size="sm">
        h4 rendered at size sm
      </Heading>
    </Stack>
  ),
};
