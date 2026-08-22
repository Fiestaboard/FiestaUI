import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, FileText, GalleryHorizontalEnd, Home, Puzzle, Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../containment/card";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { PAGE_HUES, PageHeader, pageHue, PageIconGradientDefs } from "./page-header";
import { PageToolbar } from "./page-toolbar";

const meta = {
  title: "App/Chrome/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <>
        <PageIconGradientDefs />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    icon: Calendar,
    title: "Schedule",
    description: "Decide what your board shows and when.",
  },
};

export const WithActions: Story = {
  args: {
    icon: Puzzle,
    title: "Integrations",
    description: "Connect data sources to your board.",
    children: (
      <div className="mt-3">
        <Button variant="brand">Browse plugins</Button>
      </div>
    ),
  },
};

/**
 * Every primary route, with its ASSIGNED hue — the recommended pattern: walk
 * the nav in order and hand out PAGE_HUES, so all six are used exactly once.
 *
 * The bottom half is the same six routes falling back to `pageHue(title)`, and
 * it is in this story on purpose: three of them land on red, and green and
 * orange never appear. That is the birthday problem — six items into six
 * buckets — not a bad hash, and it is why assignment is the contract rather
 * than a nicety.
 *
 * What both halves share is that they are FIXED. Schedule is the same colour
 * on every machine, every session, every build. Picking randomly per
 * navigation would produce an identical spread of colour and none of the
 * recognition, and would read as a bug the second time you saw one page
 * wearing two different colours.
 */
export const EveryPage: Story = {
  args: { icon: Home, title: "Home", description: "Your board at a glance." },
  parameters: { layout: "fullscreen" },
  render: () => {
    const routes = [
      { icon: Home, title: "Home", description: "Your board at a glance." },
      { icon: FileText, title: "Pages", description: "Everything you have composed." },
      { icon: GalleryHorizontalEnd, title: "Collections", description: "Groups of pages that travel together." },
      { icon: Calendar, title: "Schedule", description: "Decide what your board shows and when." },
      { icon: Puzzle, title: "Integrations", description: "Connect data sources to your board." },
      { icon: Settings, title: "Settings", description: "Configure your FiestaBoard service." },
    ];
    return (
      <div className="bg-background min-h-dvh space-y-10 p-8">
        <div>
          <p className="text-muted-foreground mb-6 font-mono text-xs tracking-widest uppercase">
            Assigned in nav order — all six hues, each used once
          </p>
          <div className="space-y-8">
            {routes.map((r, i) => (
              <div key={r.title}>
                <PageHeader {...r} hue={PAGE_HUES[i % PAGE_HUES.length]} />
                <p className="text-muted-foreground -mt-4 font-mono text-xs">
                  hue=&quot;{PAGE_HUES[i % PAGE_HUES.length]}&quot;
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="border-border border-t pt-8">
          <p className="text-muted-foreground mb-6 font-mono text-xs tracking-widest uppercase">
            Hashed fallback — three reds, no green, no orange
          </p>
          <div className="space-y-8">
            {routes.map((r) => (
              <div key={r.title}>
                <PageHeader {...r} />
                <p className="text-muted-foreground -mt-4 font-mono text-xs">
                  pageHue({JSON.stringify(r.title)}) = {pageHue(r.title)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
};

/**
 * THE ALIGNMENT CONTRACT, and the reason PageHeader carries `pl-6` of its own.
 *
 * A route is a header followed by cards, all of them direct children of the
 * same `PageLayout` container. That container's gutter puts each card's
 * BORDER on it — but a card's own `px-6` puts each card's WORDS 24px further
 * in. So a header with no padding of its own lines its H1 up with a hairline
 * while every other line of text on the page sits on a different vertical,
 * and the route reads as having two competing left edges.
 *
 * TWO RULES ARE DRAWN, one per column, and everything meets one of them.
 *
 * - The RED rule is the CONTENT column: the gutter plus 24. The page title
 *   and description, the header's action, the toolbar's field, and both card
 *   titles and bodies all start here.
 * - The BLUE rule is the CHROME column: the gutter itself. Only borders live
 *   on it — the toolbar's and both cards'.
 *
 * The toolbar being a card is what makes this work. As a bare transparent row
 * its field ran to the blue rule while the title sat on the red one, which is
 * the misalignment this pair of changes exists to remove.
 *
 * Check both at BOTH viewports: the container's gutter steps 16 → 24 at md,
 * but `Card`'s padding is a constant 24, so the inset is the same at either
 * size.
 */
export const AlignsWithCardContent: Story = {
  args: {
    icon: Settings,
    title: "Integrations",
    description: "Enable and configure data source plugins for your FiestaBoard.",
  },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div className="bg-background min-h-dvh py-8">
      {/* Mirrors PageLayout's own container gutter — the cards sit on it. */}
      <div className="relative container mx-auto max-w-full px-4 md:px-6">
        {/* Content column: the gutter, plus the 24 that Card and PageToolbar
            both pad by. Every word and every control starts here. */}
        <div className="bg-hue-red pointer-events-none absolute inset-y-0 left-10 w-px opacity-60 md:left-12" />
        {/* Chrome column: the gutter itself. Only borders sit on it. */}
        <div className="bg-hue-blue pointer-events-none absolute inset-y-0 right-4 w-px opacity-60 md:right-6" />
        <PageHeader {...args}>
          <Button variant="outline">Check for updates</Button>
        </PageHeader>
        {/* The real Integrations shape — a tab strip and a field that takes the
            rest — not a right-slot input, which would right-align the field and
            leave nothing of the toolbar on the content column to check. */}
        <PageToolbar>
          <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
            <div className="flex items-center gap-1">
              <Badge>Installed</Badge>
              <Badge variant="secondary">Marketplace</Badge>
            </div>
            <Input placeholder="Search installed plugins…" />
          </div>
        </PageToolbar>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Instance name</CardTitle>
              <CardDescription>Name the FiestaBoard device that controls your boards.</CardDescription>
            </CardHeader>
            <CardContent>
              <Input placeholder="e.g. Living Room Pi" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
              <CardDescription>Choose how FiestaBoard looks.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline">System</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  ),
};
