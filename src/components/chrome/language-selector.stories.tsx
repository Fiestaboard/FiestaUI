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
} satisfies Meta<typeof LanguageSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: "en",
    options: OPTIONS,
    onChange: () => {},
    label: "Language",
  },
  render: function Render(args) {
    const [value, setValue] = useState(args.value);
    return <LanguageSelector {...args} value={value} onChange={setValue} />;
  },
};
