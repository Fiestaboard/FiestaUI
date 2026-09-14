import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { GhostValue, SpotlightCaption, SpotlightRing } from "./spotlight";

const meta = {
  title: "AI/Spotlight",
  component: SpotlightRing,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    tone: {
      control: "radio",
      options: ["driving", "landed", "error"],
      description: "`driving` pulses (static under reduced motion); `landed` and `error` are still.",
    },
    style: { control: false, description: "The measured rect — the app positions the ring." },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof SpotlightRing>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A ring around a field the assistant is acting on, with the caption beside it. */
export const Driving: Story = {
  args: { tone: "driving" },
  render: (args) => (
    <div className="relative h-32 w-full sm:w-[380px]">
      <label htmlFor="spot-name" className="absolute left-4 top-2 text-xs text-muted-foreground">
        Page name
      </label>
      <Input id="spot-name" readOnly value="" className="absolute left-4 top-7 w-56" />
      <GhostValue value="Morning brief" progress={0.6} style={{ left: 28, top: 36 }} />
      <SpotlightRing {...args} style={{ left: 16, top: 28, width: 224, height: 36 }} />
      <SpotlightCaption
        tone={args.tone ?? "driving"}
        style={{ left: 16, top: 76 }}
        controls={
          <Button size="sm" variant="outline">
            Stop
          </Button>
        }
      >
        Typing the page name…
      </SpotlightCaption>
    </div>
  ),
};

/** The change arrived. */
export const Landed: Story = {
  args: { tone: "landed" },
  render: (args) => (
    <div className="relative h-24 w-full sm:w-[380px]">
      <Input readOnly aria-label="Page name" value="Morning brief" className="absolute left-4 top-7 w-56" />
      <SpotlightRing {...args} style={{ left: 16, top: 28, width: 224, height: 36 }} />
      <SpotlightCaption tone="landed" style={{ left: 16, top: 76 }}>
        Created “Morning brief”.
      </SpotlightCaption>
    </div>
  ),
};

/** A badge stands in for controls with no text box — a switch, a select. */
export const BadgeGhost = () => (
  <div className="relative h-10 w-full sm:w-[280px]">
    <span className="absolute left-0 top-2 text-sm">Reduce motion</span>
    <GhostValue variant="badge" value="on" style={{ left: 120, top: 6 }} />
  </div>
);
