import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { TooltipProvider } from "../ui/tooltip";
import { BoardSelector } from "./board-selector";

const BOARDS = [
  { id: "living-room", name: "Living Room" },
  { id: "kitchen", name: "Kitchen" },
  { id: "office", name: "" },
];

const LABELS = { boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" };

const meta = {
  title: "Chrome/BoardSelector",
  component: BoardSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={0}>
        {/* The selector reads sidebar tokens — show it on the gradient. */}
        <div className="sidebar-gradient w-64 rounded-xl p-4">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
} satisfies Meta<typeof BoardSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    boards: BOARDS,
    value: "living-room",
    onChange: () => {},
    labels: LABELS,
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <BoardSelector {...args} value={value} onChange={setValue} />;
  },
};

export const Collapsed: Story = {
  args: {
    boards: BOARDS,
    value: "kitchen",
    onChange: () => {},
    labels: LABELS,
    collapsed: true,
  },
};

export const MobileHeader: Story = {
  args: {
    boards: BOARDS,
    value: "living-room",
    onChange: () => {},
    labels: LABELS,
    variant: "mobileHeader",
  },
};
