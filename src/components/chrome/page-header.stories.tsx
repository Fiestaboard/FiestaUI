import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, Puzzle } from "lucide-react";

import { Button } from "../forms/button";
import { PageHeader, PageIconGradientDefs } from "./page-header";

const meta = {
  title: "App/Chrome/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <>
        <PageIconGradientDefs />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Calendar,
    title: "Schedule",
    description: "Decide what your board shows and when.",
  },
};

export const WithActions: Story = {
  args: {
    icon: Puzzle,
    title: "Integrations",
    description: "Connect data sources to your board.",
    children: (
      <div className="mt-3">
        <Button variant="brand">Browse plugins</Button>
      </div>
    ),
  },
};
