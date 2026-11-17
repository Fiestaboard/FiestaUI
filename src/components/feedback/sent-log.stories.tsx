import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "storybook/test";

import { SentLog } from "./sent-log";

const meta = {
  title: "Feedback/SentLog",
  component: SentLog,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    items: [
      { id: "1", at: "7:41 AM", outcome: "shown", message: "to Den TV · é → E" },
      { id: "2", at: "6:55 AM", outcome: "held", message: "re-rendered when Silence ends 7:00 AM" },
      { id: "3", at: "Yesterday", outcome: "paused", message: "Den TV paused 8:31–9:00 PM" },
    ],
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SentLog>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole("listitem")).toHaveLength(3);
    expect(canvas.getByText("Held")).toBeVisible();
    expect(canvas.getByText("Paused")).toBeVisible();
  },
};
export const Summary: Story = { args: { presentation: "summary" } };
export const Empty: Story = { args: { items: [] } };
export const LastTwenty: Story = {
  args: {
    items: Array.from({ length: 24 }, (_, i) => ({
      id: `${i}`,
      at: `Event ${i + 1}`,
      outcome: i % 3 === 0 ? "held" : i % 3 === 1 ? "shown" : "paused",
      message: "Den TV",
    })),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    expect(canvas.getAllByRole("listitem")).toHaveLength(20);
    expect(canvas.queryByText("Event 21")).not.toBeInTheDocument();
  },
};
export const Mobile: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } };
// Every story uses the shared light/dark VRT and axe matrix; do not pin a theme.
export const LongContent: Story = {
  args: {
    items: [
      {
        id: "1",
        at: "A very long localized relative time",
        outcome: "held",
        message:
          "The upstairs display will re-render this page when Silence ends, using the newest values available from all connected providers.",
      },
    ],
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[280px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    for (const element of canvasElement.querySelectorAll<HTMLElement>('[data-slot="sent-log"], li, time'))
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
  },
};
