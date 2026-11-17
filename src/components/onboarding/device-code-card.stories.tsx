import type { Meta, StoryObj } from "@storybook/react";
import { CircleCheck, Clock, ShieldAlert, Tv, UserRound, X } from "lucide-react";
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
        <UserRound aria-hidden="true" className="size-3" />
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
        <div className="flex flex-col gap-1 text-xs">
          <p className="font-medium">If you allow it, this TV can:</p>
          <ul className="list-inside list-disc">
            <li>show the panels you pick on the TV</li>
          </ul>
          <p className="text-muted-foreground">
            It can’t change pages, the Schedule, displays or settings, and you can sign it out any time in Settings ›
            Account.
          </p>
        </div>
        <p className="flex items-center gap-1.5 text-xs">
          <Clock aria-hidden="true" className="size-3" />
          Code expires in 7:48 · works once
        </p>
      </div>
    ),
  },
};

export const Approved: Story = {
  args: {
    title: "Living room Apple TV is signed in",
    description: undefined,
    children: (
      <div className="flex items-start gap-3">
        <CircleCheck aria-hidden="true" className="size-6 shrink-0 text-success" />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            It will show its panel in a few seconds. If it asks, pick a panel on the TV.
          </p>
          <p className="text-xs">Approved by this browser · 5:31 PM</p>
        </div>
      </div>
    ),
    primaryAction: <Button size="touch">Done</Button>,
    secondaryAction: (
      <Button size="touch" variant="outline">
        See signed-in devices
      </Button>
    ),
  },
};
export const Expired: Story = {
  args: {
    title: "This code expired",
    description: undefined,
    children: (
      <>
        <DeviceCodeInput aria-label="Expired code" value="BCDF7KQM" onValueChange={() => {}} readOnly aria-invalid />
        <div className="flex items-start gap-3">
          <Clock aria-hidden="true" className="size-6 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-muted-foreground">Codes last 10 minutes. Nothing was signed in.</p>
            <p>On the TV, choose Get a new code, then type the new one here.</p>
          </div>
        </div>
      </>
    ),
    primaryAction: <Button size="touch">Enter a new code</Button>,
  },
};
export const AlreadyUsed: Story = {
  args: {
    title: "This code was already used",
    description: undefined,
    children: (
      <div className="flex items-start gap-3">
        <ShieldAlert aria-hidden="true" className="size-6 shrink-0 text-warning" />
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground">Codes work once. Someone allowed or denied this one at 5:29 PM.</p>
          <p>If you didn’t do that, check Signed-in devices and sign out any TV you don’t recognize.</p>
        </div>
      </div>
    ),
    primaryAction: <Button size="touch">See signed-in devices</Button>,
    secondaryAction: (
      <Button size="touch" variant="outline">
        Enter a different code
      </Button>
    ),
  },
};
export const Denied: Story = {
  args: {
    title: "Not allowed",
    description: undefined,
    children: (
      <div className="flex items-start gap-3">
        <X aria-hidden="true" className="size-6 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground">
            “Living room Apple TV” can’t sign in with this code. The TV shows “Not allowed”.
          </p>
          <p>Denied by this browser · 5:31 PM. If that was a mistake, get a new code on the TV.</p>
        </div>
      </div>
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
    expect(
      card.querySelector('[data-slot="device-code-header"]')!.getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(100);
    const buttons = card.querySelectorAll("button");
    for (const button of buttons) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
  },
};
