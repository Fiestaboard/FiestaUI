import type { Meta, StoryObj } from "@storybook/react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Underline } from "lucide-react";

import { Toggle, ToggleGroup } from "./toggle";

const meta = {
  title: "Forms/ToggleGroup",
  component: ToggleGroup,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    multiple: {
      control: "boolean",
      description:
        "Off (the default), pressing one item unpresses the rest — one-of-N, though pressing the pressed " +
        "item again may empty the selection. On, any number of items can be pressed (bold + italic).",
    },
    segmented: {
      control: "boolean",
      description:
        "Joined toolbar look: one shared rounded border with hairline dividers, items stripped of their own " +
        "chrome. Off, the items sit loose with a small gap.",
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Layout axis. Arrow-key roving focus follows it (all four arrows work, with wrap).",
    },
    disabled: {
      control: "boolean",
      description: "Disables every item in the group.",
    },
    loopFocus: {
      control: "boolean",
      description: "Whether arrow-key focus wraps from the last item back to the first.",
    },
    value: {
      control: false,
      description:
        "Values of all pressed items, always an array (controlled). Single-select groups just hold 0 or 1 entries.",
    },
    defaultValue: {
      control: false,
      description: "Initially pressed values (uncontrolled).",
    },
    onValueChange: {
      control: false,
      description: "Fired with the new array of pressed values.",
    },
    "aria-label": {
      control: "text",
      description:
        'Accessible name for the group — required (or `aria-labelledby`), a `role="group"` of controls ' +
        "cannot ship nameless.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * One-of-three alignment, loose layout. One tab stop for the whole group;
 * arrow keys move focus, Space/Enter commits — traversing never re-aligns.
 */
export const Default: Story = {
  args: {
    "aria-label": "Text alignment",
    defaultValue: ["left"],
    children: (
      <>
        <Toggle value="left" size="icon" aria-label="Align left">
          <AlignLeft />
        </Toggle>
        <Toggle value="center" size="icon" aria-label="Align center">
          <AlignCenter />
        </Toggle>
        <Toggle value="right" size="icon" aria-label="Align right">
          <AlignRight />
        </Toggle>
      </>
    ),
  },
};

/**
 * The joined toolbar cluster the template editor hand-builds twice out of
 * `rounded-md border overflow-hidden` plus per-child `border-x` fixups —
 * here it is one prop.
 */
export const Segmented: Story = {
  args: {
    "aria-label": "Text alignment",
    segmented: true,
    defaultValue: ["center"],
    children: (
      <>
        <Toggle value="left" size="icon" aria-label="Align left">
          <AlignLeft />
        </Toggle>
        <Toggle value="center" size="icon" aria-label="Align center">
          <AlignCenter />
        </Toggle>
        <Toggle value="right" size="icon" aria-label="Align right">
          <AlignRight />
        </Toggle>
      </>
    ),
  },
};

/**
 * The page builder's board colour picker — a segmented one-of-two. The
 * swatches are decorative (`aria-hidden`); the labels carry the meaning, so
 * the choice is never conveyed by colour alone.
 */
export const BoardColor = () => (
  <div className="w-full sm:w-[360px]">
    <ToggleGroup aria-label="Board color" segmented defaultValue={["black"]} className="w-full">
      <Toggle value="black" className="flex-1">
        <span className="size-3 rounded-full border border-input bg-zinc-950" aria-hidden="true" />
        Black board
      </Toggle>
      <Toggle value="white" className="flex-1">
        <span className="size-3 rounded-full border border-input bg-white" aria-hidden="true" />
        White board
      </Toggle>
    </ToggleGroup>
  </div>
);

/** `multiple` — any-of-N. Bold and italic are independently on. */
export const Multiple = () => (
  <ToggleGroup aria-label="Text formatting" segmented multiple defaultValue={["bold", "italic"]}>
    <Toggle value="bold" size="icon" aria-label="Bold">
      <Bold />
    </Toggle>
    <Toggle value="italic" size="icon" aria-label="Italic">
      <Italic />
    </Toggle>
    <Toggle value="underline" size="icon" aria-label="Underline">
      <Underline />
    </Toggle>
  </ToggleGroup>
);

/** Vertical orientation. Items stretch to the frame's width; up/down arrows rove. */
export const Vertical = () => (
  <ToggleGroup aria-label="Text alignment" segmented orientation="vertical" defaultValue={["left"]}>
    <Toggle value="left">
      <AlignLeft /> Left
    </Toggle>
    <Toggle value="center">
      <AlignCenter /> Center
    </Toggle>
    <Toggle value="right">
      <AlignRight /> Right
    </Toggle>
  </ToggleGroup>
);

/**
 * Group-level disabled reaches every item through Base UI's context — the
 * pressed one keeps showing which state it is stuck in.
 */
export const Disabled = () => (
  <ToggleGroup aria-label="Text alignment" segmented disabled defaultValue={["left"]}>
    <Toggle value="left" size="icon" aria-label="Align left">
      <AlignLeft />
    </Toggle>
    <Toggle value="center" size="icon" aria-label="Align center">
      <AlignCenter />
    </Toggle>
    <Toggle value="right" size="icon" aria-label="Align right">
      <AlignRight />
    </Toggle>
  </ToggleGroup>
);
