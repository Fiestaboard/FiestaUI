import type { Meta, StoryObj } from "@storybook/react";
import { Monitor, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "../forms/button";
import { PageCard, PageSection } from "./page-card";
import { PageHeader } from "./page-header";
import { PageSubheader, type PageSubheaderDetail } from "./page-subheader";

const meta = {
  title: "App/Chrome/PageSubheader",
  component: PageSubheader,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    detail: {
      description: "The item the route drilled into, or null at the section's own list. Null collapses, not unmounts.",
      control: false,
    },
    renderLink: { control: false },
    className: { control: false },
  },
} satisfies Meta<typeof PageSubheader>;

export default meta;
type Story = StoryObj<typeof meta>;

const LIVING_ROOM: PageSubheaderDetail = {
  id: "living-room",
  title: "Living Room",
  description: "Vestaboard · Flagship",
  crumbs: [{ label: "Displays", href: "#displays" }],
  action: (
    <Button variant="outline" size="sm">
      <Trash2 aria-hidden="true" />
      Remove
    </Button>
  ),
};

/** The shape it ships in: under a section header, inside the route's card. */
function InCard({ detail, layout }: { detail: PageSubheaderDetail | null; layout?: "stacked" | "inline" }) {
  return (
    <PageCard>
      <PageHeader
        icon={Monitor}
        hue="orange"
        title="Displays"
        description="Every board and screen FiestaBoard shows on."
        collapsed={detail != null}
      >
        <Button>Add display</Button>
      </PageHeader>
      <PageSubheader detail={detail} breadcrumbLabel="Breadcrumb" layout={layout} />
      <PageSection title="What it shows now">
        <div className="bg-muted h-32 rounded-lg" />
      </PageSection>
    </PageCard>
  );
}

export const Open: Story = {
  args: { detail: LIVING_ROOM, breadcrumbLabel: "Breadcrumb" },
  render: (args) => <InCard detail={args.detail} />,
};

/** At the hub the block takes no space and leaves no rule behind. */
export const Closed: Story = {
  args: { detail: null, breadcrumbLabel: "Breadcrumb" },
  render: (args) => <InCard detail={args.detail} />,
};

/** A name long enough to wrap at 390px — it must wrap, never scroll sideways. */
export const LongTitle: Story = {
  args: {
    breadcrumbLabel: "Breadcrumb",
    detail: {
      ...LIVING_ROOM,
      title: "The extremely long upstairs hallway Vestaboard by the guest bedroom",
    },
  },
  render: (args) => <InCard detail={args.detail} />,
};

/** Toggle to watch the header tuck away and the sub-header expand together. */
export const Interactive: Story = {
  args: { detail: null, breadcrumbLabel: "Breadcrumb" },
  render: function Render() {
    const [open, setOpen] = useState(false);
    return (
      <div className="space-y-4">
        <Button variant="outline" onClick={() => setOpen(!open)}>
          {open ? "Back to the list" : "Open Living Room"}
        </Button>
        <InCard detail={open ? LIVING_ROOM : null} />
      </div>
    );
  },
};

/** One row: the h2 is the breadcrumb's current entry. */
export const Inline: Story = {
  args: { detail: LIVING_ROOM, breadcrumbLabel: "Breadcrumb", layout: "inline" },
  render: (args) => <InCard detail={args.detail} layout={args.layout} />,
};
