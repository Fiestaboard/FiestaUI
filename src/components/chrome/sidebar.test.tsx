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

describe("Sidebar menu notice", () => {
  const mobileHeader = () => document.querySelector<HTMLElement>("header")!;
  const hamburgerDot = () => mobileHeader().querySelector('[data-slot="sidebar-menu-notice"]');

  it("puts no dot on the hamburger by default", () => {
    renderSidebar();
    expect(hamburgerDot()).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: LABELS.openMenu })).not.toHaveAttribute("aria-describedby");
  });

  it("dots the closed hamburger and describes why", () => {
    // In the drawer the account menu's rows are inline, so there is no
    // trigger to wear the dot; the hamburger is the only thing on screen.
    renderSidebar({ menuNotice: "Update available" });
    const button = screen.getByRole("button", { name: LABELS.openMenu });
    expect(button).toHaveAccessibleDescription("Update available");
    expect(button).toContainElement(hamburgerDot() as HTMLElement);
  });

  it("drops the dot while the drawer is open, where the glyph is a close X", async () => {
    const user = userEvent.setup();
    renderSidebar({ menuNotice: "Update available" });
    expect(hamburgerDot()).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const close = within(mobileHeader()).getByRole("button", { name: LABELS.closeMenu });
    expect(close).not.toHaveAttribute("aria-describedby");
    expect(hamburgerDot()).not.toBeInTheDocument();
  });

  it("hands the notice to the account menu, and draws no dot of its own on the rail", () => {
    // The rail's dot belongs on the app's trigger, which gets the words
    // through the slot; a second dot from the Sidebar would be a double.
    const seen: Array<string | undefined> = [];
    renderSidebar({
      menuNotice: "Update available",
      renderSettingsMenu: ({ variant, notice }) => {
        if (variant === "desktop") seen.push(notice);
        return <button type="button">casa</button>;
      },
    });
    expect(seen.at(-1)).toBe("Update available");
    expect(desktopRail().querySelector('[data-slot="sidebar-menu-notice"]')).not.toBeInTheDocument();
  });

  it("hands over no notice when there is none", () => {
    const seen: Array<string | undefined> = [];
    renderSidebar({
      menuNotice: "",
      renderSettingsMenu: ({ notice }) => {
        seen.push(notice);
        return null;
      },
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen.every((n) => n === undefined)).toBe(true);
    expect(hamburgerDot()).not.toBeInTheDocument();
  });
});

