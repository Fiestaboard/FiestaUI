import type { Meta, StoryObj } from "@storybook/react";
import {
  Calendar,
  FileText,
  FlaskConical,
  GalleryHorizontalEnd,
  HelpCircle,
  Home,
  Puzzle,
  Settings,
  User,
} from "lucide-react";
import { useState } from "react";

import { type Season } from "../../lib/seasons";
import { ALL_SEASONS } from "../../lib/seasons-drafts";
import { cn } from "../../lib/utils";
import { BoardSelector } from "./board-selector";
import { Sidebar, type SidebarNavItem, type SidebarProps } from "./sidebar";
import { ThemeToggle } from "./theme-toggle";

// Seasons are a decorator concern: the Season toolbar (preview.tsx) stamps the
// CSS class app-wide, and stories resolve the same global into the Sidebar's
// `season` prop so the aurora + celebration logo appear only while the
// toolbar has a season active — never as a baked-in story variant.
function toolbarSeason(globals: Record<string, unknown>): Season | null {
  return ALL_SEASONS.find((s) => s.id === globals.season) ?? null;
}

function seasonProps(globals: Record<string, unknown>) {
  const season = toolbarSeason(globals);
  return season ? { season, onLogoClick: () => {} } : {};
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

const BOARD_NAMES = ["Living Room", "Kitchen", "Office", "Workshop", "Guest Room"];

function makeBoards(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `board-${i + 1}`,
    name: BOARD_NAMES[i] ?? `Board ${i + 1}`,
  }));
}

const renderLink: SidebarProps["renderLink"] = ({ children, ...props }) => <a {...props}>{children}</a>;

/** Placeholder account row styled like a nav item (the app injects its real account menu here). */
function AccountRow({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center gap-3 py-2 pl-[14px] pr-3 rounded-lg text-sm font-medium text-sidebar-foreground">
      <User className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
      <span
        className={cn(
          "whitespace-nowrap overflow-hidden transition-opacity duration-fast",
          collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-48 delay-150",
        )}
      >
        casa@example.com
      </span>
    </div>
  );
}

