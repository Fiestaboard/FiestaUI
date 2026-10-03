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
import { SidebarAccountTrigger } from "./sidebar-account-trigger";

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
 * Note what is NOT here: settings, the assistant, sign-out. Settings is a
 * gear chip in the footer (and an item of the account menu), the assistant
 * is a footer action, and sign-out is a menu item — the list is for the
 * places the app is ABOUT, and none of these is one.
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

/** What the app calls the menu when there is nobody signed in to name it after. */
const ANONYMOUS_LABEL = "More";

const SETTINGS: NonNullable<SidebarProps["settings"]> = { href: "#settings", label: "Settings" };

/**
 * A stand-in for the app's real account menu, built from the same
 * primitives it uses. The Sidebar owns where this sits and how wide it gets;
 * everything inside it — the name, the routes, the theme, the version — is
 * app knowledge, which is why the real one is assembled in FiestaBoard.
 *
 * An empty `username` is the auth-off install: the trigger turns anonymous
 * and the menu loses its identity header.
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
  const anonymous = username === "";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarAccountTrigger
          label={anonymous ? ANONYMOUS_LABEL : username}
          anonymous={anonymous}
          collapsed={collapsed}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" sideOffset={8} className="w-56">
        {!anonymous && (
          <>
            {/* Text only. The avatar is on the trigger this menu hangs off;
                a second one here adds nothing but a fourth left edge. The
                header earns its place as the one spot a truncated name, or
                the collapsed rail's bare avatar, is spelled out in full. */}
            <DropdownMenuLabel className="truncate">{username}</DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
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
        {/* Nobody signed in means nobody to sign out. */}
        {!anonymous && (
          <DropdownMenuItem>
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        )}
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
      settings={SETTINGS}
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
  showSettings: boolean;
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
      settings={args.showSettings ? { ...SETTINGS, active: args.activeItem === "settings" } : undefined}
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
    showSettings: true,
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
    showSettings: {
      description: "Show the settings gear in the footer, left of the assistant. Desktop rail only.",
      control: "boolean",
    },
    username: {
      description:
        'Name on the account trigger. Empty is the auth-off install: an ellipsis and the app\'s word for "More".',
      control: "text",
    },
    activeItem: {
      description: "Which destination is the current route. `settings` lights the footer gear, not a nav row.",
      control: "select",
      options: ["home", "pages", "collections", "schedule", "integrations", "transitions", "settings"],
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
 * The footer at 64px: avatar, gear, assistant, all 36px squares on the
 * rail's centre line. There is no room to share a row, so the three stack
 * in the order they read expanded.
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
 * No AI provider configured: the assistant chip is absent, the gear holds
 * the right edge alone, and the account menu takes the width that frees up.
 * The app hides the assistant this way rather than disabling it — there is
 * nothing to open.
 */
export const WithoutAssistant: Story = {
  render: () => <DemoSidebar ai={undefined} />,
};

/**
 * /settings is the current route. Settings has no row in the list, so the
 * gear is the only thing on the rail that can say so — and no nav row is
 * lit, because none of them is where you are.
 */
export const SettingsActive: Story = {
  render: () => (
    <DemoSidebar
      items={NAV_ITEMS.map((item) => ({ ...item, active: false }))}
      settings={{ ...SETTINGS, active: true }}
    />
  ),
};

/** The same route on the 64px rail: the lit chip is the middle of the stack. */
export const SettingsActiveCollapsed: Story = {
  render: () => (
    <DemoSidebar
      initialCollapsed
      items={NAV_ITEMS.map((item) => ({ ...item, active: false }))}
      settings={{ ...SETTINGS, active: true }}
    />
  ),
};

/**
 * Both chips lit at once: /settings is the route AND the assistant's panel
 * is open over it. Two true facts of different kinds — `aria-current` on
 * the gear, `aria-pressed` on the assistant — which is why they are chips
 * and not rows of one list.
 */
export const SettingsAndAssistantActive: Story = {
  render: () => (
    <DemoSidebar
      items={NAV_ITEMS.map((item) => ({ ...item, active: false }))}
      settings={{ ...SETTINGS, active: true }}
      ai={{ active: true, onOpen: () => {} }}
    />
  ),
};

/**
 * Auth is off, or nobody is signed in. There is no person to draw — and a
 * blank silhouette would read as a sign-in button on an install with
 * nothing to sign in to — so the avatar gives way to an ellipsis and the
 * label is the app's translated word for "More". Not "Settings": the gear
 * beside it already says that.
 */
export const NoUsername: Story = {
  render: () => <DemoSidebar username="" />,
};

/** The same install on the 64px rail: ellipsis, gear, assistant. */
export const NoUsernameCollapsed: Story = {
  render: () => <DemoSidebar initialCollapsed username="" />,
};

/**
 * A username with nowhere to go truncates rather than pushing the chevrons
 * or the chips off the rail — the footer's width belongs to the rail, not
 * to the name.
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
 * of the board selector, so it stays one tap away; the account menu is the
 * pinned footer of the drawer. The settings gear does not come along — the
 * drawer's footer lists settings itself.
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
