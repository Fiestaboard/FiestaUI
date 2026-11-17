import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { getNoteArrayGeometry } from "../../lib/note-array-geometry";
import { StaticBoardDisplay } from "../board/static-board-display";
import { NoteFocus } from "./note-focus";
import { NoteSeams, type NoteSeamsProps } from "./note-seams";

const MESSAGE =
  "GOOD MORNING   FROM ROSA'S\nLATTE 4.50     MOCHA 5.00\nTEA 3.00       CAPPUCCINO 4.75\nPASTRIES       CROISSANT 4.25\nFRESH TODAY    WELCOME\nTHANK YOU      COME BACK SOON";

function Canvas({ note, notesWide = 2, notesTall = 2 }: NoteSeamsProps) {
  const geometry = getNoteArrayGeometry({ notesWide, notesTall });
  return (
    <div
      data-slot="note-example-canvas"
      className="relative"
      style={{ width: geometry.width, height: geometry.height }}
    >
      <StaticBoardDisplay
        deviceType="note_array"
        notesWide={notesWide}
        notesTall={notesTall}
        size="sm"
        bezel={false}
        message={MESSAGE}
      />
      <NoteSeams note={note} notesWide={notesWide} notesTall={notesTall} />
    </div>
  );
}

const meta = {
  title: "Editor/NoteSeams",
  component: NoteSeams,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  render: (args) => (
    <div className="max-w-full overflow-x-auto">
      <Canvas {...args} />
    </div>
  ),
} satisfies Meta<typeof NoteSeams>;
export default meta;
type Story = StoryObj<typeof meta>;

/** A real shared small board: the overlay never draws its own grid. */
export const AllNotes: Story = {
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll<HTMLElement>("[data-note-row]");
    const left = rows[0].querySelectorAll<HTMLElement>("[data-note-tile]")[14].getBoundingClientRect();
    const right = rows[0].querySelectorAll<HTMLElement>("[data-note-tile]")[15].getBoundingClientRect();
    const above = rows[2].getBoundingClientRect();
    const below = rows[3].getBoundingClientRect();
    const columnSeam = canvasElement
      .querySelector<HTMLElement>('[data-slot="note-column-seam"]')!
      .getBoundingClientRect();
    const rowSeam = canvasElement.querySelector<HTMLElement>('[data-slot="note-row-seam"]')!.getBoundingClientRect();
    await expect(right.left - left.right).toBe(9);
    await expect(columnSeam.left + columnSeam.width / 2).toBeCloseTo((left.right + right.left) / 2, 1);
    await expect(rowSeam.top + rowSeam.height / 2).toBeCloseTo((above.bottom + below.top) / 2, 1);
    await expect(columnSeam.width).toBe(2);
    await expect(rowSeam.height).toBe(2);
  },
};
export const FocusedNote: Story = {
  args: { note: 4 },
  play: async ({ canvasElement }) => {
    const rows = canvasElement.querySelectorAll<HTMLElement>("[data-note-row]");
    const first = rows[3].querySelectorAll<HTMLElement>("[data-note-tile]")[15].getBoundingClientRect();
    const last = rows[5].querySelectorAll<HTMLElement>("[data-note-tile]")[29].getBoundingClientRect();
    const region = canvasElement.querySelector<HTMLElement>('[data-slot="note-focus-region"]')!.getBoundingClientRect();
    await expect(region.left).toBeCloseTo(first.left, 1);
    await expect(region.top).toBeCloseTo(first.top, 1);
    await expect(region.right).toBeCloseTo(last.right, 1);
    await expect(region.bottom).toBeCloseTo(last.bottom, 1);
  },
};
export const SingleNote: Story = { args: { notesWide: 1, notesTall: 1 } };
export const VerticalArray: Story = { args: { notesWide: 1, notesTall: 3, note: 2 } };

/** Host-owned focus crops the same canvas. No per-Note template or renderer. */
export const CanvasFocus: Story = {
  render: function FocusExample() {
    const [note, setNote] = useState<number | null>(null);
    const geometry = getNoteArrayGeometry();
    const region = geometry.notes.find((item) => item.note === note);
    return (
      <div className="flex max-w-full flex-col items-start gap-4">
        <NoteFocus note={note} onNoteChange={setNote} size="touch" />
        <div role="status" className="font-mono text-xs text-muted-foreground">
          {region
            ? `Note ${note} · rows ${region.rowStart + 1}–${region.rowEnd} · columns ${region.columnStart + 1}–${region.columnEnd}`
            : "All notes · one 30 × 6 canvas"}
        </div>
        <div
          data-slot="note-example-viewport"
          className="max-w-full overflow-auto"
          style={{ width: region?.width ?? geometry.width, height: region?.height ?? geometry.height }}
        >
          <div
            style={{
              width: region?.width ?? geometry.width,
              height: region?.height ?? geometry.height,
              overflow: region ? "hidden" : undefined,
            }}
          >
            <div style={{ transform: `translate(${-(region?.x ?? 0)}px, ${-(region?.y ?? 0)}px)` }}>
              <Canvas note={note} />
            </div>
          </div>
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const grid = canvasElement.querySelector('[data-slot="static-board-display"]');
    await userEvent.click(canvas.getByRole("radio", { name: "Note 4" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("Note 4 · rows 4–6 · columns 16–30");
    await waitFor(() => {
      const viewport = canvasElement
        .querySelector<HTMLElement>('[data-slot="note-example-viewport"]')!
        .getBoundingClientRect();
      expect(viewport.width).toBe(237);
      expect(viewport.height).toBe(60);
    });
    await expect(canvasElement.querySelector('[data-slot="static-board-display"]')).toBe(grid);
    await expect(canvasElement.querySelectorAll("[data-note-tile]")).toHaveLength(180);
    await userEvent.click(canvas.getByRole("radio", { name: "All notes" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("one 30 × 6 canvas");
  },
};
