import type { Meta, StoryObj } from "@storybook/react";
import {
  Calendar,
  CloudSun,
  FileText,
  GalleryHorizontalEnd,
  Home,
  type LucideIcon,
  Monitor,
  Plus,
  Puzzle,
  RefreshCw,
  Save,
  TrainFront,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { ScaledBoardDisplay } from "../board/scaled-board-display";
import { Tabs, TabsList, TabsTrigger } from "../containment/tabs";
import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { Field } from "../forms/field";
import { Input } from "../forms/input";
import { Switch } from "../forms/switch";
import { BoardSelector } from "./board-selector";
import { MainContent } from "./main-content";
import { PageCard, PageOutlet, PageSection } from "./page-card";
import { PAGE_HUES, PageHeader, type PageHue } from "./page-header";
import { PageLayout } from "./page-layout";
import { PageSubheader, type PageSubheaderDetail } from "./page-subheader";
import { PageToolbar } from "./page-toolbar";
import { Sidebar, type SidebarNavItem, type SidebarProps } from "./sidebar";
import { SidebarAccountTrigger } from "./sidebar-account-trigger";
import { SkipToContent } from "./skip-to-content";

/*
 * HUB AND SPOKE, END TO END. A mock of FiestaBoard's routes with a tiny
 * in-story router, built the way the app will build them: each section is a
 * layout that owns the card and the header, and a drill-in only changes what
 * the layout is told about the item. Switching SECTIONS remounts the layout
 * (keyed by section) — that is a different page — but moving between a
 * section's list and its items never does.
 */

// ─── Mock data ────────────────────────────────────────────────────────────

const DISPLAYS = [
  {
    id: "living-room",
    name: "Living Room",
    output: "Vestaboard · Flagship",
    message: "GOOD MORNING\n{orange}72°{/orange} SUNNY\nN JUDAH  4 MIN",
  },
  {
    id: "kitchen",
    name: "Kitchen",
    output: "Vestaboard · Note",
    message: "MILK\nEGGS\nCOFFEE",
    device: "note" as const,
  },
  {
    id: "office-tv",
    name: "Office TV",
    output: "FiestaPanel · 55 in",
    message: "STANDUP 9:30\n{green}ALL GREEN{/green}",
  },
];

const PAGES = [
  { id: "morning", name: "Morning briefing", message: "GOOD MORNING\n{orange}72°{/orange} SUNNY\nN JUDAH  4 MIN" },
  { id: "transit", name: "Transit times", message: "N JUDAH  4 MIN\n{red}L TARAVAL{/red} 11 MIN" },
  { id: "grocery", name: "Grocery list", message: "MILK\nEGGS\nCOFFEE" },
  { id: "wifi", name: "Guest wifi", message: "WIFI  CASA\nPW  TACOS4EVER" },
];

const PLUGINS = [
  {
    id: "weather",
    name: "Weather",
    by: "FiestaBoard",
    category: "Weather",
    installed: true,
    icon: CloudSun,
    message: "SF  72° SUNNY\nHI 75  LO 58",
  },
  {
    id: "muni",
    name: "Muni",
    by: "FiestaBoard",
    category: "Transit",
    installed: true,
    icon: TrainFront,
    message: "N JUDAH  4 MIN\nL TARAVAL 11 MIN",
  },
  {
    id: "moon-phase",
    name: "Moon phase",
    by: "Community",
    category: "Space",
    installed: false,
    icon: Calendar,
    message: "WAXING GIBBOUS\n{yellow}87%{/yellow}",
  },
  {
    id: "dad-jokes",
    name: "Dad jokes",
    by: "Community",
    category: "Fun",
    installed: false,
    icon: Puzzle,
    message: "I ONLY KNOW\n25 LETTERS OF\nTHE ALPHABET",
  },
];

// ─── A router small enough to read ────────────────────────────────────────

type Navigate = (href: string) => void;

function useMiniRouter(initial: string): [string, Navigate] {
  const [path, setPath] = useState(initial);
  const navigate = useCallback<Navigate>((href) => {
    setPath(href);
    window.scrollTo({ top: 0 });
  }, []);
  return [path, navigate];
}

function parse(path: string) {
  const [pathname, query = ""] = path.split("?");
  const [section = "", item] = pathname.replace(/^\//, "").split("/");
  return { section: section || "home", item, params: new URLSearchParams(query) };
}

function makeLink(navigate: Navigate) {
  return function RouterLink({
    href,
    children,
    ...rest
  }: { href: string; children: React.ReactNode } & Record<string, unknown>) {
    return (
      <a
        {...rest}
        href={`#${href}`}
        onClick={(event) => {
          event.preventDefault();
          navigate(href);
        }}
      >
        {children}
      </a>
    );
  };
}

// ─── The section layout: what each FiestaBoard section route becomes ──────

interface SectionLayoutProps {
  icon: LucideIcon;
  hue: PageHue;
  title: string;
  description: string;
  action?: React.ReactNode;
  detail: PageSubheaderDetail | null;
  /** The list tile the reader opened, so focus can return to it on the way back. */
  returnFocusTo?: string;
  renderLink: (props: { href: string; children: React.ReactNode }) => React.ReactElement;
  /** Keyed per path so the body cross-fades while the header holds still. */
  bodyKey: string;
  children: React.ReactNode;
}

function SectionLayout({
  icon,
  hue,
  title,
  description,
  action,
  detail,
  returnFocusTo,
  renderLink,
  bodyKey,
  children,
}: SectionLayoutProps) {
  const opened = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (detail) {
      opened.current = returnFocusTo;
    } else if (opened.current) {
      document.querySelector<HTMLElement>(`[data-item-id="${opened.current}"]`)?.focus({ preventScroll: true });
      opened.current = undefined;
    }
  }, [detail, returnFocusTo]);

  return (
    <PageLayout>
      <PageCard>
        <PageHeader icon={icon} hue={hue} title={title} description={description} collapsed={detail != null}>
          {action}
        </PageHeader>
        <PageSubheader detail={detail} breadcrumbLabel="Breadcrumb" renderLink={renderLink} />
        <PageOutlet key={bodyKey}>{children}</PageOutlet>
      </PageCard>
    </PageLayout>
  );
}

