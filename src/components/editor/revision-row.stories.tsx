import type { Meta, StoryObj } from "@storybook/react";
import { useEffect } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { REVISION_BOARD } from "../../test/fixtures/revision-board";
import { StaticBoardDisplay } from "../board/static-board-display";
import { ListRowGroup } from "../containment/list-row";
import { RevisionRow } from "./revision-row";

const thumbnail = (
  <div className="rounded-md bg-board-surface-dark p-2">
    <StaticBoardDisplay
      deviceType="panel"
      gridCols={29}
      gridRows={12}
      message={REVISION_BOARD}
      size="sm"
      bezel={false}
    />
  </div>
);
const meta = {
  title: "App/Editor/RevisionRow",
  component: RevisionRow,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: {
    thumbnail,
    savedAt: "Now",
    author: "Edited on this iPhone",
    summary: "2 cells changed",
    current: true,
    onCompare: fn(),
  },
  decorators: [
    (Story) => (
      <div style={{ width: 352, maxWidth: "100%" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RevisionRow>;
export default meta;
type Story = StoryObj<typeof meta>;

function expectRowContentWithinBounds(canvasElement: HTMLElement) {
  const row = canvasElement.querySelector<HTMLElement>("[data-revision-row]")!;
  const bounds = row.getBoundingClientRect();
  expect(bounds.width).toBeCloseTo(220);
  for (const child of row.children) {
    const childBounds = child.getBoundingClientRect();
    expect(childBounds.left).toBeGreaterThanOrEqual(bounds.left - 0.5);
    expect(childBounds.right).toBeLessThanOrEqual(bounds.right + 0.5);
  }
  // Text ranges catch centered glyph overflow to either side of the 86px column.
  const label = within(canvasElement).getByText(/ÜBERSICHT|OVERVIEW/);
  const labelBounds = label.parentElement!.getBoundingClientRect();
  const range = canvasElement.ownerDocument.createRange();
  range.selectNodeContents(label);
  for (const line of range.getClientRects()) {
    expect(line.left).toBeGreaterThanOrEqual(labelBounds.left - 0.5);
    expect(line.right).toBeLessThanOrEqual(labelBounds.right + 0.5);
  }
  expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector<HTMLElement>("[data-revision-row]")!;
    const overview = row.querySelector<HTMLElement>('[data-slot="revision-overview"]')!;
    expect(row.getBoundingClientRect().width).toBeCloseTo(352);
    expect(overview.getBoundingClientRect().width).toBeCloseTo(86);
    expect(overview.getBoundingClientRect().height).toBeCloseTo(48);
  },
};
export const Live: Story = {
  args: {
    savedAt: "7:12 AM",
    author: "Saved on iPad",
    summary: "Row 12 formula added",
    current: false,
    status: "live",
  },
};
export const Past: Story = {
  args: {
    savedAt: "Yesterday 9:02 PM",
    author: "FiestaBot draft accepted on iPhone",
    summary: undefined,
    current: false,
    onCompare: undefined,
    onRestore: fn(),
  },
};
export const Restored: Story = {
  args: {
    savedAt: "Mon 6:40 PM",
    author: "Restored from Sun 5:10 PM",
    summary: undefined,
    current: false,
    onCompare: undefined,
    onRestore: fn(),
  },
};
export const History: Story = {
  render: () => (
    <ListRowGroup variant="plain">
      <RevisionRow
        thumbnail={thumbnail}
        savedAt="Now"
        author="Edited on this iPhone"
        summary="2 cells changed"
        current
        onCompare={fn()}
      />
      <RevisionRow
        thumbnail={thumbnail}
        savedAt="7:12 AM"
        author="Saved on iPad"
        summary="Row 12 formula added"
        status="live"
        onCompare={fn()}
      />
      <RevisionRow
        thumbnail={thumbnail}
        savedAt="Yesterday 9:02 PM"
        author="FiestaBot draft accepted on iPhone"
        onRestore={fn()}
      />
      <RevisionRow thumbnail={thumbnail} savedAt="Mon 6:40 PM" author="Restored from Sun 5:10 PM" onRestore={fn()} />
    </ListRowGroup>
  ),
};
export const Dark: Story = {};
export const Mobile: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } };
export const Disabled: Story = { args: { disabled: true } };
export const Restoring: Story = { args: { current: false, onCompare: undefined, onRestore: fn(), loading: true } };
export const Keyboard: Story = {
  play: async ({ canvasElement, args }) => {
    const control = within(canvasElement).getByRole("button", { name: "Compare Now" });
    control.focus();
    await userEvent.keyboard("{Enter}");
    expect(args.onCompare).toHaveBeenCalledOnce();
  },
};
export const NarrowLocalized: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 220 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    savedAt: "Gestern um 21:02 Uhr",
    author: "Auf dem gemeinsamen Familientablet gespeichert",
    summary: "Die Abfahrtsanzeige wurde aktualisiert",
    current: false,
    onCompare: undefined,
    onRestore: fn(),
    labels: { overview: "ÜBERSICHT", restore: "Diese Version wiederherstellen" },
  },
  play: async ({ canvasElement }) => {
    expectRowContentWithinBounds(canvasElement);
    const button = within(canvasElement).getByRole("button");
    expect(button.scrollHeight).toBeLessThanOrEqual(button.clientHeight);
  },
};
export const NarrowUnbrokenOverview: Story = {
  ...NarrowLocalized,
  args: {
    ...NarrowLocalized.args,
    labels: { overview: "ÜBERSICHTSVORSCHAUZUSAMMENFASSUNG", restore: "Diese Version wiederherstellen" },
  },
};
export const NarrowLargeText: Story = {
  ...NarrowLocalized,
  args: { ...NarrowLocalized.args, labels: { overview: "OVERVIEW", restore: "Diese Version wiederherstellen" } },
  parameters: { layout: "fullscreen" },
  decorators: [
    function LargeTextDecorator(Story) {
      useEffect(() => {
        const root = document.documentElement;
        const before = root.style.fontSize;
        root.style.fontSize = "200%";
        return () => {
          root.style.fontSize = before;
        };
      }, []);
      return (
        <div style={{ width: 220, margin: 16 }}>
          <Story />
        </div>
      );
    },
  ],
  play: async ({ canvasElement }) => {
    expect(getComputedStyle(canvasElement.ownerDocument.documentElement).fontSize).toBe("32px");
    expectRowContentWithinBounds(canvasElement);
  },
};
