import type { Meta, StoryObj } from "@storybook/react";
import { BookOpen, Component, Palette, Puzzle } from "lucide-react";

import {
  NavList,
  NavListItem,
  NavListLink,
  NavListSection,
  NavListSectionContent,
  NavListSectionTrigger,
} from "./nav-list";

const meta = {
  title: "App/Chrome/NavList",
  component: NavList,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    children: {
      control: false,
      description:
        "`NavListItem` rows and `NavListSection` groups. The list renders no landmark of its own — wrap it in " +
        "your own `<nav aria-label={…}>`, because every consumer of this already sits inside one.",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
} satisfies Meta<typeof NavList>;

export default meta;
type Story = StoryObj<typeof meta>;

// One width for every demo, so the rows wrap and truncate the way they will in
// a real 240px rail rather than shrink-wrapping their labels.
const DEMO_WIDTH = "w-[240px]";

/**
 * The docs sidebar's shape: flat rows, one section expanded around the current
 * page and one left closed. The current row is the only one carrying
 * `aria-current="page"` — the state a screen-reader user actually hears, and
 * the one the existing Sidebar rail never sets.
 */
export const Default: Story = {
  render: (args) => (
    <nav aria-label="Documentation" className={DEMO_WIDTH}>
      <NavList {...args}>
        <NavListItem>
          <NavListLink href="#getting-started">Getting started</NavListLink>
        </NavListItem>
        <NavListItem>
          <NavListLink href="#installation">Installation</NavListLink>
        </NavListItem>
        <NavListSection defaultOpen>
          <NavListSectionTrigger>Components</NavListSectionTrigger>
          <NavListSectionContent>
            <NavListItem>
              <NavListLink href="#button">Button</NavListLink>
            </NavListItem>
            <NavListItem>
              <NavListLink href="#nav-list" active>
                NavList
              </NavListLink>
            </NavListItem>
            <NavListItem>
              <NavListLink href="#toggle">Toggle</NavListLink>
            </NavListItem>
          </NavListSectionContent>
        </NavListSection>
        <NavListSection>
          <NavListSectionTrigger>Recipes</NavListSectionTrigger>
          <NavListSectionContent>
            <NavListItem>
              <NavListLink href="#theming">Theming</NavListLink>
            </NavListItem>
          </NavListSectionContent>
        </NavListSection>
        <NavListItem>
          <NavListLink href="#changelog">Changelog</NavListLink>
        </NavListItem>
      </NavList>
    </nav>
  ),
};

/**
 * Leading icons, sized by the row rather than by each call site (`[&>svg]:size-4`),
 * so an icon row and a text-only row keep the same height and the same left
 * edge. This is the composition the app rail renders today with hardcoded
 * class constants.
 */
export const WithIcons: Story = {
  render: (args) => (
    <nav aria-label="Application" className={DEMO_WIDTH}>
      <NavList {...args}>
        <NavListItem>
          <NavListLink href="#overview" active>
            <BookOpen />
            Overview
          </NavListLink>
        </NavListItem>
        <NavListItem>
          <NavListLink href="#plugins">
            <Puzzle />
            Plugins
          </NavListLink>
        </NavListItem>
        <NavListSection defaultOpen>
          <NavListSectionTrigger>
            <Component />
            Boards
          </NavListSectionTrigger>
          <NavListSectionContent>
            <NavListItem>
              <NavListLink href="#kitchen">Kitchen</NavListLink>
            </NavListItem>
            <NavListItem>
              <NavListLink href="#lobby">Lobby</NavListLink>
            </NavListItem>
          </NavListSectionContent>
        </NavListSection>
        <NavListItem>
          <NavListLink href="#appearance">
            <Palette />
            Appearance
          </NavListLink>
        </NavListItem>
      </NavList>
    </nav>
  ),
};

/**
 * A table of contents, the second consumer. Two differences from a sidebar and
 * both are props, not a fork: `current="location"` (an in-page anchor is a
 * position on the page you are already on, not another page), and a `className`
 * that trims the row to TOC density — the reason there is no `size` axis.
 */
export const TableOfContents: Story = {
  render: (args) => (
    <nav aria-label="On this page" className={DEMO_WIDTH}>
      <NavList {...args}>
        <NavListItem>
          <NavListLink href="#why" className="min-h-8 py-1.5 font-normal">
            Why this exists
          </NavListLink>
        </NavListItem>
        <NavListItem>
          <NavListLink href="#anatomy" className="min-h-8 py-1.5 font-normal" active current="location">
            Anatomy
          </NavListLink>
        </NavListItem>
        <NavListItem>
          <NavListLink href="#accessibility" className="min-h-8 py-1.5 font-normal">
            Accessibility
          </NavListLink>
        </NavListItem>
      </NavList>
    </nav>
  ),
};

/**
 * The rail surface. Nothing about the rows changes — `.nav-active` and
 * `.nav-active-hover` mix the LOCAL foreground, and `.sidebar-gradient`
 * re-declares that from `--sidebar-foreground`, so the same markup inverts its
 * pill and re-tunes its hover for the rail without a `variant` prop.
 */
export const OnTheRail: Story = {
  render: (args) => (
    <nav aria-label="Rail" className="sidebar-gradient w-[248px] p-3">
      <NavList {...args}>
        <NavListItem>
          <NavListLink href="#boards" active>
            <Component />
            Boards
          </NavListLink>
        </NavListItem>
        <NavListItem>
          <NavListLink href="#plugins">
            <Puzzle />
            Plugins
          </NavListLink>
        </NavListItem>
        <NavListSection defaultOpen>
          <NavListSectionTrigger>Settings</NavListSectionTrigger>
          <NavListSectionContent>
            <NavListItem>
              <NavListLink href="#appearance">Appearance</NavListLink>
            </NavListItem>
            <NavListItem>
              <NavListLink href="#members">Members</NavListLink>
            </NavListItem>
          </NavListSectionContent>
        </NavListSection>
      </NavList>
    </nav>
  ),
};

/**
 * `asChild` hands the row's classes and its `aria-current` to the caller's own
 * element — a router Link, here stood in for by an anchor carrying its own
 * attributes. Same mechanics as BreadcrumbLink: there is no `href`-only path
 * that would full-page-reload inside an SPA.
 */
export const RouterLinks: Story = {
  render: (args) => (
    <nav aria-label="Router" className={DEMO_WIDTH}>
      <NavList {...args}>
        <NavListItem>
          <NavListLink asChild active>
            <a href="#dashboard" data-router="view-transition">
              Dashboard
            </a>
          </NavListLink>
        </NavListItem>
        <NavListItem>
          <NavListLink asChild>
            <a href="#reports" data-router="view-transition">
              Reports
            </a>
          </NavListLink>
        </NavListItem>
      </NavList>
    </nav>
  ),
};

/**
 * Hostile content: a label with no spaces, and a section two levels deep. The
 * row truncates instead of widening the rail, and the nested sublist keeps its
 * own indent guide so depth stays readable rather than becoming an ever-growing
 * left margin.
 */
export const DeepAndTruncated: Story = {
  render: (args) => (
    <nav aria-label="Deep" className={DEMO_WIDTH}>
      <NavList {...args}>
        <NavListSection defaultOpen>
          <NavListSectionTrigger className="min-w-0">
            <span className="truncate">Configuration</span>
          </NavListSectionTrigger>
          <NavListSectionContent>
            <NavListItem>
              <NavListLink href="#env" className="min-w-0">
                <span className="truncate">FIESTABOARD_TEMPLATE_RENDERER_TIMEOUT_MS</span>
              </NavListLink>
            </NavListItem>
            <NavListSection defaultOpen>
              <NavListSectionTrigger>Advanced</NavListSectionTrigger>
              <NavListSectionContent>
                <NavListItem>
                  <NavListLink href="#flags" active>
                    Feature flags
                  </NavListLink>
                </NavListItem>
              </NavListSectionContent>
            </NavListSection>
          </NavListSectionContent>
        </NavListSection>
      </NavList>
    </nav>
  ),
};
