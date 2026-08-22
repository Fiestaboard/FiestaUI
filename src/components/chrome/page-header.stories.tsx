import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, FileText, GalleryHorizontalEnd, Home, Puzzle, Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../containment/card";
import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { PAGE_HUES, PageHeader, pageHue, PageIconGradientDefs } from "./page-header";

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
 * TWO RULES ARE DRAWN, and they are deliberately not symmetric.
 *
 * - The LEFT rule is the card's content edge. The page title, both card
 *   titles and both card bodies meet it; nothing sits to its left but the
 *   cards' own borders.
 * - The RIGHT rule is the container gutter — the cards' edge. The header's
 *   action meets it, and so does the toolbar's field below, because both are
 *   controls and controls run to the gutter. Padding the header's right side
 *   too would pull the action 24px inboard of that field and trade a
 *   left-edge fix for a right-edge break.
 *
 * Check both at BOTH viewports: the container's gutter steps 16 → 24 at md,
 * but `Card`'s padding is a constant 24, so the inset the header adds is the
 * same at either size.
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
        {/* Left: the card's content edge — that gutter, plus Card's px-6. */}
        <div className="bg-hue-red pointer-events-none absolute inset-y-0 left-10 w-px opacity-60 md:left-12" />
        {/* Right: the gutter itself, where every control's edge lands. */}
        <div className="bg-hue-blue pointer-events-none absolute inset-y-0 right-4 w-px opacity-60 md:right-6" />
        <PageHeader {...args}>
          <Button variant="outline">Check for updates</Button>
        </PageHeader>
        <div className="mb-4">
          <Input placeholder="Search installed plugins…" />
        </div>
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
