import type { Meta, StoryObj } from "@storybook/react";
import { ChevronLeft, Settings } from "lucide-react";
import type { ComponentProps } from "react";

import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { Label } from "../forms/label";
import { Swatch, SwatchGroup } from "../forms/swatch";
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

/*
 * Bottom sheet (slice 1.3 · C3 · WEB-05). Figma: 07 Web / Bottom sheet
 * `53:100588`, 07c editor sheets (Formatting, More), 07 Colors sheet
 * `57:65460`. Each story pins a phone-shaped editor page with `position:
 * fixed`, which leaves #storybook-root with no box, so VRT captures the whole
 * viewport and the portalled sheet is in the shot.
 */

function EditorPageMock() {
  return (
    <div className="fixed inset-0 flex flex-col gap-3 bg-background p-4 text-foreground">
      <div className="flex h-11 items-center justify-between">
        <div>
          <p className="text-base font-semibold leading-5">Kitchen morning</p>
          <p className="text-xs text-muted-foreground">Unsaved</p>
        </div>
        <Button size="sm">Show now</Button>
      </div>
      <div
        aria-label="Live preview"
        role="img"
        className="grid h-40 place-items-center rounded-lg bg-[var(--color-board-surface-dark)] font-mono text-sm tracking-[0.3em] text-white"
      >
        GOOD MORNING
      </div>
      <p className="font-mono text-sm text-muted-foreground">1 GOOD MORNING</p>
    </div>
  );
}

const MORE_ROWS = ["Export share string", "Keyboard shortcuts", "Fill board…"];

/** Grabber, no detents: as tall as its content; drag the grabber down (or press Esc / Close) to dismiss. */
export const BottomGrabber: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <>
      <EditorPageMock />
      <Sheet defaultOpen>
        <SheetContent side="bottom" grabber>
          <SheetHeader className="min-h-12 justify-center pr-12 text-left sm:text-left">
            <SheetTitle>Formatting</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 pb-2">
            {[
              ["Fill space", "fill_space"],
              ["Wrap text", "wrap"],
            ].map(([label, code]) => (
              <button
                key={code}
                type="button"
                className="flex min-h-11 items-center justify-between rounded-md px-2 text-left text-sm hover:bg-accent focus-ring"
              >
                {label}
                <code className="rounded-full bg-muted px-2 py-0.5 font-mono text-xs">{code}</code>
              </button>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Fill space pushes the rest of the line to the right edge. Wrap lets a long value continue on the next line.
          </p>
        </SheetContent>
      </Sheet>
    </>
  ),
};

/**
 * Detents at half and 90% of the viewport. The grabber is a separator:
 * ↑/↓, Home/End and Enter/Space move between detents; dragging snaps to the
 * nearest one and below half of the smallest dismisses.
 */
export const BottomDetents: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <>
      <EditorPageMock />
      <Sheet defaultOpen>
        <SheetContent side="bottom" detents={["half", 0.9]}>
          <SheetHeader className="min-h-12 justify-center pr-12 text-left sm:text-left">
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="flex items-start justify-between gap-4 py-2">
            <div>
              <Label htmlFor="mirror-board">Mirror to board while editing</Label>
              <p className="text-sm text-muted-foreground">The Kitchen board shows your edits as you type.</p>
            </div>
            <Switch id="mirror-board" />
          </div>
          <ul className="flex flex-col">
            {MORE_ROWS.map((row) => (
              <li key={row}>
                <button
                  type="button"
                  className="flex min-h-12 w-full items-center rounded-md px-2 text-left text-sm hover:bg-accent focus-ring"
                >
                  {row}
                </button>
              </li>
            ))}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  ),
};

/**
 * WEB-05 picker: no scrim and non-modal, so the preview above stays visible
 * and the page stays usable while the sheet is up.
 */
export const BottomNoScrim: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <>
      <EditorPageMock />
      <Sheet defaultOpen modal={false} disablePointerDismissal>
        <SheetContent side="bottom" grabber scrim={false}>
          <SheetHeader className="min-h-12 justify-center pr-12 text-left sm:text-left">
            <SheetTitle>Colors</SheetTitle>
          </SheetHeader>
          <SwatchGroup aria-label="Tile color" defaultValue="red" className="pb-3">
            {["red", "orange", "yellow", "green", "blue", "violet"].map((hue) => (
              <Swatch key={hue} value={hue} label={hue} color={`var(--color-board-${hue})`} size="lg" />
            ))}
          </SwatchGroup>
          <p className="text-sm text-muted-foreground">Tap a color to insert a tile at the cursor.</p>
        </SheetContent>
      </Sheet>
    </>
  ),
};

/**
 * 07a Dialog shell · Mobile sheet (`297:7667`): a pinned header with Back, a
 * scrolling body and a sticky footer with a full-width 44px primary. Direct
 * `SheetHeader` / `SheetFooter` children are pinned; the rest scrolls.
 */
export const BottomStickyFooter: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <>
      <EditorPageMock />
      <Sheet defaultOpen>
        <SheetContent side="bottom" detents={[0.6]}>
          {/* Back (36px) and the title's first line centre 24px into the head, on the close chip. */}
          <SheetHeader className="min-h-12 flex-row items-start gap-3 pt-1.5 pr-12 text-left sm:text-left">
            <Button variant="ghost" size="icon" aria-label="Back">
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="mt-1 flex flex-col gap-1">
              <SheetTitle>Compose a message</SheetTitle>
              <SheetDescription>Shows on Kitchen board as soon as you choose Show now.</SheetDescription>
            </div>
          </SheetHeader>
          <div className="flex flex-col gap-4 py-2">
            {["Line 1", "Line 2", "Line 3", "Line 4", "Line 5", "Line 6"].map((line, i) => (
              <div key={line} className="grid gap-1.5">
                <Label htmlFor={`compose-${i}`}>{line}</Label>
                <Input id={`compose-${i}`} defaultValue={i === 0 ? "DINNER AT 7" : ""} />
              </div>
            ))}
          </div>
          <SheetFooter>
            <Button className="h-11 w-full">Show now</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  ),
};
