import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText, HelpCircle, Home, Settings } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Sidebar, type SidebarLabels, type SidebarNavItem, type SidebarProps } from "./sidebar";

/*
 * The rail's promise is now a structural one: ONE nav landmark holding ONE
 * flat list, in the order the app handed it over — help, settings, the AI
 * row and the account row are rows in that list, not a fenced-off block
 * below it. That is a shape the accessibility tree can see, so it belongs
 * here rather than in VRT: the count of landmarks and the order of rows are
 * exactly what jsdom models well and what a screenshot cannot assert.
 *
 * The other half of this file guards the deprecation window. `primaryItems`
 * and `secondaryItems` must keep rendering the same DOM `items` does, with
 * the AI row still at the seam between them, for as long as they exist —
 * the whole point of shipping aliases instead of a breaking change.
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
const account = () => <div data-testid="account">casa@example.com</div>;

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
 * children whatever element they happen to be — an `<a>`, the AI `<button>`,
 * the caller's account node — so this reads the list the way the eye does
 * rather than the way any one row is built.
 */
function rowsOf(nav: HTMLElement) {
  return Array.from(nav.children).map((row) => row.textContent?.trim() ?? "");
}

/** The desktop rail's nav. The mobile menu is `aria-hidden` while closed, so it is not in the tree. */
function desktopNav() {
  return screen.getByRole("navigation", { name: LABELS.primaryNavigation });
}

describe("Sidebar nav structure", () => {
  it("renders exactly one nav landmark", () => {
    renderSidebar({ ai: AI, renderAccount: account });
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("stacks every row in one list, in the order given, with AI and account last", () => {
    renderSidebar({ ai: AI, renderAccount: account });
    expect(rowsOf(desktopNav())).toEqual([
      "Home",
      "Pages",
      "Help & Docs",
      "Settings",
      "AI Assistant",
      "casa@example.com",
    ]);
  });

  it("puts the account row inside the scrolling list, not the pinned footer", () => {
    renderSidebar({ renderAccount: account });
    expect(within(desktopNav()).getByTestId("account")).toBeInTheDocument();
  });

  it("honours an explicitly empty list instead of falling back to the deprecated props", () => {
    renderSidebar({ items: [], primaryItems: DESTINATIONS, secondaryItems: UTILITIES });
    expect(rowsOf(desktopNav())).toEqual([]);
  });

  it("renders one nav in the mobile menu too", async () => {
    const user = userEvent.setup();
    renderSidebar({ ai: AI, renderAccount: account });

    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    // Both rails are in the DOM at once — Tailwind's breakpoints do not run
    // in jsdom — so an open menu means exactly two navs, never four.
    const navs = screen.getAllByRole("navigation", { name: LABELS.primaryNavigation });
    expect(navs).toHaveLength(2);

    const mobileNav = within(screen.getByRole("dialog", { name: LABELS.navigationMenu })).getByRole("navigation");
    expect(rowsOf(mobileNav)).toEqual(["Home", "Pages", "Help & Docs", "Settings", "AI Assistant", "casa@example.com"]);
  });
});

describe("Sidebar deprecated primaryItems/secondaryItems", () => {
  it("renders the same single list as items", () => {
    const { unmount } = renderSidebar({ renderAccount: account });
    const viaItems = rowsOf(desktopNav());
    unmount();

    renderSidebar({
      items: undefined,
      primaryItems: DESTINATIONS,
      secondaryItems: UTILITIES,
      renderAccount: account,
    });
    expect(rowsOf(desktopNav())).toEqual(viaItems);
    expect(screen.getAllByRole("navigation")).toHaveLength(1);
  });

  it("keeps the AI row at the primary/secondary seam so migrating consumers see no reshuffle", () => {
    renderSidebar({
      items: undefined,
      primaryItems: DESTINATIONS,
      secondaryItems: UTILITIES,
      ai: AI,
      renderAccount: account,
    });
    expect(rowsOf(desktopNav())).toEqual([
      "Home",
      "Pages",
      "AI Assistant",
      "Help & Docs",
      "Settings",
      "casa@example.com",
    ]);
  });

  it("renders an empty list when neither prop is supplied", () => {
    renderSidebar({ items: undefined });
    expect(rowsOf(desktopNav())).toEqual([]);
  });
});
