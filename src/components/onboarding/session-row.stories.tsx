import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn } from "storybook/test";

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
      <div className="w-full max-w-[790px]">
        <Story />
      </div>
    ),
  ],
  render: (args) => (
    <ListRowGroup className="w-full p-1">
      <SessionRow {...args} />
    </ListRowGroup>
  ),
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
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('[data-slot="session-row"]')!;
    const button = canvasElement.querySelector("button")!;
    const wide = row.getBoundingClientRect().width >= 480;
    expect(getComputedStyle(button).paddingLeft).toBe(wide ? "12px" : "24px");
    expect(getComputedStyle(button).paddingRight).toBe(wide ? "12px" : "24px");
    expect(button.getBoundingClientRect().height).toBe(wide ? 32 : 44);
  },
};
export const Mobile: Story = {
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile", isRotated: false } },
  decorators: [
    (Story) => (
      <main className="min-h-screen w-[390px] p-4">
        <Story />
      </main>
    ),
  ],
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector("main")!.getBoundingClientRect();
    const group = canvasElement.querySelector('[data-slot="list-row-group"]')!;
    const row = canvasElement.querySelector('[data-slot="session-row"]')!;
    expect(frame.width).toBe(390);
    expect(group.getBoundingClientRect().width).toBe(358);
    expect(group.getBoundingClientRect().left - frame.left).toBe(16);
    expect(row.getBoundingClientRect().width).toBe(348);
    for (const element of canvasElement.querySelectorAll<HTMLElement>(
      '[data-slot="session-row"], [data-slot="list-row-body"], [data-slot="list-row-text"]',
    )) {
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
    }
    const button = canvasElement.querySelector("button")!;
    expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(getComputedStyle(button).paddingLeft).toBe("24px");
    expect(getComputedStyle(button).paddingRight).toBe("24px");
  },
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
