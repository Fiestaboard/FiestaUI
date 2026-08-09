import type { Meta, StoryObj } from "@storybook/react";
import { ArrowDownToLine, CheckCircle } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { PluginCard } from "./plugin-card";

const meta = {
  title: "Plugin/PluginCard",
  component: PluginCard,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    teaser: {
      control: "text",
      description: "Literal board line, at most 15 tiles; omit to hide the footer",
    },
    boardType: {
      control: "select",
      options: ["black", "white"],
    },
    category: {
      control: "select",
      options: ["art", "data", "entertainment", "home", "transit", "utility", "weather"],
    },
  },
} satisfies Meta<typeof PluginCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const base = {
  name: "Air Quality & Fog",
  description: "Display air quality (AQI), fog/visibility conditions, and pollen/allergen levels.",
  authorLabel: "by FiestaBoard Team",
  category: "weather",
  categoryLabel: "Weather & Environment",
  teaser: "{66}AQI 45 CLEAR",
  renderLink: ({ className, children }: { className: string; children: React.ReactNode }) => (
    <a href="#air-fog" className={className}>
      {children}
    </a>
  ),
};

/** The docs plugin directory: no action slot, the whole card is the link. */
export const Default: Story = {
  args: base,
  render: (args) => (
    <div className="w-[340px]">
      <PluginCard {...args} />
    </div>
  ),
};

/** The FiestaBoard marketplace: an Install button rides above the stretched link. */
export const WithInstallAction: Story = {
  args: {
    ...base,
    action: (
      <Button size="sm" variant="outline" className="h-8 text-xs">
        <ArrowDownToLine className="mr-1 h-3 w-3" />
        Install
      </Button>
    ),
  },
  render: (args) => (
    <div className="w-[340px]">
      <PluginCard {...args} />
    </div>
  ),
};

export const Installed: Story = {
  args: {
    ...base,
    action: (
      <Badge variant="secondary" className="gap-1 text-xs">
        <CheckCircle className="h-3 w-3" />
        Installed
      </Badge>
    ),
  },
  render: (args) => (
    <div className="w-[340px]">
      <PluginCard {...args} />
    </div>
  ),
};

/** A plugin that hasn't declared a teaser yet renders without the footer band. */
export const NoTeaser: Story = {
  args: { ...base, teaser: undefined },
  render: (args) => (
    <div className="w-[340px]">
      <PluginCard {...args} />
    </div>
  ),
};

export const Grid: Story = {
  args: base,
  render: (args) => (
    <div className="grid w-[720px] grid-cols-2 gap-6">
      <PluginCard {...args} />
      <PluginCard
        {...args}
        name="Muni Departures"
        description="Live SFMTA arrival predictions for your nearest stops."
        category="transit"
        categoryLabel="Transportation"
        teaser="N JUDAH {66}4 MIN"
      />
      <PluginCard
        {...args}
        name="Stocks"
        description="Track tickers with change, percent, and market-state colouring."
        category="data"
        categoryLabel="Data & Information"
        teaser="{65}AAPL +1.88%"
      />
      <PluginCard
        {...args}
        name="Sun Art"
        description="A generated sunrise and sunset scene rendered in split-flap colour."
        category="art"
        categoryLabel="Display Art"
        teaser="{63}{64}{65}{66}{67}{68}"
      />
    </div>
  ),
};
