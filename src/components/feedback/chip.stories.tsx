import type { Meta, StoryObj } from "@storybook/react";
import { Tag } from "lucide-react";

import { Chip } from "./chip";

const meta = {
  title: "Feedback/Chip",
  component: Chip,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    mono: {
      control: "boolean",
      description:
        "Geist Mono for code-shaped labels — version numbers, plugin ids. Typography only; orthogonal to any future colour variant.",
    },
    asChild: {
      control: false,
      description:
        "Render the chip styles onto a single child element — the primary usage, `<Chip asChild><a href=…>` — so navigation keeps native link semantics. Without it the chip is a real `<button>`, never a styled span.",
    },
    children: {
      control: "text",
      description: "Chip label content",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The bare `<button>` form, for chips that trigger an action rather than navigate. */
export const Default: Story = {
  args: {
    children: "Chip",
  },
};

/** Geist Mono keeps digit-heavy labels tabular — the archived-version idiom. */
export const Mono: Story = {
  args: {
    children: "5.11",
    mono: true,
  },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Tag aria-hidden="true" />
        release
      </>
    ),
  },
};

/**
 * The primary usage (#229): archived-version links on the docs site. Hover a
 * chip — the border lifts from --border to --brand, the ink-plateau gold that
 * measures 5.09:1 light / 9.63:1 dark, not the 1.83:1 tile the old docs CSS
 * used. Focus rides the shared two-tone `focus-ring`.
 */
export const VersionLinks = () => (
  <nav aria-label="Archived versions" className="flex flex-wrap items-center gap-2">
    {["5.11", "5.10", "5.9", "5.8", "5.7", "5.6"].map((version) => (
      <Chip key={version} asChild mono>
        <a href={`#v${version}`}>{version}</a>
      </Chip>
    ))}
  </nav>
);

/** Blog-tag rows: proportional labels, wrapping freely inside a constrained column. */
export const TagRowWrapping = () => (
  <div className="w-full sm:w-[320px] rounded-md border px-4 py-3">
    <div className="mb-2 text-xs font-medium text-muted-foreground">Tagged</div>
    <div className="flex flex-wrap gap-2">
      {["release", "plugins", "hardware", "split-flap", "home-assistant", "design-system", "typography"].map((tag) => (
        <Chip key={tag} asChild>
          <a href={`#tag-${tag}`}>{tag}</a>
        </Chip>
      ))}
    </div>
  </div>
);
