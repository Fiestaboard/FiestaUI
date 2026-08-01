import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "Chrome/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    theme: {
      description: "Current resolved theme — the button shows the icon of the mode you'd switch to.",
      control: "inline-radio",
      options: ["light", "dark"],
    },
    onToggle: { description: "Called on click; theme state and persistence live in the app.", control: false },
    label: { description: "Localized accessible label for the icon-only button.", control: "text" },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Keyed on args.theme so the `theme` control re-seeds local toggle state. */
function ControlledThemeToggle(args: React.ComponentProps<typeof ThemeToggle>) {
  const [theme, setTheme] = useState<"light" | "dark">(args.theme);
  return <ThemeToggle {...args} theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} />;
}

export const Default: Story = {
  args: {
    theme: "dark",
    onToggle: () => {},
    label: "Toggle theme",
  },
  render: function Render(args) {
    return <ControlledThemeToggle key={args.theme} {...args} />;
  },
};
