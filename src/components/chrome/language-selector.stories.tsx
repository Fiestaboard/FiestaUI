import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { LanguageSelector } from "./language-selector";

const OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "ja", label: "日本語" },
];

const meta = {
  title: "Chrome/LanguageSelector",
  component: LanguageSelector,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      description: "Current locale value.",
      control: "select",
      options: OPTIONS.map((o) => o.value),
    },
    options: { description: "Available locales with display names, in menu order.", control: "object" },
    onChange: {
      description: "Called with the newly selected locale; persistence stays in the app wrapper.",
      control: false,
    },
    label: { description: "Localized accessible label for the trigger.", control: "text" },
    disabled: { description: "Disables the picker (e.g. while locales load).", control: "boolean" },
  },
} satisfies Meta<typeof LanguageSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Keyed on args.value so the `value` control re-seeds local selection state. */
function ControlledLanguageSelector(args: React.ComponentProps<typeof LanguageSelector>) {
  const [value, setValue] = useState(args.value);
  return <LanguageSelector {...args} value={value} onChange={setValue} />;
}

export const Default: Story = {
  args: {
    value: "en",
    options: OPTIONS,
    onChange: () => {},
    label: "Language",
    disabled: false,
  },
  render: function Render(args) {
    return <ControlledLanguageSelector key={args.value} {...args} />;
  },
};
