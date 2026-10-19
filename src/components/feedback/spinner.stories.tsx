import type { Meta, StoryObj } from "@storybook/react";

import { Card, CardContent, CardHeader } from "../containment/card";
import { Button } from "../forms/button";
import { Spinner } from "./spinner";

const meta = {
  title: "Feedback/Spinner",
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
      description: "Additional CSS classes, including size overrides for page loading states",
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

/** Transparent artwork retains its colors on both surfaces. */
export const Surfaces = () => (
  <div className="flex flex-wrap gap-6">
    {(["light", "dark"] as const).map((theme) => (
      <div
        key={theme}
        className={`flex min-w-56 flex-col items-center gap-6 rounded-xl p-8 ring-1 ring-border ${theme === "light" ? "bg-white text-slate-900" : "bg-slate-950 text-white"}`}
      >
        <span className="text-sm">{theme === "light" ? "Light" : "Dark"} surface</span>
        <div className="flex items-center gap-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
        </div>
        <Spinner className="size-24" label="Loading board" />
      </div>
    ))}
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
 * The explicit motion switch previews the same still pose used for the OS
 * reduced-motion preference and the app's `.reduce-motion` class.
 */
export const ReducedMotion = () => (
  <div data-motion="off" className="flex flex-col items-center gap-3">
    <div className="flex items-center gap-6">
      <Spinner size="sm" />
      <Spinner size="md" />
      <Spinner size="lg" />
      <Spinner className="size-24" />
    </div>
    <span className="max-w-[320px] text-center text-xs text-muted-foreground">
      Motion is off. The taco stays still and loading announcements remain available.
    </span>
  </div>
);
