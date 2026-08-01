import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, FileText, GalleryHorizontalEnd, HelpCircle, Home, Puzzle, Settings } from "lucide-react";
import { useState } from "react";

import { BoardSelector } from "./board-selector";
import { Sidebar, type SidebarNavItem, type SidebarProps } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

const TACO_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="26" font-size="26">🌮</text></svg>`,
  );

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
};

const PRIMARY: SidebarNavItem[] = [
  { key: "home", href: "#", icon: Home, label: "Home", active: true },
  { key: "pages", href: "#pages", icon: FileText, label: "Pages" },
  { key: "collections", href: "#collections", icon: GalleryHorizontalEnd, label: "Collections" },
  { key: "schedule", href: "#schedule", icon: Calendar, label: "Schedule" },
  { key: "integrations", href: "#integrations", icon: Puzzle, label: "Integrations" },
];

const SECONDARY: SidebarNavItem[] = [
  {
    key: "helpDocs",
    href: "https://fiestaboard.app/docs/intro",
    icon: HelpCircle,
    label: "Help & Docs",
    external: true,
  },
  { key: "settings", href: "#settings", icon: Settings, label: "Settings" },
];

const renderLink: SidebarProps["renderLink"] = ({ children, ...props }) => <a {...props}>{children}</a>;

function DemoSidebar(overrides: Partial<SidebarProps>) {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [board, setBoard] = useState("living-room");

  return (
    <Sidebar
      labels={LABELS}
      primaryItems={PRIMARY}
      secondaryItems={SECONDARY}
      renderLink={renderLink}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed(!collapsed)}
      logoIconSrc={TACO_ICON}
      maxWidth={1680}
      sidebarInset={12}
      boardSelector={
        <BoardSelector
          boards={[
            { id: "living-room", name: "Living Room" },
            { id: "kitchen", name: "Kitchen" },
          ]}
          value={board}
          onChange={setBoard}
          labels={{ boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" }}
          collapsed={collapsed}
        />
      }
      versionSlot={<span className="text-xs text-sidebar-foreground/70">v9.0.0</span>}
      themeToggleSlot={
        <ThemeToggle
          theme={theme}
          onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
          label="Toggle theme"
        />
      }
      {...overrides}
    />
  );
}

const meta: Meta = {
  title: "Chrome/Sidebar",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <DemoSidebar />,
};

export const WithAiAssistant: Story = {
  render: () => <DemoSidebar ai={{ active: false, onOpen: () => {} }} />,
};

export const Pride: Story = {
  render: () => <DemoSidebar pride onLogoClick={() => {}} />,
};
