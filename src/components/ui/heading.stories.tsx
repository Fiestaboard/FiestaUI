import type { Meta, StoryObj } from "@storybook/react";

import { Heading } from "./heading";
import { Stack } from "./stack";

const meta = {
  title: "UI/Heading",
  component: Heading,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    level: {
      control: "select",
      options: [2, 3, 4],
      description: "Semantic heading element (h2–h4); h1 belongs to PageHeader",
    },
    size: {
      control: "select",
      options: ["sm", "base", "lg", "xl"],
      description: "Visual size, decoupled from the semantic level",
    },
    tone: {
      control: "select",
      options: ["default", "muted", "destructive"],
      description: "Heading color, sharing Text's status token names",
    },
  },
} satisfies Meta<typeof Heading>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Section heading",
  },
};

export const Levels: Story = {
  render: () => (
    <Stack gap="3">
      <Heading level={2} size="xl">
        h2 rendered at size xl
      </Heading>
      <Heading level={3} size="lg">
        h3 rendered at size lg
      </Heading>
      <Heading level={3}>h3 at the default base size</Heading>
      <Heading level={4} size="sm">
        h4 rendered at size sm
      </Heading>
    </Stack>
  ),
};

/**
 * `tone` is deliberately a two-step scale, not the five `Text` exposes: a
 * section title is structure, and colouring it is a signal, not decoration.
 * `muted` de-emphasises a secondary group header; `destructive` titles an
 * error or a destructive-action section. Both clear WCAG AA (4.5:1) against
 * `--background` and `--card` in either theme — `destructive` measures
 * 7.04:1 / 7.35:1 in light and 8.49:1 / 8.19:1 in dark. Anything needing
 * `info` / `success` / `warning` should bring a call site first.
 */
export const Tones: Story = {
  render: () => (
    <Stack gap="4">
      <Stack gap="1">
        <Heading size="lg">default — the standard section title</Heading>
        <Heading size="lg" tone="muted">
          muted — a de-emphasised secondary group header
        </Heading>
        <Heading size="lg" tone="destructive">
          destructive — an error or destructive-action section
        </Heading>
      </Stack>
      {/* Same ramp on `--card`, the other surface these titles land on. */}
      <Stack gap="1" className="rounded-xl border bg-card p-4">
        <Heading size="lg">default on a card surface</Heading>
        <Heading size="lg" tone="muted">
          muted on a card surface
        </Heading>
        <Heading size="lg" tone="destructive">
          destructive on a card surface
        </Heading>
      </Stack>
    </Stack>
  ),
};

/**
 * Regression guard for the `leading-none` collision: constrained to a narrow
 * column so every size wraps. Ascenders and descenders on adjacent lines must
 * stay clear of each other.
 */
export const Wrapping: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Headings wrap in narrow columns and on mobile. `leading-tight` (1.25) keeps the ramp visually tight while leaving descender clearance between lines.",
      },
    },
  },
  render: () => (
    <Stack gap="6" className="max-w-[16rem]">
      <Heading size="xl">Configure your board layout and typography</Heading>
      <Heading size="lg">Configure your board layout and typography</Heading>
      <Heading size="base">Configure your board layout and typography</Heading>
      <Heading size="sm">Configure your board layout and typography</Heading>
    </Stack>
  ),
};
