import type { Meta, StoryObj } from "@storybook/react";

import { Text } from "./text";
import { TextLink } from "./text-link";

const meta = {
  title: "Primitives/Typography/TextLink",
  component: TextLink,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    href: {
      control: "text",
      description:
        "Destination. Required in practice: an `<a>` without one has no implicit `link` role and no tab stop, so " +
        "it is invisible to assistive technology and to the keyboard. Router navigation stays with the router's " +
        "own `Link` — this primitive is for plain anchors.",
    },
    children: {
      control: "text",
      description:
        "The link text. It is the accessible name, so it has to make sense read out of context — `“read the " +
        'setup guide”`, never `"click here"`.',
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof TextLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The resting treatment: `text-brand` (5.09:1 light / 9.63:1 dark on
 * `--background`) with a permanent underline. The underline is not decoration
 * — `--brand` against `--foreground` is 1.86:1 in dark, under G183's 3:1, so
 * colour alone cannot tell a link from the sentence around it.
 */
export const Default: Story = {
  args: {
    children: "Read the setup guide",
    href: "https://example.com",
  },
};

/**
 * The real job: an anchor inside running prose, where `link-in-text-block`
 * applies and the underline is doing the work.
 */
export const InSentence: Story = {
  render: () => (
    <Text size="base">
      Get an API key from the <TextLink href="https://example.com">provider dashboard</TextLink> first.
    </Text>
  ),
};

/**
 * The same link on `--card` and on `--muted`. `--brand` is an ink-plateau
 * pigment rather than a surface-tuned one, so it holds across the surface
 * scale (5.09:1 on `--background`, 5.55:1 on `--card`, 4.65:1 on `--muted`)
 * instead of needing a per-surface override.
 */
export const OnSurfaces: Story = {
  render: () => (
    <div className="flex w-80 flex-col gap-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <Text size="sm">
          Card surface — <TextLink href="https://example.com">open the dashboard</TextLink>.
        </Text>
      </div>
      <div className="rounded-lg bg-muted p-4">
        <Text size="sm">
          Muted surface — <TextLink href="https://example.com">open the dashboard</TextLink>.
        </Text>
      </div>
    </div>
  ),
};

/**
 * Hostile content: a link whose label is a long unbroken URL. The anchor
 * wraps with the paragraph rather than pushing the column wider, and the
 * focus ring — a `box-shadow`, so never clipped by the text flow — still
 * bounds every line box it lands on.
 */
export const LongUrlLabel: Story = {
  render: () => (
    <div className="w-72">
      <Text size="sm">
        Full path:{" "}
        <TextLink className="break-all" href="https://example.com">
          https://example.com/workspaces/fiestaboard/boards/kitchen-display/settings
        </TextLink>
      </Text>
    </div>
  ),
};
