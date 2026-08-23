import type { Meta, StoryObj } from "@storybook/react";
import { FileText } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "../containment/card";
import { Tabs, TabsList, TabsTrigger } from "../containment/tabs";
import { Button } from "../forms/button";
import { PageHeader } from "./page-header";
import { PageInset } from "./page-inset";
import { PageToolbar } from "./page-toolbar";

const meta = {
  title: "App/Chrome/PageInset",
  component: PageInset,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    children: {
      description: "Bare body content — a tab strip, a caption, an unadorned paragraph. Never a card.",
      control: false,
    },
    className: { control: false },
  },
} satisfies Meta<typeof PageInset>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A device tab strip, the case this component was added for. */
export const Default: Story = {
  args: {
    children: (
      <Tabs defaultValue="flagship">
        <TabsList>
          <TabsTrigger value="flagship">Flagship</TabsTrigger>
          <TabsTrigger value="note">Note</TabsTrigger>
        </TabsList>
      </Tabs>
    ),
  },
};

/**
 * A grid of page tiles, standing in for the real Pages route. Squat rather
 * than the route's true `aspect-[9/16]`, so the shot is about where the edges
 * land and not about four tall empty rectangles.
 */
function TileGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {["Morning", "Grocery list", "Weather", "Guest wifi"].map((name) => (
        <div key={name} className="flex h-24 flex-col justify-end rounded-xl border-2 border-border p-4">
          <span className="truncate text-sm font-medium">{name}</span>
        </div>
      ))}
    </div>
  );
}

/** Labels a half of the comparison, and doubles as a card to check against. */
function Half({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-muted-foreground text-sm">{children}</span>
      </CardContent>
    </Card>
  );
}

/**
 * THE RULE, DRAWN. Same two rules as `PageHeader`'s `AlignsWithCardContent`
 * story, and the same reason for both: a route has one column for words and
 * one for chrome, and every direct child of `PageLayout` belongs to exactly
 * one of them.
 *
 * - The RED rule is the CONTENT column — the gutter plus 24. The page title,
 *   the toolbar's controls, the tab strip and each card's own words all start
 *   here.
 * - The BLUE rule is the gutter. Only a SURFACE'S EDGE should reach it: a
 *   card's border, or a tile's.
 *
 * The top half is the route WITHOUT `PageInset` — the shape that shipped when
 * `PageHeader` and `PageToolbar` moved onto the content column and tab strips
 * did not follow. The strip crosses back out to the blue rule and reads as
 * outdented against the toolbar one row above it, which is the regression this
 * shot exists to catch.
 *
 * The bottom half is the same route WITH it. Note what does NOT move: the
 * tiles stay on the gutter in both halves, because a tile draws a border and
 * a border is chrome. Wrapping those too would indent them past every card on
 * every other route.
 *
 * Check at BOTH viewports — the container's gutter steps 16 → 24 at md while
 * the inset stays a constant 24, so the two rules move together but the gap
 * between them does not change.
 */
export const TheRuleItDraws: Story = {
  args: { children: null },
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="bg-background min-h-dvh py-8">
      {/* Mirrors PageLayout's own container gutter — the cards sit on it. */}
      <div className="relative container mx-auto max-w-full px-4 md:px-6">
        {/* Content column: the gutter, plus the 24 that Card, PageHeader,
            PageToolbar and PageInset all pad by. */}
        <div className="bg-hue-red pointer-events-none absolute inset-y-0 left-10 w-px opacity-60 md:left-12" />
        {/* The gutter itself. Only a surface's edge should reach it. */}
        <div className="bg-hue-blue pointer-events-none absolute inset-y-0 left-4 w-px opacity-60 md:left-6" />

        <PageHeader icon={FileText} title="Pages" description="Everything you have composed.">
          <Button variant="brand">New page</Button>
        </PageHeader>
        <PageToolbar left={<Button variant="outline">Grid</Button>} right={<Button variant="outline">Import</Button>} />

        {/* WITHOUT — the strip runs back out to the blue rule. */}
        <Half title="Without PageInset">
          The strip below starts on the blue rule — 24px outboard of this card&rsquo;s words, of the toolbar above it
          and of the page title. That is the regression.
        </Half>
        <Tabs defaultValue="flagship">
          <TabsList className="mb-5">
            <TabsTrigger value="flagship">Flagship</TabsTrigger>
            <TabsTrigger value="note">Note</TabsTrigger>
          </TabsList>
        </Tabs>
        <TileGrid />

        <div className="h-10" />

        {/* WITH — the strip joins the toolbar and the card titles. */}
        <Half title="With PageInset">
          The strip below starts on the red rule, with this card&rsquo;s words. The tiles under it have not moved —
          their border is chrome, so it stays on the blue rule.
        </Half>
        <PageInset>
          <Tabs defaultValue="flagship">
            <TabsList className="mb-5">
              <TabsTrigger value="flagship">Flagship</TabsTrigger>
              <TabsTrigger value="note">Note</TabsTrigger>
            </TabsList>
          </Tabs>
        </PageInset>
        <TileGrid />
      </div>
    </div>
  ),
};
