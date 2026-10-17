import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../forms/button";
import { toast, Toaster } from "./toaster";

const meta = {
  title: "Feedback/Toaster",
  component: Toaster,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    theme: { control: "inline-radio", options: ["light", "dark"] },
    position: {
      control: "select",
      options: ["top-center", "top-right", "bottom-right", "bottom-center"],
    },
    closeButton: { control: "boolean" },
    visibleToasts: { control: "number" },
  },
  args: {
    theme: "light",
    position: "bottom-right",
    closeButton: false,
    visibleToasts: 3,
  },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

function Triggers() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" onClick={() => toast("Board refreshed")}>
        Default
      </Button>
      <Button variant="outline" onClick={() => toast.success("Settings saved")}>
        Success
      </Button>
      <Button variant="outline" onClick={() => toast.info("A new version is available")}>
        Info
      </Button>
      <Button variant="outline" onClick={() => toast.warning("Board is offline", { description: "Retrying in 30s" })}>
        Warning
      </Button>
      <Button variant="outline" onClick={() => toast.error("Could not save settings")}>
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((resolve) => setTimeout(resolve, 1500)), {
            loading: "Connecting to MQTT…",
            success: "Connected",
            error: "Connection failed",
          })
        }
      >
        Promise
      </Button>
    </div>
  );
}

export const Default: Story = {
  render: (args) => (
    <>
      <Toaster {...args} />
      <Triggers />
    </>
  ),
};

export const WithCloseButton: Story = {
  args: { closeButton: true, duration: Infinity },
  render: Default.render,
};

export const Localized: Story = {
  args: { labels: { container: "Benachrichtigungen", close: "Schließen" }, closeButton: true },
  render: Default.render,
};
