import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, FileText, GalleryHorizontalEnd, Home, Puzzle, Settings } from "lucide-react";
import { useState } from "react";

import { PRIDE_SEASON, type Season } from "../../lib/seasons";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { BoardSelector } from "./board-selector";
import { MainContent } from "./main-content";
import { PageHeader, PageIconGradientDefs } from "./page-header";
import { PageLayout } from "./page-layout";
import { PageToolbar } from "./page-toolbar";
import { Sidebar, type SidebarNavItem, type SidebarProps } from "./sidebar";
import { SkipToContent } from "./skip-to-content";
import { ThemeToggle } from "./theme-toggle";

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
      <PageIconGradientDefs />
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
          <PageHeader icon={Home} title="Home" description="Your board at a glance." />
          <PageToolbar left={<Badge>2 boards</Badge>} right={<Button variant="brand">New page</Button>} />
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
  title: "Chrome/AppShell",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => <AppShellDemo />,
};

export const Collapsed: Story = {
  render: () => <AppShellDemo initialCollapsed />,
};

/**
 * The shell during a festive season: the sidebar renders its aurora and
 * the logo becomes a celebration button — no extra wiring needed beyond
 * passing the season to the Sidebar.
 */
export const PrideSeason: Story = {
  render: () => <AppShellDemo season={PRIDE_SEASON} />,
};
