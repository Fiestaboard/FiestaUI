import type { Meta, StoryObj } from "@storybook/react";
import {
  Calendar,
  FileText,
  FlaskConical,
  GalleryHorizontalEnd,
  HelpCircle,
  Home,
  Info,
  LogOut,
  Monitor,
  Moon,
  Puzzle,
  Settings,
  Sun,
} from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../overlays/dropdown-menu";
import { BoardSelector } from "./board-selector";
import { Sidebar, type SidebarNavItem, type SidebarProps } from "./sidebar";
import { SidebarSettingsTrigger } from "./sidebar-settings-trigger";

const LABELS = {
  mainNavigation: "Main navigation",
  primaryNavigation: "Primary navigation",
  navigationMenu: "Navigation menu",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  expandSidebar: "Expand sidebar",
  collapseSidebar: "Collapse sidebar",
  aiAssistant: "AI Assistant",
  logoButtonAriaLabel: "FiestaBoard home",
};

/*
 * The sidebar takes ONE list of DESTINATIONS. These two arrays are the
 * *app's* grouping, not the component's — they exist so the stories can
 * compose orderings readably (and so OverflowingNav can wedge filler between
 * them). Nothing about the rendered rail distinguishes them.
 *
 * Note what is NOT here: settings, the assistant, sign-out. Settings is
 * reachable from the footer menu, the assistant is a footer action, and
 * sign-out is a menu item — none of them is a place you can be, so none of
 * them is a row that can light up.
 */
const DESTINATIONS: SidebarNavItem[] = [
  { key: "home", href: "#", icon: Home, label: "Home", active: true },
  { key: "pages", href: "#pages", icon: FileText, label: "Pages" },
  { key: "collections", href: "#collections", icon: GalleryHorizontalEnd, label: "Collections" },
  { key: "schedule", href: "#schedule", icon: Calendar, label: "Schedule" },
  { key: "integrations", href: "#integrations", icon: Puzzle, label: "Integrations" },
];

const UTILITIES: SidebarNavItem[] = [
  {
    key: "helpDocs",
    href: "https://fiestaboard.app/docs/intro",
    icon: HelpCircle,
    label: "Help & Docs",
    external: true,
  },
];

const NAV_ITEMS: SidebarNavItem[] = [...DESTINATIONS, ...UTILITIES];

const BOARD_NAMES = ["Living Room", "Kitchen", "Office", "Workshop", "Guest Room"];

function makeBoards(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `board-${i + 1}`,
    name: BOARD_NAMES[i] ?? `Board ${i + 1}`,
  }));
}

const renderLink: SidebarProps["renderLink"] = ({ children, ...props }) => <a {...props}>{children}</a>;

/**
 * A stand-in for the app's real settings menu, built from the same
 * primitives it uses. The Sidebar owns where this sits and how wide it gets;
 * everything inside it — the name, the routes, the theme, the version — is
 * app knowledge, which is why the real one is assembled in FiestaBoard.
 */
