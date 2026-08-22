import type { Meta, StoryObj } from "@storybook/react";

import { ScaledBoardTeaser } from "./scaled-board-teaser";

const meta = {
  title: "App/Plugin/ScaledBoardTeaser",
  component: ScaledBoardTeaser,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    teaser: {
      control: "text",
      description: "Literal board line; a color marker like {66} is one tile",
    },
    boardType: {
      control: "select",
      options: ["black", "white"],
    },
    code62Glyph: {
      control: "select",
      options: ["degree", "heart"],
      description:
        "Which glyph the viewer's board draws for code 62. Vestaboard replaced the Flagship's degree flap with a heart on units built from 2026 and nothing queryable tells them apart, so the consumer passes what the owner reported. Defaults to `degree`.",
    },
    tiles: {
      control: { type: "number", min: 1, max: 22 },
    },
  },
} satisfies Meta<typeof ScaledBoardTeaser>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The strip scales to whatever the container is — here, a 320px card body. */
export const Default: Story = {
  args: {
    teaser: "{66}AQI 45 CLEAR",
  },
  render: (args) => (
    <div className="w-full sm:w-[320px] rounded-xl border bg-card p-4">
      <ScaledBoardTeaser {...args} />
    </div>
  ),
};

export const WhiteBoard: Story = {
  args: {
    teaser: "{66}AQI 45 CLEAR",
    boardType: "white",
  },
  render: (args) => (
    <div className="w-full sm:w-[320px] rounded-xl border bg-card p-4">
      <ScaledBoardTeaser {...args} />
    </div>
  ),
};

/** A narrow container scales the strip down instead of overflowing it. */
export const NarrowContainer: Story = {
  args: {
    teaser: "AAPL +1.88%",
  },
  render: (args) => (
    <div className="w-[180px] rounded-xl border bg-card p-4">
      <ScaledBoardTeaser {...args} />
    </div>
  ),
};
