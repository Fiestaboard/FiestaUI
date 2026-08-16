import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, GalleryHorizontalEnd, Home, Puzzle, Settings, FileText } from "lucide-react";

import { Button } from "../forms/button";
import { PAGE_HUES, PageHeader, PageIconGradientDefs, pageHue } from "./page-header";

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
