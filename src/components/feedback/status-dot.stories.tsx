import type { Meta, StoryObj } from "@storybook/react";

import { StatusDot } from "./status-dot";

const meta = {
  title: "Feedback/StatusDot",
  component: StatusDot,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["success", "warning", "danger", "info", "neutral"],
      description: "Semantic state, mapped to the success / warning / destructive / info / muted-foreground tokens",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "sm 6px · md 8px (the inline default) · lg 12px (standalone indicators)",
    },
    glow: {
      control: "boolean",
      description: "Soft halo colour-mixed from the dot's own token — decorative emphasis only",
    },
    pulse: {
      control: "boolean",
      description: "Attention pulse. Off by default and disabled under `prefers-reduced-motion`.",
    },
    label: {
      control: "text",
      description:
        "Accessible name. `null` (the default) renders a decorative `aria-hidden` dot for use beside text that " +
        'already states the status; a string promotes the dot to `role="status"` with an sr-only label.',
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof StatusDot>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A standalone dot: it is the only thing saying "running", so it carries a label. */
export const Default: Story = {
  args: {
    status: "success",
    size: "md",
    label: "Service running",
  },
};

/** The five semantic states. Labels are visible text here, so the dots are decorative. */
export const Statuses = () => (
  <div className="flex flex-col gap-3 text-sm">
    <div className="flex items-center gap-2">
      <StatusDot status="success" />
      <span>Running</span>
    </div>
    <div className="flex items-center gap-2">
      <StatusDot status="warning" />
      <span>Degraded</span>
    </div>
    <div className="flex items-center gap-2">
      <StatusDot status="danger" />
      <span>Disconnected</span>
    </div>
    <div className="flex items-center gap-2">
      <StatusDot status="info" />
      <span>Cached</span>
    </div>
    <div className="flex items-center gap-2">
      <StatusDot status="neutral" />
      <span>Stopped</span>
    </div>
  </div>
);

/** md is the size the inline settings rows use; lg matches the header service indicator. */
export const Sizes = () => (
  <div className="flex items-center gap-6">
    <div className="flex flex-col items-center gap-2">
      <StatusDot status="success" size="sm" />
      <span className="text-xs text-muted-foreground">sm · 6px</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <StatusDot status="success" size="md" />
      <span className="text-xs text-muted-foreground">md · 8px</span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <StatusDot status="success" size="lg" />
      <span className="text-xs text-muted-foreground">lg · 12px</span>
    </div>
  </div>
);

/**
 * The glow is colour-mixed from the dot's own token at 50%, so it follows the
 * theme instead of being a hand-written shadow per call site.
 */
export const Glow = () => (
  <div className="flex items-center gap-8">
    <div className="flex flex-col items-center gap-3">
      <StatusDot status="success" size="lg" glow />
      <span className="text-xs text-muted-foreground">success</span>
    </div>
    <div className="flex flex-col items-center gap-3">
      <StatusDot status="warning" size="lg" glow />
      <span className="text-xs text-muted-foreground">warning</span>
    </div>
    <div className="flex flex-col items-center gap-3">
      <StatusDot status="danger" size="lg" glow />
      <span className="text-xs text-muted-foreground">danger</span>
    </div>
    <div className="flex flex-col items-center gap-3">
      <StatusDot status="info" size="lg" glow />
      <span className="text-xs text-muted-foreground">info</span>
    </div>
  </div>
);

/**
 * Pulse is emphasis, never meaning — the colour and the label already say
 * everything. It is off by default and removed entirely under
 * `prefers-reduced-motion: reduce` (emulate it in devtools to check).
 */
export const Pulse = () => (
  <div className="flex items-center gap-8 text-sm">
    <div className="flex items-center gap-2">
      <StatusDot status="danger" size="lg" pulse glow />
      <span>Reconnecting…</span>
    </div>
    <div className="flex items-center gap-2">
      <StatusDot status="warning" size="lg" pulse />
      <span>Sync pending</span>
    </div>
  </div>
);

/**
 * Decorative vs. standalone — the whole a11y contract of this component.
 *
 * Left: the row's text already says "Running", so the dot is `aria-hidden` and
 * a screen reader hears "Running" once. Right: the dot is alone in the header,
 * so it takes a label and `role="status"`, and its change is announced.
 */
export const DecorativeVsStandalone = () => (
  <div className="flex flex-col gap-4 text-sm sm:flex-row sm:items-stretch">
    <div className="w-[260px] rounded-lg border px-4 py-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">Decorative (beside text)</div>
      <div className="flex items-center justify-between">
        <span className="font-medium">Service</span>
        <span className="flex items-center gap-2">
          <StatusDot status="success" />
          <span>Running</span>
        </span>
      </div>
    </div>
    <div className="w-[260px] rounded-lg border px-4 py-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground">Standalone (labelled)</div>
      <div className="flex items-center justify-between">
        <span className="font-medium">Kitchen board</span>
        <StatusDot status="success" size="lg" glow label="Connected" />
      </div>
    </div>
  </div>
);

/**
 * The settings-panel idiom this component replaces: a column of state rows
 * that used to hand-type `h-2 w-2 rounded-full bg-*` at every site.
 */
export const InSettingsRows = () => (
  <dl className="w-[320px] space-y-3 rounded-lg border px-4 py-3 text-sm">
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">Service</dt>
      <dd className="flex items-center gap-2">
        <StatusDot status="success" glow />
        <span>Running</span>
      </dd>
    </div>
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">Cache</dt>
      <dd className="flex items-center gap-2">
        <StatusDot status="info" />
        <span>Warm</span>
      </dd>
    </div>
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">Scheduler</dt>
      <dd className="flex items-center gap-2">
        <StatusDot status="neutral" />
        <span>Idle</span>
      </dd>
    </div>
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">Last publish</dt>
      <dd className="flex items-center gap-2">
        <StatusDot status="danger" />
        <span>Failed</span>
      </dd>
    </div>
  </dl>
);
