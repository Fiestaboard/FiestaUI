import type { Meta, StoryObj } from "@storybook/react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../containment/card";
import { Button } from "../../forms/button";
import FadeContent from "./fade-content";

const meta = {
  title: "Effects/React Bits/FadeContent",
  component: FadeContent,
  parameters: {
    layout: "centered",
    a11y: {
      config: {
        // Content animates from opacity 0; axe can snapshot mid-transition.
        rules: [{ id: "color-contrast", enabled: false }],
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: false,
      description: "Content to reveal",
    },
    blur: {
      control: "boolean",
      description: "Also animate from blur(10px) to sharp",
    },
    duration: {
      control: { type: "number", min: 0.1, max: 3, step: 0.1 },
      description: "Animation duration in seconds",
    },
    delay: {
      control: { type: "number", min: 0, max: 5, step: 0.1 },
      description: "Delay before the animation starts in seconds",
    },
    translateY: {
      control: { type: "range", min: 0, max: 100, step: 5 },
      description: "Vertical slide-in distance in pixels",
    },
    threshold: {
      control: { type: "range", min: 0, max: 1, step: 0.05 },
      description: "IntersectionObserver visibility ratio (0-1) for off-screen mounts",
    },
    className: {
      control: "text",
      description: "Classes applied to the animated wrapper div",
    },
  },
} satisfies Meta<typeof FadeContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <Card className="w-full sm:w-80">
        <CardHeader>
          <CardTitle>Fade In Content</CardTitle>
          <CardDescription>Appears when scrolled into view</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This content fades in with a smooth slide-up animation.</p>
        </CardContent>
      </Card>
    ),
    blur: false,
    duration: 0.6,
    delay: 0,
    translateY: 20,
    threshold: 0.1,
  },
};

export const WithBlur: Story = {
  args: {
    children: (
      <Card className="w-full sm:w-80">
        <CardHeader>
          <CardTitle>Blur + Fade Effect</CardTitle>
          <CardDescription>Fades in from blur</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This content combines fade-in with a blur effect for a more dramatic entrance.
          </p>
        </CardContent>
      </Card>
    ),
    blur: true,
    duration: 0.8,
    translateY: 30,
  },
};

export const FastAnimation: Story = {
  args: {
    children: (
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <h3 className="mb-2 text-lg font-semibold">Quick Fade</h3>
        <p className="text-sm text-muted-foreground">Fast animation speed</p>
      </div>
    ),
    duration: 0.3,
  },
};

export const SlowAnimation: Story = {
  args: {
    children: (
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <h3 className="mb-2 text-lg font-semibold">Slow Fade</h3>
        <p className="text-sm text-muted-foreground">Smooth, slow animation</p>
      </div>
    ),
    duration: 2,
  },
};

export const WithDelay: Story = {
  args: {
    children: (
      <div className="rounded-lg border bg-card p-6 text-card-foreground">
        <h3 className="mb-2 text-lg font-semibold">Delayed Fade</h3>
        <p className="text-sm text-muted-foreground">Waits 1 second before animating</p>
      </div>
    ),
    delay: 1,
    duration: 0.6,
  },
};

export const LargeTranslation: Story = {
  args: {
    children: (
      <Card className="w-full sm:w-80">
        <CardHeader>
          <CardTitle>Large Slide Distance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Slides up from 80px below</p>
        </CardContent>
      </Card>
    ),
    translateY: 80,
    duration: 1,
  },
};

export const PureFade: Story = {
  args: {
    children: (
      <Card className="w-full sm:w-80">
        <CardHeader>
          <CardTitle>No Movement</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Opacity-only fade with translateY set to 0</p>
        </CardContent>
      </Card>
    ),
    translateY: 0,
    duration: 1.2,
  },
};

export const StaggeredList: Story = {
  parameters: {
    layout: "padded",
  },
  args: {
    children: (
      <Card>
        <CardHeader>
          <CardTitle>First Card</CardTitle>
          <CardDescription>No delay</CardDescription>
        </CardHeader>
      </Card>
    ),
    duration: 0.6,
    translateY: 20,
  },
  render: (args) => (
    <div className="max-w-2xl space-y-4">
      <FadeContent {...args} />
      <FadeContent duration={0.6} delay={0.2} translateY={20}>
        <Card>
          <CardHeader>
            <CardTitle>Second Card</CardTitle>
            <CardDescription>0.2s delay</CardDescription>
          </CardHeader>
        </Card>
      </FadeContent>
      <FadeContent duration={0.6} delay={0.4} translateY={20}>
        <Card>
          <CardHeader>
            <CardTitle>Third Card</CardTitle>
            <CardDescription>0.4s delay</CardDescription>
          </CardHeader>
        </Card>
      </FadeContent>
      <FadeContent duration={0.6} delay={0.6} blur translateY={30}>
        <Button className="w-full">Call to Action</Button>
      </FadeContent>
    </div>
  ),
};
