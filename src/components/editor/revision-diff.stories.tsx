import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";

import { REVISION_BOARD } from "../../test/fixtures/revision-board";
import { StaticBoardDisplay } from "../board/static-board-display";
import { RevisionDiff } from "./revision-diff";

const thumbnail = (message: string) => (
  <div className="rounded-md bg-board-surface-dark p-2">
    <StaticBoardDisplay deviceType="panel" gridCols={29} gridRows={12} message={message} size="sm" bezel={false} />
  </div>
);
const meta = {
  title: "App/Editor/RevisionDiff",
  component: RevisionDiff,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    before: { label: "7:12 AM", thumbnail: thumbnail(REVISION_BOARD), status: "live" },
    after: { label: "Now", thumbnail: thumbnail(REVISION_BOARD.replace("KT DELAY", "KT ON TIME")), status: "draft" },
    changes: [{ id: "row12", x: 114 / 220, y: 109 / 123, width: 92 / 220, height: 11 / 123 }],
    summary: "Row 12: “KT DELAY” → “KT ON TIME” · 2 cells · Dev’s iPhone 7:44 AM",
    onRestore: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 592, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RevisionDiff>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Overlay: Story = { args: { mode: "overlay" } };
export const Dark: Story = { globals: { theme: "dark" } };
export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  decorators: [
    (Story) => (
      <div style={{ width: 320, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
};
export const Disabled: Story = { args: { disabled: true } };
export const Restoring: Story = { args: { loading: true } };
export const KeyboardRestore: Story = {
  play: async ({ canvasElement, args }) => {
    const action = within(canvasElement).getByRole("button", { name: "Restore 7:12 AM" });
    action.focus();
    await userEvent.keyboard("{Enter}");
    expect(args.onRestore).toHaveBeenCalledWith({ kind: "new-draft" });
  },
};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 240 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const root = canvasElement.querySelector<HTMLElement>('[data-slot="revision-diff"]')!;
    expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    const outlines = root.querySelectorAll('[data-slot="revision-change-region"]');
    for (const outline of outlines) {
      const bounds = outline.parentElement!.getBoundingClientRect();
      const marker = outline.getBoundingClientRect();
      expect(marker.left).toBeGreaterThanOrEqual(bounds.left);
      expect(marker.right).toBeLessThanOrEqual(bounds.right + 1);
      expect(marker.bottom).toBeLessThanOrEqual(bounds.bottom + 1);
    }
  },
};
