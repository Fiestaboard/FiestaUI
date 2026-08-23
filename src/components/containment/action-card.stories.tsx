import type { Meta, StoryObj } from "@storybook/react";
import { CalendarOff, ChevronRight, ExternalLink, Settings2, SlidersHorizontal, Trash2 } from "lucide-react";

import { Badge } from "../feedback/badge";
import { Stack } from "../layout/stack";
import { Text } from "../typography/text";
import { ActionCard } from "./action-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card";

const meta = {
  title: "Containment/ActionCard",
  component: ActionCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    icon: {
      control: false,
      description:
        "Glyph for the medallion. Decorative — the medallion is an `aria-hidden` IconTile, so nothing here is " +
        "announced; `title` is the accessible name.",
    },
    tone: {
      control: "select",
      options: ["muted", "primary", "destructive"],
      description:
        "Medallion tint only — it never recolours the card surface, because an ActionCard is an action, not a " +
        "status. `primary` is drawn with `--brand`, the tile hue at the ink plateau, since `--primary` itself is " +
        "1.83:1 as ink on a light page.",
    },
    title: {
      control: "text",
      description: "The primary line, and the card's accessible name (wired with `aria-labelledby`).",
    },
    description: {
      control: "text",
      description: "Secondary line, announced as the card's description rather than as part of its name.",
    },
    meta: {
      control: false,
      description: "Trailing content on the title row — a chevron for a navigating card, a Badge, a shortcut.",
    },
    loading: {
      control: "boolean",
      description:
        '"Already running". Swaps the glyph for a Spinner, marks the card `aria-busy` + `aria-disabled` and ' +
        "guards activation — but NOT the native `disabled` attribute, which would move focus to `<body>` at the " +
        "moment the user is waiting for feedback. Same line Button draws.",
    },
    disabled: {
      control: "boolean",
      description: '"Not available". Native `disabled`, dimmed and inert. Never the same picture as `loading`.',
    },
    asChild: {
      control: false,
      description:
        "Render the caller's element instead of a `<button>` — pass `<a href>` for a card that navigates, so it " +
        "is right-clickable, middle-clickable and announced as a link.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof ActionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The ordinary case: medallion, title, description, whole surface pressable. */
export const Default: Story = {
  args: {
    icon: <CalendarOff />,
    title: "Turn off schedule",
    description: "Stops the schedule for this board. You can turn it back on at any time.",
    className: "w-full sm:w-[420px]",
  },
};

/**
 * The tone axis. Tone tints the MEDALLION and nothing else — a destructive
 * action still sits on the ordinary card ground, the same way a destructive
 * menu item does. Recolouring the whole surface would make the card read as a
 * status message rather than as something you press.
 */
export const AllTones: Story = {
  args: { title: "Tone", className: "w-full sm:w-[420px]" },
  render: (args) => (
    <Stack gap="3" className="w-full sm:w-[420px]">
      <ActionCard
        {...args}
        tone="muted"
        icon={<Settings2 />}
        title="Board settings"
        description="Name, timezone and hardware."
      />
      <ActionCard
        {...args}
        tone="primary"
        icon={<SlidersHorizontal />}
        title="Override temporarily"
        description="Show something else until the next scheduled page."
      />
      <ActionCard
        {...args}
        tone="destructive"
        icon={<Trash2 />}
        title="Delete this board"
        description="Removes the board and every page on it. This cannot be undone."
      />
    </Stack>
  ),
};

/**
 * `meta` is the trailing slot on the title row. A chevron is the convention
 * for a card that navigates; a Badge is the convention for one that is new,
 * beta or gated.
 */
export const WithMeta: Story = {
  args: { title: "Meta", className: "w-full sm:w-[420px]" },
  render: (args) => (
    <Stack gap="3" className="w-full sm:w-[420px]">
      <ActionCard
        {...args}
        icon={<Settings2 />}
        title="Board settings"
        description="Name, timezone and hardware."
        meta={<ChevronRight />}
      />
      <ActionCard
        {...args}
        tone="primary"
        icon={<SlidersHorizontal />}
        title="Automations"
        description="Change what the board shows when something happens."
        meta={<Badge variant="secondary">Beta</Badge>}
      />
    </Stack>
  ),
};

/**
 * The distinction the component exists to hold: `loading` is "already
 * running", `disabled` is "not available".
 *
 * The busy card keeps its full ink, keeps its place in the tab order and
 * spins — losing focus to `<body>` the instant you press something is the
 * worst possible moment for it to happen. The unavailable card is dimmed,
 * inert, and says nothing about being busy.
 */
export const LoadingVersusDisabled: Story = {
  args: { title: "States", className: "w-full sm:w-[420px]" },
  render: (args) => (
    <Stack gap="3" className="w-full sm:w-[420px]">
      <ActionCard
        {...args}
        icon={<CalendarOff />}
        title="Turn off schedule"
        description="Idle — press to run the mutation."
      />
      <ActionCard
        {...args}
        loading
        icon={<CalendarOff />}
        title="Turn off schedule"
        description="Loading: the glyph became a Spinner, and a second press does nothing."
      />
      <ActionCard
        {...args}
        disabled
        icon={<CalendarOff />}
        title="Turn off schedule"
        description="Disabled: this board has no schedule to turn off."
      />
    </Stack>
  ),
};

/** Busy, on its own. */
export const Loading: Story = {
  args: {
    icon: <CalendarOff />,
    title: "Turn off schedule",
    description: "Stops the schedule for this board.",
    loading: true,
    className: "w-full sm:w-[420px]",
  },
};

/** Unavailable, on its own. */
export const Disabled: Story = {
  args: {
    icon: <CalendarOff />,
    title: "Turn off schedule",
    description: "This board has no schedule to turn off.",
    disabled: true,
    className: "w-full sm:w-[420px]",
  },
};

/**
 * A card that NAVIGATES has to be a real anchor: right-clickable,
 * middle-clickable, "open in new tab", and announced as a link rather than as
 * a button. `asChild` hands the element to the caller — a plain `<a>`, or a
 * router's Link with its prefetch and base-path handling — while the card
 * keeps owning the surface, the content and the ARIA.
 */
export const AsALink: Story = {
  args: { title: "Link", className: "w-full sm:w-[420px]" },
  render: (args) => (
    <Stack gap="3" className="w-full sm:w-[420px]">
      <ActionCard {...args} icon={<Settings2 />} title="Board settings" meta={<ChevronRight />} asChild>
        <a href="#board-settings" />
      </ActionCard>
      <ActionCard
        {...args}
        tone="primary"
        icon={<ExternalLink />}
        title="Vestaboard documentation"
        description="Opens in a new tab."
        meta={<ChevronRight />}
        asChild
      >
        <a href="https://docs.vestaboard.com" target="_blank" rel="noreferrer" />
      </ActionCard>
    </Stack>
  ),
};

/**
 * The reason this is a component and not two hand-rolled buttons.
 *
 * A pressable card and a static one sit in the same dialog constantly, and
 * both downstream copies dropped `shadow-card` and Card's transition when
 * they retyped the visuals onto a `<button>`. ActionCard composes the
 * exported `cardSurfaceClassName` instead, so the ground, radius, boundary
 * and elevation are the SAME STRING in both — they cannot drift apart again.
 */
export const AlongsideACard: Story = {
  args: { title: "Alongside", className: "w-full sm:w-[420px]" },
  render: (args) => (
    <Stack gap="3" className="w-full sm:w-[420px]">
      <Card>
        <CardHeader>
          <CardTitle size="base">Kitchen board</CardTitle>
          <CardDescription>Running the morning briefing page.</CardDescription>
        </CardHeader>
        <CardContent>
          <Text size="sm" tone="muted">
            A static Card — same ground, same radius, same elevation.
          </Text>
        </CardContent>
      </Card>
      <ActionCard
        {...args}
        tone="primary"
        icon={<SlidersHorizontal />}
        title="Override temporarily"
        description="Show something else until the next scheduled page."
      />
      <ActionCard
        {...args}
        icon={<CalendarOff />}
        title="Turn off schedule"
        description="Stops the schedule for this board."
      />
    </Stack>
  ),
};

/**
 * Long copy in a narrow column. The medallion never shrinks, the body wraps,
 * and `meta` holds the trailing edge — `min-w-0` on the body is what stops a
 * long unbroken title from pushing the chevron out of the card.
 */
export const LongContent: Story = {
  args: { title: "Long", className: "w-full" },
  render: (args) => (
    <div className="w-full max-w-xs">
      <ActionCard
        {...args}
        icon={<Settings2 />}
        title="Replace the currently scheduled page with a temporary override"
        description="The override stays until the next scheduled page begins, or until you clear it by hand from this same dialog."
        meta={<ChevronRight />}
      />
    </div>
  ),
};

/**
 * No icon, no description — the minimum. A row-shaped card, still one target
 * for the whole surface.
 */
export const TitleOnly: Story = {
  args: {
    title: "Turn off schedule",
    meta: <ChevronRight />,
    className: "w-full sm:w-[420px]",
  },
};
