import type { Meta, StoryObj } from "@storybook/react";
import { Baseline, Clock, Palette, Settings2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useState } from "react";

import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { Label } from "../forms/label";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
  usePopoverClose,
} from "./popover";

type PopoverStoryArgs = ComponentProps<typeof Popover> & {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
};

const meta = {
  title: "Overlays/Popover",
  component: Popover,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    defaultOpen: {
      control: "boolean",
      description: "Open the popover on first render (uncontrolled)",
    },
    modal: {
      control: "select",
      options: [false, true, "trap-focus"],
      description: "Block interaction with the rest of the page while open",
    },
    closeOnOutsideClick: {
      control: "boolean",
      description: "Whether a press outside the popup dismisses it (Escape always does)",
    },
    open: {
      control: false,
      description: "Controlled open state; pair with onOpenChange",
    },
    onOpenChange: {
      control: false,
      description: "Callback fired when the open state changes",
    },
    side: {
      control: "select",
      options: ["top", "right", "bottom", "left"],
      description: "Preferred side of the trigger (PopoverContent prop)",
    },
    align: {
      control: "select",
      options: ["start", "center", "end"],
      description: "Alignment along the chosen side (PopoverContent prop)",
    },
    sideOffset: {
      control: "number",
      description: "Distance in pixels from the trigger (PopoverContent prop)",
    },
    children: {
      control: false,
      description: "PopoverTrigger and PopoverContent elements",
    },
  },
} satisfies Meta<PopoverStoryArgs>;

export default meta;
// Positioning lives on PopoverContent, so the stories take a widened arg set
// rather than deriving it from the Popover root alone.
type Story = StoryObj<PopoverStoryArgs>;

export const Default: Story = {
  args: {
    side: "bottom",
    align: "center",
    sideOffset: 4,
    defaultOpen: false,
    modal: false,
    closeOnOutsideClick: true,
  },
  render: ({ side, align, sideOffset, ...args }) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <Settings2 className="h-4 w-4" />
          Display
        </Button>
      </PopoverTrigger>
      <PopoverContent side={side} align={align} sideOffset={sideOffset} className="w-80">
        <div className="grid gap-4">
          <div className="space-y-1">
            <PopoverTitle>Display</PopoverTitle>
            <PopoverDescription>Set how this page renders on the board.</PopoverDescription>
          </div>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="popover-width">Width</Label>
              <Input id="popover-width" defaultValue="1280" className="col-span-2 h-8" />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="popover-height">Height</Label>
              <Input id="popover-height" defaultValue="720" className="col-span-2 h-8" />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

/** The popup is `role="dialog"`; a PopoverTitle names it via aria-labelledby. */
export const Open: Story = {
  args: {
    defaultOpen: true,
  },
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="outline">Share page</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-1">
          <PopoverTitle>Share page</PopoverTitle>
          <PopoverDescription>Anyone with the link can view this page.</PopoverDescription>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const Sides: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-16">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Popover key={side}>
          <PopoverTrigger asChild>
            <Button variant="outline">{side}</Button>
          </PopoverTrigger>
          <PopoverContent side={side} label={`Popover on ${side}`} className="w-48">
            <p className="text-sm">Anchored to the {side} of the trigger.</p>
          </PopoverContent>
        </Popover>
      ))}
    </div>
  ),
};

/**
 * Base UI's positioner flips and shifts the popup to keep it inside the
 * viewport — the four hand-rolled panels this component replaces each carried
 * their own `getBoundingClientRect` clamping loop instead. The trigger here sits
 * hard against the right edge of a narrow rail; the panel is wider than the
 * space left of it, and still lands on screen.
 */
export const CollisionAware: Story = {
  render: () => (
    <div className="flex w-full sm:w-[360px] items-center justify-end rounded-lg border bg-muted/40 p-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Text formatting">
            <Baseline className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" label="Text formatting" className="w-72">
          <p className="text-sm">
            A panel far wider than the room to its right. It shifts back inside the viewport instead of overflowing.
          </p>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

function SwatchGrid() {
  // Dismiss from a descendant without lifting `open` into consumer state —
  // the alternative to threading a `close` callback down by hand.
  const close = usePopoverClose();
  const swatches = [
    { name: "Primary", className: "bg-primary" },
    { name: "Secondary", className: "bg-secondary" },
    { name: "Accent", className: "bg-accent" },
    { name: "Muted", className: "bg-muted" },
    { name: "Destructive", className: "bg-destructive" },
    { name: "Foreground", className: "bg-foreground" },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {swatches.map((swatch) => (
        <button
          key={swatch.name}
          type="button"
          onClick={close}
          className="flex size-10 items-center justify-center rounded-md border focus-ring"
        >
          <span className={`size-6 rounded-sm ${swatch.className}`} />
          <span className="sr-only">{swatch.name}</span>
        </button>
      ))}
    </div>
  );
}

/** Toolbar-style icon trigger whose body closes the popover on selection. */
export const SelectionClosesPopover: Story = {
  render: () => (
    <div className="flex items-center gap-1 rounded-md border bg-background p-1 shadow-sm">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Text colour">
            <Palette className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" label="Text colour" className="w-auto p-2">
          <SwatchGrid />
        </PopoverContent>
      </Popover>
    </div>
  ),
};

/**
 * The popup can be tied to the trigger's measured width with the
 * `--anchor-width` custom property the positioner publishes, which is how a
 * field-anchored picker keeps its panel flush with the input.
 */
export const MatchTriggerWidth = () => {
  const [time, setTime] = useState("09:00");
  const times = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00"];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="outline" className="w-56 justify-start">
            <Clock className="h-4 w-4" />
            {time}
          </Button>
        }
      />
      <PopoverContent align="start" label="Choose a time" className="w-[var(--anchor-width)] max-h-48 p-1">
        {({ close }) => (
          <div className="grid gap-0.5">
            {times.map((value) => (
              <button
                key={value}
                type="button"
                aria-current={value === time}
                onClick={() => {
                  setTime(value);
                  close();
                }}
                className="rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground aria-[current=true]:font-semibold"
              >
                {value}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

/**
 * `closeOnOutsideClick={false}` keeps a half-finished edit open when the user
 * clicks the page behind it. Escape and the explicit close still dismiss, so the
 * popover never traps the keyboard.
 */
export const StaysOpenOnOutsideClick: Story = {
  render: () => (
    <Popover closeOnOutsideClick={false}>
      <PopoverTrigger asChild>
        <Button variant="outline">Rename board</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-3">
          <PopoverTitle>Rename board</PopoverTitle>
          <div className="grid gap-2">
            <Label htmlFor="popover-board-name">Board name</Label>
            <Input id="popover-board-name" defaultValue="Kitchen board" />
          </div>
          <div className="flex justify-end gap-2">
            <PopoverClose asChild>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
            </PopoverClose>
            <PopoverClose asChild>
              <Button size="sm">Save</Button>
            </PopoverClose>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

/** `modal` locks page scroll and traps focus inside the popup while it is open. */
export const Modal: Story = {
  args: {
    modal: true,
  },
  render: (args) => (
    <Popover {...args}>
      <PopoverTrigger asChild>
        <Button variant="outline">Filters</Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="grid gap-3">
          <PopoverTitle>Filters</PopoverTitle>
          <PopoverDescription>Only pages matching every filter are shown.</PopoverDescription>
          <div className="grid gap-2">
            <Label htmlFor="popover-filter-query">Contains</Label>
            <Input id="popover-filter-query" placeholder="weather" />
          </div>
          <PopoverClose asChild>
            <Button size="sm">Apply</Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  ),
};
