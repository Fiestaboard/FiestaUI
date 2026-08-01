import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { PageToolbar } from "./page-toolbar";

const meta = {
  title: "Chrome/PageToolbar",
  component: PageToolbar,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    left: {
      description: "Left slot — filters, counts, status badges. Omit to right-align the actions.",
      control: false,
    },
    right: { description: "Right slot — page-level actions. Omit to left-align the info cluster.", control: false },
    className: { control: false },
  },
} satisfies Meta<typeof PageToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    left: (
      <>
        <Badge>4 pages</Badge>
        <Badge variant="secondary">2 scheduled</Badge>
      </>
    ),
    right: (
      <>
        <Button variant="outline">Import</Button>
        <Button variant="brand">New page</Button>
      </>
    ),
  },
};

export const LeftOnly: Story = {
  args: {
    left: <Badge variant="secondary">Read-only view</Badge>,
  },
};

export const RightOnly: Story = {
  args: {
    right: <Button variant="brand">New page</Button>,
  },
};
