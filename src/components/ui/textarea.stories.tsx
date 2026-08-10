import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Textarea } from "./textarea";

const meta = {
  title: "UI/Textarea",
  component: Textarea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    placeholder: {
      control: "text",
      description: "Placeholder text shown when the textarea is empty",
    },
    defaultValue: {
      control: "text",
      description: "Uncontrolled initial value",
    },
    rows: {
      control: "number",
      description: "Number of visible text rows",
    },
    maxLength: {
      control: "number",
      description: "Maximum number of characters allowed",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state (dimmed, not focusable)",
    },
    readOnly: {
      control: "boolean",
      description: "Read-only state (focusable, value not editable)",
    },
    required: {
      control: "boolean",
      description: "Marks the field as required for form validation",
    },
    "aria-invalid": {
      control: "boolean",
      description: "Marks the value as invalid for assistive technology",
    },
    className: {
      control: "text",
      description: "Additional Tailwind classes merged onto the textarea",
    },
  },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Type something...",
    "aria-label": "Default textarea",
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="textarea-message">Message</Label>
      <Textarea id="textarea-message" {...args} />
    </div>
  ),
  args: {
    placeholder: "Enter your message...",
  },
};

export const Disabled: Story = {
  args: {
    placeholder: "This textarea is disabled",
    disabled: true,
    "aria-label": "Disabled textarea",
  },
};

export const ReadOnly: Story = {
  args: {
    defaultValue: "This content cannot be edited, but can be selected and copied.",
    readOnly: true,
    "aria-label": "Read-only textarea",
  },
};

export const FixedRows: Story = {
  args: {
    rows: 8,
    placeholder: "Eight visible rows...",
    "aria-label": "Tall textarea",
  },
};

export const Invalid: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="textarea-invalid">Description</Label>
      <Textarea id="textarea-invalid" aria-describedby="textarea-invalid-error" {...args} />
      <p id="textarea-invalid-error" className="text-sm text-destructive">
        Description must be at least 20 characters.
      </p>
    </div>
  ),
  args: {
    defaultValue: "Too short",
    // aria-invalid alone is enough — Textarea carries the destructive recipe.
    "aria-invalid": true,
  },
};

export const WithCharacterCount: Story = {
  render: function Render(args) {
    const { defaultValue, ...rest } = args;
    const [value, setValue] = React.useState(String(defaultValue ?? ""));
    const maxLength = rest.maxLength ?? 140;
    return (
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label htmlFor="textarea-count">Status update</Label>
        <Textarea
          {...rest}
          id="textarea-count"
          maxLength={maxLength}
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        <p className="text-right text-xs text-muted-foreground">
          {value.length}/{maxLength}
        </p>
      </div>
    );
  },
  args: {
    placeholder: "What's happening?",
    maxLength: 140,
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex w-full sm:w-80 flex-col gap-4">
      <div className="grid gap-1.5">
        <Label htmlFor="textarea-empty">Empty</Label>
        <Textarea id="textarea-empty" placeholder="Empty textarea" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="textarea-prefilled">Pre-filled</Label>
        <Textarea id="textarea-prefilled" defaultValue="This textarea has content already." />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="textarea-long">Long content</Label>
        <Textarea
          id="textarea-long"
          rows={5}
          defaultValue={"Line one\nLine two\nLine three\nLine four\nLine five\nLine six"}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="textarea-disabled-filled">Disabled with content</Label>
        <Textarea id="textarea-disabled-filled" defaultValue="Read-only content" disabled />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="textarea-disabled-empty">Disabled empty</Label>
        <Textarea id="textarea-disabled-empty" placeholder="Cannot type here" disabled />
      </div>
    </div>
  ),
  args: {},
};

export const FeedbackFormExample: Story = {
  render: () => (
    <form className="w-full sm:w-80 space-y-4" onSubmit={(event) => event.preventDefault()}>
      <div className="grid gap-1.5">
        <Label htmlFor="feedback-subject">Subject</Label>
        <Input id="feedback-subject" type="text" placeholder="Brief summary" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="feedback-details">Details</Label>
        <Textarea id="feedback-details" rows={5} placeholder="Tell us what happened..." required />
      </div>
      <Button type="submit" className="w-full">
        Send feedback
      </Button>
    </form>
  ),
  args: {},
};
