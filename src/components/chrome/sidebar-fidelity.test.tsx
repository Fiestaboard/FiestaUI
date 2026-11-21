import { fireEvent, render, screen, within } from "@testing-library/react";
import {
  Award,
  Calendar,
  CircleHelp,
  FileText,
  GalleryHorizontalEnd,
  Home,
  Monitor,
  Puzzle,
  Settings,
} from "lucide-react";
import { describe, expect, it } from "vitest";

import { BoardSelector } from "./board-selector";
import { Sidebar, type SidebarLabels, type SidebarNavItem, type SidebarProps } from "./sidebar";
import { SidebarAccountTrigger } from "./sidebar-account-trigger";
import { SkipToContent } from "./skip-to-content";

/*
 * Bug bash F (shell fidelity): the rail against 07a `302:20841`, its 900
 * rail `307:61756` and the More sheet `308:36074`. jsdom computes no layout,
 * so these hold the class contract that produces the measured geometry
 * (16×28 handle, 8px corners, 2px proud; 16px nest; one 1px hairline), and
 * the before/after screenshots hold the pixels.
 */

const LABELS: SidebarLabels = {
  mainNavigation: "Main navigation",
  primaryNavigation: "Primary navigation",
  navigationMenu: "Navigation menu",
  openMenu: "Open menu",
  closeMenu: "Close menu",
  expandSidebar: "Expand sidebar",
  collapseSidebar: "Collapse sidebar",
  aiAssistant: "AI Assistant",
  more: "More",
};

// FiestaBoard's IA (07a): Home · Pages (▸ Collections) · Schedule · Displays │ Integrations …
const IA: SidebarNavItem[] = [
  { key: "home", href: "#home", icon: Home, label: "Home", active: true },
  { key: "pages", href: "#pages", icon: FileText, label: "Pages" },
  { key: "collections", href: "#collections", icon: GalleryHorizontalEnd, label: "Collections", nested: true },
  { key: "schedule", href: "#schedule", icon: Calendar, label: "Schedule" },
  { key: "displays", href: "#displays", icon: Monitor, label: "Displays" },
  { key: "integrations", href: "#integrations", icon: Puzzle, label: "Integrations", separatorBefore: true },
  { key: "picks", href: "#picks", icon: Award, label: "Staff Picks" },
  { key: "settings", href: "#settings", icon: Settings, label: "Settings" },
  { key: "help", href: "https://example.com", icon: CircleHelp, label: "Help & Docs", external: true },
];

const renderLink: SidebarProps["renderLink"] = ({ children, ...props }) => <a {...props}>{children}</a>;

function renderSidebar(overrides: Partial<SidebarProps> = {}) {
  return render(
    <Sidebar
      labels={LABELS}
      items={IA}
      renderLink={renderLink}
      collapsed={false}
      onToggleCollapsed={() => {}}
      maxWidth={1680}
      sidebarInset={12}
      {...overrides}
    />,
  );
}

const rail = () => screen.getByRole("complementary", { name: LABELS.mainNavigation });
const railNav = () => within(rail()).getByRole("navigation", { name: LABELS.primaryNavigation });
const handle = () => rail().querySelector<HTMLElement>('[data-slot="sidebar-collapse-handle"]')!;
const classes = (el: Element) => el.className.split(/\s+/);

