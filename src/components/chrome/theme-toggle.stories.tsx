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
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    theme: "dark",
    onToggle: () => {},
    label: "Toggle theme",
  },
  render: function Render(args) {
    const [theme, setTheme] = useState<"light" | "dark">(args.theme);
    return (
      <ThemeToggle theme={theme} onToggle={() => setTheme(theme === "dark" ? "light" : "dark")} label={args.label} />
    );
  },
};
