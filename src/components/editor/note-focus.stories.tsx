import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { NoteFocus, type NoteFocusProps } from "./note-focus";

const meta = {
  title: "Editor/NoteFocus",
  component: NoteFocus,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { note: null, onNoteChange: () => {} },
  render: function Controlled(args) {
    const [note, setNote] = useState(args.note);
    return <NoteFocus {...args} note={note} onNoteChange={setNote} />;
  },
} satisfies Meta<typeof NoteFocus>;
export default meta;
type Story = StoryObj<typeof meta>;

/** 04b 108:7944 — the drawn All notes state. Both themes run through CI. */
export const AllNotes: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const all = canvas.getByRole("radio", { name: "All notes" });
    await expect(all).toBeChecked();
    await expect(all.getBoundingClientRect().height).toBeGreaterThanOrEqual(32);
  },
};
export const Note1: Story = { args: { note: 1 } };
export const Note2: Story = { args: { note: 2 } };
export const Note3: Story = { args: { note: 3 } };
export const Note4: Story = { args: { note: 4 } };
export const Disabled: Story = {
  args: { note: 2, disabled: true },
  play: async ({ canvasElement }) => {
    for (const radio of within(canvasElement).getAllByRole("radio")) await expect(radio).toBeDisabled();
  },
};

export const Touch: Story = {
  args: { size: "touch", note: 1 },
  globals: { viewport: { value: "mobile" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const radio of canvas.getAllByRole("radio")) {
      await expect(radio.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      await expect(radio.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    }
    const first = canvas.getByRole("radio", { name: "Note 1" });
    first.focus();
    await userEvent.keyboard("{End}");
    const last = canvas.getByRole("radio", { name: "Note 4" });
    await expect(last).toHaveFocus();
    await expect(last).toBeChecked();
    await waitFor(() => {
      const strip = canvasElement.querySelector<HTMLElement>('[data-slot="note-focus"]')!;
      const bounds = strip.getBoundingClientRect();
      const option = last.getBoundingClientRect();
      expect(option.left).toBeGreaterThanOrEqual(bounds.left);
      expect(option.right).toBeLessThanOrEqual(bounds.right);
    });
    await userEvent.keyboard("{Home}");
    await expect(canvas.getByRole("radio", { name: "All notes" })).toBeChecked();
  },
};

function NarrowSelector(args: NoteFocusProps) {
  const [note, setNote] = useState(args.note);
  return (
    <div className="w-[280px] max-w-full">
      <NoteFocus {...args} note={note} onNoteChange={setNote} />
    </div>
  );
}

export const LargeArray: Story = {
  args: { notesWide: 4, notesTall: 2, note: 8 },
  render: (args) => <NarrowSelector {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const last = canvas.getByRole("radio", { name: "Note 8" });
    await waitFor(() => {
      const strip = canvasElement.querySelector<HTMLElement>('[data-slot="note-focus"]')!;
      expect(strip.scrollLeft).toBeGreaterThan(0);
      expect(last.getBoundingClientRect().right).toBeLessThanOrEqual(strip.getBoundingClientRect().right);
    });
    const strip = canvasElement.querySelector<HTMLElement>('[data-slot="note-focus"]')!;
    strip.parentElement!.style.width = "180px";
    await waitFor(() =>
      expect(last.getBoundingClientRect().right).toBeLessThanOrEqual(strip.getBoundingClientRect().right),
    );
    last.focus();
    await userEvent.keyboard("{Home}");
    const all = canvas.getByRole("radio", { name: "All notes" });
    await expect(all).toBeChecked();
    await waitFor(() =>
      expect(canvasElement.querySelector<HTMLElement>('[data-slot="note-focus"]')!.scrollLeft).toBe(0),
    );
  },
};

export const Localized: Story = {
  args: {
    note: 4,
    labels: { group: "Aperçu des écrans", allNotes: "Tous les écrans", note: (n) => `Écran d'affichage ${n}` },
  },
  render: (args) => <NarrowSelector {...args} />,
};
