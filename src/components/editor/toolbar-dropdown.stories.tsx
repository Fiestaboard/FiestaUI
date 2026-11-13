import type { Meta, StoryObj } from "@storybook/react";
import { Palette, Pilcrow } from "lucide-react";
import type { ComponentProps } from "react";
import { userEvent, within } from "storybook/test";

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
    labels: { control: "object", description: "Fallback accessible name when `label` is empty; sheet close label." },
    presentation: {
      control: "inline-radio",
      options: ["popover", "sheet", "auto"],
      description: "`popover` (default), `sheet` (non-modal bottom sheet), or `auto` (sheet below 640px).",
    },
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

/*
 * Presentation (slice 1.3 · WEB-05 · 07c editor sheets). The stories pin a
 * phone-shaped editor page with `position: fixed`, so VRT captures the whole
 * viewport (the sheet is portalled out of #storybook-root), and open the
 * picker in `play`.
 */
function EditorWithToolbar(props: Partial<ComponentProps<typeof ToolbarDropdown>>) {
  return (
    <div className="fixed inset-0 flex flex-col gap-3 bg-background p-4 text-foreground">
      <p className="text-base font-semibold">Kitchen morning</p>
      <div
        role="img"
        aria-label="Live preview"
        className="grid h-40 place-items-center rounded-lg bg-[var(--color-board-surface-dark)] font-mono text-sm tracking-[0.3em] text-white"
      >
        GOOD MORNING
      </div>
      <div role="toolbar" aria-label="Editor tools" className="flex gap-1">
        <ToolbarDropdown
          label="Formatting"
          icon={<Pilcrow className="w-4 h-4" />}
          closeOnOutsideClick={false}
          {...props}
        >
          <Stack gap="1" className="w-full p-1 sm:w-56 sm:p-3">
            {["Fill space", "Wrap text", "Repeat fill"].map((row) => (
              <button
                key={row}
                type="button"
                className="flex min-h-11 items-center rounded-md px-2 text-left text-sm hover:bg-accent focus-ring"
              >
                {row}
              </button>
            ))}
          </Stack>
        </ToolbarDropdown>
      </div>
    </div>
  );
}

const openFormatting: Story["play"] = async ({ canvasElement }) => {
  await userEvent.click(within(canvasElement).getByRole("button", { name: "Formatting" }));
};

/** `presentation="sheet"`: a non-modal bottom sheet with a grabber and no scrim; the preview stays live. */
export const SheetPresentation: Story = {
  parameters: { layout: "fullscreen" },
  args: { children: null },
  render: () => <EditorWithToolbar presentation="sheet" />,
  play: openFormatting,
};

/** `presentation="auto"`: a popover at 640px and up (desktop shot), a bottom sheet below it (mobile shot). */
export const AutoPresentation: Story = {
  parameters: { layout: "fullscreen" },
  args: { children: null },
  render: () => <EditorWithToolbar presentation="auto" />,
  play: openFormatting,
};