// ─── Shared bits ──────────────────────────────────────────────────────────

/** A clickable item: its border is the click target, so it keeps one inside the card. */
function Tile({
  id,
  href,
  navigate,
  title,
  meta,
  message,
  device,
}: {
  id: string;
  href: string;
  navigate: Navigate;
  title: string;
  meta: string;
  message: string;
  device?: "note";
}) {
  return (
    <a
      href={`#${href}`}
      data-item-id={id}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
      className="focus-ring border-border hover:border-brand bg-card flex flex-col gap-3 rounded-xl border-2 p-3 transition-colors"
    >
      <ScaledBoardDisplay message={message} size="sm" deviceType={device} isStatic className="pointer-events-none" />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="text-muted-foreground block truncate text-xs">{meta}</span>
      </span>
    </a>
  );
}

function SettingsFields({ name }: { name: string }) {
  return (
    <div className="grid max-w-xl gap-5">
      <Field label="Name">
        <Input defaultValue={name} />
      </Field>
      <Field label="Quiet hours" description="Stop flipping between 22:00 and 07:00." orientation="inline">
        <Switch defaultChecked />
      </Field>
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────

type SectionProps = {
  item?: string;
  params: URLSearchParams;
  navigate: Navigate;
  renderLink: SectionLayoutProps["renderLink"];
};

function DisplaysSection({ item, navigate, renderLink }: SectionProps) {
  const display = DISPLAYS.find((d) => d.id === item);
  return (
    <SectionLayout
      icon={Monitor}
      hue={HUES.displays}
      title="Displays"
      description="Every board and screen FiestaBoard shows on."
      action={
        <Button>
          <Plus aria-hidden="true" />
          Add display
        </Button>
      }
      detail={
        display
          ? {
              title: display.name,
              description: display.output,
              crumbs: [{ label: "Displays", href: "/displays" }],
              action: (
                <Button variant="outline" size="sm">
                  <Trash2 aria-hidden="true" />
                  Remove
                </Button>
              ),
            }
          : null
      }
      returnFocusTo={display?.id}
      renderLink={renderLink}
      bodyKey={item ?? "list"}
    >
      {display ? (
        <>
          <PageSection title="What it shows now">
            <div className="flex justify-center">
              <div className="w-full max-w-3xl">
                <ScaledBoardDisplay message={display.message} size="md" deviceType={display.device} isStatic />
              </div>
            </div>
          </PageSection>
          <PageSection title="Settings">
            <SettingsFields name={display.name} />
          </PageSection>
        </>
      ) : (
        <PageSection contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DISPLAYS.map((d) => (
            <Tile
              key={d.id}
              id={d.id}
              href={`/displays/${d.id}`}
              navigate={navigate}
              title={d.name}
              meta={d.output}
              message={d.message}
              device={d.device}
            />
          ))}
        </PageSection>
      )}
    </SectionLayout>
  );
}

function PagesSection({ item, navigate, renderLink }: SectionProps) {
  const page = item === "new" ? { id: "new", name: "New page", message: "" } : PAGES.find((p) => p.id === item);
  return (
    <SectionLayout
      icon={FileText}
      hue={HUES.pages}
      title="Pages"
      description="What your boards can show."
      action={
        <Button onClick={() => navigate("/pages/new")}>
          <Plus aria-hidden="true" />
          New page
        </Button>
      }
      detail={
        page
          ? {
              title: page.name,
              crumbs: [{ label: "Pages", href: "/pages" }],
              action: (
                <Button size="sm" onClick={() => navigate("/pages")}>
                  <Save aria-hidden="true" />
                  Save
                </Button>
              ),
            }
          : null
      }
      returnFocusTo={page?.id}
      renderLink={renderLink}
      bodyKey={item ?? "list"}
    >
      {page ? (
        <PageSection title="Lines" description="Type what each row of the board says.">
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div className="grid gap-2">
              {[0, 1, 2, 3, 4, 5].map((row) => (
                <Input
                  key={row}
                  aria-label={`Line ${row + 1}`}
                  defaultValue={page.message.split("\n")[row]?.replace(/\{\/?\w+\}/g, "") ?? ""}
                  className="font-mono uppercase"
                />
              ))}
            </div>
            <div className="w-full lg:w-80">
              <ScaledBoardDisplay message={page.message} size="sm" isStatic />
            </div>
          </div>
        </PageSection>
      ) : (
        <PageSection contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PAGES.map((p) => (
            <Tile
              key={p.id}
              id={p.id}
              href={`/pages/${p.id}`}
              navigate={navigate}
              title={p.name}
              meta="Flagship"
              message={p.message}
            />
          ))}
        </PageSection>
      )}
    </SectionLayout>
  );
}

