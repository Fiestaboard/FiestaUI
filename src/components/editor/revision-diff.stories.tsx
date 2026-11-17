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
export const Dark: Story = {};
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

/** Positive subpixel regions must remain present while their 2px stroke stays inside the slot. */
export const TinyEdgeRegions: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {(["side-by-side", "overlay"] as const).flatMap((mode) =>
        [220, 150].map((width) => (
          <div key={`${mode}-${width}`} style={{ width }}>
            <RevisionDiff
              {...args}
              mode={mode}
              changes={[{ id: "tiny-edge", x: 0.999, y: 0.999, width: 0.001, height: 0.001 }]}
            />
          </div>
        )),
      )}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const regions = canvasElement.querySelectorAll<HTMLElement>('[data-slot="revision-change-region"]');
    expect(regions).toHaveLength(4);
    for (const region of regions) {
      const slot = region.closest<HTMLElement>('[data-slot="revision-overview"]')!;
      slot.scrollIntoView({ block: "center" });
      const bounds = slot.getBoundingClientRect();
      expect(bounds.width).toBeCloseTo(region.closest<HTMLElement>('[data-slot="revision-diff"]')!.clientWidth);
      expect(region.getBoundingClientRect().width).toBeGreaterThan(0);
      expect(region.getBoundingClientRect().height).toBeGreaterThan(0);
      expect(getComputedStyle(region).borderRightWidth).toBe("2px");
      // Opt the marker into hit testing to distinguish clipped paint from an overflowing border box.
      const originalPointerEvents = region.style.pointerEvents;
      region.style.pointerEvents = "auto";
      try {
        for (const [x, y] of [
          [bounds.right + 1, bounds.bottom - 0.05],
          [bounds.right - 0.05, bounds.bottom + 1],
          [bounds.right + 1, bounds.bottom + 1],
        ]) {
          expect(canvasElement.ownerDocument.elementFromPoint(x, y)).not.toBe(region);
        }
      } finally {
        region.style.pointerEvents = originalPointerEvents;
      }
    }
  },
};
