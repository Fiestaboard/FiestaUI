import type { Meta, StoryObj } from "@storybook/react";
import { ArrowDownToLine, CalendarDays, CheckCircle, GripVertical, TrainFront, Tv } from "lucide-react";
import { expect } from "storybook/test";

import { BoardIcon } from "../chrome/board-icon";
import { Card } from "../containment/card";
import { Badge } from "../feedback/badge";
import { Chip } from "../feedback/chip";
import { Button } from "../forms/button";
import { PluginCard, type PluginInstallState } from "./plugin-card";

const meta = {
  title: "App/Plugin/PluginCard",
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
    code62Glyph: {
      control: "select",
      options: ["degree", "heart"],
      description:
        "Which glyph the viewer's board draws for code 62. Vestaboard replaced the Flagship's degree flap with a heart on units built from 2026 and nothing queryable tells them apart, so the consumer passes what the owner reported. Defaults to `degree`.",
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
    <div className="w-full sm:w-[340px]">
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
    <div className="w-full sm:w-[340px]">
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
    <div className="w-full sm:w-[340px]">
      <PluginCard {...args} />
    </div>
  ),
};

/** A plugin that hasn't declared a teaser yet renders without the footer band. */
export const NoTeaser: Story = {
  args: { ...base, teaser: undefined },
  render: (args) => (
    <div className="w-full sm:w-[340px]">
      <PluginCard {...args} />
    </div>
  ),
};

export const Grid: Story = {
  args: base,
  render: (args) => (
    <div className="grid w-full sm:w-[720px] grid-cols-2 gap-6">
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

/* ------------------------------------------------------------------ *
 * variant="compact" — 08 C25 (`65:30673`); 06 Marketplace `42:89748`.
 * ------------------------------------------------------------------ */

/**
 * Stand-in for DisplayTypeChip (slice 1.5c, not on alpha yet): an
 * informational mono Chip. Swap for `<DisplayTypeChip type=…>` when it lands.
 */
function WorksWith({ types }: { types: { label: string; icon: React.ReactNode }[] }) {
  return (
    <>
      {types.map(({ label, icon }) => (
        <Chip key={label} mono asChild>
          <span>
            {icon}
            {label}
          </span>
        </Chip>
      ))}
    </>
  );
}

const ALL_TYPES = [
  { label: "FLAGSHIP · 22×6", icon: <BoardIcon /> },
  { label: "NOTE · 15×3", icon: <BoardIcon /> },
  { label: "PIXOO · 64×64", icon: <GripVertical /> },
  { label: "TC001 · 32×8", icon: <GripVertical /> },
  { label: "FIESTAPANEL TV", icon: <Tv /> },
];

const compactBase = {
  ...base,
  variant: "compact" as const,
  name: "Muni Transit",
  description: undefined,
  authorLabel: "by FiestaBoard · Official",
  category: "transit",
  categoryLabel: "Transit",
  teaser: undefined,
  icon: <TrainFront />,
};

/** The Marketplace result row (06 `42:89748`): icon tile, name + category, author, Install, works-with chips. */
export const Compact: Story = {
  args: { ...compactBase, installState: "available", displayTypes: <WorksWith types={ALL_TYPES} /> },
  render: (args) => (
    <Card className="w-full gap-0 overflow-hidden py-0 sm:w-[370px]">
      <PluginCard {...args} />
    </Card>
  ),
};

const STATES: { state: PluginInstallState; name: string; author: string; category: string; label: string }[] = [
  {
    state: "available",
    name: "Muni Transit",
    author: "by FiestaBoard · Official",
    category: "transit",
    label: "Transit",
  },
  {
    state: "installing",
    name: "BART Departures",
    author: "by @kpark · Community",
    category: "transit",
    label: "Transit",
  },
  { state: "installed", name: "Weather", author: "by FiestaBoard · Official", category: "weather", label: "Weather" },
  {
    state: "needs-setup",
    name: "Google Calendar",
    author: "by FiestaBoard · Official",
    category: "utility",
    label: "Utility",
  },
  { state: "update", name: "Stocks", author: "by @mtran · Community", category: "data", label: "Data" },
];

/**
 * Marketplace results in every install state: Install, Installing…,
 * Installed, Set up (installed, still needs its settings) and Update. The 06
 * Installed screen (`42:89411`) is a ListRow list in web slice 2.14, not this
 * card (DD-W12).
 */
export const CompactInstallStates: Story = {
  args: compactBase,
  render: (args) => (
    <Card className="w-full gap-0 divide-y overflow-hidden py-0 sm:w-[370px]">
      {STATES.map((row) => (
        <PluginCard
          key={row.state}
          {...args}
          name={row.name}
          authorLabel={row.author}
          category={row.category}
          categoryLabel={row.label}
          icon={row.category === "utility" ? <CalendarDays /> : <TrainFront />}
          installState={row.state}
        />
      ))}
    </Card>
  ),
  // Pins R-M1 (#392 re-review): the busy button is exactly as wide as the
  // idle "Install" (no reflow) and both match 06 42:89748's 72px button.
  play: async ({ canvasElement }) => {
    const width = (state: string) =>
      canvasElement
        .querySelector<HTMLElement>(`[data-slot="plugin-card-install"][data-state="${state}"]`)
        ?.getBoundingClientRect().width ?? 0;
    const idle = width("available");
    await expect(Math.abs(width("installing") - idle)).toBeLessThan(0.5);
    await expect(Math.abs(idle - 72)).toBeLessThanOrEqual(4);
  },
};

/** A long name wraps the category badge under it (06 "BART Departures"). */
export const CompactLongName: Story = {
  args: {
    ...compactBase,
    name: "BART Departures and Delays",
    authorLabel: "by @kpark · Community",
    installState: "available",
    displayTypes: <WorksWith types={ALL_TYPES.slice(0, 3)} />,
  },
  render: Compact.render,
};
