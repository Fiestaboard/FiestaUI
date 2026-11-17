import type { Meta, StoryObj } from "@storybook/react";
import { Clock, Tv, UserRound } from "lucide-react";
import { useState } from "react";
import { expect } from "storybook/test";

import { IconTile } from "../containment/icon-tile";
import { Button } from "../forms/button";
import { DeviceCodeCard } from "./device-code-card";
import { DeviceCodeInput } from "./device-code-input";

const meta = {
  title: "App/Onboarding/DeviceCodeCard",
  component: DeviceCodeCard,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    title: "Allow a TV",
    description:
      "Type the code your TV is showing. You’re signed in as maya, so the TV will sign in to Maya’s FiestaPi.",
    account: (
      <span className="inline-flex items-center gap-1">
        <UserRound aria-hidden="true" className="size-3.5" />
        maya · Maya’s FiestaPi
      </span>
    ),
  },
} satisfies Meta<typeof DeviceCodeCard>;
export default meta;
type Story = StoryObj<typeof meta>;

export const EnterCode: Story = {
  render: function Entry(args) {
    const [value, setValue] = useState("BCDF7KQ");
    return (
      <DeviceCodeCard
        {...args}
        primaryAction={
          <Button size="touch" disabled={value.length !== 8}>
            Continue
          </Button>
        }
        footer="No code? Open FiestaBoard on the TV and choose Sign in."
      >
        <DeviceCodeInput
          aria-label="Code shown on your TV"
          aria-describedby="code-hint"
          value={value}
          onValueChange={setValue}
        />
        <p id="code-hint" className="text-xs text-muted-foreground">
          Letters and numbers only; no vowels, so there is no O/0 or I/1 mix-up.
        </p>
      </DeviceCodeCard>
    );
  },
};

export const AllowTV: Story = {
  args: {
    title: "Allow this TV?",
    description: "Only allow a TV you can see in front of you right now.",
    primaryAction: <Button size="touch">Allow this TV</Button>,
    secondaryAction: (
      <Button size="touch" variant="outline">
        Deny
      </Button>
    ),
    children: (
      <div className="flex flex-col gap-2.5 rounded-md bg-muted p-4 text-sm">
        <div className="flex items-center gap-3">
          <IconTile>
            <Tv />
          </IconTile>
          <div className="min-w-0">
            <p className="font-semibold">“Living room Apple TV”</p>
            <p className="text-xs text-muted-foreground">
              FiestaBoard for Apple TV 2.3
              <br />
              Code BCDF-7KQM
            </p>
          </div>
        </div>
        <p>If you allow it, this TV can:</p>
        <ul className="list-inside list-disc">
          <li>show the panels you pick on the TV</li>
        </ul>
        <p className="text-xs text-muted-foreground">
          It can’t change pages, the Schedule, displays or settings, and you can sign it out any time in Settings ›
          Account.
        </p>
        <p className="flex items-center gap-1 text-xs">
          <Clock aria-hidden="true" className="size-3.5" />
          Code expires in 7:48 · works once
        </p>
      </div>
    ),
  },
};

export const Approved: Story = {
  args: {
    title: "Living room Apple TV is signed in",
    description: "It will show its panel in a few seconds. If it asks, pick a panel on the TV.",
    children: <p className="text-xs text-muted-foreground">Approved by this browser · 5:31 PM</p>,
    primaryAction: <Button size="touch">Done</Button>,
    secondaryAction: (
      <Button size="touch" variant="outline">
        Signed-in devices
      </Button>
    ),
  },
};
export const Expired: Story = {
  args: {
    title: "This code expired",
    description: "Codes last 10 minutes. Nothing was signed in.",
    children: (
      <>
        <DeviceCodeInput aria-label="Expired code" value="BCDF7KQM" onValueChange={() => {}} readOnly />
        <p className="text-sm">On the TV, choose Get a new code, then type the new one here.</p>
      </>
    ),
    primaryAction: <Button size="touch">Enter a new code</Button>,
  },
};
export const AlreadyUsed: Story = {
  args: {
    title: "This code was already used",
    description: "Codes work once. Someone allowed or denied this one at 5:29 PM.",
    children: (
      <p className="text-sm">If you didn’t do that, check Signed-in devices and sign out any TV you don’t recognize.</p>
    ),
    primaryAction: <Button size="touch">Signed-in devices</Button>,
    secondaryAction: (
      <Button size="touch" variant="outline">
        Enter a new code
      </Button>
    ),
  },
};
export const Denied: Story = {
  args: {
    title: "Not allowed",
    description: "“Living room Apple TV” can’t sign in with this code. The TV shows “Not allowed”.",
    children: (
      <p className="text-xs text-muted-foreground">
        Denied by this browser · 5:31 PM. If that was a mistake, get a new code on the TV.
      </p>
    ),
    primaryAction: <Button size="touch">Done</Button>,
    secondaryAction: (
      <Button size="touch" variant="outline">
        Enter a new code
      </Button>
    ),
  },
};
export const Mobile: Story = {
  ...AllowTV,
  globals: { viewport: { value: "mobile", isRotated: false } },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[358px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const card = canvasElement.querySelector<HTMLElement>('[data-slot="device-code-card"]')!;
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
    const buttons = card.querySelectorAll("button");
    for (const button of buttons) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};
