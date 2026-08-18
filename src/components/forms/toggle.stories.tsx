import type { Meta, StoryObj } from "@storybook/react";
import { Bold, Italic, PenLine, Underline, WrapText } from "lucide-react";

import { Toggle } from "./toggle";

const meta = {
  title: "Forms/Toggle",
  component: Toggle,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "outline"],
      description:
        "Off-state chrome only. `default` is Button's ghost (flat until hovered, the toolbar look); " +
        "`outline` is Button's outline (a bordered field). The on-state fill — bg-primary with board ink — " +
        "is shared by both and cannot be opted out of.",
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon", "icon-sm"],
      description:
        "Narrower than Button's sizes on purpose: toggles are icon-first toolbar controls. " +
        "`min-w` mirrors the height so a lone icon stays square; icon sizes are exactly square.",
    },
    pressed: {
      control: false,
      description: "Controlled on/off state; pair with `onPressedChange`. Rendered as `aria-pressed`.",
    },
    defaultPressed: {
      control: "boolean",
      description: "Initial state when uncontrolled.",
    },
    onPressedChange: {
      control: false,
      description: "Fired with the next pressed state (a single boolean — safe to pass a setState directly).",
    },
    value: {
      control: false,
      description: "Identifies the toggle inside a ToggleGroup. Unused standalone.",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state — native `disabled`, greyed at 50% opacity.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

/** An icon-only toggle needs an `aria-label` — the glyph is its whole face. */
export const Default: Story = {
  args: {
    "aria-label": "Bold",
    defaultPressed: true,
    size: "icon",
    children: <Bold />,
  },
};

/**
 * Both variants, off and on. The on state is identical across variants —
 * `default` and `outline` only decide what the control looks like while off.
 */
export const Variants = () => (
  <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-6 gap-y-3 text-sm">
    <span className="text-xs text-muted-foreground" />
    <span className="text-xs text-muted-foreground">off</span>
    <span className="text-xs text-muted-foreground">on</span>
    <span className="text-xs text-muted-foreground">default</span>
    <Toggle aria-label="Italic" size="icon">
      <Italic />
    </Toggle>
    <Toggle aria-label="Italic" size="icon" defaultPressed>
      <Italic />
    </Toggle>
    <span className="text-xs text-muted-foreground">outline</span>
    <Toggle aria-label="Italic" variant="outline" size="icon">
      <Italic />
    </Toggle>
    <Toggle aria-label="Italic" variant="outline" size="icon" defaultPressed>
      <Italic />
    </Toggle>
  </div>
);

/** Padded sizes carry a label; icon sizes are square. All clear the 24px target minimum. */
export const Sizes = () => (
  <div className="flex flex-wrap items-center gap-4">
    <div className="flex flex-col items-center gap-2">
      <Toggle variant="outline" size="sm">
        <WrapText /> Wrap
      </Toggle>
      <span className="text-xs text-muted-foreground">sm</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Toggle variant="outline" size="default">
        <WrapText /> Wrap
      </Toggle>
      <span className="text-xs text-muted-foreground">default</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Toggle variant="outline" size="lg">
        <WrapText /> Wrap
      </Toggle>
      <span className="text-xs text-muted-foreground">lg</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Toggle variant="outline" size="icon-sm" aria-label="Wrap text">
        <WrapText />
      </Toggle>
      <span className="text-xs text-muted-foreground">icon-sm</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Toggle variant="outline" size="icon" aria-label="Wrap text">
        <WrapText />
      </Toggle>
      <span className="text-xs text-muted-foreground">icon</span>
    </div>
  </div>
);

/**
 * The template editor's draw-mode toggle — the one call site that remembered
 * `aria-pressed` by hand. Icon + label, so no aria-label is needed.
 */
export const WithLabel = () => (
  <Toggle variant="outline">
    <PenLine /> Draw mode
  </Toggle>
);

/** Disabled in both states. A disabled toggle keeps showing WHICH state it is stuck in. */
export const Disabled = () => (
  <div className="flex items-center gap-3">
    <Toggle aria-label="Bold" size="icon" disabled>
      <Bold />
    </Toggle>
    <Toggle aria-label="Underline" size="icon" disabled defaultPressed>
      <Underline />
    </Toggle>
    <Toggle variant="outline" disabled>
      <WrapText /> Wrap
    </Toggle>
  </div>
);
