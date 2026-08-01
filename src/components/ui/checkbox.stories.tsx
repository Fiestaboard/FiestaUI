import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

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
    defaultChecked: {
      control: "boolean",
      description: "Checked on first render (uncontrolled)",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    required: {
      control: "boolean",
      description: "Marks the checkbox as required in forms",
    },
    "aria-label": {
      control: "text",
      description: "Accessible name when no visible label is present",
    },
    checked: {
      control: false,
      description: "Controlled checked state; pair with onChange",
    },
    onChange: {
      control: false,
      description: "Change event handler",
    },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    "aria-label": "Accept terms",
    defaultChecked: false,
    disabled: false,
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

export const Indeterminate = () => (
  <Checkbox
    aria-label="Select some items"
    ref={(el) => {
      if (el) el.indeterminate = true;
    }}
  />
);

export const WithLabel = () => (
  <div className="flex items-center space-x-2">
    <Checkbox id="terms" />
    <Label htmlFor="terms">Accept terms and conditions</Label>
  </div>
);

export const WithDescription = () => (
  <div className="flex items-start space-x-2">
    <Checkbox id="marketing-opt-in" className="mt-0.5" />
    <div className="grid gap-1">
      <Label htmlFor="marketing-opt-in">Marketing emails</Label>
      <p className="text-sm text-muted-foreground">Receive occasional product news. You can unsubscribe anytime.</p>
    </div>
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

export const SelectAll = () => {
  const [selected, setSelected] = useState<Record<string, boolean>>({
    kitchen: true,
    office: false,
    lobby: false,
  });
  const values = Object.values(selected);
  const allChecked = values.every(Boolean);
  const someChecked = values.some(Boolean) && !allChecked;

  return (
    <div className="w-[280px] space-y-3 rounded-lg border p-4">
      <div className="flex items-center space-x-2 border-b pb-3">
        <Checkbox
          id="select-all-boards"
          checked={allChecked}
          ref={(el) => {
            if (el) el.indeterminate = someChecked;
          }}
          onChange={(event) => {
            const next = event.target.checked;
            setSelected({ kitchen: next, office: next, lobby: next });
          }}
        />
        <Label htmlFor="select-all-boards" className="font-medium">
          Select all boards
        </Label>
      </div>
      {(["kitchen", "office", "lobby"] as const).map((board) => (
        <div key={board} className="flex items-center space-x-2">
          <Checkbox
            id={`board-${board}`}
            checked={selected[board]}
            onChange={(event) => setSelected((prev) => ({ ...prev, [board]: event.target.checked }))}
          />
          <Label htmlFor={`board-${board}`} className="capitalize">
            {board} board
          </Label>
        </div>
      ))}
    </div>
  );
};
