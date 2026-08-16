import type { Meta, StoryObj } from "@storybook/react";

import { FormattingPickerContent } from "./formatting-picker-content";

/** A realistic `formatting` map from the template engine's `/variables` payload. */
const FORMATTING = {
  fill_space: { syntax: "{{fill_space}}", description: "Push the rest of the line to the right edge" },
  fill_space_repeat: {
    syntax: "{{fill_space_repeat}}",
    description: "Fill the gap with a repeated color or character",
  },
  center: { syntax: "{{center}}", description: "Center the line" },
};

const meta = {
  title: "Editor/FormattingPickerContent",
  component: FormattingPickerContent,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    formatting: { control: "object", description: "Formatting options keyed by name, as the engine declares them." },
    onInsert: { control: false, description: "Receives the template syntax to insert." },
    labels: { control: "object", description: "Localized strings, including the color display names." },
  },
  args: {
    onInsert: () => {},
  },
} satisfies Meta<typeof FormattingPickerContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    formatting: FORMATTING,
  },
};

/**
 * `fill_space_repeat` needs a fill, so it opens a second pane instead of
 * inserting: the eight board colors, or any custom pattern up to 10 characters.
 * Click "Fill space repeat" in the Default story to reach it.
 */
export const RepeatFillPicker: Story = {
  args: {
    formatting: { fill_space_repeat: FORMATTING.fill_space_repeat },
  },
};

/** No options configured — the picker says so rather than rendering an empty panel. */
export const Empty: Story = {
  args: {
    formatting: {},
  },
};
