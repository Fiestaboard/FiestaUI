import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "../badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import SpotlightCard from "./spotlight-card";

const meta = {
  title: "UI/React Bits/SpotlightCard",
  component: SpotlightCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    spotlightColor: {
      control: "color",
      description: "Color of the radial spotlight that follows the cursor (use RGBA for softness)",
    },
    className: {
      control: "text",
      description: "Classes applied to the wrapping div (position: relative, overflow hidden)",
    },
    children: {
      control: false,
      description: "Card content the spotlight overlays",
    },
  },
} satisfies Meta<typeof SpotlightCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    spotlightColor: "rgba(255, 255, 255, 0.25)",
    className: "rounded-xl",
    children: (
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Spotlight Card</CardTitle>
          <CardDescription>Hover to see the spotlight effect</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Move your mouse over this card to see the interactive spotlight effect.
          </p>
        </CardContent>
      </Card>
    ),
  },
};

export const BlueSpotlight: Story = {
  args: {
    spotlightColor: "rgba(99, 102, 241, 0.15)",
    className: "rounded-xl",
    children: (
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Blue Spotlight</CardTitle>
          <CardDescription>Custom spotlight color</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">This card uses a blue spotlight effect on hover.</p>
        </CardContent>
      </Card>
    ),
  },
};

export const GreenSpotlight: Story = {
  args: {
    spotlightColor: "rgba(34, 197, 94, 0.2)",
    className: "rounded-xl",
    children: (
      <Card className="w-80 border-success">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Active Plugin</CardTitle>
            <Badge variant="default">Enabled</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Spotlight effect can be customized to match your theme.</p>
        </CardContent>
      </Card>
    ),
  },
};

export const IntenseSpotlight: Story = {
  args: {
    spotlightColor: "rgba(236, 72, 153, 0.4)",
    className: "rounded-xl",
    children: (
      <Card className="w-80">
        <CardHeader>
          <CardTitle>High Intensity</CardTitle>
          <CardDescription>Higher alpha = stronger glow</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Increase the RGBA alpha channel for a much more pronounced spotlight.
          </p>
        </CardContent>
      </Card>
    ),
  },
};

export const SubtleSpotlight: Story = {
  args: {
    spotlightColor: "rgba(148, 163, 184, 0.08)",
    className: "rounded-xl",
    children: (
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Barely There</CardTitle>
          <CardDescription>Low alpha for a subtle sheen</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">A gentle highlight that does not compete with content.</p>
        </CardContent>
      </Card>
    ),
  },
};

export const FeatureGrid: Story = {
  args: {
    spotlightColor: "rgba(99, 102, 241, 0.15)",
    className: "rounded-xl",
  },
  render: (args) => (
    <div className="grid max-w-2xl grid-cols-2 gap-4 p-8">
      <SpotlightCard {...args}>
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Plugin Ecosystem</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Weather, transit, stocks and more out of the box.</p>
          </CardContent>
        </Card>
      </SpotlightCard>
      <SpotlightCard spotlightColor="rgba(34, 197, 94, 0.15)" className="rounded-xl">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Live Scheduling</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Rotate pages on a per-board schedule you control.</p>
          </CardContent>
        </Card>
      </SpotlightCard>
      <SpotlightCard spotlightColor="rgba(234, 179, 8, 0.15)" className="rounded-xl">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Template Engine</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Compose variables from any plugin into one layout.</p>
          </CardContent>
        </Card>
      </SpotlightCard>
      <SpotlightCard spotlightColor="rgba(239, 68, 68, 0.15)" className="rounded-xl">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-base">Self-Hosted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">One Docker container. Your data stays home.</p>
          </CardContent>
        </Card>
      </SpotlightCard>
    </div>
  ),
};
