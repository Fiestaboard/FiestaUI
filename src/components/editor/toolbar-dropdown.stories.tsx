import type { Meta, StoryObj } from "@storybook/react";
import { Palette } from "lucide-react";

import { Stack } from "../layout/stack";
import { Text } from "../typography/text";
import { ToolbarDropdown } from "./toolbar-dropdown";

const meta = {
  title: "Editor/ToolbarDropdown",
  component: ToolbarDropdown,
  parameters: {
    // The panel opens downward from the trigger and needs room below it.
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    label: { control: "text", description: "Trigger's accessible name and tooltip copy." },
    icon: { control: false, description: "Glyph shown in the 16×16 trigger." },
    children: { control: false, description: "Panel content, or `(close) => content` to dismiss from inside." },
    closeOnOutsideClick: { control: "boolean" },
    disabled: { control: "boolean" },
    onClose: { control: false },
    labels: { control: "object", description: "Fallback accessible name when `label` is empty." },
  },
  args: {
    label: "Colors",
    icon: <Palette className="w-4 h-4" />,
  },
} satisfies Meta<typeof ToolbarDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <Stack gap="1" className="w-48 p-3">
        <Text size="xs" tone="muted">
          Panel content
        </Text>
      </Stack>
    ),
  },
};

/** Pickers dismiss the dropdown after inserting, via the render-prop `close`. */
export const ClosesFromInside: Story = {
  args: {
    children: (close: () => void) => (
      <Stack gap="1" className="w-48 p-3">
        <button type="button" onClick={close} className="rounded-md px-2 py-1 text-sm hover:bg-accent">
          Insert and close
        </button>
      </Stack>
    ),
  },
};

/** A disabled trigger cannot be opened and reads as dimmed. */
export const Disabled: Story = {
  args: {
    disabled: true,
    children: <Text className="p-3">Unreachable</Text>,
  },
};
