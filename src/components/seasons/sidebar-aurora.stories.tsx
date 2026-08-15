import type { Meta, StoryObj } from "@storybook/react";

import { PRIDE_SEASON } from "../../lib/seasons";
import { SidebarAurora } from "./sidebar-aurora";

const meta = {
  title: "App/Seasons/SidebarAurora",
  component: SidebarAurora,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "WebGL2 aurora shimmer for the desktop sidebar during festive seasons. Purely decorative (`aria-hidden`) — the canvas fills a positioned, rounded parent (here the sidebar gradient) and animates the color ramp top to bottom.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    colors: {
      description: "Up to six hex color stops, top → bottom. Defaults to the pride flag palette.",
      control: "object",
    },
  },
  decorators: [
    // The canvas sizes itself to its parent — give it the same positioned,
    // rounded gradient surface the real sidebar provides.
    (Story) => (
      <div className="sidebar-gradient relative h-64 w-72 overflow-hidden rounded-[14px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SidebarAurora>;

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
