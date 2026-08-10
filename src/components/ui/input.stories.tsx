import type { Meta, StoryObj } from "@storybook/react";
import { Search } from "lucide-react";

import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    type: {
      control: "select",
      options: ["text", "password", "email", "number", "file", "search", "url", "tel", "date", "time"],
      description: "HTML input type",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text shown when the input is empty",
    },
    defaultValue: {
      control: "text",
      description: "Uncontrolled initial value",
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
      description: "Additional Tailwind classes merged onto the input",
    },
  },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    type: "text",
    placeholder: "Enter text...",
    "aria-label": "Text input",
  },
};

export const Email: Story = {
  args: {
    type: "email",
    placeholder: "user@example.com",
    "aria-label": "Email address",
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Enter password...",
    "aria-label": "Password",
  },
};

export const NumberInput: Story = {
  args: {
    type: "number",
    placeholder: "0",
    "aria-label": "Quantity",
  },
};

export const File: Story = {
  args: {
    type: "file",
    "aria-label": "Upload file",
  },
};

export const Disabled: Story = {
  args: {
    type: "text",
    placeholder: "Disabled input",
    disabled: true,
    "aria-label": "Disabled input",
  },
};

export const ReadOnly: Story = {
  args: {
    type: "text",
    defaultValue: "Read-only value",
    readOnly: true,
    "aria-label": "Read-only input",
  },
};

export const WithValue: Story = {
  args: {
    type: "text",
    defaultValue: "Pre-filled value",
    "aria-label": "Example input",
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="with-label-email">Email</Label>
      <Input id="with-label-email" {...args} />
    </div>
  ),
  args: {
    type: "email",
    placeholder: "Email",
  },
};

export const WithIcon: Story = {
  render: (args) => (
    <div className="relative w-full max-w-sm">
      <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input {...args} className="pl-8" />
    </div>
  ),
  args: {
    type: "search",
    placeholder: "Search...",
    "aria-label": "Search",
  },
};

export const Invalid: Story = {
  render: (args) => (
    <div className="grid w-full max-w-sm items-center gap-1.5">
      <Label htmlFor="invalid-username">Username</Label>
      <Input id="invalid-username" aria-describedby="invalid-username-error" {...args} />
      <p id="invalid-username-error" className="text-sm text-destructive">
        This username is already taken.
      </p>
    </div>
  ),
  args: {
    type: "text",
    defaultValue: "admin",
    // aria-invalid alone is enough — Input carries the destructive recipe.
    "aria-invalid": true,
  },
};

export const AllTypes: Story = {
  render: () => (
    <div className="flex w-full sm:w-80 flex-col gap-4">
      <Input type="text" placeholder="Text input" aria-label="Text" />
      <Input type="email" placeholder="Email input" aria-label="Email" />
      <Input type="password" placeholder="Password input" aria-label="Password" />
      <Input type="number" placeholder="Number input" aria-label="Number" />
      <Input type="search" placeholder="Search input" aria-label="Search" />
      <Input type="url" placeholder="URL input" aria-label="URL" />
      <Input type="tel" placeholder="Telephone input" aria-label="Telephone" />
      <Input type="file" aria-label="File upload" />
      <Input type="text" placeholder="Disabled input" aria-label="Disabled" disabled />
    </div>
  ),
  args: {},
};

export const LoginForm: Story = {
  render: () => (
    <form className="w-full sm:w-80 space-y-4" onSubmit={(event) => event.preventDefault()}>
      <div className="grid gap-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input id="login-email" type="email" placeholder="user@example.com" autoComplete="email" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          placeholder="Enter password"
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" className="w-full">
        Sign in
      </Button>
    </form>
  ),
  args: {},
};
