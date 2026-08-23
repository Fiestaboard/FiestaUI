import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "../feedback/badge";
import { CopyButton } from "./copy-button";

const meta = {
  title: "Forms/CopyButton",
  component: CopyButton,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Writes a value to the clipboard and confirms it — awaiting the write, cleaning up its own timer, " +
          "and announcing the result in a live region that was already mounted. Replaces four hand-rolled " +
          "versions in FiestaBoard (#271), none of which did all three.",
      },
    },
  },
  argTypes: {
    value: { control: "text", description: "The text written to the clipboard." },
    confirmMs: { control: "number", description: "How long the confirmed state lasts. Default 1500." },
    children: { control: false, description: "Visible label. Omit for the icon-only form." },
  },
  tags: ["autodocs"],
} satisfies Meta<typeof CopyButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Icon-only — the form the `page-builder` and `integrations` sites need. */
export const IconOnly: Story = {
  args: { value: "sk-live-2f8c91a4" },
};

/** Labelled — the form `mcp-settings` needs. The visible label swaps too. */
export const WithLabel: Story = {
  args: { value: "npx -y @fiestaboard/mcp", children: "Copy config", variant: "outline" },
};

/**
 * `labels` is how a consumer localizes this; the package ships no copy of its
 * own beyond the English defaults.
 */
export const Localized: Story = {
  args: {
    value: "Jeton",
    children: "Copier",
    variant: "outline",
    labels: { copy: "Copier", copied: "Copié", announcement: "Jeton copié" },
  },
};

/**
 * A distinct `announcement` names the thing, where the visible label beside
 * an icon cannot afford the width.
 */
export const WithAnnouncement: Story = {
  args: { value: "sk-live-2f8c91a4", labels: { announcement: "API token copied" } },
};

/** Slower confirmation, for a copy the user is likely to look away from. */
export const LongerConfirmation: Story = {
  args: { value: "{{weather.temp}}", confirmMs: 4000 },
};

/**
 * The 24px `icon-xs` default is what lets the button sit inside a dense host
 * without out-growing it — the size floor SC 2.5.8 sets, and the reason #240
 * added it.
 */
export const InsideATag = () => (
  <div className="flex items-center gap-2">
    <Badge variant="variable" className="font-mono">
      {"{{weather.temp}}"}
    </Badge>
    <CopyButton value="{{weather.temp}}" labels={{ announcement: "Variable copied" }} />
  </div>
);

/**
 * A rejected write must NOT confirm — no check, and an empty live region.
 * Storybook runs in a secure context so the write here succeeds; to see the
 * failure path, open this story over plain http, or deny the clipboard
 * permission for the origin. `onCopyError` is where a consumer puts its
 * toast.
 */
export const HandlesFailure: Story = {
  args: {
    value: "never-written",
    children: "Copy",
    variant: "outline",
    onCopyError: (error: unknown) => console.warn("copy failed:", error),
  },
};
