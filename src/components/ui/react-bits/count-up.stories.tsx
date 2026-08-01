import type { Meta, StoryObj } from "@storybook/react";

import CountUp from "./count-up";

const meta = {
  title: "UI/React Bits/CountUp",
  component: CountUp,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    to: {
      control: { type: "number" },
      description: "Target number to animate to",
    },
    from: {
      control: { type: "number" },
      description: "Starting number (set higher than `to` for a countdown)",
    },
    duration: {
      control: { type: "number", min: 0.1, max: 10, step: 0.1 },
      description: "Animation duration in seconds (ease-out cubic)",
    },
    delay: {
      control: { type: "number", min: 0, max: 5, step: 0.25 },
      description: "Delay before the animation starts in seconds",
    },
    separator: {
      control: "text",
      description: "Thousands separator character (empty string disables grouping)",
    },
    startWhen: {
      control: "boolean",
      description: "Gate the animation; it only starts when true and the element is in view",
    },
    className: {
      control: "text",
      description: "Classes applied to the rendered span",
    },
    onStart: {
      control: false,
      description: "Callback fired when the animation starts (after delay)",
    },
    onEnd: {
      control: false,
      description: "Callback fired when the animation reaches the target",
    },
  },
} satisfies Meta<typeof CountUp>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    to: 100,
    from: 0,
    duration: 2,
    delay: 0,
    separator: "",
    startWhen: true,
    className: "text-4xl font-bold tabular-nums text-foreground",
  },
};

export const WithSeparator: Story = {
  args: {
    to: 1000000,
    from: 0,
    duration: 2,
    separator: ",",
    className: "text-3xl font-semibold tabular-nums text-foreground",
  },
};

export const Decimals: Story = {
  args: {
    to: 99.99,
    from: 0,
    duration: 2,
    className: "text-3xl font-semibold tabular-nums text-foreground",
  },
};

export const Countdown: Story = {
  args: {
    to: 0,
    from: 10,
    duration: 5,
    className: "text-4xl font-bold tabular-nums text-foreground",
  },
};

export const FastAnimation: Story = {
  args: {
    to: 500,
    from: 0,
    duration: 0.5,
    className: "text-3xl font-semibold tabular-nums text-foreground",
  },
};

export const SlowAnimation: Story = {
  args: {
    to: 50,
    from: 0,
    duration: 5,
    className: "text-3xl font-semibold tabular-nums text-foreground",
  },
};

export const WithDelay: Story = {
  args: {
    to: 100,
    from: 0,
    duration: 2,
    delay: 2,
    className: "text-3xl font-semibold tabular-nums text-foreground",
  },
};

export const Paused: Story = {
  args: {
    to: 2048,
    from: 0,
    duration: 2,
    separator: ",",
    startWhen: false,
    className: "text-3xl font-semibold tabular-nums text-foreground",
  },
};

export const LargeNumber: Story = {
  args: {
    to: 9876543,
    from: 0,
    duration: 3,
    separator: ",",
    className: "text-4xl font-bold tabular-nums text-primary",
  },
};

export const Percentage: Story = {
  args: {
    to: 87.5,
    from: 0,
    duration: 2,
  },
  render: (args) => (
    <div className="flex items-center gap-1 text-2xl font-semibold text-foreground">
      <CountUp {...args} />
      <span>%</span>
    </div>
  ),
};

export const StatsDashboard: Story = {
  args: {
    to: 1234,
    from: 0,
    duration: 2,
    separator: ",",
  },
  render: (args) => (
    <div className="flex gap-8 text-center">
      <div>
        <div className="text-4xl font-bold tabular-nums text-primary">
          <CountUp {...args} />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Total Users</div>
      </div>
      <div>
        <div className="text-4xl font-bold tabular-nums text-success">
          <CountUp to={98.7} from={0} duration={2} delay={0.2} />
          <span>%</span>
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Success Rate</div>
      </div>
      <div>
        <div className="text-4xl font-bold tabular-nums text-info">
          <CountUp to={42} from={0} duration={2} delay={0.4} />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Active Projects</div>
      </div>
      <div>
        <div className="text-4xl font-bold tabular-nums text-foreground">
          <CountUp to={3600000} from={0} duration={2.5} delay={0.6} separator="," />
        </div>
        <div className="mt-2 text-sm text-muted-foreground">Messages Sent</div>
      </div>
    </div>
  ),
};
