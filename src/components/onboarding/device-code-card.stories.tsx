import type { Meta, StoryObj } from "@storybook/react";
import { CircleCheck, CircleHelp, Clock, ShieldAlert, Tv, UserRound, X } from "lucide-react";
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

/** Fine desktop actions use the drawn lg size; narrow/coarse targets retain 44px. */
async function expectActionGeometry(canvasElement: HTMLElement) {
  const card = canvasElement.querySelector<HTMLElement>('[data-slot="device-code-card"]')!;
  const actions = card.querySelector('[data-slot="device-code-actions"]')!;
  const style = getComputedStyle(card);
  const contentWidth = card.clientWidth - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
  const wide = contentWidth >= 352;
  const coarse = !!card.closest(".fui-coarse") && matchMedia("(pointer: coarse)").matches;
  expect(getComputedStyle(actions).gap).toBe(wide ? "8px" : "16px");
  for (const button of actions.querySelectorAll("button")) {
    expect(button.getBoundingClientRect().height).toBe(wide && !coarse ? 40 : 44);
  }
}

// These result references exist only at 390px. The fixed frame keeps the
// shared scrollbar gutter from shrinking their intended 358px card column.
const phoneReference: Story = {
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
    await expectActionGeometry(canvasElement);
    const frame = canvasElement.querySelector("main")!.getBoundingClientRect();
    const card = canvasElement.querySelector<HTMLElement>('[data-slot="device-code-card"]')!;
    expect(frame.width).toBe(390);
    expect(card.getBoundingClientRect().width).toBe(358);
    expect(card.getBoundingClientRect().left - frame.left).toBe(16);
    expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth + 1);
    expect(
      card.querySelector('[data-slot="device-code-header"]')!.getBoundingClientRect().height,
    ).toBeGreaterThanOrEqual(100);
    const result = card.querySelector('[data-slot="device-code-result"]');
    if (result) {
      const icon = result.querySelector("svg")!.getBoundingClientRect();
      const body = result.querySelector("div")!.getBoundingClientRect();
      expect(icon.width).toBe(28);
      expect(icon.height).toBe(28);
      expect(getComputedStyle(result).columnGap).toBe("12px");
      expect(body.left - frame.left).toBeCloseTo(81, 1);
    }
    for (const button of card.querySelectorAll("button")) {
      expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    }
  },
};

export const EnterCode: Story = {
  play: async ({ canvasElement }) => {
    await expectActionGeometry(canvasElement);
    const footer = canvasElement.querySelector('[data-slot="device-code-footer"]')!;
    const row = footer.firstElementChild!;
    const icon = row.querySelector("svg")!;
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon.getBoundingClientRect().width).toBe(14);
    expect(icon.getBoundingClientRect().height).toBe(14);
    expect(getComputedStyle(row).columnGap).toBe("6px");
  },
  render: function Entry(args) {
    const [value, setValue] = useState("BCDF7KQ");
    return (
      <DeviceCodeCard
        {...args}
        primaryAction={
          <Button size="lg" disabled={value.length !== 8}>
            Continue
          </Button>
        }
        footer={
          <span className="flex items-center gap-1.5">
            <CircleHelp aria-hidden="true" className="size-3.5 shrink-0" />
            <span>No code? Open FiestaBoard on the TV and choose Sign in.</span>
          </span>
        }
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
  play: async ({ canvasElement }) => expectActionGeometry(canvasElement),
  args: {
    title: "Allow this TV?",
    description: "Only allow a TV you can see in front of you right now.",
    primaryAction: <Button size="lg">Allow this TV</Button>,
    secondaryAction: (
      <Button size="lg" variant="outline">
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
  ...phoneReference,
  args: {
    title: "Living room Apple TV is signed in",
    description: undefined,
    children: (
      <div data-slot="device-code-result" className="flex items-start gap-3">
        <CircleCheck aria-hidden="true" className="size-7 shrink-0 text-success" />
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            It will show its panel in a few seconds. If it asks, pick a panel on the TV.
          </p>
          <p className="text-xs">Approved by this browser · 5:31 PM</p>
        </div>
      </div>
    ),
    primaryAction: <Button size="lg">Done</Button>,
    secondaryAction: (
      <Button size="lg" variant="outline">
        See signed-in devices
      </Button>
    ),
  },
};
export const Expired: Story = {
  ...phoneReference,
  args: {
    title: "This code expired",
    description: undefined,
    children: (
      <>
        <DeviceCodeInput
          aria-label="Expired code"
          value="BCDF7KQM"
          onValueChange={() => {}}
          size="compact"
          readOnly
          aria-invalid
        />
        <div data-slot="device-code-result" className="flex items-start gap-3">
          <Clock aria-hidden="true" className="size-7 shrink-0 text-muted-foreground" />
          <div className="flex flex-col gap-1 text-sm">
            <p className="text-muted-foreground">Codes last 10 minutes. Nothing was signed in.</p>
            <p>On the TV, choose Get a new code, then type the new one here.</p>
          </div>
        </div>
      </>
    ),
    primaryAction: <Button size="lg">Enter a new code</Button>,
  },
  play: async (context) => {
    await phoneReference.play?.(context);
    const { canvasElement } = context;
    const field = canvasElement.querySelector('[data-slot="device-code-input"]')!;
    const grid = canvasElement.querySelector('[data-slot="device-code-cells"]')!;
    expect(field.getBoundingClientRect().width).toBe(271);
    expect(getComputedStyle(grid).columnGap).toBe("3px");
    for (const cell of grid.querySelectorAll('[data-slot="device-code-cell"]')) {
      expect(cell.getBoundingClientRect().height).toBe(44);
    }
  },
};
export const AlreadyUsed: Story = {
  ...phoneReference,
  args: {
    title: "This code was already used",
    description: undefined,
    children: (
      <div data-slot="device-code-result" className="flex items-start gap-3">
        <ShieldAlert aria-hidden="true" className="size-7 shrink-0 text-warning" />
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground">Codes work once. Someone allowed or denied this one at 5:29 PM.</p>
          <p>If you didn’t do that, check Signed-in devices and sign out any TV you don’t recognize.</p>
        </div>
      </div>
    ),
    primaryAction: <Button size="lg">See signed-in devices</Button>,
    secondaryAction: (
      <Button size="lg" variant="outline">
        Enter a different code
      </Button>
    ),
  },
};
export const Denied: Story = {
  ...phoneReference,
  args: {
    title: "Not allowed",
    description: undefined,
    children: (
      <div data-slot="device-code-result" className="flex items-start gap-3">
        <X aria-hidden="true" className="size-7 shrink-0 text-destructive" />
        <div className="flex flex-col gap-1 text-sm">
          <p className="text-muted-foreground">
            “Living room Apple TV” can’t sign in with this code. The TV shows “Not allowed”.
          </p>
          <p>Denied by this browser · 5:31 PM. If that was a mistake, get a new code on the TV.</p>
        </div>
      </div>
    ),
    primaryAction: <Button size="lg">Done</Button>,
    secondaryAction: (
      <Button size="lg" variant="outline">
        Enter a new code
      </Button>
    ),
  },
};
export const Mobile: Story = {
  ...AllowTV,
  ...phoneReference,
};
