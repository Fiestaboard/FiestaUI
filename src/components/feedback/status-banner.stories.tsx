import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";

import { STATUS_BANNER_KINDS, StatusBanner, StatusBannerAction, type StatusBannerKind } from "./status-banner";

/*
 * Copy is the web Figma's (07a Banner `298:2280`; No viewer from 02
 * `149:28542`). The component ships none of it — consumers pass every string.
 */
const EXAMPLES: Record<StatusBannerKind, { title: string; description: string; action?: ReactNode }> = {
  paused: {
    title: "Kitchen board is paused",
    description: "It keeps showing Evening commute and skips the Schedule until you resume it.",
    action: <StatusBannerAction>Resume</StatusBannerAction>,
  },
  silenced: {
    title: "Silence Schedule until 6:30 AM",
    description: "Kitchen board is quiet. New messages wait until 6:30 AM unless you choose Show now.",
  },
  "silence-soon": {
    title: "Silence Schedule starts at 10:00 PM",
    description: "Kitchen board goes quiet in 12 min and holds Good night until 6:30 AM.",
    action: <StatusBannerAction variant="ghost">Edit Silence Schedule</StatusBannerAction>,
  },
  "display-offline": {
    title: "Entry clock is offline",
    description: "Last connected 4:12 PM. Check its power and Wi-Fi; FiestaBoard checks again on its own.",
    action: <StatusBannerAction>Diagnostics</StatusBannerAction>,
  },
  "hub-unreachable": {
    title: "Can’t reach your hub at fiestapi.local",
    description:
      "Your displays keep running their schedules on the hub, so nothing is lost. Last connected 2:14 PM · trying again every 30 s.",
    action: (
      <>
        <StatusBannerAction>Try again</StatusBannerAction>
        <StatusBannerAction variant="ghost">Connection help</StatusBannerAction>
      </>
    ),
  },
  "device-offline": {
    title: "You’re offline",
    description:
      "This computer has no network. Your displays keep running on the hub; FiestaBoard reconnects when the network is back.",
    action: <StatusBannerAction>Try again</StatusBannerAction>,
  },
  "out-of-sync": {
    title: "Kitchen board is out of sync",
    description: "It’s showing something other than Evening commute. Another app may have changed it.",
    action: <StatusBannerAction>Show Evening commute again</StatusBannerAction>,
  },
  "no-viewer": {
    title: "No TV is showing Living room TV",
    description: "Last shown on Apple TV · 2h ago",
    action: <StatusBannerAction>Check again</StatusBannerAction>,
  },
  "init-error": {
    title: "Couldn’t start Desk Pixoo",
    description: "The hub can’t talk to it at 192.168.1.42. Check the address in its display settings.",
    action: <StatusBannerAction>Display settings</StatusBannerAction>,
  },
  https: {
    title: "Requires HTTPS",
    description:
      "Install, notifications and offline need a secure address. You’re on http://fiestapi.local. Open your remote address (https://fiestapi.example.net) or set up HTTPS on the hub.",
    action: <StatusBannerAction variant="ghost">How to set up HTTPS</StatusBannerAction>,
  },
};

const meta = {
  title: "Feedback/StatusBanner",
  component: StatusBanner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    kind: {
      control: "select",
      options: [...STATUS_BANNER_KINDS],
      description: "Which state. Picks the tone, the glyph and the default announcement urgency.",
    },
    title: { control: "text", description: "What happened, in one line. Required; the component ships no copy." },
    description: { control: "text", description: "The plain consequence and what happens next." },
    layout: {
      control: "inline-radio",
      options: ["auto", "inline", "stacked"],
      description: "`auto` is one row from the `sm` breakpoint up, stacked below it.",
    },
    politeness: {
      control: "inline-radio",
      options: ["assertive", "polite", "off"],
      description: "Override the kind's urgency. `off` renders no live region.",
    },
    touch: { control: "boolean", description: "Force 44 px actions on any pointer." },
    action: { control: false, description: "One or two StatusBannerAction buttons, outside the live region." },
    icon: { control: false, description: "Replace the kind's glyph; `null` drops it." },
  },
} satisfies Meta<typeof StatusBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    kind: "display-offline",
    title: EXAMPLES["display-offline"].title,
    description: EXAMPLES["display-offline"].description,
    action: EXAMPLES["display-offline"].action,
    className: "w-full sm:w-[964px]",
  },
};

/**
 * Every kind, as the web Banner set draws it (Layout=Desktop at 964 px; the
 * `auto` layout stacks them at the 390 px viewport, Layout=Mobile).
 */
export const AllKinds = () => (
  <div className="flex w-full flex-col gap-4 sm:w-[964px]">
    {STATUS_BANNER_KINDS.map((kind) => (
      <StatusBanner key={kind} kind={kind} {...EXAMPLES[kind]} />
    ))}
  </div>
);

/**
 * Layout=Mobile with touch actions: stacked, actions under the text and
 * aligned with it, each 44 px (`--control-h-touch`). On a phone the coarse
 * pointer does this on its own; `touch` forces it here.
 */
export const MobileTouch = () => (
  <div className="flex w-full flex-col gap-4 sm:w-[358px]">
    {(["display-offline", "hub-unreachable", "paused", "silenced"] as const).map((kind) => (
      <StatusBanner key={kind} kind={kind} layout="stacked" touch {...EXAMPLES[kind]} />
    ))}
  </div>
);
