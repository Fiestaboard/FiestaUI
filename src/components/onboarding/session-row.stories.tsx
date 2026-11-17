import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";

import { ListRowGroup } from "../containment/list-row";
import { SessionRow } from "./session-row";

const meta = {
  title: "App/Onboarding/SessionRow",
  component: SessionRow,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    name: "Living room Apple TV",
    kind: "tv",
    kindLabel: "TV",
    description: "Approved by Maya’s iPhone · Nov 5",
    lastConnected: "Last connected 5:39 PM",
    lastShown: "Last shown: Kitchen board panel · 5:39 PM",
    signOut: { label: "Sign out", onClick: fn() },
  },
  decorators: [
    (Story) => (
      <ListRowGroup className="w-full max-w-[790px] p-1">
        <Story />
      </ListRowGroup>
    ),
  ],
} satisfies Meta<typeof SessionRow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const ThisBrowser: Story = {
  args: {
    name: "Chrome on MacBook Air",
    kind: "browser",
    kindLabel: "This browser",
    current: true,
    description: "Signed in with a password · Nov 2",
    lastConnected: "Last connected just now",
    lastShown: undefined,
  },
};
export const Phone: Story = {
  args: {
    name: "Maya’s iPhone",
    kind: "phone",
    kindLabel: "Phone · FiestaBoard app",
    description: "Connected with a QR code · Nov 5 · approved 2 TVs",
    lastShown: undefined,
    signOut: { label: "Sign out…", onClick: fn() },
  },
};
export const PasswordTV: Story = {
  args: {
    name: "Kitchen TV",
    kindLabel: "Password sign-in",
    badgeVariant: "outline",
    description: "Signed in with a password · Sep 14 · phones can’t see or sign out this TV",
  },
};
export const Compact: Story = { args: { compact: true } };
export const Disabled: Story = { args: { signOut: { label: "Signing out…", onClick: fn(), disabled: true } } };
export const Medium: Story = {
  decorators: [
    (Story) => (
      <div className="w-full max-w-[498px]">
        <Story />
      </div>
    ),
  ],
};
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[348px]">
        <Story />
      </div>
    ),
  ],
};
export const LongNames: Story = {
  ...Mobile,
  args: {
    name: "Bedroom television shared by the upstairs family and guests",
    kindLabel: "Signed in with the FiestaBoard television application",
    lastConnected: "Last connected yesterday, 6:02 PM",
    lastShown: "Last shown: Upstairs family room board panel · yesterday, 6:02 PM",
  },
};
