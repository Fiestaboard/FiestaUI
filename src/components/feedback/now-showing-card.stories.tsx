import type { Meta, StoryObj } from "@storybook/react";
import { LayoutGrid, Pencil } from "lucide-react";
import * as React from "react";

import { ScaledBoardDisplay } from "../board/scaled-board-display";
import { Button } from "../forms/button";
import { Countdown } from "./countdown";
import { NowShowingCard } from "./now-showing-card";

const MIN = 60_000;

// Maya's household (CANON). Messages are the Figma frames' boards.
const DINNER_NOTE =
  "\n      DINNER AT 7\n      TACO NIGHT\n      SEE YOU SOON\n\n{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}";
const MORNING_COMMUTE =
  "\n     GOOD MORNING\n  72° SUNNY  HI 78\n  N JUDAH  4 MIN\n\n{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}";
const TACO_TUESDAY =
  "\n      TACO TUESDAY\n      MAYA COOKS\n      DINNER 6:30 PM\n\n{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}{67}{68}{63}{64}{65}{66}";

function Board({ message }: { message: string }) {
  return <ScaledBoardDisplay message={message} size="md" isStatic />;
}

/** Pins `endsAt` at mount so screenshots read the same (see Countdown stories). */
function useEndsIn(ms: number) {
  const [endsAt] = React.useState(() => Date.now() + ms - 500);
  return endsAt;
}

const meta = {
  title: "Feedback/NowShowingCard",
  component: NowShowingCard,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "inline-radio", options: ["hero", "compact"] },
    mode: { control: "inline-radio", options: [undefined, "schedule", "manual", "override"] },
    state: { control: "inline-radio", options: ["live", "preview"] },
  },
  args: {
    display: "Kitchen board",
    title: "Morning commute",
    board: null,
  },
} satisfies Meta<typeof NowShowingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function OverrideHero() {
  const endsAt = useEndsIn(2 * 60 * MIN + 42 * MIN);
  return (
    <NowShowingCard
      className="w-full max-w-[832px]"
      display="Kitchen board"
      meta="Flagship 22 × 6 · Maya’s FiestaPi"
      mode="override"
      title="Dinner note"
      board={<Board message={DINNER_NOTE} />}
      countdown={<Countdown endsAt={endsAt} startedAt={endsAt - 4 * 60 * MIN} untilLabel="until 9:00 PM" />}
      outcome="Holds until 9:00 PM, then Schedule resumes. Next: Good night."
      actions={
        <>
          <Button variant="secondary" size="lg">
            <LayoutGrid aria-hidden="true" />
            Change Page
          </Button>
          <Button variant="outline" size="lg">
            Cancel override
          </Button>
          <Button variant="ghost" size="lg">
            <Pencil aria-hidden="true" />
            Edit page
          </Button>
        </>
      }
    />
  );
}

/** 07a Home · Override active (303:22566): badge, countdown, outcome line, Cancel override as outline. */
export const Override: Story = {
  render: () => <OverrideHero />,
};

/** Home in Schedule Mode: no countdown, the line says what comes next. */
export const ScheduleMode: Story = {
  render: () => (
    <NowShowingCard
      className="w-full max-w-[832px]"
      display="Kitchen board"
      meta="Flagship 22 × 6 · Maya’s FiestaPi"
      mode="schedule"
      title="Morning commute"
      board={<Board message={MORNING_COMMUTE} />}
      outcome="Until 9:00 AM, then Market open."
      actions={
        <>
          <Button variant="secondary" size="lg">
            <LayoutGrid aria-hidden="true" />
            Change Page
          </Button>
          <Button variant="ghost" size="lg">
            <Pencil aria-hidden="true" />
            Edit page
          </Button>
        </>
      }
    />
  ),
};

/** Manual Mode (Schedule Mode off): the page holds until someone changes it. */
export const ManualMode: Story = {
  render: () => (
    <NowShowingCard
      className="w-full max-w-[832px]"
      display="Kitchen board"
      mode="manual"
      title="Morning commute"
      board={<Board message={MORNING_COMMUTE} />}
      outcome="Holds until you Change Page. Schedule Mode is off."
    />
  ),
};

/** 02 Board / Mobile · Now showing card (10:1212): the compact card for lists and glanceable surfaces. */
export const Compact: Story = {
  render: () => (
    <NowShowingCard
      variant="compact"
      className="w-[370px] max-w-full"
      display="Kitchen board"
      mode="schedule"
      title="Morning commute"
      description="Until 9:00 AM · then Market open"
      board={<Board message={MORNING_COMMUTE} />}
    />
  ),
};

/** Compact during an Override. */
export const CompactOverride: Story = {
  render: () => (
    <NowShowingCard
      variant="compact"
      className="w-[370px] max-w-full"
      display="Kitchen board"
      mode="override"
      title="Dinner note"
      description="Until 9:00 PM · then Good night"
      board={<Board message={DINNER_NOTE} />}
    />
  ),
};

/** Preview · Not sent yet: what Change Page or Compose will show, before Show now. */
export const Preview: Story = {
  render: () => (
    <NowShowingCard
      variant="compact"
      state="preview"
      className="w-[370px] max-w-full"
      display="Kitchen board"
      title="Taco Tuesday"
      description="Flagship · not in the Schedule"
      board={<Board message={TACO_TUESDAY} />}
    />
  ),
};

/** The display is offline: a labelled danger dot, since no nearby text says so. */
export const Offline: Story = {
  render: () => (
    <NowShowingCard
      variant="compact"
      className="w-[370px] max-w-full"
      display="Kitchen board"
      status="danger"
      statusLabel="Offline"
      mode="schedule"
      title="Morning commute"
      description="Last connected 6:02 PM"
      board={<Board message={MORNING_COMMUTE} />}
    />
  ),
};

/** Phone width (07a 306:53082): the hero card at 358 px, buttons wrap. */
export const Mobile: Story = {
  render: () => (
    <div className="w-[358px] max-w-full">
      <OverrideHero />
    </div>
  ),
};