function DemoSettingsMenu({
  collapsed,
  username = "casa",
  theme,
  onThemeChange,
}: {
  collapsed: boolean;
  username?: string;
  theme: string;
  onThemeChange: (theme: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarSettingsTrigger label={username} collapsed={collapsed} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
        <DropdownMenuLabel>{username}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={theme} onValueChange={(v) => onThemeChange(String(v))}>
            <DropdownMenuRadioItem value="light">
              <Sun className="h-4 w-4" aria-hidden="true" />
              Light
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="dark">
              <Moon className="h-4 w-4" aria-hidden="true" />
              Dark
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="system">
              <Monitor className="h-4 w-4" aria-hidden="true" />
              System
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Info className="h-4 w-4" aria-hidden="true" />
          About FiestaBoard
        </DropdownMenuItem>
        <DropdownMenuItem>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DemoSidebar({
  initialCollapsed = false,
  boardCount = 2,
  username,
  ...overrides
}: Partial<SidebarProps> & { initialCollapsed?: boolean; boardCount?: number; username?: string }) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [theme, setTheme] = useState("dark");
  const [board, setBoard] = useState("board-1");

  const boards = makeBoards(boardCount);

  return (
    <Sidebar
      labels={LABELS}
      items={NAV_ITEMS}
      renderLink={renderLink}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed(!collapsed)}
      maxWidth={1680}
      sidebarInset={12}
      ai={{ active: false, onOpen: () => {} }}
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
      renderSettingsMenu={({ collapsed: isCollapsed }) => (
        <DemoSettingsMenu collapsed={isCollapsed} username={username} theme={theme} onThemeChange={setTheme} />
      )}
      {...overrides}
    />
  );
}

/** Flat, controls-friendly args mapped onto the Sidebar's real (function/slot-heavy) props. */
interface PlaygroundArgs {
  collapsed: boolean;
  showAi: boolean;
  aiActive: boolean;
  boardCount: number;
  username: string;
  activeItem: string;
  showTransitionsLab: boolean;
}

function PlaygroundSidebar(args: PlaygroundArgs) {
  const [collapsed, setCollapsed] = useState(args.collapsed);
  const [theme, setTheme] = useState("dark");
  const [board, setBoard] = useState("board-1");

  const boards = makeBoards(args.boardCount);

  const withActive = (item: SidebarNavItem) => ({ ...item, active: item.key === args.activeItem });
  // One array, composed in the order the app wants it read.
  const items: SidebarNavItem[] = [
    ...DESTINATIONS.map(withActive),
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
    ...UTILITIES.map(withActive),
  ];

  return (
    <Sidebar
      labels={LABELS}
      items={items}
      renderLink={renderLink}
      collapsed={collapsed}
      onToggleCollapsed={() => setCollapsed(!collapsed)}
      maxWidth={1680}
      sidebarInset={12}
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
      renderSettingsMenu={({ collapsed: isCollapsed }) => (
        <DemoSettingsMenu collapsed={isCollapsed} username={args.username} theme={theme} onThemeChange={setTheme} />
      )}
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
    username: "casa",
    activeItem: "home",
    showTransitionsLab: false,
  },
  argTypes: {
    collapsed: {
      description: "Start collapsed to the icon rail — the edge chevron stays clickable either way.",
      control: "boolean",
    },
    showAi: {
      description: "Show the assistant. It is a footer action and a mobile-header action — never a nav row.",
      control: "boolean",
    },
    aiActive: {
      description: "Highlight the assistant as open. Note that no nav row changes: that is the point.",
      control: "boolean",
    },
    boardCount: {
      description: "How many boards the install has — a single board hides the selector, matching the app.",
      control: { type: "range", min: 1, max: 5, step: 1 },
    },
    username: {
      description: "Name on the settings trigger — the app falls back to its word for Settings.",
      control: "text",
    },
    activeItem: {
      description: "Which nav item renders in the active-route state.",
      control: "select",
      options: ["home", "pages", "collections", "schedule", "integrations", "transitions"],
    },
    showTransitionsLab: {
      description: "Append the beta Transitions Lab entry, mirroring the app's feature flag.",
      control: "boolean",
    },
  },
  render: function Render(args) {
    // Re-mount when the collapsed control flips so it re-seeds local state
    // without killing the edge-toggle interactivity in between.
    return <PlaygroundSidebar key={String(args.collapsed)} {...args} />;
  },
};

export const Default: Story = {
  render: () => <DemoSidebar />,
};

/**
 * The footer at 64px: settings above, assistant below, both 36px squares on
 * the rail's centre line. There is no room to share a row, so the pair
 * stacks in the order it reads expanded.
 */
export const Collapsed: Story = {
  render: () => <DemoSidebar initialCollapsed />,
};

export const MultiBoard: Story = {
  render: () => <DemoSidebar boardCount={3} />,
};

export const SingleBoard: Story = {
  parameters: {
    docs: {
      description: {
        story: "Single-board installs render no board selector — the nav starts directly under the logo.",
      },
    },
  },
  render: () => <DemoSidebar boardCount={1} />,
};

/**
 * The drawer is open. Exactly one thing on the rail is highlighted — the
 * assistant chip — and Home stays the current route, because the route
 * never stopped being current. As a nav row the assistant produced two
 * highlights at once and no way to tell which one answered "where am I".
 */
export const AiActive: Story = {
  render: () => <DemoSidebar ai={{ active: true, onOpen: () => {} }} />,
};

/**
 * No AI provider configured: the chip is absent and the settings menu takes
 * the whole footer width. The app hides the assistant this way rather than
 * disabling it — there is nothing to open.
 */
export const WithoutAssistant: Story = {
  render: () => <DemoSidebar ai={undefined} />,
};

/**
 * Auth is off, or nobody is signed in, so the app passes its translated
 * word for Settings instead of a name. The trigger is the same object.
 */
export const NoUsername: Story = {
  render: () => <DemoSidebar username="Settings" />,
};

/**
 * A username with nowhere to go truncates rather than pushing the chevron
 * off the rail — the footer's width belongs to the rail, not to the name.
 */
export const LongUsername: Story = {
  render: () => <DemoSidebar username="bartholomew.featherstonehaugh" />,
};

/**
 * When the nav outgrows the rail, the LIST scrolls inside itself — only the
 * header (logo + board switcher) and the settings/assistant footer stay
 * pinned. Twelve extra destinations guarantee overflow at the VRT viewport
 * heights (800px desktop, 844px mobile).
 */
export const OverflowingNav: Story = {
  render: () => (
    <DemoSidebar
      items={[
        ...DESTINATIONS,
        ...Array.from({ length: 12 }, (_, i) => ({
          key: `extra-${i + 1}`,
          href: `#extra-${i + 1}`,
          icon: FileText,
          label: `Destination ${i + 1}`,
        })),
        ...UTILITIES,
      ]}
    />
  ),
};

/**
 * Below the `lg` breakpoint the sidebar swaps to a fixed top bar with a
 * hamburger-driven dialog menu. The assistant rides in that top bar, right
 * of the board selector, so it stays one tap away; the settings menu is the
 * pinned footer of the drawer.
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
  render: () => <DemoSidebar />,
};
