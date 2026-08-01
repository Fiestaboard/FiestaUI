import type { Meta, StoryObj } from "@storybook/react";

import { Checkbox } from "./checkbox";
import { Label } from "./label";

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "Accept terms",
  },
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
    "aria-label": "Accept terms",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    "aria-label": "Accept terms",
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
    "aria-label": "Accept terms",
  },
};

export const WithLabel = () => (
  <div className="flex items-center space-x-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">Accept terms and conditions</Label>
  </div>
);

export const CheckboxList = () => (
  <div className="space-y-3">
    <div className="flex items-center space-x-2">
      <Checkbox id="option-email" defaultChecked />
      <Label htmlFor="option-email">Email notifications</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox id="option-sms" />
      <Label htmlFor="option-sms">SMS notifications</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox id="option-push" defaultChecked />
      <Label htmlFor="option-push">Push notifications</Label>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox id="option-digest" disabled />
      <Label htmlFor="option-digest">Weekly digest (coming soon)</Label>
    </div>
  </div>
);
