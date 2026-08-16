import type { Meta, StoryObj } from "@storybook/react";
import { Monitor, Moon, Sun } from "lucide-react";

import { Label } from "./label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./select";

const meta = {
  title: "Forms/Select",
  component: Select,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    defaultValue: {
      control: "text",
      description: "Initially selected value (uncontrolled)",
    },
    value: {
      control: false,
      description: "Controlled selected value; pair with onValueChange",
    },
    onValueChange: {
      control: false,
      description: "Callback fired with the newly selected value",
    },
    disabled: {
      control: "boolean",
      description: "Disables the trigger and prevents opening the listbox",
    },
    required: {
      control: "boolean",
      description: "Marks the underlying form control as required",
    },
    name: {
      control: "text",
      description: "Name of the hidden input submitted with forms",
    },
    defaultOpen: {
      control: "boolean",
      description: "Whether the listbox is initially open",
    },
    open: {
      control: false,
      description: "Controlled open state of the listbox",
    },
    modal: {
      control: "boolean",
      description: "Whether opening blocks interaction with the rest of the page",
    },
    children: {
      control: false,
      description: "SelectTrigger and SelectContent sub-components",
    },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    disabled: false,
    required: false,
  },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-[180px]" aria-label="Fruit">
        <SelectValue placeholder="Select a fruit" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
        <SelectItem value="grape">Grape</SelectItem>
        <SelectItem value="orange">Orange</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithDefaultValue: Story = {
  args: {
    defaultValue: "banana",
  },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-[180px]" aria-label="Fruit">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">Apple</SelectItem>
        <SelectItem value="banana">Banana</SelectItem>
        <SelectItem value="cherry">Cherry</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const WithGroups: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[280px]" aria-label="Timezone">
        <SelectValue placeholder="Select a timezone" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>North America</SelectLabel>
          <SelectItem value="est">Eastern Standard Time (EST)</SelectItem>
          <SelectItem value="cst">Central Standard Time (CST)</SelectItem>
          <SelectItem value="mst">Mountain Standard Time (MST)</SelectItem>
          <SelectItem value="pst">Pacific Standard Time (PST)</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Europe</SelectLabel>
          <SelectItem value="gmt">Greenwich Mean Time (GMT)</SelectItem>
          <SelectItem value="cet">Central European Time (CET)</SelectItem>
          <SelectItem value="eet">Eastern European Time (EET)</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  ),
};

export const WithIcons: Story = {
  args: {
    defaultValue: "system",
  },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-[200px]" aria-label="Theme">
        <SelectValue placeholder="Select a theme" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="light">
          <span className="flex items-center gap-2">
            <Sun className="h-4 w-4" aria-hidden="true" />
            Light
          </span>
        </SelectItem>
        <SelectItem value="dark">
          <span className="flex items-center gap-2">
            <Moon className="h-4 w-4" aria-hidden="true" />
            Dark
          </span>
        </SelectItem>
        <SelectItem value="system">
          <span className="flex items-center gap-2">
            <Monitor className="h-4 w-4" aria-hidden="true" />
            System
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => (
    <Select {...args}>
      <SelectTrigger className="w-[180px]" aria-label="Disabled option">
        <SelectValue placeholder="Disabled" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="option">Option</SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const DisabledItems: Story = {
  render: () => (
    <Select>
      <SelectTrigger className="w-[220px]" aria-label="Refresh interval">
        <SelectValue placeholder="Refresh interval" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="1m">Every minute</SelectItem>
        <SelectItem value="5m">Every 5 minutes</SelectItem>
        <SelectItem value="15m" disabled>
          Every 15 minutes (Pro)
        </SelectItem>
        <SelectItem value="1h" disabled>
          Hourly (Pro)
        </SelectItem>
      </SelectContent>
    </Select>
  ),
};

export const FormRow: Story = {
  render: () => (
    <div className="grid w-full sm:w-[320px] gap-1.5">
      <Label htmlFor="notification-sound">Notification sound</Label>
      <Select defaultValue="chime">
        <SelectTrigger id="notification-sound">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="chime">Chime</SelectItem>
          <SelectItem value="ping">Ping</SelectItem>
          <SelectItem value="bell">Bell</SelectItem>
          <SelectItem value="none">None</SelectItem>
        </SelectContent>
      </Select>
      <p className="text-sm text-muted-foreground">Played when a new message arrives.</p>
    </div>
  ),
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-6 w-[280px]">
      <div>
        <h3 className="text-sm font-medium mb-3">Default State</h3>
        <Select>
          <SelectTrigger aria-label="Default option">
            <SelectValue placeholder="Select an option..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
            <SelectItem value="3">Option 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">With Value Selected</h3>
        <Select defaultValue="2">
          <SelectTrigger aria-label="Selected option">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
            <SelectItem value="2">Option 2</SelectItem>
            <SelectItem value="3">Option 3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">Disabled</h3>
        <Select disabled>
          <SelectTrigger aria-label="Disabled option">
            <SelectValue placeholder="Disabled select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Option 1</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <h3 className="text-sm font-medium mb-3">With Groups</h3>
        <Select defaultValue="pst">
          <SelectTrigger aria-label="Timezone">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>US Timezones</SelectLabel>
              <SelectItem value="est">EST</SelectItem>
              <SelectItem value="pst">PST</SelectItem>
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel>Europe</SelectLabel>
              <SelectItem value="gmt">GMT</SelectItem>
              <SelectItem value="cet">CET</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  ),
};
