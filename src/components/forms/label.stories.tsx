import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "./input";
import { Label } from "./label";
import { Switch } from "./switch";
import { Textarea } from "./textarea";

const meta = {
  title: "Forms/Label",
  component: Label,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: "text",
      description: "Label text content",
    },
    htmlFor: {
      control: "text",
      description: "The id of the form control this label describes",
    },
    className: {
      control: "text",
      description: "Additional Tailwind classes merged onto the label",
    },
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Label text",
  },
};

export const WithInput: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="label-name" {...args} />
      <Input type="text" id="label-name" placeholder="Enter your name" />
    </div>
  ),
  args: {
    children: "Name",
  },
};

export const WithSwitch: Story = {
  render: (args) => (
    <div className="flex items-center space-x-2">
      <Switch id="label-airplane-mode" />
      <Label htmlFor="label-airplane-mode" {...args} />
    </div>
  ),
  args: {
    children: "Airplane Mode",
  },
};

export const WithTextarea: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="label-message" {...args} />
      <Textarea id="label-message" placeholder="Enter your message..." />
    </div>
  ),
  args: {
    children: "Message",
  },
};

export const Required: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="label-required" {...args}>
        {args.children}
        <span className="text-destructive" aria-hidden="true">
          {" "}
          *
        </span>
      </Label>
      <Input type="email" id="label-required" placeholder="user@example.com" required aria-required="true" />
    </div>
  ),
  args: {
    children: "Email",
  },
};

export const Disabled: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Input type="text" id="label-disabled-input" placeholder="Disabled" disabled className="peer order-2" />
      <Label htmlFor="label-disabled-input" className="order-1" {...args} />
    </div>
  ),
  args: {
    children: "Disabled field",
  },
};

export const SettingsFormExample: Story = {
  render: () => (
    <form className="w-full sm:w-80 space-y-4" onSubmit={(event) => event.preventDefault()}>
      <div className="grid gap-1.5">
        <Label htmlFor="settings-display-name">Display name</Label>
        <Input id="settings-display-name" type="text" placeholder="Board nickname" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="settings-bio">Bio</Label>
        <Textarea id="settings-bio" placeholder="A short description..." />
      </div>
      <div className="flex items-center justify-between">
        <Label htmlFor="settings-notifications">Email notifications</Label>
        <Switch id="settings-notifications" defaultChecked />
      </div>
    </form>
  ),
  args: {
    children: "Settings",
  },
};
