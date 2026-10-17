import type { Meta, StoryObj } from "@storybook/react";

import { BoardSizeIndicator } from "./board-size-indicator";

/*
 * The textual form of a board's geometry: `rows × cols`, plus the layout name
 * the app resolves for note arrays. Read aloud, it names each axis.
 */

const meta = {
  title: "App/Board/BoardSizeIndicator",
  component: BoardSizeIndicator,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { deviceType: "flagship" },
} satisfies Meta<typeof BoardSizeIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Flagship: Story = {};

export const Note: Story = { args: { deviceType: "note" } };

export const NoteArrayPreset: Story = {
  args: { deviceType: "note_array", notesWide: 2, notesTall: 2, layoutLabel: "2×2 grid" },
};

export const NoteArrayCustom: Story = {
  args: { deviceType: "note_array", notesWide: 3, notesTall: 2, layoutLabel: "Custom" },
};

export const Panel: Story = { args: { deviceType: "panel", gridRows: 12, gridCols: 40 } };

export const AllPresets: Story = {
  render: () => (
    <ul className="flex flex-col gap-2">
      <li>
        <BoardSizeIndicator deviceType="flagship" />
      </li>
      <li>
        <BoardSizeIndicator deviceType="note" />
      </li>
      <li>
        <BoardSizeIndicator deviceType="note_array" notesWide={2} layoutLabel="2 wide" />
      </li>
      <li>
        <BoardSizeIndicator deviceType="note_array" notesWide={4} layoutLabel="4 wide" />
      </li>
      <li>
        <BoardSizeIndicator deviceType="note_array" notesTall={2} layoutLabel="2 tall" />
      </li>
      <li>
        <BoardSizeIndicator deviceType="note_array" notesTall={4} layoutLabel="4 tall" />
      </li>
      <li>
        <BoardSizeIndicator deviceType="note_array" notesWide={2} notesTall={2} layoutLabel="2×2 grid" />
      </li>
      <li>
        <BoardSizeIndicator deviceType="note_array" notesWide={3} notesTall={2} layoutLabel="Custom" />
      </li>
    </ul>
  ),
};
