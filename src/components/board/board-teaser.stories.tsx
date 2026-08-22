import type { Meta, StoryObj } from "@storybook/react";

import { BoardTeaser } from "./board-teaser";

const meta = {
  title: "App/Board/BoardTeaser",
  component: BoardTeaser,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    teaser: {
      control: "text",
      description: "Literal board line; colors via {red}…{/red} or {63} markers (a marker is one tile)",
    },
    tiles: {
      control: { type: "number", min: 1, max: 22 },
      description: "Strip width in tiles; the teaser is truncated/padded with blanks to exactly this many",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Tile size variant (matches StaticBoardDisplay tile sizing)",
    },
    boardType: {
      control: "select",
      options: ["black", "white"],
      description: "Type of board (black or white)",
    },
    code62Glyph: {
      control: "select",
      options: ["degree", "heart"],
      description:
        "Which glyph the board this strip stands for draws for code 62. Already resolved by the consumer — a one-row strip has no device shape of its own. Defaults to `degree`.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes on the strip container",
    },
  },
} satisfies Meta<typeof BoardTeaser>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    teaser: "HELLO WORLD",
    size: "md",
  },
};

export const WithColorTiles: Story = {
  args: {
    teaser: "{66}AAPL +1.88%",
    size: "md",
  },
};

export const WhiteBoard: Story = {
  args: {
    teaser: "{67}SUNNY 72°",
    size: "md",
    boardType: "white",
  },
};

/** Over-long teasers are truncated to the strip width — no overflow, no second row. */
export const Truncated: Story = {
  args: {
    teaser: "{63}THIS TEASER IS FAR TOO LONG FOR ONE ROW",
    size: "md",
  },
};

export const SmallSize: Story = {
  args: {
    teaser: "{65}QUOTE OF DAY",
    size: "sm",
  },
};

/** Directory-card strip — the use case this component exists for: one teaser per plugin card. */
export const PluginDirectory = () => (
  <div className="flex flex-col gap-3">
    {["{66}AAPL +1.88%", "{67}RAIN AT 4PM", "{64}N JUDAH 3 MIN", "WIFI: CASA1234"].map((teaser) => (
      <BoardTeaser key={teaser} teaser={teaser} size="sm" />
    ))}
  </div>
);
