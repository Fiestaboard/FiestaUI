import type { Meta, StoryObj } from "@storybook/react";
import { expect } from "storybook/test";

import { TraceStep } from "./trace-step";

function expectViewportFit(canvasElement: HTMLElement) {
  const viewportWidth = canvasElement.ownerDocument.documentElement.clientWidth;
  expect(canvasElement.getBoundingClientRect().right).toBeLessThanOrEqual(viewportWidth + 1);
  for (const row of canvasElement.querySelectorAll<HTMLElement>('[data-slot="trace-step"]')) {
    const bounds = row.getBoundingClientRect();
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(viewportWidth + 1);
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth + 1);
  }
}

const meta = {
  title: "Editor/TraceStep",
  component: TraceStep,
  tags: ["autodocs"],
  // A centered flex canvas grows to the fixed desktop width plus both
  // decorators' padding. Padded block layout lets max-w-full constrain the
  // 380px reference row to the actual mobile viewport.
  parameters: { layout: "padded" },
  args: { expression: 'DATEDIFF(NOW(), DATE(item.eta), "minutes")', value: "7" },
  decorators: [
    (Story) => (
      <div className="w-[380px] max-w-full">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    expectViewportFit(canvasElement);
  },
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
    expectViewportFit(canvasElement);
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

/**
 * BB-FP-16 (Figma 132:20145): a row wraps at word boundaries and only breaks
 * a token that cannot fit. `overflow-wrap: anywhere` gave every character a
 * break in the row's min-content width, so under any intrinsically sized
 * ancestor (here `w-min`, as a shrink-to-fit panel column does) the spans
 * collapsed and "random.choice" split as "random.choic / e". With
 * `break-word` the min-content width is the longest token, kept whole.
 */
export const LongTokens: Story = {
  args: { expression: 'IF(ready, random.choice(list), "none")', value: "7" },
  decorators: [
    (Story) => (
      <div className="w-min max-w-full">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    expectViewportFit(canvasElement);
    const expression = canvasElement.querySelector<HTMLElement>('[data-slot="trace-step-expression"]')!;
    const text = expression.firstChild!;
    const lineTops = (start: number, end: number) => {
      const range = document.createRange();
      range.setStart(text, start);
      range.setEnd(text, end);
      return new Set(Array.from(range.getClientRects(), (r) => Math.round(r.top))).size;
    };
    const source = text.textContent!;
    // The identifier the bug split ("random.choic / e") stays on one line.
    const token = "random.choice";
    const start = source.indexOf(token);
    // The row does wrap.
    await expect(lineTops(0, source.length)).toBeGreaterThan(1);
    await expect(lineTops(start, start + token.length)).toBe(1);
    for (const slot of ["trace-step-expression", "trace-step-value"]) {
      const el = canvasElement.querySelector<HTMLElement>(`[data-slot="${slot}"]`)!;
      await expect(getComputedStyle(el).overflowWrap).toBe("break-word");
    }
  },
};
