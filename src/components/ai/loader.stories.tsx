import type { Meta, StoryObj } from "@storybook/react";

import { Loader } from "./loader";

const meta = {
  title: "AI/Loader",
  component: Loader,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    children: { control: "text", description: "What is happening. Announced politely." },
    label: { control: "text", description: "Announced when there is no visible text." },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof Loader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithText: Story = { args: { children: "Thinking…" } };

export const SpinnerOnly: Story = { args: { label: "Working" } };
