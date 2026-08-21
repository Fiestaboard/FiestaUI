import type { Meta, StoryObj } from "@storybook/react";
import { Bell, Cloud, Plug, Sparkles } from "lucide-react";

import { FiestaIcon } from "../chrome/fiesta-icon";
import { IconTile } from "./icon-tile";

const meta = {
  title: "Containment/IconTile",
  component: IconTile,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description:
        "Box size, 32 / 40 / 48px. The corner radius scales with it so every size reads as the same squircle, and " +
        "an unsized `svg` child takes 16 / 20 / 24px — a child that sets its own `size-*` keeps it.",
    },
    tone: {
      control: "select",
      options: ["muted", "board"],
      description:
        "Ground the glyph sits on. `muted` is the ordinary surface step below the page; `board` is the hardware " +
        "black, the same dark in both themes, for brand artwork drawn for a dark field.",
    },
    decorative: {
      control: "boolean",
      description:
        "Keeps the tile and its glyph out of the accessibility tree (the default). Turn it off only when the icon " +
        "is the sole carrier of its meaning — and then name the glyph yourself, since this package ships no copy.",
    },
    children: {
      control: false,
      description: "The glyph. Usually a lucide icon; any element works, and full-bleed artwork clips to the radius.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof IconTile>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The ordinary case: a lucide glyph on the muted ground at the default size. */
export const Default: Story = {
  args: {
    children: <Cloud />,
  },
};

/**
 * The size axis. The glyph grows with the box and so does the radius — the
 * three tiles are the same shape photographed at three scales, which is the
 * point of a scale rather than three unrelated boxes.
 */
export const AllSizes: Story = {
  args: { children: <Cloud /> },
  render: (args) => (
    <div className="flex items-end gap-4">
      <IconTile {...args} size="sm" />
      <IconTile {...args} size="md" />
      <IconTile {...args} size="lg" />
    </div>
  ),
};

/**
 * The tone axis. `muted` follows the theme; `board` does not — it is the
 * hardware black in light and dark alike, because the artwork it exists for
 * (the pixel-art mark, the plugin category tiles) is drawn against a dark
 * field and dissolves on a light one.
 */
export const AllTones: Story = {
  args: { children: <Cloud /> },
  render: (args) => (
    <div className="flex items-center gap-4">
      <IconTile {...args} tone="muted" />
      <IconTile {...args} tone="board" />
    </div>
  ),
};

/**
 * The wizard's header lockup, which is the consumer this component was
 * extracted from: brand artwork sized at the call site (`size-8 sm:size-10`)
 * inside a board-toned `lg` tile, with the wordmark carrying the name.
 */
export const BrandLockup: Story = {
  args: {
    size: "lg",
    tone: "board",
    children: <FiestaIcon className="size-8" />,
  },
  render: (args) => (
    <span className="flex items-center gap-3">
      <IconTile {...args} />
      <span className="text-xl font-semibold tracking-tight">FiestaBoard</span>
    </span>
  ),
};

/**
 * A row of tiles labelled by the text beside them — the composition that
 * justifies the decorative default. Each glyph restates its label, so
 * announcing the tiles would read the list twice.
 */
export const InListRows: Story = {
  args: { children: <Cloud /> },
  render: (args) => (
    <ul className="flex w-64 flex-col gap-3">
      {[
        { icon: <Plug />, label: "Plugins" },
        { icon: <Bell />, label: "Notifications" },
        { icon: <Sparkles />, label: "What's new" },
      ].map((row) => (
        <li key={row.label} className="flex items-center gap-3">
          <IconTile {...args} size="sm">
            {row.icon}
          </IconTile>
          <span className="text-sm font-medium">{row.label}</span>
        </li>
      ))}
    </ul>
  ),
};

/**
 * Hostile content: a glyph far bigger than the box, and one far smaller. The
 * tile never resizes — `overflow-hidden` clips the oversized mark to the
 * radius, and the undersized one stays centred rather than collapsing the
 * square. A tile whose size depended on its contents could not line up a
 * column of rows, which is most of what it is for.
 */
export const OversizedAndUndersizedGlyphs: Story = {
  args: { size: "md" },
  render: (args) => (
    <div className="flex items-center gap-4">
      <IconTile {...args}>
        <Cloud className="size-16" />
      </IconTile>
      <IconTile {...args}>
        <Cloud className="size-2" />
      </IconTile>
      <IconTile {...args} tone="board">
        <FiestaIcon className="size-16" />
      </IconTile>
    </div>
  ),
};
