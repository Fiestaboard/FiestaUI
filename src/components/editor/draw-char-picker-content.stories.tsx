import type { Meta, StoryObj } from "@storybook/react";

import { DrawCharPickerContent } from "./draw-char-picker-content";

const meta = {
  title: "Editor/DrawCharPickerContent",
  component: DrawCharPickerContent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    current: {
      control: false,
      description: "The active brush; a `char` brush shows as the pressed swatch.",
    },
    onSelect: { control: false, description: "Called with the `{ kind: 'char' }` brush the user picked." },
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
      description: "Switches the code-62 glyph between ° (Flagship) and ♥ (Note).",
    },
    labels: { control: "object", description: "Grid name and the two names for code 62." },
  },
  args: {
    onSelect: () => {},
  },
} satisfies Meta<typeof DrawCharPickerContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * All 56 stampable characters, derived from `BOARD_CHARS` codes 1–62: blank is
 * the eraser, and the six codes the hardware leaves undefined (43, 45, 51, 57,
 * 58, 61) are not offered.
 */
export const Default: Story = {
  args: {
    current: { kind: "eraser" },
  },
};

/** A selected stamp keeps the roving tab stop and reads as `aria-pressed`. */
export const CharacterSelected: Story = {
  args: {
    current: { kind: "char", char: "%" },
  },
};

/**
 * On a Note, board code 62 draws a heart. The button shows ♥ and is announced
 * as "Heart", but the character stamped into the template is still `°` — the
 * board decides the glyph, not the editor.
 */
export const NoteDegreeDrawsHeart: Story = {
  args: {
    current: { kind: "char", char: "°" },
    deviceType: "note",
  },
};