function IntegrationsSection({ item, params, navigate, renderLink }: SectionProps) {
  const plugin = PLUGINS.find((p) => p.id === item);
  const tab = params.get("tab") === "marketplace" ? "marketplace" : "installed";
  // The crumb goes back to the tab the reader came from, not the section root.
  const from = params.get("from") === "marketplace" ? "/integrations?tab=marketplace" : "/integrations";
  const shown = PLUGINS.filter((p) => (tab === "installed" ? p.installed : !p.installed));
  return (
    <SectionLayout
      icon={Puzzle}
      hue={HUES.integrations}
      title="Integrations"
      description="Plugins that bring live data to your boards."
      action={
        <Button variant="outline">
          <RefreshCw aria-hidden="true" />
          Check for updates
        </Button>
      }
      detail={
        plugin
          ? {
              title: plugin.name,
              description: (
                <span className="inline-flex flex-wrap items-center gap-2">
                  by {plugin.by} <Badge variant="secondary">{plugin.category}</Badge>
                </span>
              ),
              crumbs: [{ label: "Integrations", href: from }],
              action: plugin.installed ? (
                <Field label="Enabled" orientation="inline">
                  <Switch defaultChecked />
                </Field>
              ) : (
                <Button size="sm">Install</Button>
              ),
            }
          : null
      }
      returnFocusTo={plugin?.id}
      renderLink={renderLink}
      bodyKey={item ?? tab}
    >
      {plugin ? (
        <>
          <PageSection title="On your board">
            <div className="flex justify-center">
              <div className="w-full max-w-3xl">
                <ScaledBoardDisplay message={plugin.message} size="md" isStatic />
              </div>
            </div>
          </PageSection>
          <PageSection title="About">
            <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
              {plugin.name} brings live data to any page through template variables. Add it to a page, pick the fields
              you want, and FiestaBoard keeps the board current.
            </p>
          </PageSection>
        </>
      ) : (
        <>
          <PageToolbar
            left={
              <Tabs
                value={tab}
                onValueChange={(v) => navigate(v === "marketplace" ? "/integrations?tab=marketplace" : "/integrations")}
              >
                <TabsList>
                  <TabsTrigger value="installed">Installed</TabsTrigger>
                  <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                </TabsList>
              </Tabs>
            }
          />
          <PageSection contentClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => (
              <Tile
                key={p.id}
                id={p.id}
                href={`/integrations/${p.id}${tab === "marketplace" ? "?from=marketplace" : ""}`}
                navigate={navigate}
                title={p.name}
                meta={`${p.by} · ${p.category}`}
                message={p.message}
              />
            ))}
          </PageSection>
        </>
      )}
    </SectionLayout>
  );
}

/** Sections with no drill-in: a header and a body, nothing to expand. */
function FlatSection({
  icon,
  hue,
  title,
  description,
}: {
  icon: LucideIcon;
  hue: PageHue;
  title: string;
  description: string;
}) {
  return (
    <PageLayout>
      <PageCard>
        <PageHeader icon={icon} hue={hue} title={title} description={description} />
        <PageSection>
          <div className="bg-muted/60 h-48 rounded-lg" />
        </PageSection>
      </PageCard>
    </PageLayout>
  );
}

