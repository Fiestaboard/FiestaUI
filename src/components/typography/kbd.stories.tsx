import type { Meta, StoryObj } from "@storybook/react";
import { Search } from "lucide-react";

import { Input } from "../forms/input";
import { Kbd } from "./kbd";
import { Text } from "./text";

const meta = {
  title: "Primitives/Typography/Kbd",
  component: Kbd,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    keys: {
      control: "object",
      description:
        "The chord, one entry per key. `Mod` prints ⌘ on Apple and `Ctrl` everywhere else; anything the glyph map " +
        "does not know (`K`, `F5`, `/`) renders verbatim.",
    },
    platform: {
      control: "inline-radio",
      options: ["generic", "apple"],
      description:
        "Which modifier spelling to print. A prop rather than a `navigator` sniff, so a server-rendered page " +
        "hydrates without a mismatch — call `useKbdPlatform()` to follow the reader's real machine.",
    },
  },
} satisfies Meta<typeof Kbd>;

export default meta;
type Story = StoryObj<typeof meta>;

/** One free-form cap. No `keys`, no nesting — a single `<kbd>` wearing the keycap. */
export const Default: Story = {
  args: {
    children: "Esc",
  },
};

/**
 * A chord: nested `<kbd>`s, one cap per key, announced as a single input. The
 * two platforms side by side — the same `keys` array, two spellings.
 */
export const Chord: Story = {
  render: () => (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex items-center gap-3">
        <Text size="sm" tone="muted">
          generic
        </Text>
        <Kbd keys={["Mod", "K"]} />
        <Kbd keys={["Shift", "Enter"]} />
        <Kbd keys={["Ctrl", "Alt", "Delete"]} />
      </div>
      <div className="flex items-center gap-3">
        <Text size="sm" tone="muted">
          apple
        </Text>
        <Kbd platform="apple" keys={["Mod", "K"]} />
        <Kbd platform="apple" keys={["Shift", "Enter"]} />
        <Kbd platform="apple" keys={["Ctrl", "Alt", "Delete"]} />
      </div>
    </div>
  ),
};

/**
 * The cap's type size is `0.8125em`, so it tracks whatever it is sitting in
 * rather than pinning itself to one step of the scale. Three body sizes, one
 * component, no `size` prop.
 */
export const InProse: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-3">
      <Text size="lg">
        Press <Kbd keys={["Mod", "K"]} platform="apple" /> to open search.
      </Text>
      <Text size="base">
        Press <Kbd keys={["Mod", "K"]} platform="apple" /> to open search.
      </Text>
      <Text size="sm">
        Press <Kbd keys={["Mod", "K"]} platform="apple" /> to open search.
      </Text>
    </div>
  ),
};

/**
 * The reason this exists: the docs navbar's search affordance. The hint sits
 * in the field's trailing slot, and because the cap is em-sized it lands
 * inside the 36px field without a bespoke size.
 */
export const InSearchField: Story = {
  render: () => (
    <div className="relative w-[280px]">
      <Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" placeholder="Search docs" aria-label="Search docs" className="pl-9 pr-16" />
      <Kbd
        platform="apple"
        keys={["Mod", "K"]}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
      />
    </div>
  ),
};

/** Everything the glyph map knows, in both spellings. */
export const KeyGlyphs: Story = {
  render: () => {
    const keys = ["Mod", "Ctrl", "Alt", "Shift", "Enter", "Tab", "Backspace", "Delete", "Escape", "Space", "Up"];
    return (
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {keys.map((key) => (
            <Kbd key={key} keys={[key]} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {keys.map((key) => (
            <Kbd key={key} platform="apple" keys={[key]} />
          ))}
        </div>
      </div>
    );
  },
};