function DemoSidebar({
  initialCollapsed = false,
  boardCount = 2,
  ...overrides
}: Partial<SidebarProps> & { initialCollapsed?: boolean; boardCount?: number }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [board, setBoard] = useState("board-1");

  const boards = makeBoards(boardCount);

  return (
    <Sidebar
      labels={LABELS}
      primaryItems={PRIMARY}
      secondaryItems={SECONDARY}
      renderLink={renderLink}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed(!collapsed)}
      maxWidth={1680}
      sidebarInset={12}
      boardSelector={
        // A single board hides the switcher — matching app behavior.
        boards.length > 1 ? (
          <BoardSelector
            boards={boards}
            value={board}
            onChange={setBoard}
            labels={{ boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" }}
            collapsed={collapsed}
          />
        ) : undefined
      }
      mobileBoardSelector={
        // Phone widths switch boards from the always-visible header bar.
        boards.length > 1 ? (
          <BoardSelector
            boards={boards}
            value={board}
            onChange={setBoard}
            labels={{ boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" }}
            variant="mobileHeader"
          />
        ) : undefined
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

/** Flat, controls-friendly args mapped onto the Sidebar's real (function/slot-heavy) props. */
interface PlaygroundArgs {
  collapsed: boolean;
  /** Injected from the Season toolbar global, not a control. */
  season?: Season | null;
  showAi: boolean;
  aiActive: boolean;
  boardCount: number;
  showAccount: boolean;
  versionText: string;
  activeItem: string;
  showTransitionsLab: boolean;
}

function PlaygroundSidebar(args: PlaygroundArgs) {
  const [collapsed, setCollapsed] = useState(args.collapsed);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [board, setBoard] = useState("board-1");

  const boards = makeBoards(args.boardCount);

  const primary: SidebarNavItem[] = [
    ...PRIMARY.map((item) => ({ ...item, active: item.key === args.activeItem })),
    ...(args.showTransitionsLab
      ? [
          {
            key: "transitions",
            href: "#transitions",
            icon: FlaskConical,
            label: "Transitions Lab",
            active: args.activeItem === "transitions",
          },
        ]
      : []),
  ];
  const secondary = SECONDARY.map((item) => ({ ...item, active: item.key === args.activeItem }));

  return (
    <Sidebar
      labels={LABELS}
      primaryItems={primary}
      secondaryItems={secondary}
      renderLink={renderLink}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed(!collapsed)}
      maxWidth={1680}
      sidebarInset={12}
      season={args.season ?? null}
      onLogoClick={args.season ? () => {} : undefined}
      ai={args.showAi ? { active: args.aiActive, onOpen: () => {} } : undefined}
      boardSelector={
        boards.length > 1 ? (
          <BoardSelector
            boards={boards}
            value={board}
            onChange={setBoard}
            labels={{ boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" }}
            collapsed={collapsed}
          />
        ) : undefined
      }
      mobileBoardSelector={
        boards.length > 1 ? (
          <BoardSelector
            boards={boards}
            value={board}
            onChange={setBoard}
            labels={{ boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" }}
            variant="mobileHeader"
          />
        ) : undefined
      }
      renderAccount={args.showAccount ? ({ collapsed: c }) => <AccountRow collapsed={c} /> : undefined}
      versionSlot={<span className="text-xs text-sidebar-foreground/70">{args.versionText}</span>}
      themeToggleSlot={
        <ThemeToggle
          theme={theme}
          onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
          label="Toggle theme"
        />
      }
    />
  );
}

const meta: Meta = {
  title: "App/Chrome/Sidebar",
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj;

/**
 * Every sidebar variant in one place — the controls panel maps simple
 * values onto the Sidebar's slot/function props so you can mix and match.
 * The edge chevron stays interactive; the `collapsed` control re-seeds it.
 */
export const Playground: StoryObj<PlaygroundArgs> = {
  args: {
    collapsed: false,
    showAi: true,
    aiActive: false,
    boardCount: 2,
    showAccount: true,
    versionText: "v9.0.0",
    activeItem: "home",
    showTransitionsLab: false,
  },
  argTypes: {
    collapsed: {
      description: "Start collapsed to the icon rail — the edge chevron stays clickable either way.",
      control: "boolean",
    },
    showAi: { description: "Show the AI assistant entry between primary and secondary nav.", control: "boolean" },
    aiActive: { description: "Highlight the AI assistant entry as the active route.", control: "boolean" },
    boardCount: {
      description: "How many boards the install has — a single board hides the selector, matching the app.",
      control: { type: "range", min: 1, max: 5, step: 1 },
    },
    showAccount: { description: "Render a placeholder account row in the secondary nav slot.", control: "boolean" },
    versionText: { description: "Version indicator text in the footer row.", control: "text" },
    activeItem: {
      description: "Which nav item renders in the active-route state.",
      control: "select",
      options: ["home", "pages", "collections", "schedule", "integrations", "transitions", "settings"],
    },
    showTransitionsLab: {
      description: "Append the beta Transitions Lab entry, mirroring the app's feature flag.",
      control: "boolean",
    },
  },
  render: function Render(args, { globals }) {
    // Re-mount when the collapsed control flips so it re-seeds local state
    // without killing the edge-toggle interactivity in between.
    return <PlaygroundSidebar key={String(args.collapsed)} {...args} season={toolbarSeason(globals)} />;
  },
};

export const Default: Story = {
  render: (_, { globals }) => <DemoSidebar {...seasonProps(globals)} />,
};

export const Collapsed: Story = {
  render: (_, { globals }) => <DemoSidebar initialCollapsed {...seasonProps(globals)} />,
};

export const MultiBoard: Story = {
  render: (_, { globals }) => <DemoSidebar boardCount={3} {...seasonProps(globals)} />,
};

export const SingleBoard: Story = {
  parameters: {
    docs: {
      description: {
        story: "Single-board installs render no board selector — the nav starts directly under the logo.",
      },
    },
  },
  render: (_, { globals }) => <DemoSidebar boardCount={1} {...seasonProps(globals)} />,
};

export const WithAiAssistant: Story = {
  render: (_, { globals }) => <DemoSidebar ai={{ active: false, onOpen: () => {} }} {...seasonProps(globals)} />,
};

export const AiActive: Story = {
  render: (_, { globals }) => <DemoSidebar ai={{ active: true, onOpen: () => {} }} {...seasonProps(globals)} />,
};

export const WithAccount: Story = {
  render: (_, { globals }) => (
    <DemoSidebar renderAccount={({ collapsed }) => <AccountRow collapsed={collapsed} />} {...seasonProps(globals)} />
  ),
};

/**
 * Below the `lg` breakpoint the sidebar swaps to a fixed top bar with a
 * hamburger-driven dialog menu. Resize the canvas (or use the viewport
 * toolbar) under 1024px to see it; tap the hamburger to open the menu.
 */
export const Mobile: Story = {
  globals: {
    viewport: { value: "mobile1", isRotated: false },
  },
  parameters: {
    viewport: { defaultViewport: "mobile1" },
    docs: {
      description: {
        story:
          "The mobile chrome: fixed top bar + hamburger menu. The desktop `<aside>` is still in the DOM but hidden below `lg` (1024px).",
      },
    },
  },
  render: (_, { globals }) => <DemoSidebar {...seasonProps(globals)} />,
};
