import type { Meta, StoryObj } from "@storybook/react";

import { FiestaLogo } from "./fiesta-logo";

const meta = {
  title: "Chrome/FiestaLogo",
  component: FiestaLogo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof FiestaLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
  args: { size: "sm" },
};

export const OnSidebarGradient: Story = {
  render: () => (
    <div className="sidebar-gradient rounded-xl p-6">
      <FiestaLogo className="logo-on-gradient" />
    </div>
  ),
};