describe("Sidebar collapse handle (BB-FS-1)", () => {
  it("is the 07a 16×28 tab with 8px corners, 2px proud of the rail, centred on the logo", () => {
    renderSidebar();
    const c = classes(handle());
    expect(c).toEqual(expect.arrayContaining(["w-4", "h-7", "rounded-md", "-right-0.5", "top-4.5"]));
    // The old 28px circle hanging 14px off the edge.
    expect(c).not.toContain("rounded-full");
    expect(c).not.toContain("w-7");
    expect(c).not.toContain("-right-3.5");
  });

  it("hovers to a SOLID fill: the translucent accent is layered over --sidebar, never replacing it", () => {
    renderSidebar();
    const c = classes(handle());
    expect(c).toContain("bg-sidebar");
    expect(c).toContain("hover:bg-[linear-gradient(var(--sidebar-accent),var(--sidebar-accent))]");
    expect(c).not.toContain("hover:bg-sidebar-accent");
  });

  it("is a type=button with the shell's focus ring", () => {
    renderSidebar();
    expect(handle()).toHaveAttribute("type", "button");
    expect(classes(handle())).toContain("focus-ring");
  });

  it("hides at rest by default (owner ruling: hover), returning on rail hover, keyboard focus and touch", () => {
    renderSidebar();
    expect(handle()).toHaveAttribute("data-visibility", "hover");
    const c = classes(handle());
    expect(c).toEqual(
      expect.arrayContaining([
        "opacity-0",
        "group-hover/rail:opacity-100",
        "focus-visible:opacity-100",
        "[@media(hover:none)]:opacity-100",
      ]),
    );
    expect(classes(rail())).toContain("group/rail");
  });

  it('keeps the handle at rest with collapseHandle="always", as the 07a/07e frames draw it', () => {
    renderSidebar({ collapseHandle: "always" });
    expect(handle()).toHaveAttribute("data-visibility", "always");
    expect(classes(handle())).not.toContain("opacity-0");
  });

  it('stays visible on the collapsed rail even with collapseHandle="hover"', () => {
    renderSidebar({ collapseHandle: "hover", collapsed: true });
    expect(handle()).toHaveAttribute("data-visibility", "always");
    expect(classes(handle())).not.toContain("opacity-0");
  });
});

describe("Sidebar nesting and the primary/secondary hairline (BB-FS-2)", () => {
  it("indents a nested row 16px on the expanded rail", () => {
    renderSidebar();
    const collections = within(railNav()).getByRole("link", { name: "Collections" });
    expect(classes(collections)).toContain("ms-4");
    expect(classes(within(railNav()).getByRole("link", { name: "Pages" }))).not.toContain("ms-4");
  });

  it("keeps the nested tile flush on the collapsed rail (07a 900 `307:61756`)", () => {
    renderSidebar({ collapsed: true });
    const collections = within(railNav()).getByRole("link", { name: "Collections" });
    expect(classes(collections)).not.toContain("ms-4");
  });

  it("draws exactly one hairline, between Displays and Integrations, inset 16px expanded", () => {
    renderSidebar();
    const separators = railNav().querySelectorAll('[data-slot="sidebar-nav-separator"]');
    expect(separators).toHaveLength(1);
    const sep = separators[0] as HTMLElement;
    expect(sep).toHaveAttribute("aria-hidden", "true");
    expect(sep.previousElementSibling).toHaveTextContent("Displays");
    expect(sep.nextElementSibling).toHaveTextContent("Integrations");
    expect(classes(sep)).toEqual(expect.arrayContaining(["border-t", "border-sidebar-border", "mx-2"]));
  });

  it("keeps the hairline on the collapsed rail at the tile's full width", () => {
    renderSidebar({ collapsed: true });
    const sep = railNav().querySelector<HTMLElement>('[data-slot="sidebar-nav-separator"]')!;
    expect(sep).not.toBeNull();
    expect(classes(sep)).not.toContain("mx-2");
  });

  it("carries both into the header-menu drawer, and leaves the tab bar alone", () => {
    const { unmount } = renderSidebar();
    const drawer = document.querySelector<HTMLElement>('[data-anchor="top"]')!;
    expect(drawer.querySelectorAll('[data-slot="sidebar-nav-separator"]')).toHaveLength(1);
    const drawerCollections = Array.from(drawer.querySelectorAll("a")).find((a) => a.textContent === "Collections")!;
    expect(classes(drawerCollections)).toContain("ms-4");
    unmount();

    renderSidebar({ variant: "bottom-nav", items: IA.filter((i) => !i.nested).slice(0, 4) });
    const bar = document.querySelector<HTMLElement>('[data-slot="sidebar-bottom-nav"]')!;
    expect(bar.querySelector('[data-slot="sidebar-nav-separator"]')).toBeNull();
  });
});

