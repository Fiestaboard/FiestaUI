import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "./button";
import { Card, CardContent, CardHeader } from "./card";
import { Spinner } from "./spinner";

const meta = {
  title: "UI/Spinner",
  component: Spinner,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size scale, pinned to the Button heights (sm = h-8, md = h-9, lg = h-10)",
    },
    label: {
      control: "text",
      description:
        'Text announced via `role="status"`. Pass `null` for a decorative spinner when an ancestor ' +
        "already owns the busy semantics.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes (e.g. a text-* colour — the mark uses currentColor)",
    },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    size: "md",
    label: "Loading",
  },
};

/** The three sizes line up with the button heights they are meant to sit in. */
export const Sizes = () => (
  <div className="flex items-center gap-6">
    <div className="flex flex-col items-center gap-2">
      <Spinner size="sm" />
      <span className="text-xs text-muted-foreground">sm · 14px</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Spinner size="md" />
      <span className="text-xs text-muted-foreground">md · 16px</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <Spinner size="lg" />
      <span className="text-xs text-muted-foreground">lg · 20px</span>
    </div>
  </div>
);

/** The mark inherits `currentColor`, so it takes the colour of whatever it sits in. */
export const Colors = () => (
  <div className="flex items-center gap-6">
    <Spinner />
    <Spinner className="text-brand" />
    <Spinner className="text-destructive" />
    <Spinner className="text-muted-foreground" />
  </div>
);

/**
 * The Button composes the Spinner: `<Button loading>` renders it decoratively
 * (`label={null}`) because the button itself carries `aria-busy` and must keep
 * its own accessible name.
 */
export const InsideAButton = () => (
  <div className="flex items-center gap-3">
    <Button size="sm" loading>
      Saving
    </Button>
    <Button loading>Saving</Button>
    <Button size="lg" variant="brand" loading>
      Saving
    </Button>
  </div>
);

/** Block-level loading — a spinner with its label made visible. */
export const WithVisibleLabel = () => (
  <Card className="w-[320px]">
    <CardHeader className="text-sm font-medium">Board preview</CardHeader>
    <CardContent className="flex items-center justify-center gap-3 py-10 text-muted-foreground">
      <Spinner label={null} />
      <span className="text-sm">Fetching the latest message…</span>
    </CardContent>
  </Card>
);

/**
 * Reduced motion — turn on "Reduce motion" in the OS (or emulate
 * `prefers-reduced-motion: reduce` in devtools) and the rotating arc is
 * replaced by a static complete ring rather than frozen mid-turn. A frozen
 * three-quarter arc reads as a rendering glitch; a whole ring reads as a
 * deliberate placeholder, the same language the static Skeleton uses. The
 * `role="status"` announcement is identical either way, which is what makes
 * dropping the animation safe rather than merely quieter.
 */
export const ReducedMotion = () => (
  <div className="flex flex-col items-center gap-3">
    <Spinner size="lg" />
    <span className="max-w-[320px] text-center text-xs text-muted-foreground">
      Emulate <code>prefers-reduced-motion: reduce</code> to see the static ring.
    </span>
  </div>
);
