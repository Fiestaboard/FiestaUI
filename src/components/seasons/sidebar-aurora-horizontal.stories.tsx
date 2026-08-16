import type { Meta, StoryObj } from "@storybook/react";

import { PRIDE_SEASON } from "../../lib/seasons";
import { SidebarAuroraHorizontal } from "./sidebar-aurora-horizontal";

const meta = {
  title: "App/Seasons/SidebarAuroraHorizontal",
  component: SidebarAuroraHorizontal,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "The horizontal counterpart of SidebarAurora, used by the mobile header bar during festive seasons. Purely decorative (`aria-hidden`) — the canvas fills a positioned, rounded parent and runs the color ramp left to right with a soft glow rising from the bottom edge.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    colors: {
      description: "Up to six hex color stops, left → right. Defaults to the pride flag palette.",
      control: "object",
    },
  },
  decorators: [
    // Mirrors the mobile header: a short, wide gradient bar the canvas fills.
    (Story) => (
      <div className="sidebar-gradient-horizontal relative h-14 w-full sm:w-96 overflow-hidden rounded-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SidebarAuroraHorizontal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { colors: PRIDE_SEASON.colors },
};

export const CustomColors: Story = {
  args: {
    colors: ["#0ea5e9", "#22d3ee", "#34d399", "#a3e635", "#fbbf24", "#fb7185"],
  },
};
