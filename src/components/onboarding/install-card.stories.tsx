import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";

import { InstallCard } from "./install-card";

/*
 * Copy is the web Figma's (07 `58:34360` and the note `58:34443`). The
 * component ships none of it except the two button labels.
 */
const TITLE = "Add FiestaBoard Control to this phone?";
const BODY =
  "You’ve sent 3 messages from here. Installed, it opens straight to Home and can tell you when a display goes offline. It still talks only to your hub at fiestapi.example.net; there is no FiestaBoard account or cloud.";

const meta = {
  title: "App/Onboarding/InstallCard",
  component: InstallCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    title: TITLE,
    children: BODY,
    onInstall: fn(),
    onDismiss: fn(),
  },
  argTypes: {
    state: { control: "inline-radio", options: ["available", "installing", "needs-https"] },
  },
  decorators: [
    (Story) => (
      // 366 = the 07 card in a 390 phone with 12 px gutters.
      <div className="w-full max-w-[366px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InstallCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 07 `58:34360`: the Chrome install card after a real success. */
export const Default: Story = {};

/** The browser's own install prompt is open: Install is busy and keeps focus. */
export const Installing: Story = {
  args: { state: "installing" },
};

/**
 * On `http://fiestapi.local` there is no service worker, so nothing to
 * install: the card says so plainly and draws no Install button (07 note
 * `58:34443`). No Figma frame yet (DD-W19).
 */
export const NeedsHttps: Story = {
  args: {
    state: "needs-https",
    title: "Install needs a secure address",
    children: "Add a secure address under Settings › Network › Use remote address, then open FiestaBoard from it.",
  },
};

/** Without `onDismiss` there is no Not now (an offer reached from More). */
export const WithoutDismiss: Story = {
  args: { onDismiss: undefined },
};

/** A longer, localized title wraps beside the tile; labels merge over the defaults. */
export const Localized: Story = {
  args: {
    title: "FiestaBoard Control auf diesem Telefon hinzufügen?",
    children:
      "Installiert öffnet sie direkt die Startseite. Sie spricht weiterhin nur mit deinem Hub; es gibt kein FiestaBoard-Konto und keine Cloud.",
    labels: { install: "Installieren", notNow: "Nicht jetzt" },
  },
};
