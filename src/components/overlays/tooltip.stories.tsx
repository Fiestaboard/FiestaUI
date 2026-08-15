import type { Meta, StoryObj } from "@storybook/react";
import { Bold, Italic, Plus, Underline } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "../forms/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

type TooltipStoryArgs = ComponentProps<typeof Tooltip> & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  delayDuration?: number;
  content?: string;
};

const meta = {
  title: "Overlays/Tooltip",
  component: Tooltip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
  argTypes: {
    defaultOpen: {
      control: "boolean",
      description: "Whether the tooltip is initially open (uncontrolled)",
    },
    open: {
      control: false,
      description: "Controlled open state; pair with onOpenChange",
    },
    onOpenChange: {
      control: false,
      description: "Callback fired when the tooltip opens or closes",
    },
    disabled: {
      control: "boolean",
      description: "Prevents the tooltip from opening",
    },
    trackCursorAxis: {
      control: "select",
      options: ["none", "x", "y", "both"],
      description: "Axis on which the tooltip follows the cursor",
    },
    side: {
      control: "select",
      options: ["top", "right", "bottom", "left"],
      description: "Preferred side of the trigger (TooltipContent prop)",
    },
    align: {
      control: "select",
      options: ["start", "center", "end"],
      description: "Alignment along the chosen side (TooltipContent prop)",
    },
    sideOffset: {
      control: "number",
      description: "Distance in pixels from the trigger (TooltipContent prop)",
    },
    delayDuration: {
      control: "number",
      description: "Hover delay in milliseconds before opening (TooltipProvider prop)",
    },
    content: {
      control: "text",
      description: "Tooltip text used by the args-driven stories",
    },
    children: {
      control: false,
      description: "TooltipTrigger and TooltipContent elements",
    },
  },
} satisfies Meta<TooltipStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: "Add to library",
    side: "top",
    align: "center",
    sideOffset: 4,
    delayDuration: 0,
    defaultOpen: false,
    disabled: false,
  },
  render: ({ content, side, align, sideOffset, delayDuration, ...args }) => (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip {...args}>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent side={side} align={align} sideOffset={sideOffset}>
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const InitiallyOpen: Story = {
  args: {
    defaultOpen: true,
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <Button variant="outline">Already showing</Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Visible without hovering</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const WithIconButton: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Add new item">
          <Plus className="h-4 w-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Add new item</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const Positions: Story = {
  render: () => (
    <div className="flex items-center gap-8 p-16">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Top</Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Bottom</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Left</Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tooltip on left</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Right</Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip on right</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const Alignments: Story = {
  render: () => (
    <div className="flex items-center gap-8 p-16">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Start</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start">
          <p>Aligned to start</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Center</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="center">
          <p>Aligned to center</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">End</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p>Aligned to end</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const FormattingToolbar: Story = {
  render: () => (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-1 rounded-md border bg-background p-1 shadow-sm">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Bold">
              <Bold className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Bold</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Italic">
              <Italic className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Italic</p>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Underline">
              <Underline className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>Underline</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
};
