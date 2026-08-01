import type { Meta, StoryObj } from "@storybook/react";

import { Label } from "./label";
import { Switch } from "./switch";

const meta = {
  title: "UI/Switch",
  component: Switch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    checked: {
      control: "boolean",
      description: "Controlled checked state; pair with onCheckedChange",
    },
    defaultChecked: {
      control: "boolean",
      description: "Initial checked state (uncontrolled)",
    },
    onCheckedChange: {
      control: false,
      description: "Callback fired when the checked state changes",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    readOnly: {
      control: "boolean",
      description: "Whether the user can toggle the switch",
    },
    required: {
      control: "boolean",
      description: "Marks the switch as required before form submission",
    },
    name: {
      control: "text",
      description: "Name submitted with the owning form",
    },
    "aria-label": {
      control: "text",
      description: "Accessible name when no visible label is associated",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the root element",
    },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultChecked: false,
    disabled: false,
    "aria-label": "Toggle setting",
  },
};

export const Checked: Story = {
  args: {
    defaultChecked: true,
    "aria-label": "Toggle setting",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    "aria-label": "Toggle setting",
  },
};

export const DisabledChecked: Story = {
  args: {
    disabled: true,
    defaultChecked: true,
    "aria-label": "Toggle setting",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Switch id="airplane-mode" />
      <Label htmlFor="airplane-mode">Airplane Mode</Label>
    </div>
  ),
};

export const FormExample: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between w-64">
        <Label htmlFor="notifications">Notifications</Label>
        <Switch id="notifications" defaultChecked />
      </div>
      <div className="flex items-center justify-between w-64">
        <Label htmlFor="marketing">Marketing emails</Label>
        <Switch id="marketing" />
      </div>
      <div className="flex items-center justify-between w-64">
        <Label htmlFor="security">Security alerts</Label>
        <Switch id="security" defaultChecked />
      </div>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Interactive States</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch id="unchecked" />
            <Label htmlFor="unchecked">Unchecked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="checked" defaultChecked />
            <Label htmlFor="checked">Checked</Label>
          </div>
        </div>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Disabled States</h3>
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <Switch id="disabled-unchecked" disabled />
            <Label htmlFor="disabled-unchecked">Disabled Unchecked</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="disabled-checked" disabled defaultChecked />
            <Label htmlFor="disabled-checked">Disabled Checked</Label>
          </div>
        </div>
      </div>
    </div>
  ),
};
