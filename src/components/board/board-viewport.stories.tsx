import type { Meta, StoryObj } from "@storybook/react";
import { type ReactNode, useLayoutEffect, useRef } from "react";

import { BoardViewport } from "./board-viewport";

/*
 * Figma 02 `Board / Scroll viewport` 36:35275 (370 wide, Tile sm) and 07
 * `57:27771` / 07c `310:68695` (the web editor's live preview, Tile md).
 *
 * Every story passes `persist={false}`: the Fit / Actual choice is shared
 * through sessionStorage with ScaledBoardDisplay, and a value left behind by
 * another story must not change what these capture.
 */
const meta = {
  title: "App/Board/BoardViewport",
  component: BoardViewport,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { persist: false, animationsEnabled: false, size: "sm" },
} satisfies Meta<typeof BoardViewport>;

export default meta;
type Story = StoryObj<typeof meta>;

const LOBBY_3X1 =
  "    LOBBY      COFFEE  $3     WIFI: FIESTA\n   WELCOME       TEA  $2      OPEN 7-7\n{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}";
const LOBBY_2X2 =
  "    LOBBY      COFFEE  $3\n   WELCOME       TEA  $2\n{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}\n  WIFI: FIESTA  MEETING 10:00\n    OPEN 7-7     ROOM B\n{69}{68}{67}{66}{65}{64}{63}{69}{68}{67}{66}{65}{64}{63}{69}{68}{67}{66}{65}{64}{63}{69}{68}{67}{66}{65}{64}{63}{69}{68}";
const FLAGSHIP =
  "\n    GOOD MORNING\n  72° SUNNY  HI 78\n  N JUDAH  4 MIN\n\n{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}";

/** A phone-width slot (Figma's 370), capped by the viewport on a 390 phone. */
function Slot({ width = 370, children }: { width?: number; children: ReactNode }) {
  return (
    <div className="max-w-[calc(100vw-4rem)]" style={{ width }}>
      {children}
    </div>
  );
}

/**
 * Story-only: start the scroller at `left` (or its end), the way a user's
 * swipe would leave it, so the middle and end states can be captured.
 */
function ScrolledTo({ left, children }: { left: number | "end"; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const scroller = ref.current?.querySelector<HTMLElement>("[data-slot=board-viewport-scroller]");
    if (!scroller) return;
    scroller.scrollLeft = left === "end" ? scroller.scrollWidth : left;
  }, [left]);
  return <div ref={ref}>{children}</div>;
}

/** 3×1 at Tile sm, Actual size: fade on the right, "Note 1 of 3" (`36:32684`). */
export const OverflowStart: Story = {
  args: {
    deviceType: "note_array",
    notesWide: 3,
    message: LOBBY_3X1,
    title: "Note array 3×1 · 45×3",
    hint: "swipe",
  },
  render: (args) => (
    <Slot>
      <BoardViewport {...args} />
    </Slot>
  ),
};

/** Scrolled one Note: fades both sides, "Note 2 of 3" (`36:33074`). */
export const OverflowMiddle: Story = {
  args: OverflowStart.args,
  render: (args) => (
    <Slot>
      <ScrolledTo left={240}>
        <BoardViewport {...args} />
      </ScrolledTo>
    </Slot>
  ),
};

/** At the end: fade on the left, "Note 3 of 3" (`36:33465`). */
export const OverflowEnd: Story = {
  args: OverflowStart.args,
  render: (args) => (
    <Slot>
      <ScrolledTo left="end">
        <BoardViewport {...args} />
      </ScrolledTo>
    </Slot>
  ),
};

/** Fit: the opt-in overview, labelled because its tiles are under 13 px (`36:33855`). */
export const FitOverview: Story = {
  args: { ...OverflowStart.args, defaultMode: "fit" },
  render: (args) => (
    <Slot>
      <BoardViewport {...args} />
    </Slot>
  ),
};

/** 2×2 pages one column of Notes at a time (`36:34244`). */
export const NoteArray2x2: Story = {
  args: {
    deviceType: "note_array",
    notesWide: 2,
    notesTall: 2,
    message: LOBBY_2X2,
    title: "Note array 2×2 · 30×6",
    hint: "swipe",
  },
  render: (args) => (
    <Slot>
      <BoardViewport {...args} />
    </Slot>
  ),
};

/** A Flagship in a 280 slot pages by column, with a progress bar (`52:122709`). */
export const FlagshipNarrow: Story = {
  args: { deviceType: "flagship", message: FLAGSHIP, title: "Flagship · 22×6 · Tile sm", hint: "swipe" },
  render: (args) => (
    <Slot width={280}>
      <BoardViewport {...args} />
    </Slot>
  ),
};

/** A board that fits draws no chrome (`36:32556`). */
export const Fits: Story = {
  args: {
    deviceType: "note",
    message: "     LOBBY\n    WELCOME\n{63}{64}{65}{66}{67}{68}{69}{63}{64}{65}{66}{67}{68}{69}{63}",
    title: "Note · 15×3 · fits",
  },
  render: (args) => (
    <Slot>
      <BoardViewport {...args} />
    </Slot>
  ),
};

/** The web editor's pane: Tile md, the keyboard hint (07 `57:27771`). */
export const WebPane: Story = {
  args: {
    deviceType: "note_array",
    notesWide: 3,
    message: LOBBY_3X1,
    size: "md",
    title: "Lobby wall · Note array 3×1",
    hint: "Shift + scroll, trackpad swipe, or ← → when focused. Snaps to each Note.",
  },
  render: (args) => (
    <Slot width={760}>
      <BoardViewport {...args} />
    </Slot>
  ),
};

/** A white board fades into its light bezel. */
export const WhiteBoard: Story = {
  args: { ...FlagshipNarrow.args, boardType: "white" },
  render: (args) => (
    <Slot width={280}>
      <BoardViewport {...args} />
    </Slot>
  ),
};
