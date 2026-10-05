import type { Meta, StoryObj } from "@storybook/react";

import { goldenCharacterSet } from "../../lib/charset-golden-cases";
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

/**
 * An LED character set with colour spans, block spans and icons: a
 * text-colour group (the host wraps the selection as `{{red:…}}`, black
 * offered as "Black (unlit on LEDs)"), a block-colour group (`{{black/red:…}}`)
 * and an icon group (`{{icon:sun}}`). Each glyph is drawn by the set, 30px
 * in a 40px button. A split-flap set never shows any of them.
 */
export const LedCharset: Story = {
  args: {
    onInsert: (value) => console.log("insert", value),
    charset: "led_5x7",
    onInsertTextColor: (color) => console.log("text colour", color),
    onInsertBlockColor: (choice) => console.log("block colour", choice),
    onInsertIcon: (icon) => console.log("icon", icon),
  },
};

/** The 3×5 set offers only the icons its face can draw. */
export const SmallLedCharset: Story = {
  args: {
    onInsert: (value) => console.log("insert", value),
    charset: "led_3x5",
    onInsertTextColor: (color) => console.log("text colour", color),
    onInsertBlockColor: (choice) => console.log("block colour", choice),
    onInsertIcon: (icon) => console.log("icon", icon),
  },
};

/**
 * A plugin's own set, passed as an object: the ACME sign has block spans and
 * three icons but no colour spans, so the text-colour group is absent and
 * the icon group offers only up, down and check.
 */
export const PluginCharset: Story = {
  args: {
    onInsert: (value) => console.log("insert", value),
    charset: goldenCharacterSet("acme_sign_v1"),
    onInsertTextColor: (color) => console.log("text colour", color),
    onInsertBlockColor: (choice) => console.log("block colour", choice),
    onInsertIcon: (icon) => console.log("icon", icon),
  },
};

/** A heart-flap Vestaboard set decides the code-62 glyph itself, drawn as a tile. */
export const HeartFlapCharset: Story = {
  args: {
    onInsert: (value) => console.log("insert", value),
    deviceType: "flagship",
    charset: "vestaboard_v2",
  },
};
