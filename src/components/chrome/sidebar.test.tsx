import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText, HelpCircle, Home, Settings } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { Sidebar, type SidebarLabels, type SidebarNavItem, type SidebarProps } from "./sidebar";

/*
 * The rail's promise is now a structural one: ONE nav landmark holding ONE
 * flat list of DESTINATIONS, in the order the app handed it over. What is
 * NOT in that list is just as load-bearing — the assistant is a footer
 * action, not a row, because a row of its own gave the rail two highlighted
 * things at once (route + panel) whenever the drawer was open over a page.
 *
 * That is a shape the accessibility tree can see, so it belongs here rather
 * than in VRT: the count of landmarks, the rows of the list, and which
 * controls sit outside it are exactly what jsdom models well and what a
 * screenshot cannot assert.
 *
 * The other half of this file guards the deprecation window. `primaryItems`
 * and `secondaryItems` must keep rendering the same DOM `items` does, for as
 * long as they exist — the whole point of shipping aliases instead of a
 * breaking change.
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
};

const DESTINATIONS: SidebarNavItem[] = [
  { key: "home", href: "#home", icon: Home, label: "Home", active: true },
  { key: "pages", href: "#pages", icon: FileText, label: "Pages" },
];

const UTILITIES: SidebarNavItem[] = [
  { key: "help", href: "https://example.com/docs", icon: HelpCircle, label: "Help & Docs", external: true },
  { key: "settings", href: "#settings", icon: Settings, label: "Settings" },
];

const renderLink: SidebarProps["renderLink"] = ({ children, ...props }) => <a {...props}>{children}</a>;

const AI: SidebarProps["ai"] = { active: false, onOpen: () => {} };
const settingsMenu: SidebarProps["renderSettingsMenu"] = ({ collapsed }) => (
  <button type="button" data-testid="settings-menu">
    {collapsed ? "⚙" : "casa"}
  </button>
);

function renderSidebar(overrides: Partial<SidebarProps> = {}) {
  return render(
    <Sidebar
      labels={LABELS}
      items={[...DESTINATIONS, ...UTILITIES]}
      renderLink={renderLink}
      collapsed={false}
      onToggleCollapsed={() => {}}
      maxWidth={1680}
      sidebarInset={12}
      {...overrides}
    />,
  );
}

/**
 * The row sequence of a nav, top to bottom. Rows are the nav's direct
 * children whatever element they happen to be — an `<a>`, the caller's own
 * node — so this reads the list the way the eye does rather than the way any
 * one row is built.
 */
function rowsOf(nav: HTMLElement) {
  return Array.from(nav.children).map((row) => row.textContent?.trim() ?? "");
}

/** The desktop rail's nav. The mobile menu is `aria-hidden` while closed, so it is not in the tree. */
function desktopNav() {
  return screen.getByRole("navigation", { name: LABELS.primaryNavigation });
}

/** The desktop rail itself, for scoping away the always-in-the-DOM mobile chrome. */
function desktopRail() {
  return screen.getByRole("complementary", { name: LABELS.mainNavigation });
}

function desktopFooter() {
  return desktopRail().querySelector<HTMLElement>('[data-slot="sidebar-footer"]')!;
}

describe("Sidebar nav structure", () => {
  it("renders exactly one nav landmark", () => {
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("stacks every destination in one list, in the order given", () => {
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });
    expect(rowsOf(desktopNav())).toEqual(["Home", "Pages", "Help & Docs", "Settings"]);
  });

  it("keeps the assistant out of the nav list", () => {
    // The bug this closes: with the assistant as a nav row, opening the
    // drawer from /pages lit BOTH Pages (the route) and AI Assistant (the
    // panel). Nothing in the list may claim to be the assistant.
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });
    expect(within(desktopNav()).queryByRole("button", { name: LABELS.aiAssistant })).not.toBeInTheDocument();
    expect(rowsOf(desktopNav())).not.toContain(LABELS.aiAssistant);
  });

  it("leaves every nav row unhighlighted while the assistant is active", () => {
    renderSidebar({
      ai: { active: true, onOpen: () => {} },
      items: DESTINATIONS.map((i) => ({ ...i, active: false })),
    });
    for (const row of Array.from(desktopNav().children)) {
      // Whole-token match: `nav-active-hover` is on every INACTIVE row, and
      // a \b regex matches it too because `-` is a word boundary.
      expect(row.className.split(/\s+/)).not.toContain("nav-active");
    }
  });

  it("honours an explicitly empty list instead of falling back to the deprecated props", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    renderSidebar({ items: [], primaryItems: DESTINATIONS, secondaryItems: UTILITIES });
    expect(rowsOf(desktopNav())).toEqual([]);
  });

  it("warns rather than silently dropping deprecated props passed alongside items", () => {
    // The failure this guards is a half-finished migration: `primaryItems`
    // moved into `items`, `secondaryItems` left behind, help and settings
    // gone from the rail with a clean build and no type error.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderSidebar({ secondaryItems: UTILITIES });

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/IGNORED/);
    // …and the warning describes what actually rendered.
    expect(rowsOf(desktopNav())).toEqual(["Home", "Pages", "Help & Docs", "Settings"]);
  });

  it("stays quiet when only one prop shape is used", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { unmount } = renderSidebar();
    unmount();
    renderSidebar({ items: undefined, primaryItems: DESTINATIONS, secondaryItems: UTILITIES });
    expect(warn).not.toHaveBeenCalled();
  });

  it("renders one nav in the mobile menu too", async () => {
    const user = userEvent.setup();
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });

    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    // Both rails are in the DOM at once — Tailwind's breakpoints do not run
    // in jsdom — so an open menu means exactly two navs, never four.
    const navs = screen.getAllByRole("navigation", { name: LABELS.primaryNavigation });
    expect(navs).toHaveLength(2);

    const mobileNav = within(screen.getByRole("dialog", { name: LABELS.navigationMenu })).getByRole("navigation");
    expect(rowsOf(mobileNav)).toEqual(["Home", "Pages", "Help & Docs", "Settings"]);
  });
});

