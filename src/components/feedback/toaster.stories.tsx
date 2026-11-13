import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

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

/*
 * Snackbar actions and the bottom-nav offset (slice 1.3 · C18). Figma: 07a
 * Web / Toast `297:7793`, 07c "Saved to Pages". The toasts are raised on
 * mount and pinned (`duration: Infinity`); the page mock is `position: fixed`
 * so VRT captures the viewport, where Sonner draws the stack.
 */
function RaiseSnackbars() {
  React.useEffect(() => {
    // After the Toaster's own effect has subscribed.
    const id = window.setTimeout(() => {
      toast.info("Override canceled", {
        id: "override-canceled",
        description: "Kitchen board is back on Schedule Mode · Evening commute.",
        action: { label: "Undo", onClick: () => {} },
        duration: Infinity,
      });
      toast.success("Saved to Pages", {
        id: "saved-to-pages",
        description: "Kitchen morning is in your page library.",
        action: { label: "Show now", onClick: () => {} },
        cancel: { label: "Add to Schedule", onClick: () => {} },
        duration: Infinity,
      });
    }, 0);
    return () => {
      window.clearTimeout(id);
      toast.dismiss();
    };
  }, []);
  return null;
}

/** Primary action (secondary fill) and a second ghost action, on their own row at 44px. */
export const SnackbarActions: Story = {
  parameters: { layout: "fullscreen" },
  args: { position: "bottom-center" },
  render: (args) => (
    <div className="fixed inset-0 bg-background p-4 text-foreground">
      <p className="text-base font-semibold">Kitchen morning</p>
      <Toaster {...args} />
      <RaiseSnackbars />
    </div>
  ),
};

/**
 * With the bottom-nav Sidebar on screen, `--bottom-nav-offset` (88px) lifts
 * the stack above the bar. The bar here is a stand-in that publishes the
 * same variable.
 */
export const AboveBottomNav: Story = {
  parameters: { layout: "fullscreen" },
  args: { position: "bottom-center" },
  render: (args) => (
    <div
      className="fixed inset-0 bg-background p-4 text-foreground"
      style={{ "--bottom-nav-offset": "88px" } as React.CSSProperties}
    >
      <p className="text-base font-semibold">Kitchen morning</p>
      <div
        aria-hidden="true"
        className="fixed inset-x-3 bottom-3 h-16 rounded-[var(--radius-chrome-mobile)] border bg-sidebar"
      />
      <Toaster {...args} />
      <RaiseSnackbars />
    </div>
  ),
};