describe("Sidebar settings shortcut", () => {
  const SETTINGS: SidebarProps["settings"] = { href: "#settings", label: "Settings" };
  const shortcut = () => within(desktopFooter()).queryByRole("link", { name: "Settings" });

  it("renders a link to settings in the footer", () => {
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu, settings: SETTINGS });
    expect(shortcut()).toHaveAttribute("href", "#settings");
    // The handle the app's tests and e2e find it by. Asserted present here
    // so the "absent" tests below are not vacuously true of a typo.
    expect(shortcut()).toHaveAttribute("data-slot", "sidebar-settings-link");
  });

  it("names itself in a tooltip, being icon-only at every width", async () => {
    const user = userEvent.setup();
    renderSidebar({ items: DESTINATIONS, settings: SETTINGS });

    await user.hover(shortcut()!);
    expect(await screen.findByText("Settings")).toBeInTheDocument();
  });

  it("still prefetches on hover and focus with the tooltip's handlers merged in", async () => {
    // The tooltip trigger attaches its own onMouseEnter/onFocus to the same
    // element; the app's must survive the merge.
    const user = userEvent.setup();
    const onPrefetch = vi.fn();
    renderSidebar({ items: DESTINATIONS, settings: { ...SETTINGS, onPrefetch } });

    await user.hover(shortcut()!);
    expect(onPrefetch).toHaveBeenCalledTimes(1);
    shortcut()!.focus();
    expect(onPrefetch).toHaveBeenCalledTimes(2);
  });

  it("works through a link that is a component, not a bare anchor", async () => {
    // The app's renderLink returns its own router-link component. Everything
    // the Sidebar and the tooltip hand over — name, slot, ref, handlers —
    // has to arrive on the anchor that component renders.
    function AppLink({ children, ...props }: React.ComponentProps<"a">) {
      return <a {...props}>{children}</a>;
    }
    const user = userEvent.setup();
    renderSidebar({
      items: DESTINATIONS,
      settings: { ...SETTINGS, active: true },
      renderLink: ({ children, ...props }) => <AppLink {...props}>{children}</AppLink>,
    });

    expect(shortcut()).toHaveAttribute("data-slot", "sidebar-settings-link");
    expect(shortcut()).toHaveAttribute("aria-current", "page");
    await user.hover(shortcut()!);
    expect(await screen.findByText("Settings")).toBeInTheDocument();
  });

  it("sits between the account menu and the assistant", () => {
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu, settings: SETTINGS });
    const footer = desktopFooter();
    const menu = within(footer).getByTestId("settings-menu");
    const assistant = within(footer).getByRole("button", { name: LABELS.aiAssistant });
    // Node.DOCUMENT_POSITION_FOLLOWING — menu, then gear, then assistant.
    expect(menu.compareDocumentPosition(shortcut()!) & 4).toBeTruthy();
    expect(shortcut()!.compareDocumentPosition(assistant) & 4).toBeTruthy();
  });

  it("is rendered through the app's link, so it navigates client-side", () => {
    const renderAppLink = vi.fn(renderLink);
    renderSidebar({ items: [], settings: SETTINGS, renderLink: renderAppLink });
    expect(renderAppLink).toHaveBeenCalledWith(
      expect.objectContaining({ href: "#settings", "aria-label": "Settings" }),
      expect.objectContaining({ key: "settings", href: "#settings" }),
    );
  });

  it("marks itself as the current page while settings is the route", () => {
    // Settings is not a row of the list, so on /settings nothing else on the
    // rail can answer "where am I".
    renderSidebar({ settings: { ...SETTINGS, active: true } });
    expect(shortcut()).toHaveAttribute("aria-current", "page");
    expect(shortcut()!.className.split(/\s+/)).toContain("nav-active");
  });

  it("claims nothing while settings is not the route", () => {
    renderSidebar({ settings: SETTINGS });
    expect(shortcut()).not.toHaveAttribute("aria-current");
    expect(shortcut()!.className.split(/\s+/)).not.toContain("nav-active");
  });

  it("stays on the collapsed rail, still named", () => {
    renderSidebar({ collapsed: true, ai: AI, renderSettingsMenu: settingsMenu, settings: SETTINGS });
    expect(shortcut()).toBeInTheDocument();
  });

  it("takes the rail's full width when collapsed, like the nav tiles above it", () => {
    // A 36px square under 48px nav tiles makes the lit gear a visibly
    // smaller "on" than the lit Home row.
    const { unmount } = renderSidebar({ ai: AI, settings: SETTINGS });
    const assistant = () => within(desktopFooter()).getByRole("button", { name: LABELS.aiAssistant });
    expect(shortcut()!.className.split(/\s+/)).toContain("w-9");
    expect(assistant().className.split(/\s+/)).toContain("w-9");
    unmount();

    renderSidebar({ collapsed: true, ai: AI, settings: SETTINGS });
    expect(shortcut()!.className.split(/\s+/)).toContain("w-full");
    expect(assistant().className.split(/\s+/)).toContain("w-full");
  });

  it("is absent unless the app asks for it", () => {
    renderSidebar({ items: DESTINATIONS, ai: AI, renderSettingsMenu: settingsMenu });
    expect(shortcut()).not.toBeInTheDocument();
  });

  it("renders a footer for the shortcut alone", () => {
    renderSidebar({ settings: SETTINGS });
    expect(shortcut()).toBeInTheDocument();
  });

  it("stays out of the mobile chrome, where the drawer lists settings itself", async () => {
    const user = userEvent.setup();
    // DESTINATIONS only: the shared list carries a "Settings" nav row, and
    // this has to be able to say there is NO settings link on mobile.
    renderSidebar({ items: DESTINATIONS, ai: AI, renderSettingsMenu: settingsMenu, settings: SETTINGS });
    expect(shortcut()).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));
    const menu = screen.getByRole("dialog", { name: LABELS.navigationMenu });
    expect(within(menu).queryByRole("link", { name: "Settings" })).not.toBeInTheDocument();
  });
});

describe("Sidebar current page", () => {
  it("announces the active nav row as the current page", () => {
    // The fill is for the eye. Without aria-current the settings shortcut
    // was the only link on the rail a screen reader ever heard as current.
    renderSidebar();
    expect(within(desktopNav()).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(within(desktopNav()).getByRole("link", { name: "Pages" })).not.toHaveAttribute("aria-current");
  });

  it("announces it in the mobile menu too", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const mobileNav = within(screen.getByRole("dialog", { name: LABELS.navigationMenu })).getByRole("navigation");
    expect(within(mobileNav).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(within(mobileNav).getByRole("link", { name: "Pages" })).not.toHaveAttribute("aria-current");
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

describe("Sidebar footer box", () => {
  // The account menu, the gear and the assistant share ONE footer box under
  // the nav's hairline — the rail's bottom margin and the hairline margin
  // are that box's padding, nothing else's. The strip used to sit in a
  // padded row nested inside another padded block, which is how the footer
  // ended up 16px above and 20px below while every other seam on the rail
  // was 12. Geometry is VRT's job; the shape (one box, every footer
  // control, outside the scrolling list, on the rhythm's classes) is what
  // jsdom can hold onto.
  it("pins the account menu and the chips together in one box outside the nav", () => {
    renderSidebar({ ai: AI, renderSettingsMenu: settingsMenu, settings: { href: "#settings", label: "Settings" } });
    const footer = desktopFooter();
    const menu = within(footer).getByTestId("settings-menu");
    const gear = within(footer).getByRole("link", { name: "Settings" });
    const assistant = within(footer).getByRole("button", { name: LABELS.aiAssistant });
    const box = footer.parentElement;

    expect(box?.contains(menu)).toBe(true);
    expect(box?.contains(gear)).toBe(true);
    expect(box?.contains(assistant)).toBe(true);
    expect(box?.contains(desktopNav())).toBe(false);
    // pt-3 to the hairline, pb-4 to the rail's edge — the logo row's pt-4 /
    // pb-3, mirrored.
    expect(box?.className).toBe("shrink-0 px-2 pt-3 pb-4");
  });

  it("gives the nav list the hairline margin on both ends", () => {
    renderSidebar();
    expect(desktopNav().className.split(/\s+/)).toContain("py-3");
  });
});
