import type { Meta, StoryObj } from "@storybook/react";

import { ColorPickerContent } from "./color-picker-content";

const meta = {
  title: "Editor/ColorPickerContent",
  component: ColorPickerContent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
      description: "Only the Note adds the heart button — code 62 draws as ° everywhere else.",
    },
    onInsert: {
      control: false,
      description: "Receives the template token to insert, e.g. `{{red}}` (or `°` for the Note heart).",
    },
    labels: {
      control: "object",
      description: "Localized strings: grid name, per-color display names, and the heart button's copy.",
    },
  },
} satisfies Meta<typeof ColorPickerContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The eight hardware colors, in board order, filled from `lib/board-colors`. */
export const Default: Story = {
  args: {
    onInsert: () => {},
  },
};

/**
 * On a Note, board code 62 draws as a heart rather than a degree symbol, so the
 * picker offers it as its own button. The inserted character is still `°`.
 */
export const NoteWithHeart: Story = {
  args: {
    onInsert: () => {},
    deviceType: "note",
  },
};

/** Every string is injectable; nothing user-visible is hard-coded English. */
export const Localized: Story = {
  args: {
    onInsert: () => {},
    deviceType: "note",
    labels: {
      colorPickerAriaLabel: "Sélecteur de couleur",
      colorNames: {
        red: "Rouge",
        orange: "Orange",
        yellow: "Jaune",
        green: "Vert",
        blue: "Bleu",
        violet: "Violet",
        white: "Blanc",
        black: "Noir",
      },
      colorOptionLabel: (colorName) => `Couleur ${colorName.toLowerCase()}`,
      heartLabel: "cœur",
      heartCharacterAriaLabel: "Caractère cœur",
      insertHeartTooltip: "Insérer un cœur (Note uniquement)",
    },
  },
};
