import type { Meta, StoryObj } from "@storybook/react";
import { FlaskConical, GalleryHorizontalEnd, Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../containment/card";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { PageCard, PageSection } from "./page-card";
import { PageHeader } from "./page-header";
import { PageToolbar } from "./page-toolbar";

const meta = {
  title: "App/Chrome/PageCard",
  component: PageCard,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    children: {
      description: "The blocks — a PageHeader, an optional PageToolbar, then PageSections or bare divs.",
      control: false,
    },
    fillHeight: {
      description: "Pins the card to its parent's height so a `PageSection fill` scrolls inside it.",
    },
    className: { control: false },
  },
} satisfies Meta<typeof PageCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Squat stand-ins for the Pages route's tiles — the shot is about edges, not thumbnails. */
function TileGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {["Morning", "Grocery list", "Weather", "Guest wifi", "Commute", "Birthdays"].map((name) => (
        <div
          key={name}
          className="border-border hover:border-brand flex h-20 flex-col justify-end rounded-xl border-2 p-3 transition-colors"
        >
          <span className="truncate text-sm font-medium">{name}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A route with a toolbar and a grid of items — the Collections/Pages shape.
 *
 * Note the two kinds of edge, and that only one of them is a border now: the
 * card's own, on the gutter. The title, the toolbar's controls and the tiles
 * all sit on the inset column, and the tiles keep their borders because a
 * tile's border is the thing you click.
 */
export const Default: Story = {
  args: { children: null },
  render: () => (
    <PageCard>
      <PageHeader icon={GalleryHorizontalEnd} title="Collections" description="Groups of pages that travel together.">
        <Button variant="brand">New collection</Button>
      </PageHeader>
      <PageToolbar
        left={
          <>
            <Badge>6 pages</Badge>
            <Badge variant="secondary">2 scheduled</Badge>
          </>
        }
        right={<Input placeholder="Search collections" className="w-56" />}
      />
      <PageSection>
        <TileGrid />
      </PageSection>
    </PageCard>
  ),
};

/**
 * THE WHOLE POINT, SIDE BY SIDE. Same content twice; the rules are drawn in
 * both halves so you can read where each block starts.
 *
 * - The BLUE rule is `PageLayout`'s gutter.
 * - The RED rule is the content column — the gutter plus 24.
 *
 * ABOVE is today's route. Every block already sits on the red rule, which is
 * the correct column — but nothing is drawn on the blue one, so the indent has
 * no visible cause. That is the "two left edges" complaint: a reader sees words
 * held off the page edge and no reason for it, and the tiles below reach out to
 * an edge the words never touch.
 *
 * BELOW is the same blocks in a `PageCard`. The header and the toolbar have not
 * moved a pixel — they were already on the red rule. Two things changed: a
 * border now sits on the blue rule, and the tiles came in to join the red one.
 *
 * Both are the point. Once something is drawn on the gutter, the indent beside
 * it stops reading as a mistake and starts reading as padding, which is what it
 * always was. And the tiles no longer need an edge of their own to justify —
 * inside the card they are items in a section rather than the only surfaces on
 * the route, so they line up with the words instead of with the page.
 */
export const WhatTheCardFixes: Story = {
  args: { children: null },
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="bg-background min-h-dvh py-8">
      <div className="relative container mx-auto max-w-full px-4 md:px-6">
        {/* Content column — where every word on the route starts. */}
        <div className="bg-hue-red pointer-events-none absolute inset-y-0 left-10 w-px opacity-60 md:left-12" />
        {/* The gutter — where a surface's edge belongs. */}
        <div className="bg-hue-blue pointer-events-none absolute inset-y-0 left-4 w-px opacity-60 md:left-6" />

        <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          Today — nothing drawn on the blue rule
        </p>
        <PageHeader icon={GalleryHorizontalEnd} title="Collections" description="Groups of pages that travel together.">
          <Button variant="brand">New collection</Button>
        </PageHeader>
        <PageToolbar left={<Badge>6 pages</Badge>} right={<Input placeholder="Search" className="w-48" />} />
        <TileGrid />

        <div className="h-12" />

        <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
          With PageCard — the same blocks, and a border that explains the indent
        </p>
        <PageCard>
          <PageHeader
            icon={GalleryHorizontalEnd}
            title="Collections"
            description="Groups of pages that travel together."
          >
            <Button variant="brand">New collection</Button>
          </PageHeader>
          <PageToolbar left={<Badge>6 pages</Badge>} right={<Input placeholder="Search" className="w-48" />} />
          <PageSection>
            <TileGrid />
          </PageSection>
        </PageCard>
      </div>
    </div>
  ),
};

/**
 * THE LENGTH TEST. Seven sections is what a Settings tab actually holds, and
 * this is the story that decides whether flattening survives contact with a
 * long route or whether Settings needs a card per tab instead.
 *
 * Read it for two things: whether the single border reads as a box that never
 * ends, and whether the hairlines give enough separation without the borders
 * the old cards had.
 */
export const SettingsLength: Story = {
  args: { children: null },
  render: () => (
    <PageCard>
      <PageHeader icon={Settings} title="Settings" description="Configure how your board behaves." />
      {[
        ["Instance name", "What this board calls itself on your network."],
        ["Appearance", "Theme, density and motion."],
        ["Language", "Interface language and region."],
        ["Time and date", "Clock format and time zone."],
        ["Location", "Used for weather, sunrise and sunset."],
        ["Accessibility", "Contrast, focus rings and announcements."],
        ["Animation", "Flap speed and transition style."],
      ].map(([title, description]) => (
        <PageSection key={title} title={title} description={description}>
          <Input placeholder={title} className="max-w-sm" />
        </PageSection>
      ))}
    </PageCard>
  ),
};

/**
 * THE ROUTE THAT PROMPTED THIS. The Transition Lab is two panels side by side,
 * which were two `Card`s inside a grid inside a route that also had a bare
 * heading above it — three surfaces deep, and the heading aligned to none of
 * them.
 *
 * As one section holding a two-column grid, the panels are divided by a
 * vertical rule instead of by two borders, and the heading is simply the block
 * above them.
 */
export const TransitionLab: Story = {
  args: { children: null },
  render: () => (
    <PageCard>
      <PageHeader
        icon={FlaskConical}
        title="Transition Lab"
        description="Preview a transition between two pages without touching the board."
      >
        <Badge variant="secondary">Beta</Badge>
      </PageHeader>
      <PageSection className="lg:divide-border grid gap-6 lg:grid-cols-[360px_1fr] lg:gap-0 lg:divide-x">
        <div className="space-y-4 lg:pr-6">
          <CardTitle size="base">Setup</CardTitle>
          <Input placeholder="Plugin" />
          <Input placeholder="From page" />
          <Input placeholder="To page" />
          <Button className="w-full">Run preview</Button>
        </div>
        <div className="space-y-4 lg:pl-6">
          <CardTitle size="base">Preview</CardTitle>
          <div className="text-muted-foreground rounded-lg border-2 border-dashed p-12 text-center text-sm">
            Run a preview to see frames here
          </div>
        </div>
      </PageSection>
    </PageCard>
  ),
};

/**
 * THE DISTINCTION, DRAWN. Both halves are inside the page card. The top half is
 * a SECTION — a region of the page, so it flattens to a divider. The bottom
 * half holds ITEMS — things you click to open, so they keep the borders that
 * are their click targets.
 *
 * Getting this backwards is visible either way: a flattened tile grid loses its
 * affordance, and a bordered section gives you card-in-card, which is the
 * double border this whole design exists to remove.
 */
export const SectionsFlattenItemsDoNot: Story = {
  args: { children: null },
  render: () => (
    <PageCard>
      <PageSection title="A section" description="Flattens — its border becomes the rule below it.">
        <span className="text-muted-foreground text-sm">
          Nothing here is separately clickable, so nothing here needs an edge of its own.
        </span>
      </PageSection>
      <PageSection title="Items" description="Keep their borders — the border is the click target.">
        <TileGrid />
      </PageSection>
      <PageSection title="What not to do" description="A content Card left inside the page card.">
        <Card>
          <CardHeader>
            <CardTitle size="base">Card in card</CardTitle>
            <CardDescription>Two borders 24px apart, which is the shape being removed.</CardDescription>
          </CardHeader>
          <CardContent>
            <span className="text-muted-foreground text-sm">Use a PageSection instead.</span>
          </CardContent>
        </Card>
      </PageSection>
    </PageCard>
  ),
};

/**
 * `fillHeight` — the schedule calendar's shape. The card is pinned to the
 * viewport and exactly one section scrolls inside it, so the header and toolbar
 * stay put while the long content moves.
 */
export const FillHeight: Story = {
  args: { children: null },
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="bg-background flex h-dvh flex-col p-6">
      <PageCard fillHeight>
        <PageHeader icon={Settings} title="Schedule" description="The header stays; the list below scrolls." />
        <PageToolbar right={<Button size="sm">New entry</Button>} />
        <PageSection fill>
          <div className="space-y-3">
            {Array.from({ length: 40 }, (_, i) => (
              <div key={i} className="border-border rounded-lg border p-3 text-sm">
                Entry {i + 1}
              </div>
            ))}
          </div>
        </PageSection>
      </PageCard>
    </div>
  ),
};
