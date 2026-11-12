import type { Meta, StoryObj } from "@storybook/react";
import { Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "../forms/button";
import { Kbd } from "../typography/kbd";
import { type ShortcutGroup, ShortcutList, ShortcutListPopover } from "./shortcut-list";

/*
 * ShortcutList (slice 1.4d, W4 / WEB-17). Figma `ZQ8RMELCO6qEOFZUnQu36e`:
 * 07 `57:28953` (the popover in the desktop editor `57:27771`), 08 `59:68086`
 * (W4), and 04 `42:90794` (the grouped iPad overlay that 08 cites).
 *
 * The open stories sit in a frame tall enough to hold the popup, because VRT
 * shoots #storybook-root's box and the popup is portalled over it.
 */
const meta = {
  title: "Overlays/ShortcutList",
  component: ShortcutListPopover,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  argTypes: {
    platform: { control: "inline-radio", options: ["apple", "generic"] },
    trigger: { control: false },
    groups: { control: false },
    footnote: { control: false },
  },
} satisfies Meta<typeof ShortcutListPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 07 `57:28953`, row for row. */
const EDITOR_SHORTCUTS: ShortcutGroup[] = [
  {
    items: [
      { label: "Insert menu (Variables, Colors, Formula)", keys: ["/"] },
      {
        label: "Undo · Redo",
        keys: [
          ["Mod", "Z"],
          ["Mod", "Shift", "Z"],
        ],
      },
      { label: "Align left · center · right", keys: ["Mod", "Shift", "L", "E", "R"] },
      { label: "Save", keys: ["Mod", "S"] },
      { label: "Show now", keys: ["Mod", "Enter"] },
      { label: "Scroll the preview by one note", keys: ["Left", "Right"] },
      { label: "Fit / Actual size (preview focused)", keys: ["F"] },
      { label: "Close a picker", keys: ["Esc"] },
    ],
  },
];

const EDITOR_FOOTNOTE =
  "No single-key shortcuts while typing in the template. ⌘⇧V stays the browser’s paste as plain text, so Insert uses / instead of iPad’s ⌘⇧V.";

/** 04 `42:90794`: the same list in titled groups. */
const GROUPED_SHORTCUTS: ShortcutGroup[] = [
  {
    id: "insert",
    title: "Insert",
    items: [
      { label: "Variable…", keys: ["/"] },
      { label: "Color tile…", keys: ["Mod", "Shift", "C"] },
      { label: "Formula…", keys: ["Mod", "Shift", "F"] },
    ],
  },
  {
    id: "edit",
    title: "Edit & send",
    items: [
      { label: "Undo", keys: ["Mod", "Z"] },
      { label: "Redo", keys: ["Mod", "Shift", "Z"] },
      { label: "Save", keys: ["Mod", "S"] },
      { label: "Show now", keys: ["Mod", "Enter"] },
    ],
  },
];

/** 07 `57:28576`: the editor header's secondary "Shortcuts" button. */
const headerButton = (
  <Button variant="secondary">
    <Zap aria-hidden />
    Shortcuts
  </Button>
);

/** A frame tall enough to hold the open popup below its trigger. */
function Frame({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[600px] bg-background p-4">{children}</div>;
}

/** 07 `57:28953`, as an Apple reader sees it (⌘ ⇧ ⏎). */
export const Default: Story = {
  args: {
    groups: EDITOR_SHORTCUTS,
    footnote: EDITOR_FOOTNOTE,
    platform: "apple",
    trigger: headerButton,
    defaultOpen: true,
  },
  render: (args) => (
    <Frame>
      <ShortcutListPopover {...args} />
    </Frame>
  ),
};

/** The same list on Windows and Linux: words, not glyphs ("Ctrl", "Shift", "Enter"). */
export const Generic: Story = {
  args: { ...Default.args, platform: "generic" },
  render: Default.render,
};

/** 08 `59:68086` `groups={[{title, items}]}`, with the titles from 04 `42:90794`. */
export const Grouped: Story = {
  args: { ...Default.args, groups: GROUPED_SHORTCUTS, footnote: undefined },
  render: Default.render,
};

/**
 * The two triggers 07 draws, closed: the header's "Shortcuts" button
 * (`57:28576`) and the toolbar row's "? All shortcuts" hint (`57:28704`).
 * Both are hidden where no fine pointer exists (phones), unless
 * `hideTriggerOnTouch={false}`.
 */
export const Triggers: Story = {
  args: { ...Default.args, defaultOpen: false },
  render: (args) => (
    <div className="flex flex-wrap items-center gap-6 bg-background p-4">
      <ShortcutListPopover {...args} />
      <ShortcutListPopover
        {...args}
        align="end"
        trigger={
          <Button variant="ghost" size="sm" className="text-xs font-normal text-muted-foreground">
            <Kbd>?</Kbd>
            All shortcuts
          </Button>
        }
      />
    </div>
  ),
};

/**
 * The body on its own, for a help page or a Settings section, where the
 * reader came to read and no popover is wanted. The title is the page's.
 */
export const InlineList: Story = {
  args: { ...Default.args },
  render: (args) => (
    <div className="bg-background p-4">
      <section aria-labelledby="inline-shortcuts" className="max-w-[466px] space-y-3">
        <h2 id="inline-shortcuts" className="text-base font-semibold">
          Page editor
        </h2>
        <ShortcutList groups={GROUPED_SHORTCUTS} platform={args.platform} />
      </section>
    </div>
  ),
};

/**
 * The app owns the `?` key; the popover only follows `open`. Press `?`
 * anywhere in this story to open it. This is also how an iPad with a
 * keyboard (no fine pointer, so no trigger) reaches the list.
 */
export const OpenedByKey: Story = {
  args: { ...Default.args, defaultOpen: undefined },
  render: function Render(args) {
    const [open, setOpen] = useState(false);
    useEffect(() => {
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== "?" || event.defaultPrevented) return;
        const target = event.target as HTMLElement | null;
        if (target?.closest("input, textarea, [contenteditable='true']")) return;
        setOpen(true);
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, []);
    return (
      <Frame>
        <p className="mb-3 text-sm text-muted-foreground">
          Press <Kbd>?</Kbd> to open the list.
        </p>
        <ShortcutListPopover {...args} open={open} onOpenChange={setOpen} />
      </Frame>
    );
  },
};

/**
 * The keyboard contract, proven in a real browser: the dialog takes focus,
 * Tab reaches the close chip and cannot leave, Escape closes and focus goes
 * back to the trigger. Ends closed.
 */
export const FocusTrap: Story = {
  args: { ...Default.args, defaultOpen: false },
  render: (args) => (
    <Frame>
      <div className="flex gap-3">
        <Button variant="outline">Before</Button>
        <ShortcutListPopover {...args} />
        <Button variant="outline">After</Button>
      </div>
    </Frame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    const trigger = canvas.getByRole("button", { name: "Shortcuts" });

    trigger.focus();
    await userEvent.keyboard("{Enter}");
    const dialog = await body.findByRole("dialog", { name: "Keyboard shortcuts" });
    await waitFor(() => expect(dialog).toHaveFocus());

    // The surface is the 07 one: the modal elevation, not the popover's default.
    const style = getComputedStyle(dialog);
    await expect(style.borderTopLeftRadius).toBe("14px");
    await expect(style.boxShadow).not.toBe("none");
    await expect(style.boxShadow).not.toContain("rgba(0, 0, 0, 0.1) 0px 4px 6px -1px");

    const close = within(dialog).getByRole("button", { name: "Close" });
    await userEvent.tab();
    await waitFor(() => expect(close).toHaveFocus());
    await expect(getComputedStyle(close).opacity).toBe("1");
    await userEvent.tab();
    await waitFor(() => expect(close).toHaveFocus());
    await userEvent.tab({ shift: true });
    await waitFor(() => expect(close).toHaveFocus());

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  },
};
