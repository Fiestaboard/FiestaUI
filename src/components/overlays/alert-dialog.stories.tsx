import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";

import { Button } from "../forms/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

const meta = {
  title: "Overlays/AlertDialog",
  component: AlertDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    defaultOpen: {
      control: "boolean",
      description: "Open the dialog on first render (uncontrolled)",
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
      description: "AlertDialogTrigger and AlertDialogContent elements",
    },
  },
} satisfies Meta<typeof AlertDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultOpen: false,
    children: (
      <>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove your data from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </>
    ),
  },
};

export const Open: Story = {
  args: {
    defaultOpen: true,
    children: (
      <>
        <AlertDialogTrigger asChild>
          <Button variant="outline">Open Dialog</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard draft?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. If you leave now, your edits will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </>
    ),
  },
};

export const DestructiveAction = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Delete Board</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Delete Board</AlertDialogTitle>
        <AlertDialogDescription>
          Are you sure you want to delete this board? All schedules and configurations will be permanently removed. This
          action cannot be undone.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction variant="destructive">Delete</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

/**
 * BB-C-12: a data-loss confirmation on a phone. The card is inset 16px from
 * both edges with rounded corners (it used to be a full-bleed, square strip
 * below `sm`), and the confirming action wears the destructive fill.
 */
export const MobileDestructive: Story = {
  // Fullscreen, so VRT's #storybook-root capture is the whole 390×844 frame
  // and not a centred sliver of the dialog.
  parameters: { layout: "fullscreen" },
  // A full-height root, so the VRT capture of #storybook-root is the frame.
  decorators: [(Story) => <div className="min-h-dvh">{Story()}</div>],
  globals: { viewport: { value: "mobile", isRotated: false } },
  args: {
    defaultOpen: true,
    children: (
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Switch to Stable?</AlertDialogTitle>
          <AlertDialogDescription>
            This switches to an older release channel. FiestaBoard restores the snapshot taken before joining the
            preview, so changes made since then will be lost. FiestaBoard will restart.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive">Switch channel</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    ),
  },
  play: async ({ canvasElement }) => {
    const body = within(canvasElement.ownerDocument.body);
    const dialog = await body.findByRole("alertdialog", { name: "Switch to Stable?" });
    const view = canvasElement.ownerDocument.defaultView!;
    // The inset and radius at 320–900px are asserted by
    // .storybook/dialog-inset-regression.ts, which resizes the page: the
    // runner does not apply this story's viewport global. This play holds the
    // destructive action at whatever width it runs.
    // The confirming action paints --destructive, measured against a probe
    // painted with the token itself rather than against a class name.
    const action = body.getByRole("button", { name: "Switch channel" });
    const probe = canvasElement.ownerDocument.createElement("div");
    probe.style.backgroundColor = "var(--destructive)";
    dialog.append(probe);
    expect(view.getComputedStyle(action).backgroundColor).toBe(view.getComputedStyle(probe).backgroundColor);
    probe.remove();
  },
};

export const SingleAction = () => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="outline">Show notice</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Update installed</AlertDialogTitle>
        <AlertDialogDescription>
          FiestaBoard was updated to version 8.11. The board will restart in the background to apply the changes.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogAction>Got it</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

export const UnsavedChanges = () => (
  <div className="flex w-full sm:w-[400px] items-center justify-between rounded-lg border p-4">
    <div>
      <p className="text-sm font-medium">Morning briefing page</p>
      <p className="text-sm text-muted-foreground">Edited 2 minutes ago — unsaved</p>
    </div>
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost">Close editor</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Close without saving?</AlertDialogTitle>
          <AlertDialogDescription>
            Your changes to &quot;Morning briefing&quot; have not been saved. Closing the editor now will discard them.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep editing</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Discard changes
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
