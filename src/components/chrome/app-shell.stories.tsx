import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, FileText, GalleryHorizontalEnd, Home, Puzzle, Settings } from "lucide-react";
import { useState } from "react";

import { type Season } from "../../lib/seasons";
import { ALL_SEASONS } from "../../lib/seasons-drafts";
import { Card, CardContent, CardHeader, CardTitle } from "../containment/card";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { BoardSelector } from "./board-selector";
import { MainContent } from "./main-content";
import { PAGE_HUES, PageHeader } from "./page-header";
import { PageLayout } from "./page-layout";
import { PageToolbar } from "./page-toolbar";
import { Sidebar, type SidebarNavItem, type SidebarProps } from "./sidebar";
import { SkipToContent } from "./skip-to-content";
import { ThemeToggle } from "./theme-toggle";

// Seasons come from the Season toolbar decorator: it stamps the CSS class,
// and stories resolve the same global into the Sidebar's season prop so the
// aurora only appears while a season is active in the toolbar.
function toolbarSeason(globals: Record<string, unknown>): Season | null {
  return ALL_SEASONS.find((s) => s.id === globals.season) ?? null;
}

const LABELS = {
  mainNavigation: "Main navigation",
  primaryNavigation: "Primary navigation",
  secondaryNavigation: "Secondary navigation",
  navigationMenu: "Navigation menu",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  expandSidebar: "Expand sidebar",
  collapseSidebar: "Collapse sidebar",
  aiAssistant: "AI Assistant",
  logoButtonAriaLabel: "Celebrate the season",
};

const renderLink: SidebarProps["renderLink"] = ({ children, ...props }) => <a {...props}>{children}</a>;

/**
 * The whole FiestaBoard look and feel in one story: sidebar chrome +
 * main-content layout + page scaffolding, all from @fiestaboard/ui.
 */
function AppShellDemo({
  season = null,
  initialCollapsed = false,
}: {
  season?: Season | null;
  initialCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [board, setBoard] = useState("board-1");

  const boards = [
    { id: "board-1", name: "Living Room" },
    { id: "board-2", name: "Kitchen" },
  ];
  const boardSelectorProps = {
    boards,
    value: board,
    onChange: setBoard,
    labels: { boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" },
  };

  const primary: SidebarNavItem[] = [
    { key: "home", href: "#", icon: Home, label: "Home", active: true },
    { key: "pages", href: "#pages", icon: FileText, label: "Pages" },
    { key: "collections", href: "#collections", icon: GalleryHorizontalEnd, label: "Collections" },
    { key: "schedule", href: "#schedule", icon: Calendar, label: "Schedule" },
    { key: "integrations", href: "#integrations", icon: Puzzle, label: "Integrations" },
  ];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <SkipToContent label="Skip to main content" />
      <Sidebar
        labels={LABELS}
        primaryItems={primary}
        secondaryItems={[{ key: "settings", href: "#settings", icon: Settings, label: "Settings" }]}
        renderLink={renderLink}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        maxWidth={1680}
        sidebarInset={12}
        season={season}
        onLogoClick={season ? () => {} : undefined}
        boardSelector={<BoardSelector {...boardSelectorProps} collapsed={collapsed} />}
        mobileBoardSelector={<BoardSelector {...boardSelectorProps} variant="mobileHeader" />}
        versionSlot={<span className="text-xs text-sidebar-foreground/70">v9.0.0</span>}
        themeToggleSlot={
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
            label="Toggle theme"
          />
        }
      />
      <MainContent collapsed={collapsed} maxWidth={1680}>
        <PageLayout>
          {/* hue is ASSIGNED from nav order, not hashed: Home is the first
              primary route, so it takes the first of the six board hues and
              every other route takes the next. See PageHeader/EveryPage for
              what a hash does with six routes instead. */}
          <PageHeader icon={Home} title="Home" description="Your board at a glance." hue={PAGE_HUES[0]} />
          {/* The count is `secondary`, not the default brand fill. A metadata
              badge and the page's primary action are not peers, and rendering
              both in the one brand pigment put two saturated orange objects at
              opposite ends of an otherwise empty row with no hierarchy between
              them. */}
          <PageToolbar
            left={<Badge variant="secondary">2 boards</Badge>}
            right={<Button variant="brand">New page</Button>}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Active page</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                Morning briefing — showing until 9:00.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Up next</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">Transit times at 9:00.</CardContent>
            </Card>
          </div>
        </PageLayout>
      </MainContent>
    </div>
  );
}

const meta = {
  title: "App/Chrome/AppShell",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (_, { globals }) => <AppShellDemo season={toolbarSeason(globals)} />,
};

export const Collapsed: Story = {
  render: (_, { globals }) => <AppShellDemo initialCollapsed season={toolbarSeason(globals)} />,
};