describe("One focus treatment across the shell (BB-FS-3, BB-FS-10)", () => {
  it("rings every rail row with the kit focus-ring, lit or not, internal or external", () => {
    renderSidebar();
    for (const link of within(railNav()).getAllByRole("link")) {
      expect(classes(link)).toContain("focus-ring");
    }
  });

  it("rings the collapsed rail's tiles too", () => {
    renderSidebar({ collapsed: true });
    for (const link of within(railNav()).getAllByRole("link")) {
      expect(classes(link)).toContain("focus-ring");
    }
  });

  it("rings the drawer's rows", () => {
    renderSidebar();
    const drawer = document.querySelector<HTMLElement>('[data-anchor="top"]')!;
    for (const link of Array.from(drawer.querySelectorAll("a"))) {
      expect(classes(link)).toContain("focus-ring");
    }
  });

  it("rings the board selector like the rows under it, not with the form field's half-alpha band", () => {
    render(
      <BoardSelector
        boards={[
          { id: "a", name: "Kitchen" },
          { id: "b", name: "Hallway" },
        ]}
        value="a"
        onChange={() => {}}
        labels={{ boardSelector: "Board", selectBoard: "Select board", unnamedBoard: "Unnamed" }}
      />,
    );
    const trigger = classes(screen.getByRole("combobox", { name: "Board" }));
    expect(trigger).toContain("focus-ring");
    expect(trigger).toContain("focus-visible:border-sidebar-border/70");
  });

  it("draws the skip link with the same ring instead of a 2px ring + shadow of its own", () => {
    render(<SkipToContent label="Skip to content" />);
    const link = screen.getByRole("link", { name: "Skip to content" });
    const c = classes(link);
    expect(c).toContain("focus-ring");
    expect(c).not.toContain("focus:ring-2");
    expect(c).not.toContain("focus:shadow-lg");
  });
});

describe("More sheet state (BB-FS-4)", () => {
  const BAR: SidebarNavItem[] = IA.filter((i) => !i.nested);

  it("lights only More while its drawer is open; the route's tab un-lights but stays aria-current", () => {
    renderSidebar({ variant: "bottom-nav", items: BAR });
    const bar = document.querySelector<HTMLElement>('[data-slot="sidebar-bottom-nav"]')!;
    const home = within(bar).getByRole("link", { name: "Home" });
    const more = within(bar).getByRole("button", { name: "More" });
    expect(classes(home)).toContain("nav-active");

    fireEvent.click(more);
    expect(classes(more)).toContain("nav-active");
    expect(classes(home)).not.toContain("nav-active");
    expect(home).toHaveAttribute("aria-current", "page");

    fireEvent.click(more);
    expect(classes(home)).toContain("nav-active");
  });

  it("dims with the system --overlay above the header, under the bar and the drawer", () => {
    renderSidebar({ variant: "bottom-nav", items: BAR });
    const scrim = screen.getByTestId("mobile-backdrop");
    const c = classes(scrim);
    expect(c).toContain("bg-overlay");
    expect(c).toContain("z-[var(--z-bottom-nav-backdrop)]");
    expect(c).not.toContain("bg-black/25");
    expect(classes(document.querySelector('[data-slot="sidebar-bottom-nav"]')!)).toContain("z-[var(--z-bottom-nav)]");
    expect(classes(document.querySelector('[data-anchor="bottom"]')!)).toContain("z-[var(--z-bottom-nav)]");
  });

  it("leaves the header-menu backdrop under its header (the close button lives there)", () => {
    renderSidebar();
    expect(classes(screen.getByTestId("mobile-backdrop"))).toContain("z-[var(--z-mobile-backdrop)]");
  });
});

describe("Account trigger layout (BB-FS-5)", () => {
  it("holds the chevrons at the trigger's trailing edge, not right after the name", () => {
    render(<SidebarAccountTrigger label="bugbash" collapsed={false} />);
    const label = document.querySelector<HTMLElement>('[data-slot="sidebar-account-label"]')!;
    expect(classes(label)).toContain("flex-1");
    const chevrons = document.querySelector('[data-slot="sidebar-account-chevrons"]')!;
    expect(chevrons.getAttribute("class")).toContain("ms-auto");
  });
});
