import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { TraceStep } from "./trace-step";

const meta = {
  title: "Editor/TraceStep",
  component: TraceStep,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { expression: 'DATEDIFF(NOW(), DATE(item.eta), "minutes")', value: "7" },
  decorators: [
    (Story) => (
      <div className="w-[380px] max-w-full">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TraceStep>;
export default meta;
type Story = StoryObj<typeof meta>;

export const OK: Story = {};
export const Error: Story = { args: { state: "error", value: "#REF" } };
export const Skipped: Story = { args: { state: "skipped", value: "—" } };
export const Nested: Story = {
  render: () => (
    <div role="list" aria-label="Evaluation steps">
      <TraceStep role="listitem" expression="IF(ready, SUM(3, 4), 0)" value="7" />
      <TraceStep role="listitem" expression="ready" value="true" depth={1} />
      <TraceStep role="listitem" expression="SUM(3, 4)" value="7" depth={1} />
      <TraceStep role="listitem" expression="3" value="3" depth={2} />
      <TraceStep role="listitem" expression="4" value="4" depth={2} />
      <TraceStep role="listitem" expression="0" value="—" depth={1} state="skipped" />
    </div>
  ),
};
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  args: { expression: "COALESCE(weather.temperature, fallback.temperature)", value: "Unavailable", depth: 2 },
};
export const LongValues: Story = {
  args: {
    expression: 'IF(ISBLANK(weather.current.temperature), "Not available", weather.current.temperature)',
    value: "Not available until the integration reconnects",
    depth: 20,
  },
  play: async ({ canvasElement }) => {
    for (const el of canvasElement.querySelectorAll<HTMLElement>("[data-slot^=trace-step]")) {
      expect(el.scrollWidth).toBeLessThanOrEqual(el.clientWidth + 1);
      expect(el.scrollHeight).toBeLessThanOrEqual(el.clientHeight + 1);
    }
  },
};
export const LargeText: Story = {
  args: { state: "error", expression: "weather.temperature", value: "#REF", depth: 1 },
  decorators: [
    (Story) => (
      <div className="[&_[data-slot=trace-step]]:text-2xl [&_[data-slot=trace-step]]:leading-8">
        <Story />
      </div>
    ),
  ],
};
