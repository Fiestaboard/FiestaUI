import type { Meta, StoryObj } from "@storybook/react";

import { Shimmer } from "./shimmer";

const meta = {
  title: "AI/Shimmer",
  component: Shimmer,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text", description: "The status text. Plain muted text under reduced motion." },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof Shimmer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "Running create_page…" } };
