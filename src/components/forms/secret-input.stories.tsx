import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { Button } from "./button";
import { Label } from "./label";
import { SecretInput } from "./secret-input";

const meta = {
  title: "Forms/SecretInput",
  component: SecretInput,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    showLabel: {
      control: "text",
      description: 'Accessible name for the toggle while masked (default "Show")',
    },
    hideLabel: {
      control: "text",
      description: 'Accessible name for the toggle while revealed (default "Hide")',
    },
    defaultVisible: {
      control: "boolean",
      description: "Initial visibility (uncontrolled)",
    },
    visible: {
      control: "boolean",
      description: "Controlled visibility; pair with onVisibleChange",
    },
    onVisibleChange: {
      control: false,
      description: "Callback fired with the next visibility when the toggle is activated",
    },
    revealDisabled: {
      control: "boolean",
      description: "Disables only the toggle — for write-only secrets the server never returns",
    },
    disabled: {
      control: "boolean",
      description: "Disables the field and its toggle",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text shown when the field is empty",
    },
    "aria-invalid": {
      control: "boolean",
      description: "Marks the value as invalid for assistive technology",
    },
    containerClassName: {
      control: "text",
      description: "Classes for the relative wrapper (e.g. flex-1 in a settings row)",
    },
    className: {
      control: "text",
      description: "Additional Tailwind classes merged onto the input",
    },
  },
} satisfies Meta<typeof SecretInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Enter API key...",
    "aria-label": "API key",
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "sk-live-4f9a2c7b18de",
    "aria-label": "API key",
  },
};

export const Revealed: Story = {
  args: {
    defaultValue: "sk-live-4f9a2c7b18de",
    defaultVisible: true,
    "aria-label": "API key",
  },
};

export const WithLabel: Story = {
  render: (args) => (
    <div className="grid w-full sm:w-80 gap-1.5">
      <Label htmlFor="secret-input-token">Enablement token</Label>
      <SecretInput id="secret-input-token" {...args} />
    </div>
  ),
  args: {
    placeholder: "Paste the token from your board",
    autoComplete: "off",
  },
};

/** Localized (or simply more specific) toggle labels — no i18n library involved. */
export const CustomLabels: Story = {
  args: {
    defaultValue: "hunter2-but-longer",
    showLabel: "Reveal password",
    hideLabel: "Mask password",
    "aria-label": "Password",
  },
};

/**
 * Write-only secret: the server returns a placeholder instead of the value, so
 * there is nothing to reveal — the field stays editable, only the toggle is off.
 */
export const RevealDisabled: Story = {
  args: {
    placeholder: "Key is set — type to replace",
    revealDisabled: true,
    "aria-label": "Local API key",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "sk-live-4f9a2c7b18de",
    disabled: true,
    "aria-label": "API key",
  },
};

export const Invalid: Story = {
  render: (args) => (
    <div className="grid w-full sm:w-80 gap-1.5">
      <Label htmlFor="secret-input-invalid">API key</Label>
      <SecretInput id="secret-input-invalid" aria-describedby="secret-input-invalid-error" {...args} />
      <p id="secret-input-invalid-error" className="text-sm text-destructive">
        That key was rejected by the provider.
      </p>
    </div>
  ),
  args: {
    defaultValue: "sk-live-expired",
    "aria-invalid": true,
  },
};

/** Controlled pair — the parent owns visibility and can reset it (e.g. on blur). */
export const Controlled: Story = {
  render: function ControlledSecretInput(args) {
    const [visible, setVisible] = useState(false);
    return (
      <div className="grid w-full sm:w-80 gap-1.5">
        <Label htmlFor="secret-input-controlled">Cloud key</Label>
        <SecretInput
          id="secret-input-controlled"
          {...args}
          visible={visible}
          onVisibleChange={setVisible}
          onBlur={() => setVisible(false)}
        />
        <p className="text-sm text-muted-foreground">
          Visibility: <span className="font-mono">{String(visible)}</span> — re-masks on blur.
        </p>
      </div>
    );
  },
  args: {
    defaultValue: "ck-7d1f-90ab-2e55",
  },
};

/** Dense settings row — the same control at the compact height the app uses. */
export const Compact: Story = {
  render: (args) => (
    <div className="grid w-full sm:w-80 gap-1">
      <Label htmlFor="secret-input-compact" className="text-xs">
        MQTT password
      </Label>
      <SecretInput id="secret-input-compact" className="h-8 text-xs" {...args} />
    </div>
  ),
  args: {
    defaultValue: "broker-secret",
    autoComplete: "off",
  },
};

/**
 * Inside a form: activating the toggle must never submit. Reveal a field and
 * confirm the submitted-count below stays put.
 */
export const InForm: Story = {
  render: function SecretInputForm() {
    const [submits, setSubmits] = useState(0);
    return (
      <form
        className="w-full sm:w-80 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setSubmits((count) => count + 1);
        }}
      >
        <div className="grid gap-1.5">
          <Label htmlFor="form-mqtt-password">Broker password</Label>
          <SecretInput id="form-mqtt-password" placeholder="Optional" autoComplete="off" />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="form-api-key">API key</Label>
          <SecretInput id="form-api-key" defaultValue="sk-live-4f9a2c7b18de" autoComplete="off" />
        </div>
        <Button type="submit" className="w-full">
          Save settings
        </Button>
        <p className="text-sm text-muted-foreground">
          Submitted <span className="font-mono">{submits}</span> time(s).
        </p>
      </form>
    );
  },
  args: {},
};

export const AllStates: Story = {
  render: () => (
    <div className="flex w-full sm:w-80 flex-col gap-4">
      <SecretInput placeholder="Masked (empty)" aria-label="Masked empty" />
      <SecretInput defaultValue="sk-live-4f9a2c7b18de" aria-label="Masked with value" />
      <SecretInput defaultValue="sk-live-4f9a2c7b18de" defaultVisible aria-label="Revealed" />
      <SecretInput placeholder="Key is set" revealDisabled aria-label="Reveal disabled" />
      <SecretInput defaultValue="sk-live-expired" aria-invalid aria-label="Invalid" />
      <SecretInput defaultValue="sk-live-4f9a2c7b18de" disabled aria-label="Disabled" />
    </div>
  ),
  args: {},
};
