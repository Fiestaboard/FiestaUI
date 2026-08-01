import type { Meta, StoryObj } from "@storybook/react";
import { ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { Button } from "./button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";

const meta = {
  title: "UI/Collapsible",
  component: Collapsible,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    defaultOpen: {
      control: "boolean",
      description: "Open on first render (uncontrolled)",
    },
    disabled: {
      control: "boolean",
      description: "Disable toggling the panel",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the root element",
    },
    open: {
      control: false,
      description: "Controlled open state; pair with onOpenChange",
    },
    onOpenChange: {
      control: false,
      description: "Callback fired when the open state changes",
    },
    children: {
      control: false,
      description: "CollapsibleTrigger and CollapsibleContent elements",
    },
  },
} satisfies Meta<typeof Collapsible>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultOpen: false,
    disabled: false,
    className: "w-[350px] space-y-2",
    children: (
      <>
        <div className="flex items-center justify-between space-x-4 px-4">
          <h4 className="text-sm font-semibold">3 items starred</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle starred items</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <div className="rounded-md border px-4 py-3 font-mono text-sm">@base-ui/react</div>
        <CollapsibleContent className="space-y-2">
          <div className="rounded-md border px-4 py-3 font-mono text-sm">@base-ui/react/menu</div>
          <div className="rounded-md border px-4 py-3 font-mono text-sm">@base-ui/react/dialog</div>
        </CollapsibleContent>
      </>
    ),
  },
};

export const DefaultOpen: Story = {
  args: {
    defaultOpen: true,
    className: "w-[350px] space-y-2",
    children: (
      <>
        <div className="flex items-center justify-between space-x-4 px-4">
          <h4 className="text-sm font-semibold">Settings</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0">
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle settings</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          <div className="rounded-md border px-4 py-3 text-sm">Enable notifications</div>
          <div className="rounded-md border px-4 py-3 text-sm">Dark mode</div>
          <div className="rounded-md border px-4 py-3 text-sm">Auto-refresh</div>
        </CollapsibleContent>
      </>
    ),
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    className: "w-[350px] space-y-2",
    children: (
      <>
        <div className="flex items-center justify-between space-x-4 px-4">
          <h4 className="text-sm font-semibold">Locked section</h4>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-9 p-0" disabled>
              <ChevronsUpDown className="h-4 w-4" />
              <span className="sr-only">Toggle locked section</span>
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="space-y-2">
          <div className="rounded-md border px-4 py-3 text-sm">Hidden while disabled</div>
        </CollapsibleContent>
      </>
    ),
  },
};

export const Controlled = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[350px] space-y-2">
      <div className="flex items-center justify-between space-x-4 px-4">
        <h4 className="text-sm font-semibold">Controlled collapsible ({isOpen ? "open" : "closed"})</h4>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-9 p-0">
            <ChevronsUpDown className="h-4 w-4" />
            <span className="sr-only">Toggle</span>
          </Button>
        </CollapsibleTrigger>
      </div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-3 text-sm">Open state lives in React state.</div>
        <div className="rounded-md border px-4 py-3 text-sm">The heading above reflects it live.</div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ShowMoreList = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-[350px] space-y-2">
      <div className="rounded-md border px-4 py-3 text-sm">Weather — every 15 minutes</div>
      <div className="rounded-md border px-4 py-3 text-sm">Transit — every 5 minutes</div>
      <CollapsibleContent className="space-y-2">
        <div className="rounded-md border px-4 py-3 text-sm">Stocks — market hours only</div>
        <div className="rounded-md border px-4 py-3 text-sm">Air quality — hourly</div>
        <div className="rounded-md border px-4 py-3 text-sm">Surf report — twice daily</div>
      </CollapsibleContent>
      <CollapsibleTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          {isOpen ? "Show fewer schedules" : "Show 3 more schedules"}
        </Button>
      </CollapsibleTrigger>
    </Collapsible>
  );
};
