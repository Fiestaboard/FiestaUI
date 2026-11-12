import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { Countdown } from "./countdown";

const MIN = 60_000;

/**
 * Pins `endsAt` at mount so the story reads the same in every screenshot: the
 * end sits half a second inside the minute, so the label holds for ~59 s.
 * The until label is fixed ("until 9:00 PM") for the same reason.
 */
function useEndsIn(ms: number) {
  const [endsAt] = React.useState(() => Date.now() + ms - 500);
  return endsAt;
}

const meta = {
  title: "Feedback/Countdown",
  component: Countdown,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { endsAt: 0 },
} satisfies Meta<typeof Countdown>;

export default meta;
type Story = StoryObj<typeof meta>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div className="w-full max-w-[790px]">{children}</div>;
}

/** 07a Override countdown: "2h 42m left", "until 9:00 PM", and the bar draining from a 4 h hold. */
export const Default: Story = {
  render: function Render() {
    const endsAt = useEndsIn(2 * 60 * MIN + 42 * MIN);
    return (
      <Frame>
        <Countdown endsAt={endsAt} startedAt={endsAt - 4 * 60 * MIN} untilLabel="until 9:00 PM" />
      </Frame>
    );
  },
};

/** Without a start time there is no bar, only the text. */
export const WithoutProgress: Story = {
  render: function Render() {
    const endsAt = useEndsIn(42 * MIN);
    return (
      <Frame>
        <Countdown endsAt={endsAt} untilLabel="until 7:00 PM" />
      </Frame>
    );
  },
};

/** The last minutes of a 15 min hold. Screen readers hear "5m left" once, then "Override ended". */
export const NearlyDone: Story = {
  render: function Render() {
    const endsAt = useEndsIn(4 * MIN);
    return (
      <Frame>
        <Countdown endsAt={endsAt} startedAt={endsAt - 15 * MIN} untilLabel="until 6:33 PM" />
      </Frame>
    );
  },
};

/** Time is up; the hub has not reported the change yet. */
export const Ended: Story = {
  render: () => (
    <Frame>
      <Countdown endsAt={0} startedAt={-4 * 60 * MIN} untilLabel="until 9:00 PM" />
    </Frame>
  ),
};

/** Phone width (07a 306:53082). */
export const Mobile: Story = {
  render: function Render() {
    const endsAt = useEndsIn(2 * 60 * MIN + 42 * MIN);
    return (
      <div className="w-[311px] max-w-full">
        <Countdown endsAt={endsAt} startedAt={endsAt - 4 * 60 * MIN} untilLabel="until 9:00 PM" />
      </div>
    );
  },
};
