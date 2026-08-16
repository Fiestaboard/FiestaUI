import type { Meta, StoryObj } from "@storybook/react";

import { SkipToContent } from "./skip-to-content";

const meta = {
  title: "App/Chrome/SkipToContent",
  component: SkipToContent,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Keyboard escape hatch past the navigation. The link is visually hidden (`sr-only`) until it receives keyboard focus, then pins itself to the top-left corner of the viewport. Click the canvas and press Tab to reveal it.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    label: { description: 'Localized link text, e.g. "Skip to main content".', control: "text" },
    targetId: {
      description: "id of the landmark the link jumps to (defaults to MainContent's `main-content`).",
      control: false,
    },
  },
} satisfies Meta<typeof SkipToContent>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The skip link itself is invisible until focused — this story wraps it in
 * a container that tells you how to summon it.
 */
export const Default: Story = {
  args: {
    label: "Skip to main content",
    targetId: "demo-main-content",
  },
  render: (args) => (
    <div className="w-full sm:w-96 space-y-3 rounded-xl border border-border p-6">
      <SkipToContent {...args} />
      <h2 className="text-sm font-semibold">Try it</h2>
      <p className="text-sm text-muted-foreground">
        The skip link is visually hidden until it receives keyboard focus. Click inside this canvas, then press{" "}
        <kbd className="rounded-sm border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">Tab</kbd> — it appears
        pinned to the top-left corner. Activating it jumps to the target landmark below.
      </p>
      <div
        id={args.targetId}
        tabIndex={-1}
        className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground"
      >
        Target landmark (<code>#{args.targetId}</code>)
      </div>
    </div>
  ),
};
