import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

import { Badge } from "./badge";

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "brand", "secondary", "destructive", "outline", "variable", "success", "formula"],
      description: "Visual style variant",
    },
    children: {
      control: "text",
      description: "Badge label content",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    asChild: {
      control: false,
      description: "Render the badge styles onto a single child element (e.g. an anchor)",
    },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Badge",
    variant: "default",
  },
};

export const Brand: Story = {
  args: {
    children: "Brand",
    variant: "brand",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const Variable: Story = {
  args: {
    children: "{weather.temp}",
    variant: "variable",
  },
};

export const Success: Story = {
  args: {
    children: "connected",
    variant: "success",
  },
};

export const Formula: Story = {
  args: {
    children: "{=round(temp)}",
    variant: "formula",
  },
};

export const WithIcon: Story = {
  args: {
    variant: "success",
    children: (
      <>
        <CheckCircle2 aria-hidden="true" />
        Online
      </>
    ),
  },
};

export const AsLink = () => (
  <Badge asChild variant="outline">
    <a href="#releases">v8.11 release notes</a>
  </Badge>
);

export const AllVariants = () => (
  <div className="flex flex-wrap items-center gap-4">
    <Badge variant="default">Default</Badge>
    <Badge variant="secondary">Secondary</Badge>
    <Badge variant="destructive">Destructive</Badge>
    <Badge variant="outline">Outline</Badge>
    <Badge variant="variable">{"{variable}"}</Badge>
    <Badge variant="success">success</Badge>
    <Badge variant="formula">{"{=formula}"}</Badge>
  </div>
);

export const StatusList = () => (
  <div className="w-[380px] space-y-3">
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <span className="text-sm font-medium">Kitchen board</span>
      <Badge variant="success">
        <CheckCircle2 aria-hidden="true" />
        Connected
      </Badge>
    </div>
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <span className="text-sm font-medium">Office board</span>
      <Badge variant="secondary">
        <Clock aria-hidden="true" />
        Idle
      </Badge>
    </div>
    <div className="flex items-center justify-between rounded-md border px-4 py-3">
      <span className="text-sm font-medium">Lobby board</span>
      <Badge variant="destructive">
        <AlertCircle aria-hidden="true" />
        Offline
      </Badge>
    </div>
  </div>
);