describe("Sidebar footer", () => {
  it("renders the settings menu the app supplies", () => {
    renderSidebar({ renderSettingsMenu: settingsMenu });
    expect(within(desktopFooter()).getByTestId("settings-menu")).toBeInTheDocument();
  });

  it("tells the settings menu whether the rail is collapsed", () => {
    // The trigger is a full-width name+chevron button expanded and a bare
    // icon at 64px, so the app cannot render one shape for both.
    renderSidebar({ collapsed: true, renderSettingsMenu: settingsMenu });
    expect(within(desktopFooter()).getByTestId("settings-menu")).toHaveTextContent("⚙");
  });

  it("puts the assistant in the footer, after the settings menu", () => {
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });
    const footer = desktopFooter();
    const settings = within(footer).getByTestId("settings-menu");
    const assistant = within(footer).getByRole("button", { name: LABELS.aiAssistant });
    // Node.DOCUMENT_POSITION_FOLLOWING — the assistant comes after.
    expect(settings.compareDocumentPosition(assistant) & 4).toBeTruthy();
  });

  it("lays the footer out as a row when expanded and a stack when collapsed", () => {
    const { unmount } = renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });
    expect(desktopFooter()).toHaveAttribute("data-orientation", "horizontal");
    unmount();

    renderSidebar({ collapsed: true, ai: AI, renderSettingsMenu: settingsMenu });
    expect(desktopFooter()).toHaveAttribute("data-orientation", "vertical");
  });

  it("gives the settings menu the width the assistant does not take", () => {
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });
    const slot = desktopFooter().querySelector('[data-slot="sidebar-settings-menu"]');
    expect(slot?.className).toMatch(/\bflex-1\b/);
  });

  it("opens the assistant from the footer", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderSidebar({ ai: { active: false, onOpen }, renderSettingsMenu: settingsMenu });

    await user.click(within(desktopFooter()).getByRole("button", { name: LABELS.aiAssistant }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("marks the footer assistant as pressed while the drawer is open", () => {
    renderSidebar({ ai: { active: true, onOpen: () => {} }, renderSettingsMenu: settingsMenu });
    expect(within(desktopFooter()).getByRole("button", { name: LABELS.aiAssistant })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("hides the assistant entirely when no provider is configured", () => {
    renderSidebar({ renderSettingsMenu: settingsMenu });
    expect(screen.queryByRole("button", { name: LABELS.aiAssistant })).not.toBeInTheDocument();
  });

  it("keeps the settings menu in the mobile menu's footer", async () => {
    const user = userEvent.setup();
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const menu = screen.getByRole("dialog", { name: LABELS.navigationMenu });
    const footer = menu.querySelector<HTMLElement>('[data-slot="sidebar-footer"]')!;
    expect(within(footer).getByTestId("settings-menu")).toBeInTheDocument();
  });
});

describe("Sidebar mobile header", () => {
  const mobileHeader = () => screen.getByRole("banner");

  it("puts the assistant beside the board selector, not in the menu", () => {
    renderSidebar({
      ai: AI,
      renderSettingsMenu: settingsMenu,
      mobileBoardSelector: <div data-testid="mobile-boards">Living Room</div>,
    });

    const header = mobileHeader();
    const boards = within(header).getByTestId("mobile-boards");
    const assistant = within(header).getByRole("button", { name: LABELS.aiAssistant });
    expect(boards.compareDocumentPosition(assistant) & 4).toBeTruthy();
  });

  it("shows the assistant in the header even when there is no board selector", () => {
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu });
    expect(within(mobileHeader()).getByRole("button", { name: LABELS.aiAssistant })).toBeInTheDocument();
  });
});

describe("Sidebar deprecated primaryItems/secondaryItems", () => {
  it("renders the same single list as items", () => {
    const { unmount } = renderSidebar();
    const viaItems = rowsOf(desktopNav());
    unmount();

    renderSidebar({
      items: undefined,
      primaryItems: DESTINATIONS,
      secondaryItems: UTILITIES,
    });
    expect(rowsOf(desktopNav())).toEqual(viaItems);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("renders an empty list when neither prop is supplied", () => {
    renderSidebar({ items: undefined });
    expect(rowsOf(desktopNav())).toEqual([]);
  });
});
