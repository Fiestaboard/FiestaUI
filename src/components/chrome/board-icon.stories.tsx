import type { Meta, StoryObj } from "@storybook/react";

import { BoardIcon } from "./board-icon";

const meta = {
  title: "Chrome/BoardIcon",
  component: BoardIcon,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Size and color via utility classes — the icon strokes with currentColor",
    },
  },
} satisfies Meta<typeof BoardIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "h-6 w-6",
  },
};

/** Drawn in the lucide style (24×24, stroke, currentColor), so it inherits text color. */
export const SizesAndColors = () => (
  <div className="flex items-end gap-4">
    <BoardIcon className="h-4 w-4" />
    <BoardIcon className="h-6 w-6" />
    <BoardIcon className="h-8 w-8 text-brand" />
    <BoardIcon className="h-10 w-10 text-muted-foreground" />
  </div>
);
