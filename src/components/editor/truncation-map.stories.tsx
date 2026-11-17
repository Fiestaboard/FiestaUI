import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";

import { TruncationMap, type TruncationMapLine } from "./truncation-map";

const lengths = [96, 0, 59, 73, 72, 62, 30, 0, 56, 73, 26, 48, 64, 70, 62, 0, 52, 72, 72, 23, 0, 0, 0, 98];
const lines: TruncationMapLine[] = lengths.map((length, index) => ({
  row: index + 1,
  length,
  ...(index === 11
    ? {
        overflow: {
          column: 48,
          count: 3,
          description: "Row 12 · Left zone runs 3 past col 48 (“BY 6:30 PM”) and pushes FRI to col 52",
        },
      }
    : index === 23
      ? { overflow: { column: 96, count: 2, description: "Row 24 · Ticker is 98 of 96 · “SPECIALS” loses its last 2" } }
      : {}),
}));
const meta = {
  title: "App/Editor/TruncationMap",
  component: TruncationMap,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { columns: 96, lines, zones: [48] },
} satisfies Meta<typeof TruncationMap>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Figma109:30655, complete24-row overview. */
export const Default: Story = {};
export const Dark: Story = { globals: { theme: "dark" } };
export const Mobile: Story = { args: { onJump: fn() }, globals: { viewport: { value: "mobile1", isRotated: false } } };
export const Empty: Story = { args: { lines: [] } };
export const LargeOverflow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    lines: [
      { row: 1, length: 192, overflow: { column: 96, count: 96, description: "Row 1 · 96 columns beyond the board" } },
      { row: 2, length: 144, overflow: { column: 48, count: 96, description: "Row 2 · 96 columns beyond the zone" } },
    ],
  },
  play: async ({ canvasElement }) => {
    const map = canvasElement.querySelector<HTMLElement>('[data-slot="truncation-map"]')!;
    const bounds = map.getBoundingClientRect();
    expect(map.scrollWidth).toBeLessThanOrEqual(map.clientWidth);
    for (const marker of map.querySelectorAll('[data-slot="truncation-map-overflow"]')) {
      const rectangle = marker.getBoundingClientRect();
      expect(rectangle.left).toBeGreaterThanOrEqual(bounds.left);
      expect(rectangle.right).toBeLessThanOrEqual(bounds.right);
      expect(rectangle.width).toBeGreaterThanOrEqual(12);
    }
  },
};
export const Disabled: Story = { args: { onJump: fn(), disabled: true } };
export const KeyboardJump: Story = {
  args: { onJump: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    const action = canvas.getByRole("button", { name: /Row 12/ });
    action.focus();
    await userEvent.keyboard("{Enter}");
    expect(args.onJump).toHaveBeenCalledWith({ row: 12, column: 48 });
  },
};
export const NarrowLocalized: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    title: "Überlaufende Zeilen",
    lines: [
      {
        row: 1,
        length: 98,
        overflow: {
          column: 96,
          count: 2,
          description: "Zeile 1 · Der lange Wettervorhersagetext überschreitet die verfügbare Spaltenanzahl.",
        },
      },
    ],
    onJump: fn(),
  },
  play: async ({ canvasElement }) => {
    const map = canvasElement.querySelector('[data-slot="truncation-map"]')!;
    expect(map.scrollWidth).toBeLessThanOrEqual(map.clientWidth);
    const action = within(canvasElement).getByRole("button");
    expect(action.scrollHeight).toBeLessThanOrEqual(action.clientHeight);
  },
};
