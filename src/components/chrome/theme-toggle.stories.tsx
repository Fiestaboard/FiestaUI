import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { ThemeToggle } from "./theme-toggle";

const meta = {
  title: "App/Chrome/ThemeToggle",
  component: ThemeToggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    theme: {
      description:
        "Current theme choice. `light`/`dark` show the icon of the mode you'd switch to; `system` shows a Monitor glyph so 'follow the OS' is visible at a glance.",
      control: "inline-radio",
      options: ["light", "dark", "system"],
    },
    iconSource: {
      description:
        "Which signal picks Sun vs Moon: the `theme` prop (default), or the ancestor `.dark` class — the latter for statically rendered sites, where a pre-paint `.dark` makes the first frame correct without hydration.",
      control: "inline-radio",
      options: ["prop", "dom"],
    },
    onToggle: { description: "Called on click; theme state and persistence live in the app.", control: false },
    label: { description: "Localized accessible label for the icon-only button.", control: "text" },
  },
} satisfies Meta<typeof ThemeToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Cycles light → dark → system, mirroring a "respect prefers-color-scheme" toggle. */
const NEXT_THEME = { light: "dark", dark: "system", system: "light" } as const;

/** Keyed on args.theme so the `theme` control re-seeds local toggle state. */
function ControlledThemeToggle(args: React.ComponentProps<typeof ThemeToggle>) {
  const [theme, setTheme] = useState<"light" | "dark" | "system">(args.theme);
  return <ThemeToggle {...args} theme={theme} onToggle={() => setTheme(NEXT_THEME[theme])} />;
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
