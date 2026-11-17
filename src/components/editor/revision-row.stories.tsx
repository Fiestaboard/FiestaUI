import type { Meta, StoryObj } from "@storybook/react";
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
export const Default: Story = {};
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
export const Dark: Story = { globals: { theme: "dark" } };
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
    const row = canvasElement.querySelector<HTMLElement>("[data-revision-row]")!;
    expect(row.scrollWidth).toBeLessThanOrEqual(row.clientWidth);
    const button = within(canvasElement).getByRole("button");
    expect(button.scrollHeight).toBeLessThanOrEqual(button.clientHeight);
  },
};
