import type { Meta, StoryObj } from "@storybook/react";
import { RefreshCw, WifiOff } from "lucide-react";

import { IconTile } from "../containment/icon-tile";
import { Button } from "../forms/button";
import { Heading } from "../typography/heading";
import { Text } from "../typography/text";
import { RecoverySteps } from "./recovery-steps";

/* Copy is 05's (`36:6344`, Hub not found `41:76887`). The component ships none. */
const HUB_STEPS = [
  { text: "Make sure the hub is plugged in and has finished starting. That takes about 2 minutes after power-on." },
  {
    text: "Docker or Home Assistant? Your hub may not announce itself. Enter its address instead, for example 192.168.1.50:4420.",
  },
  { text: "Still stuck? On a computer on this Wi‑Fi, open fiestaboard.app/find." },
];

const meta = {
  title: "App/Onboarding/RecoverySteps",
  component: RecoverySteps,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { title: "Try these, in order", steps: HUB_STEPS },
  decorators: [
    (Story) => (
      // 370 = 05 `36:6344`.
      <div className="w-full max-w-[370px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RecoverySteps>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 05 `36:6344`. */
export const Default: Story = {};

/** Without a title the host names the list (`aria-label`). */
export const WithoutTitle: Story = {
  args: { title: undefined, "aria-label": "Ways to find your hub" },
};

/**
 * 05 Hub not found `41:76887`, as a web setup step would compose it: the
 * error is the heading, the steps follow, and the retry is the host's
 * screen-level action, not part of the card.
 */
export const InHubNotFound: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <IconTile size="lg" tone="muted">
        <WifiOff />
      </IconTile>
      <div className="flex flex-col gap-2">
        <Heading level={2} size="lg">
          No hub found on this Wi‑Fi
        </Heading>
        <Text tone="muted">We searched 192.168.1.0/24 for 10 seconds and no FiestaBoard hub answered.</Text>
      </div>
      <RecoverySteps {...args} />
      <div className="flex flex-col gap-2">
        {/* TODO(#385): size="touch" once slice 1.2 is on alpha. */}
        <Button size="lg" className="h-11">
          <RefreshCw />
          Search again
        </Button>
        <Button variant="secondary" size="lg" className="h-11">
          Enter address
        </Button>
      </div>
    </div>
  ),
};
