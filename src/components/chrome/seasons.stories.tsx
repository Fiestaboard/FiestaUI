import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, FileText, Home, Puzzle, Settings } from "lucide-react";
import { useEffect, useState } from "react";

import { ALL_SEASONS } from "../../lib/seasons";
import { Sidebar, type SidebarNavItem, type SidebarProps } from "./sidebar";
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

const ITEMS: SidebarNavItem[] = [
  { key: "home", href: "#", icon: Home, label: "Home", active: true },
  { key: "pages", href: "#pages", icon: FileText, label: "Pages" },
  { key: "schedule", href: "#schedule", icon: Calendar, label: "Schedule" },
  { key: "integrations", href: "#integrations", icon: Puzzle, label: "Integrations" },
];

const renderLink: SidebarProps["renderLink"] = ({ children, ...props }) => <a {...props}>{children}</a>;

interface SeasonPreviewArgs {
  seasonId: string;
}

/**
 * One-stop seasonal design review: pick any season — live or draft — and
 * see the full sidebar treatment (logo gradient, sidebar base, aurora in
 * the season's palette). Drafts are Storybook-only; the app activates
 * only promoted seasons.
 */
function SeasonPreview({ seasonId }: SeasonPreviewArgs) {
  const season = ALL_SEASONS.find((s) => s.id === seasonId) ?? null;
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // Stamp the season class exactly like the app shell / toolbar does, so
  // the CSS treatments (logo text, sidebar base, icon gradient) apply.
  useEffect(() => {
    const root = document.documentElement;
    for (const s of ALL_SEASONS) root.classList.toggle(s.htmlClass, s.id === seasonId);
    return () => {
      for (const s of ALL_SEASONS) root.classList.remove(s.htmlClass);
    };
  }, [seasonId]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar
        labels={LABELS}
        primaryItems={ITEMS}
        secondaryItems={[{ key: "settings", href: "#settings", icon: Settings, label: "Settings" }]}
        renderLink={renderLink}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        season={season}
        onLogoClick={() => {}}
        maxWidth={1680}
        sidebarInset={12}
        versionSlot={<span className="text-xs text-sidebar-foreground/70">v9.0.0</span>}
        themeToggleSlot={
          <ThemeToggle
            theme={theme}
            onToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
            label="Toggle theme"
          />
        }
      />
      <main className="min-h-dvh lg:pl-[288px] p-8 pt-[88px] lg:pt-8">
        <h1 className="text-lg font-medium">{season ? season.label : "No season"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Logo gradient, sidebar base, and aurora colors all come from the selected season. Drafts are Storybook-only
          until promoted into SEASONS.
        </p>
        <div className="mt-4 flex gap-2">
          {(season?.colors ?? []).map((c, i) => (
            <div key={i} className="h-10 w-10 rounded-md border" style={{ background: c }} title={c} />
          ))}
        </div>
      </main>
    </div>
  );
}

const meta: Meta<SeasonPreviewArgs> = {
  title: "Chrome/Seasons",
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    seasonId: {
      control: "select",
      options: ALL_SEASONS.map((s) => s.id),
      description: "Season to preview — live seasons and design drafts",
    },
  },
};

export default meta;
type Story = StoryObj<SeasonPreviewArgs>;

export const Default: Story = {
  args: { seasonId: "pride" },
  render: function Render(args) {
    return <SeasonPreview seasonId={args.seasonId} />;
  },
};
