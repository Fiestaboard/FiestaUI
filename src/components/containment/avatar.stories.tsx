import type { Meta, StoryObj } from "@storybook/react";
import { Bot } from "lucide-react";

import { Avatar } from "./avatar";

const meta = {
  title: "Containment/Avatar",
  component: Avatar,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    name: {
      control: "text",
      description:
        "The person's display name. Up to two initials are drawn from it — first and last word, split on spaces, " +
        "dots, underscores and hyphens; an email address is read by its local part.",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Disc size, 24 / 32 / 40px. The monogram and an unsized `svg` child scale with it.",
    },
    tone: {
      control: "select",
      options: ["neutral", "brand"],
      description:
        "`neutral` is a tint of the surface's own foreground, and holds up on a page, a popover and the rail. " +
        "`brand` is the filled disc — the brand colour also means selected, so keep it off surfaces that show a " +
        "selection (the sidebar).",
    },
    decorative: {
      control: "boolean",
      description:
        "Keeps the avatar out of the accessibility tree (the default — the name is nearly always printed beside " +
        "it). Turn it off only when the avatar alone names the person, and pass a localized `aria-label`.",
    },
    children: {
      control: false,
      description: "A glyph to draw instead of initials.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The ordinary case: one initial from a one-word username. */
export const Default: Story = {
  args: {
    name: "casa",
  },
};

/** The size axis — 24, 32 and 40px, the monogram scaling with the disc. */
export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-3">
      <Avatar size="sm" name="casa" />
      <Avatar size="md" name="casa" />
      <Avatar size="lg" name="casa" />
    </div>
  ),
};

/** Neutral almost everywhere; brand only where nothing else on the surface is using the brand colour to say "selected". */
export const Tones: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Avatar tone="neutral" name="ada.lovelace" />
      <Avatar tone="brand" name="ada.lovelace" />
    </div>
  ),
};

/**
 * How a name becomes a monogram. Usernames are free text, so the word breaks
 * are the separators people build them from; an address is read by its local
 * part, because the domain says where the mail goes, not who the person is.
 */
export const Initials: Story = {
  render: () => (
    <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
      {["casa", "Grace Hopper", "ada.lovelace", "user@example.com", "ada_king-lovelace"].map((name) => (
        <div key={name} className="contents">
          <Avatar name={name} />
          <span className="font-mono text-muted-foreground">{name}</span>
        </div>
      ))}
    </div>
  ),
};

/**
 * No name to draw from — auth is off, or nobody is signed in — so the disc
 * holds a person glyph rather than the initial of a placeholder word.
 */
export const Anonymous: Story = {
  args: {},
};

/** Any glyph can stand in for the monogram. */
export const WithGlyph: Story = {
  args: {
    children: <Bot />,
  },
};
