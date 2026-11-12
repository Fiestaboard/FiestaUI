import type { Meta, StoryObj } from "@storybook/react";

import { StaticBoardDisplay } from "../board/static-board-display";
import { PagePreviewCard } from "./page-preview-card";

/**
 * 08 C17 (`61:25808`) — the live component is 03 "Page card" (`36:8196`),
 * used by the Change Page library sheet (`36:30293`) and the Pages grid. The
 * board is a real Tile-sm board and is never scaled down (owner rule 9).
 */
const meta = {
  title: "Containment/PagePreviewCard",
  component: PagePreviewCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof PagePreviewCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const RAINBOW = "{63}{64}{65}{66}{67}{68}".repeat(4).slice(0, 22 * 4);
const DINNER = `\n    DINNER AT 7\n     TACO NIGHT\n    SEE YOU SOON\n\n${RAINBOW}`;
const MORNING = `\n     GOOD MORNING\n   72° SUNNY  HI 78\n    N JUDAH  4 MIN\n\n${RAINBOW}`;
const BIRTHDAY = `\n     HAPPY BIRTHDAY\n        SAM!\n\n\n${RAINBOW}`;

function Board({ message }: { message: string }) {
  return <StaticBoardDisplay size="sm" deviceType="flagship" message={message} />;
}

/** 03 `36:7418`: the board, the page name, when it last showed, a chevron. */
export const Default: Story = {
  args: {
    title: "Dinner note",
    description: "Last shown yesterday, 6:30 PM",
    board: <Board message={MORNING} />,
  },
  render: (args) => (
    <div className="w-full max-w-[371px]">
      <PagePreviewCard {...args} />
    </div>
  ),
};

/** The page that is showing now: ring, tint and the check — not colour alone. */
export const Selected: Story = {
  args: { ...Default.args, selected: true },
  render: Default.render,
};

/** A card that navigates is a real link (`render={<a href>}`). */
export const AsLink: Story = {
  args: {
    title: "Birthday · Sam",
    description: "Flagship · made by Maya",
    board: <Board message={BIRTHDAY} />,
    // The card replaces the anchor's children with its own content (tested).
    // eslint-disable-next-line jsx-a11y/anchor-has-content
    render: <a href="#birthday" />,
  },
  render: Default.render,
};

/** Long names wrap; the chevron stays centred on the text block. */
export const LongTitle: Story = {
  args: {
    title: "Weekend surf report for Ocean Beach and Linda Mar",
    description: "Last shown Saturday, 7:00 AM · made by Maya",
    board: <Board message={DINNER} />,
  },
  render: Default.render,
};

/** Narrower than the board: the edges crop, the tiles keep their size. */
export const Narrow: Story = {
  args: Default.args,
  render: (args) => (
    <div className="w-[300px]">
      <PagePreviewCard {...args} />
    </div>
  ),
};

/** Change Page (03 `36:30293`): a library list of page cards. */
export const Library: Story = {
  args: Default.args,
  render: () => (
    <div className="flex w-full max-w-[371px] flex-col gap-4">
      <PagePreviewCard
        title="Dinner note"
        description="Last shown yesterday, 6:30 PM"
        board={<Board message={DINNER} />}
        selected
      />
      <PagePreviewCard
        title="Birthday · Sam"
        description="Flagship · made by Maya"
        board={<Board message={BIRTHDAY} />}
      />
      <PagePreviewCard
        title="Good morning"
        description="Last shown today, 7:00 AM"
        board={<Board message={MORNING} />}
      />
    </div>
  ),
};
