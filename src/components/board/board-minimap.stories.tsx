import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { DEN, LOBBY } from "../../test/fixtures/board-minimap";
import { BoardMinimap } from "./board-minimap";

const meta = {
  title: "App/Board/BoardMinimap",
  component: BoardMinimap,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    board: { deviceType: "panel", gridCols: 96, gridRows: 24, message: LOBBY },
    viewport: { column: 1, row: 1, columns: 44, rows: 12 },
    onJump: () => {},
  },
  render: function MinimapStory(args) {
    const [position, setPosition] = useState({ column: args.viewport.column, row: args.viewport.row });
    return <BoardMinimap {...args} viewport={{ ...args.viewport, ...position }} onJump={setPosition} />;
  },
} satisfies Meta<typeof BoardMinimap>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Figma109:8976 · Lobby TV, upper-left window. */
export const Default: Story = {};
/** Figma109:15848 · upper-right window. */
export const Right: Story = { args: { viewport: { column: 53, row: 1, columns: 44, rows: 12 } } };
/** Figma109:22720 · lower-left window. */
export const Lower: Story = { args: { viewport: { column: 1, row: 13, columns: 44, rows: 12 } } };
/** Figma109:29592 · Den TV,29×12. */
export const DenTV: Story = {
  args: {
    board: { deviceType: "panel", gridCols: 29, gridRows: 12, message: DEN },
    viewport: { column: 1, row: 1, columns: 21, rows: 12 },
  },
};
/** Figma126:127326 · phone's31-column viewport. */
export const Mobile: Story = {
  args: { viewport: { column: 1, row: 1, columns: 31, rows: 12 } },
  globals: { viewport: { value: "mobile1", isRotated: false } },
};
/** The toolbar and CI theme matrix control the palette for this named story. */
export const Dark: Story = {};
export const Disabled: Story = { args: { disabled: true } };
export const Keyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const surface = canvas.getByRole("button", { name: "Board minimap" });
    surface.focus();
    await userEvent.keyboard("{End}");
    expect(canvas.getByText("Cols 53–96 · Rows 13–24")).toBeInTheDocument();
    await userEvent.keyboard("{Home}");
    expect(canvas.getByText("Cols 1–44 · Rows 1–12")).toBeInTheDocument();
  },
};
export const NoteArray: Story = {
  args: {
    board: { deviceType: "note_array", notesWide: 2, notesTall: 2, message: "WELCOME TO ROSA'S CAFE" },
    viewport: { column: 16, row: 4, columns: 15, rows: 3 },
  },
};
export const Narrow: Story = {
  decorators: [
    (Story) => (
      <div style={{ width: 220 }}>
        <Story />
      </div>
    ),
  ],
  args: { labels: { hint: "Drag the frame to pan across your board · click anywhere to jump to that region" } },
};

/** Shallow board thumbnails retain their aspect ratio inside a full touch target. */
/**
 * A 3-row board still gets a 44px pointer surface; a click in its middle
 * centres the frame.
 *
 * The play waits for the web fonts before it measures. The card is centred and
 * as wide as its header text, so when Archivo and Spline Sans Mono replace the
 * fallback font the surface moves sideways (about 7px with DejaVu, the CI
 * runner's fallback). A click aimed from a pre-swap rect but dispatched after
 * the swap landed three columns left, "Cols 41–50", in most CI VRT shots and
 * "Cols 44–53" in the rest. `.storybook/minimap-click-regression.ts` holds the
 * fonts back to keep this ordering honest.
 */
export const ShallowTouchTarget: Story = {
  args: {
    board: { deviceType: "panel", gridCols: 96, gridRows: 3, message: "SHALLOW BOARD" },
    viewport: { column: 1, row: 1, columns: 10, rows: 1 },
  },
  play: async ({ canvasElement }) => {
    // Lay the header out first, so its font loads have started and are
    // pending in `document.fonts.ready`.
    canvasElement.getBoundingClientRect();
    await document.fonts.ready;
    const surface = canvasElement.querySelector<HTMLElement>('[data-slot="board-minimap-surface"]')!;
    const thumbnail = canvasElement.querySelector<HTMLElement>('[data-slot="board-minimap-thumbnail"]')!;
    const target = surface.getBoundingClientRect();
    const image = thumbnail.getBoundingClientRect();
    expect(target.height).toBeGreaterThanOrEqual(44);
    expect(image.height).toBeLessThan(target.height);
    expect(Math.abs((image.top + image.bottom) / 2 - (target.top + target.bottom) / 2)).toBeLessThan(1);
    await userEvent.pointer({
      target: surface,
      keys: "[MouseLeft]",
      coords: { clientX: target.x + target.width / 2, clientY: target.y + target.height / 2 },
    });
    expect(within(canvasElement).getByText("Cols 44–53 · Rows 2–2")).toBeInTheDocument();
  },
};
