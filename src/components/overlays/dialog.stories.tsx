import type { Meta, StoryObj } from "@storybook/react";
import { Copy } from "lucide-react";

import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { Label } from "../forms/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

const meta = {
  title: "Overlays/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    defaultOpen: {
      control: "boolean",
      description: "Open the dialog on first render (uncontrolled)",
    },
    modal: {
      control: "boolean",
      description: "Trap focus and block interaction with the rest of the page",
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
      description: "DialogTrigger and DialogContent elements",
    },
  },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultOpen: false,
    children: (
      <>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit page name</DialogTitle>
            <DialogDescription>Give this page a name so it is easy to find later.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="page-name">Name</Label>
            <Input id="page-name" defaultValue="Morning briefing" />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button>Save</Button>
          </DialogFooter>
        </DialogContent>
      </>
    ),
  },
};

export const Open: Story = {
  args: {
    defaultOpen: true,
    children: (
      <>
        <DialogTrigger asChild>
          <Button variant="outline">Open dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete page</DialogTitle>
            <DialogDescription>This action cannot be undone. The page will be permanently removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </>
    ),
  },
};

export const ShareDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">Share board</Button>
    </DialogTrigger>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Share board</DialogTitle>
        <DialogDescription>Anyone with this link can view the kitchen board in read-only mode.</DialogDescription>
      </DialogHeader>
      <div className="flex items-end gap-2">
        <div className="grid flex-1 gap-2">
          <Label htmlFor="share-link">Link</Label>
          <Input id="share-link" readOnly defaultValue="https://boards.example.com/s/kitchen-x1y2z3" />
        </div>
        <Button size="icon" variant="outline" aria-label="Copy link">
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <DialogFooter className="sm:justify-start">
        <DialogClose asChild>
          <Button variant="secondary">Done</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const ScrollableContent = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">View changelog</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Changelog</DialogTitle>
        <DialogDescription>What changed in the last few releases.</DialogDescription>
      </DialogHeader>
      <div className="max-h-[300px] space-y-4 overflow-y-auto pr-2 text-sm">
        {["8.11", "8.10", "8.9", "8.8", "8.7", "8.6"].map((version) => (
          <div key={version} className="space-y-1">
            <h4 className="font-medium">Version {version}</h4>
            <p className="text-muted-foreground">
              Bug fixes, performance improvements, and small polish across the dashboard, scheduler, and plugin settings
              dialogs.
            </p>
          </div>
        ))}
      </div>
      <DialogFooter>
        <DialogClose asChild>
          <Button>Close</Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const FormDialog = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button>New schedule</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create schedule</DialogTitle>
        <DialogDescription>Choose when this page should appear on the board.</DialogDescription>
      </DialogHeader>
      <form className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="schedule-name">Schedule name</Label>
          <Input id="schedule-name" placeholder="Weekday mornings" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="schedule-start">Start time</Label>
            <Input id="schedule-start" type="time" defaultValue="07:00" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="schedule-end">End time</Label>
            <Input id="schedule-end" type="time" defaultValue="09:30" />
          </div>
        </div>
      </form>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button>Create schedule</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
