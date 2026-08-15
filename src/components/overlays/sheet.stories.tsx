import type { Meta, StoryObj } from "@storybook/react";
import { Settings } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { Label } from "../forms/label";
import { Switch } from "../forms/switch";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./sheet";

/** Root props plus the SheetContent `side` variant so it is controllable from the panel. */
type SheetStoryArgs = ComponentProps<typeof Sheet> & {
  side?: "top" | "right" | "bottom" | "left";
};

const meta = {
  title: "Overlays/Sheet",
  component: Sheet,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    side: {
      control: "select",
      options: ["top", "right", "bottom", "left"],
      description: "Edge of the screen the sheet slides in from (SheetContent prop)",
    },
    defaultOpen: {
      control: "boolean",
      description: "Whether the sheet is initially open (uncontrolled)",
    },
    open: {
      control: false,
      description: "Controlled open state; pair with onOpenChange",
    },
    modal: {
      control: "select",
      options: [true, false, "trap-focus"],
      description: "Focus and scroll containment while the sheet is open",
    },
    disablePointerDismissal: {
      control: "boolean",
      description: "Prevents the sheet from closing on outside presses",
    },
    onOpenChange: {
      control: false,
      description: "Callback fired when the sheet opens or closes",
    },
    children: {
      control: false,
      description: "SheetTrigger and SheetContent sub-components",
    },
  },
} satisfies Meta<SheetStoryArgs>;

export default meta;
type Story = StoryObj<SheetStoryArgs>;

const renderProfileSheet = ({ side, ...args }: SheetStoryArgs) => (
  <Sheet {...args}>
    <SheetTrigger asChild>
      <Button variant="outline">Open Sheet</Button>
    </SheetTrigger>
    <SheetContent side={side}>
      <SheetHeader>
        <SheetTitle>Edit Profile</SheetTitle>
        <SheetDescription>Make changes to your profile here. Click save when you&apos;re done.</SheetDescription>
      </SheetHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="name" className="text-right">
            Name
          </Label>
          <Input id="name" defaultValue="John Doe" className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="username" className="text-right">
            Username
          </Label>
          <Input id="username" defaultValue="@johndoe" className="col-span-3" />
        </div>
      </div>
      <SheetFooter>
        <SheetClose asChild>
          <Button type="submit">Save changes</Button>
        </SheetClose>
      </SheetFooter>
    </SheetContent>
  </Sheet>
);

export const Default: Story = {
  args: {
    side: "right",
  },
  render: renderProfileSheet,
};

export const Open: Story = {
  args: {
    side: "right",
    defaultOpen: true,
  },
  render: renderProfileSheet,
};

export const LeftSide: Story = {
  args: {
    side: "left",
  },
  render: ({ side, ...args }) => (
    <Sheet {...args}>
      <SheetTrigger asChild>
        <Button variant="outline">Open Left</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
          <SheetDescription>Browse your boards and settings.</SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <nav className="space-y-2" aria-label="Main">
            <Button variant="ghost" className="w-full justify-start">
              Dashboard
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              My Boards
            </Button>
            <Button variant="ghost" className="w-full justify-start">
              Settings
            </Button>
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  ),
};

export const TopSide: Story = {
  args: {
    side: "top",
  },
  render: ({ side, ...args }) => (
    <Sheet {...args}>
      <SheetTrigger asChild>
        <Button variant="outline">Open Top</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Notification Banner</SheetTitle>
          <SheetDescription>Important system message.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};

export const BottomSide: Story = {
  args: {
    side: "bottom",
  },
  render: ({ side, ...args }) => (
    <Sheet {...args}>
      <SheetTrigger asChild>
        <Button variant="outline">Open Bottom</Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Quick Actions</SheetTitle>
          <SheetDescription>Select an action to perform.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};

export const IconTrigger: Story = {
  args: {
    side: "right",
  },
  render: ({ side, ...args }) => (
    <Sheet {...args}>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Open settings">
          <Settings aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side={side}>
        <SheetHeader>
          <SheetTitle>Settings</SheetTitle>
          <SheetDescription>Opened from an icon-only trigger with an accessible name.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};

export const AllSides: Story = {
  render: () => (
    <div className="flex gap-4">
      {(["right", "left", "top", "bottom"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline" className="capitalize">
              {side}
            </Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle className="capitalize">{side} Sheet</SheetTitle>
              <SheetDescription>This opens from the {side}.</SheetDescription>
            </SheetHeader>
          </SheetContent>
        </Sheet>
      ))}
    </div>
  ),
};

export const SettingsPanel: Story = {
  args: {
    side: "right",
  },
  render: ({ side, ...args }) => (
    <Sheet {...args}>
      <SheetTrigger asChild>
        <Button variant="outline">Board settings</Button>
      </SheetTrigger>
      <SheetContent side={side} className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Board settings</SheetTitle>
          <SheetDescription>Configure how this board refreshes and notifies you.</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 py-4">
          <div className="grid gap-1.5">
            <Label htmlFor="board-name">Board name</Label>
            <Input id="board-name" defaultValue="Kitchen board" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="refresh-interval">Refresh interval (minutes)</Label>
            <Input id="refresh-interval" type="number" min={1} defaultValue={5} />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="quiet-hours">Quiet hours</Label>
              <Switch id="quiet-hours" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-brightness">Auto brightness</Label>
              <Switch id="auto-brightness" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="update-notifications">Update notifications</Label>
              <Switch id="update-notifications" defaultChecked />
            </div>
          </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="outline">Cancel</Button>
          </SheetClose>
          <SheetClose asChild>
            <Button>Save changes</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
};
