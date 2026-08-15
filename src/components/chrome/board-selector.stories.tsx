import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { TooltipProvider } from "../overlays/tooltip";
import { BoardSelector } from "./board-selector";

const BOARDS = [
  { id: "living-room", name: "Living Room" },
  { id: "kitchen", name: "Kitchen" },
  { id: "office", name: "" },
];

const LABELS = { boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" };

const meta = {
  title: "App/Chrome/BoardSelector",
  component: BoardSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    boards: {
      description: "Boards to offer, in menu order — empty names fall back to the unnamedBoard label.",
      control: "object",
    },
    value: {
      description: "id of the currently selected board.",
      control: "select",
      options: BOARDS.map((b) => b.id),
    },
    onChange: { description: "Called with the newly selected board id.", control: false },
    labels: {
      description: "Localized strings: trigger aria-label, empty placeholder, and unnamed-board fallback.",
      control: "object",
    },
    collapsed: {
      description: "Sidebar-collapsed mode: icon-only trigger with a tooltip naming the current board.",
      control: "boolean",
    },
    variant: {
      description: "Where the selector lives — the sidebar or the compact mobile header bar.",
      control: "inline-radio",
      options: ["sidebar", "mobileHeader"],
    },
  },
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

/** Keyed on args.value so the `value` control re-seeds local selection state. */
function ControlledBoardSelector(args: React.ComponentProps<typeof BoardSelector>) {
  const [value, setValue] = useState(args.value);
  return <BoardSelector {...args} value={value} onChange={setValue} />;
}

export const Default: Story = {
  args: {
    boards: BOARDS,
    value: "living-room",
    onChange: () => {},
    labels: LABELS,
    collapsed: false,
    variant: "sidebar",
  },
  render: function Render(args) {
    return <ControlledBoardSelector key={args.value} {...args} />;
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
