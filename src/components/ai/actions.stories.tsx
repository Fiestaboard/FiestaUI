import type { Meta, StoryObj } from "@storybook/react";
import { Copy, RotateCcw, Undo2 } from "lucide-react";

import { Action, Actions } from "./actions";

const meta = {
  title: "AI/Actions",
  component: Action,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text", description: "Required: the accessible name and the tooltip." },
    children: { control: false, description: "The icon." },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof Action>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { label: "Copy" },
  render: (args) => (
    <Action {...args}>
      <Copy />
    </Action>
  ),
};

/** The row under an assistant turn. */
export const Row = () => (
  <Actions>
    <Action label="Copy">
      <Copy />
    </Action>
    <Action label="Retry">
      <RotateCcw />
    </Action>
    <Action label="Undo">
      <Undo2 />
    </Action>
  </Actions>
);