// ─── The app ──────────────────────────────────────────────────────────────

// Nav order, and the hue each route is ASSIGNED from it (see PageHeader `hue`).
const NAV = [
  { key: "home", href: "/", icon: Home, label: "Home" },
  { key: "displays", href: "/displays", icon: Monitor, label: "Displays" },
  { key: "pages", href: "/pages", icon: FileText, label: "Pages" },
  { key: "collections", href: "/collections", icon: GalleryHorizontalEnd, label: "Collections" },
  { key: "schedule", href: "/schedule", icon: Calendar, label: "Schedule" },
  { key: "integrations", href: "/integrations", icon: Puzzle, label: "Integrations" },
] as const;
const HUES = Object.fromEntries(NAV.map((n, i) => [n.key, PAGE_HUES[i % PAGE_HUES.length]])) as Record<
  (typeof NAV)[number]["key"],
  PageHue
>;

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

function SectionNavigationDemo({ initialPath = "/displays" }: { initialPath?: string }) {
  const [path, navigate] = useMiniRouter(initialPath);
  const [collapsed, setCollapsed] = useState(false);
  const [board, setBoard] = useState("living-room");
  const { section, item, params } = parse(path);
  const RouterLink = makeLink(navigate);
  const renderLink: SectionLayoutProps["renderLink"] = ({ href, children }) => (
    <RouterLink href={href}>{children}</RouterLink>
  );

  const items: SidebarNavItem[] = NAV.map((n) => ({
    ...n,
    active: n.key === section,
  }));
  const renderSidebarLink: SidebarProps["renderLink"] = ({ href, children, onClick, ...props }) => (
    <a
      {...props}
      href={`#${href}`}
      onClick={(event) => {
        event.preventDefault();
        onClick?.();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
  const boardSelectorProps = {
    boards: DISPLAYS.map((d) => ({ id: d.id, name: d.name })),
    value: board,
    onChange: setBoard,
    labels: { boardSelector: "Select board", selectBoard: "Select a board", unnamedBoard: "Unnamed board" },
  };

  const sectionProps: SectionProps = { item, params, navigate, renderLink };
  let route: React.ReactNode;
  switch (section) {
    case "displays":
      route = <DisplaysSection key="displays" {...sectionProps} />;
      break;
    case "pages":
      route = <PagesSection key="pages" {...sectionProps} />;
      break;
    case "integrations":
      route = <IntegrationsSection key="integrations" {...sectionProps} />;
      break;
    case "collections":
      route = (
        <FlatSection
          key="collections"
          icon={GalleryHorizontalEnd}
          hue={HUES.collections}
          title="Collections"
          description="Pages that rotate together."
        />
      );
      break;
    case "schedule":
      route = (
        <FlatSection
          key="schedule"
          icon={Calendar}
          hue={HUES.schedule}
          title="Schedule"
          description="What shows when."
        />
      );
      break;
    default:
      route = <FlatSection key="home" icon={Home} hue={HUES.home} title="Home" description="Your board at a glance." />;
  }

  return (
    <div className="bg-background text-foreground min-h-dvh">
      <SkipToContent label="Skip to main content" />
      <Sidebar
        labels={LABELS}
        items={items}
        renderLink={renderSidebarLink}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        maxWidth={1680}
        sidebarInset={12}
        boardSelector={<BoardSelector {...boardSelectorProps} collapsed={collapsed} />}
        mobileBoardSelector={<BoardSelector {...boardSelectorProps} variant="mobileHeader" />}
        ai={{ active: false, onOpen: () => {} }}
        settings={{ href: "/settings", label: "Settings" }}
        renderSettingsMenu={({ collapsed: isCollapsed }) => (
          <SidebarAccountTrigger label="casa" collapsed={isCollapsed} />
        )}
      />
      <MainContent collapsed={collapsed} maxWidth={1680}>
        {route}
      </MainContent>
    </div>
  );
}

const meta = {
  title: "App/Chrome/Section navigation",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Start at the Displays list; open a display, then use the crumb to come back. */
export const Default: Story = {
  render: () => <SectionNavigationDemo />,
};

/** Landing straight on an item (a refresh or a shared link): open, no animation, focus untouched. */
export const DeepLink: Story = {
  render: () => <SectionNavigationDemo initialPath="/displays/living-room" />,
};

/** The Marketplace tab: an item opened from here returns to the tab, not the section root. */
export const FromMarketplace: Story = {
  render: () => <SectionNavigationDemo initialPath="/integrations?tab=marketplace" />,
};
