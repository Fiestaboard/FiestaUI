import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FileText, HelpCircle, Home, Settings } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

/*
 * Selecting something in the open mobile menu has to close it. Two ways it
 * did not, both reproduced on a phone-sized viewport against FiestaBoard:
 *
 * 1. Rows the app renders into the drawer's footer (`renderSettingsMenu`
 *    with `variant: "mobile"` — Settings, "Update to …") navigated, but had
 *    no way to close the drawer, so it stayed open over the new route and
 *    the tap looked like it did nothing.
 * 2. The drawer opens by un-clipping downward, and `clip-path` clips hit
 *    testing too. A tap on a row the reveal had not reached yet fell through
 *    to the backdrop underneath, which closed the menu and dropped the tap.
 */
describe("Sidebar mobile menu closing", () => {
  const menu = () => screen.queryByRole("dialog", { name: LABELS.navigationMenu });

  /** A link that records each click (href + modifiers) instead of following it. */
  function recordingLink(onRowClick: (href: string, mods: { ctrlKey: boolean; metaKey: boolean }) => void) {
    const link: SidebarProps["renderLink"] = ({ children, onClick, href, ...props }) => (
      <a
        {...props}
        href={href}
        onClick={(e) => {
          e.preventDefault();
          onRowClick(href, { ctrlKey: e.ctrlKey, metaKey: e.metaKey });
          onClick?.();
        }}
      >
        {children}
      </a>
    );
    return link;
  }

  function rect(left: number, top: number, width: number, height: number): DOMRect {
    return {
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect;
  }

  it("hands the mobile footer a closeMenu that closes the drawer", async () => {
    const user = userEvent.setup();
    renderSidebar({
      renderSettingsMenu: ({ variant, closeMenu }) =>
        variant === "mobile" ? (
          <button type="button" onClick={closeMenu}>
            Go to settings
          </button>
        ) : null,
    });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    await user.click(within(menu()!).getByRole("button", { name: "Go to settings" }));

    expect(menu()).not.toBeInTheDocument();
    // Focus goes back to the hamburger, as it does for every other close.
    expect(screen.getByRole("button", { name: LABELS.openMenu })).toHaveFocus();
  });

  it("activates the row under a tap that the opening reveal let fall through to the backdrop", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderSidebar({
      renderLink: ({ children, onClick, href, ...props }) => (
        <a
          {...props}
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onRowClick(href);
            onClick?.();
          }}
        >
          {children}
        </a>
      ),
    });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const dialog = menu()!;
    const pages = within(dialog).getByRole("link", { name: "Pages" });
    // The menu's layout box, which clip-path does not shrink, and the row
    // inside it that the reveal has not reached yet.
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 500));
    vi.spyOn(within(dialog).getByRole("navigation"), "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 400));
    vi.spyOn(pages, "getBoundingClientRect").mockReturnValue(rect(24, 150, 342, 48));

    await user.pointer({
      keys: "[MouseLeft]",
      target: screen.getByTestId("mobile-backdrop"),
      coords: { clientX: 200, clientY: 170 },
    });

    expect(onRowClick).toHaveBeenCalledWith("#pages");
    expect(menu()).not.toBeInTheDocument();
  });

  it("ignores a row the nav has scrolled out from under the tap", async () => {
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderSidebar({
      renderLink: ({ children, onClick, href, ...props }) => (
        <a
          {...props}
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onRowClick(href);
            onClick?.();
          }}
        >
          {children}
        </a>
      ),
    });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const dialog = menu()!;
    // The nav's visible window ends at 300; the row has scrolled below it,
    // into the strip the footer covers.
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 500));
    const nav = within(dialog).getByRole("navigation");
    // jsdom has no stylesheet: stand in for the nav's `overflow-y-auto`.
    nav.style.overflowY = "auto";
    vi.spyOn(nav, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 220));
    vi.spyOn(within(dialog).getByRole("link", { name: "Pages" }), "getBoundingClientRect").mockReturnValue(
      rect(24, 320, 342, 48),
    );

    await user.pointer({
      keys: "[MouseLeft]",
      target: screen.getByTestId("mobile-backdrop"),
      coords: { clientX: 200, clientY: 340 },
    });

    expect(onRowClick).not.toHaveBeenCalled();
    expect(menu()).toBeInTheDocument();
  });

  it("ignores a footer control its own scroll container has scrolled over a visible row", async () => {
    // FiestaBoard's mobile footer is a scroll container of its own
    // (`max-h-[60dvh] overflow-y-auto`). Scrolled, a row it has moved out of
    // its window still has a rect — one that can sit over a nav row the user
    // can see and is aiming at.
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    const onFooter = vi.fn();
    renderSidebar({
      renderLink: recordingLink(onRowClick),
      renderSettingsMenu: ({ variant }) =>
        variant === "mobile" ? (
          <div data-testid="footer-scroll" style={{ overflowY: "auto", maxHeight: 100 }}>
            <button type="button" onClick={onFooter}>
              Go to settings
            </button>
          </div>
        ) : null,
    });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const dialog = menu()!;
    const nav = within(dialog).getByRole("navigation");
    nav.style.overflowY = "auto";
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 300));
    vi.spyOn(nav, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 150));
    vi.spyOn(within(dialog).getByRole("link", { name: "Pages" }), "getBoundingClientRect").mockReturnValue(
      rect(24, 150, 342, 48),
    );
    vi.spyOn(screen.getByTestId("footer-scroll"), "getBoundingClientRect").mockReturnValue(rect(12, 240, 366, 100));
    vi.spyOn(within(dialog).getByRole("button", { name: "Go to settings" }), "getBoundingClientRect").mockReturnValue(
      rect(24, 150, 342, 44),
    );

    await user.pointer({
      keys: "[MouseLeft]",
      target: screen.getByTestId("mobile-backdrop"),
      coords: { clientX: 200, clientY: 170 },
    });

    expect(onFooter).not.toHaveBeenCalled();
    expect(onRowClick).toHaveBeenCalledWith("#pages", expect.anything());
  });

  it("hands a fall-through tap to the innermost control under it", async () => {
    const user = userEvent.setup();
    const onInner = vi.fn();
    renderSidebar({
      renderSettingsMenu: ({ variant }) =>
        variant === "mobile" ? (
          // A focusable composite (a toolbar) wrapping its own control: both
          // boxes hold the point, and only the inner one is what was aimed at.
          <div role="toolbar" tabIndex={0} data-testid="outer">
            <button type="button" onClick={onInner}>
              Inner
            </button>
          </div>
        ) : null,
    });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const dialog = menu()!;
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 500));
    vi.spyOn(screen.getByTestId("outer"), "getBoundingClientRect").mockReturnValue(rect(12, 480, 366, 80));
    vi.spyOn(within(dialog).getByRole("button", { name: "Inner" }), "getBoundingClientRect").mockReturnValue(
      rect(24, 490, 200, 44),
    );

    await user.pointer({
      keys: "[MouseLeft]",
      target: screen.getByTestId("mobile-backdrop"),
      coords: { clientX: 100, clientY: 510 },
    });

    expect(onInner).toHaveBeenCalledTimes(1);
  });

  it("forwards the modifier keys of a fall-through tap to the row", async () => {
    // Ctrl/⌘-click on a link means "open in a new tab"; the row has to see
    // the modifier to let the browser do that instead of routing in place.
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderSidebar({ renderLink: recordingLink(onRowClick) });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const dialog = menu()!;
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 500));
    vi.spyOn(within(dialog).getByRole("link", { name: "Pages" }), "getBoundingClientRect").mockReturnValue(
      rect(24, 150, 342, 48),
    );

    fireEvent.click(screen.getByTestId("mobile-backdrop"), {
      clientX: 200,
      clientY: 170,
      ctrlKey: true,
      metaKey: true,
    });

    expect(onRowClick).toHaveBeenCalledWith("#pages", { ctrlKey: true, metaKey: true });
  });

  it("keeps the menu open for a fall-through tap that lands on no row", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    const dialog = menu()!;
    vi.spyOn(dialog, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 500));

    await user.pointer({
      keys: "[MouseLeft]",
      target: screen.getByTestId("mobile-backdrop"),
      coords: { clientX: 200, clientY: 560 },
    });

    expect(menu()).toBeInTheDocument();
  });

  it("closes on a backdrop click when the menu has no layout box to land in", async () => {
    // jsdom, and any engine that has not laid the menu out: every rect is
    // empty, and a click at (0, 0) must not count as "inside" a 0×0 box.
    const user = userEvent.setup();
    const onRowClick = vi.fn();
    renderSidebar({
      renderLink: ({ children, onClick, href, ...props }) => (
        <a
          {...props}
          href={href}
          onClick={(e) => {
            e.preventDefault();
            onRowClick(href);
            onClick?.();
          }}
        >
          {children}
        </a>
      ),
    });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    fireEvent.click(screen.getByTestId("mobile-backdrop"));

    expect(menu()).not.toBeInTheDocument();
    expect(onRowClick).not.toHaveBeenCalled();
  });

  it("still closes on a backdrop tap outside the menu", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));

    vi.spyOn(menu()!, "getBoundingClientRect").mockReturnValue(rect(12, 80, 366, 500));

    await user.pointer({
      keys: "[MouseLeft]",
      target: screen.getByTestId("mobile-backdrop"),
      coords: { clientX: 200, clientY: 700 },
    });

    expect(menu()).not.toBeInTheDocument();
  });
});

/*
 * Slice 1.4a — the NavItem badge (C1, WEB-14; 07a `302:2340`). A badge is an
 * overlay on the row's icon: a dot, or a count. Either way it is colour and
 * shape, so its meaning travels as words the app supplies (`badge.label`) —
 * in the row's accessible name, where a screen reader hears it with the row.
 */
describe("Sidebar nav badge", () => {
  const BADGED: SidebarNavItem[] = [
    { key: "home", href: "#home", icon: Home, label: "Home", active: true },
    {
      key: "integrations",
      href: "#integrations",
      icon: Settings,
      label: "Integrations",
      badge: { label: "Needs attention" },
    },
    { key: "pages", href: "#pages", icon: FileText, label: "Pages", badge: { count: 3, label: "3 drafts" } },
    {
      key: "help",
      href: "https://example.com/docs",
      icon: HelpCircle,
      label: "Help",
      external: true,
      badge: { count: 120, label: "120 new" },
    },
  ];

  it("draws a dot on the row's icon and says what it means", () => {
    renderSidebar({ items: BADGED });
    const row = within(desktopNav()).getByRole("link", { name: "Integrations, Needs attention" });
    const badge = row.querySelector('[data-slot="nav-badge"]');
    expect(badge).toHaveAttribute("data-kind", "dot");
    expect(badge).toHaveAttribute("aria-hidden", "true");
    expect(badge).toHaveTextContent("");
  });

  it("draws a count, capped at 99+", () => {
    renderSidebar({ items: BADGED });
    const pages = within(desktopNav()).getByRole("link", { name: "Pages, 3 drafts" });
    expect(pages.querySelector('[data-slot="nav-badge"]')).toHaveTextContent("3");
    expect(pages.querySelector('[data-slot="nav-badge"]')).toHaveAttribute("data-kind", "count");
    const help = within(desktopNav()).getByRole("link", { name: "Help, 120 new" });
    expect(help.querySelector('[data-slot="nav-badge"]')).toHaveTextContent("99+");
  });

  it("keeps the badge's words in the name on the collapsed rail, where the label is an aria-label", () => {
    renderSidebar({ items: BADGED, collapsed: true });
    expect(within(desktopNav()).getByRole("link", { name: "Integrations, Needs attention" })).toBeInTheDocument();
    expect(within(desktopNav()).getByRole("link", { name: "Help, 120 new" })).toBeInTheDocument();
    expect(within(desktopNav()).getByRole("link", { name: "Home" })).toBeInTheDocument();
  });

  it("badges the drawer's rows too", async () => {
    const user = userEvent.setup();
    renderSidebar({ items: BADGED });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));
    const dialog = screen.getByRole("dialog", { name: LABELS.navigationMenu });
    expect(within(dialog).getByRole("link", { name: "Integrations, Needs attention" })).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Help, 120 new" })).toBeInTheDocument();
  });

  it("draws nothing for a row without a badge", () => {
    renderSidebar();
    expect(document.querySelector('[data-slot="nav-badge"]')).toBeNull();
  });
});

/*
 * Slice 1.4a — `variant="bottom-nav"` (C1, WEB-01; 07 `53:100587`). Below the
 * rail breakpoint the hamburger gives way to a five-slot tab bar pinned to
 * the bottom. Up to five destinations fit as they are; past that (or when
 * the app has an account menu to reach) the fifth slot is "More", which
 * opens the existing drawer with what did not fit. Order stays the app's.
 */
describe("Sidebar bottom nav", () => {
  const MORE_LABELS: SidebarLabels = { ...LABELS, more: "More" };
  const FIVE: SidebarNavItem[] = [
    { key: "home", href: "#home", icon: Home, label: "Home", active: true },
    { key: "pages", href: "#pages", icon: FileText, label: "Pages" },
    { key: "schedule", href: "#schedule", icon: FileText, label: "Schedule" },
    { key: "displays", href: "#displays", icon: FileText, label: "Displays" },
    { key: "help", href: "https://example.com/docs", icon: HelpCircle, label: "Help", external: true },
  ];
  const EIGHT: SidebarNavItem[] = [
    ...FIVE.slice(0, 4),
    { key: "integrations", href: "#integrations", icon: Settings, label: "Integrations" },
    { key: "picks", href: "#picks", icon: FileText, label: "Staff Picks" },
    { key: "settings", href: "#settings", icon: Settings, label: "Settings" },
    FIVE[4],
  ];

  function bar() {
    return document.querySelector<HTMLElement>('[data-slot="sidebar-bottom-nav"]')!;
  }
  function more() {
    return within(bar()).getByRole("button", { name: /^More/ });
  }

  it("is not rendered by the default variant", () => {
    renderSidebar();
    expect(document.querySelector('[data-slot="sidebar-bottom-nav"]')).toBeNull();
    expect(screen.getByRole("button", { name: LABELS.openMenu })).toBeInTheDocument();
  });

  it("replaces the hamburger with a tab bar named like the rail's nav", () => {
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: FIVE });
    expect(screen.queryByRole("button", { name: LABELS.openMenu })).not.toBeInTheDocument();
    expect(bar().tagName).toBe("NAV");
    expect(bar()).toHaveAccessibleName(LABELS.primaryNavigation);
  });

  it("shows up to five destinations as they are, with no More", () => {
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: FIVE });
    expect(rowsOf(bar())).toEqual(["Home", "Pages", "Schedule", "Displays", "Help"]);
    expect(within(bar()).queryByRole("button")).toBeNull();
    expect(within(bar()).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(within(bar()).getByRole("link", { name: "Help" })).toHaveAttribute("target", "_blank");
  });

  it("folds the sixth destination onward behind More, in order", async () => {
    const user = userEvent.setup();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: EIGHT });
    expect(rowsOf(bar())).toEqual(["Home", "Pages", "Schedule", "Displays", "More"]);
    expect(more()).toHaveAttribute("aria-expanded", "false");
    expect(more()).toHaveAttribute("aria-haspopup", "dialog");

    await user.click(more());

    const dialog = screen.getByRole("dialog", { name: LABELS.navigationMenu });
    expect(more()).toHaveAttribute("aria-expanded", "true");
    expect(more()).toHaveAttribute("aria-controls", dialog.id);
    expect(rowsOf(within(dialog).getByRole("navigation"))).toEqual(["Integrations", "Staff Picks", "Settings", "Help"]);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(more()).toHaveFocus();
  });

  it("toggles the drawer shut from More", async () => {
    const user = userEvent.setup();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: EIGHT });
    await user.click(more());
    await user.click(more());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps More for five destinations when there is an account menu to reach", async () => {
    const user = userEvent.setup();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: FIVE, renderSettingsMenu: settingsMenu });
    expect(rowsOf(bar())).toEqual(["Home", "Pages", "Schedule", "Displays", "More"]);
    await user.click(more());
    const dialog = screen.getByRole("dialog", { name: LABELS.navigationMenu });
    expect(within(dialog).getByTestId("settings-menu")).toBeInTheDocument();
    expect(rowsOf(within(dialog).getByRole("navigation"))).toEqual(["Help"]);
  });

  it("lights More while the current route is one it holds", () => {
    renderSidebar({
      variant: "bottom-nav",
      labels: MORE_LABELS,
      items: EIGHT.map((item) => ({ ...item, active: item.key === "settings" })),
    });
    expect(more().className.split(/\s+/)).toContain("nav-active");
    expect(more()).toHaveAttribute("data-active", "true");
    for (const link of within(bar()).getAllByRole("link")) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("leaves More unlit while the route is on the bar", () => {
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: EIGHT });
    expect(more().className.split(/\s+/)).not.toContain("nav-active");
  });

  it("badges More for a badge it holds, and for the menu notice, in words", () => {
    renderSidebar({
      variant: "bottom-nav",
      labels: MORE_LABELS,
      items: EIGHT.map((item) =>
        item.key === "integrations" ? { ...item, badge: { label: "Integrations need attention" } } : item,
      ),
      menuNotice: "Update available",
    });
    expect(more()).toHaveAccessibleName("More, Integrations need attention, Update available");
    // 07a 308:36070: More rolls the attention up as a count, in red.
    const badge = more().querySelector('[data-slot="nav-badge"]');
    expect(badge).toHaveAttribute("data-kind", "count");
    expect(badge).toHaveAttribute("data-tone", "destructive");
    expect(badge).toHaveTextContent("1");
  });

  it("does not badge More for a badge already on the bar", () => {
    renderSidebar({
      variant: "bottom-nav",
      labels: MORE_LABELS,
      items: EIGHT.map((item) => (item.key === "pages" ? { ...item, badge: { count: 2, label: "2 drafts" } } : item)),
    });
    expect(within(bar()).getByRole("link", { name: "Pages, 2 drafts" })).toBeInTheDocument();
    expect(more().querySelector('[data-slot="nav-badge"]')).toBeNull();
    expect(more()).toHaveAccessibleName("More");
  });

  it("falls back to the drawer's name when the app has not localised More", () => {
    renderSidebar({ variant: "bottom-nav", items: EIGHT });
    expect(within(bar()).getByRole("button", { name: LABELS.navigationMenu })).toBeInTheDocument();
  });

  it("closes the drawer when a row in it is followed", async () => {
    const user = userEvent.setup();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: EIGHT });
    await user.click(more());
    await user.click(within(screen.getByRole("dialog")).getByRole("link", { name: "Settings" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("anchors the drawer above the bar rather than under the header", async () => {
    const user = userEvent.setup();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: EIGHT });
    await user.click(more());
    expect(screen.getByRole("dialog")).toHaveAttribute("data-anchor", "bottom");
  });

  it("shows the mark alone on a phone, so the hub pill shares the header's row", () => {
    const { unmount } = renderSidebar();
    expect(document.querySelector("header .logo-on-gradient")!.className).not.toMatch(/max-\[479px\]:hidden/);
    unmount();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: EIGHT });
    expect(document.querySelector("header .logo-on-gradient")!.className).toMatch(/max-\[479px\]:hidden/);
  });

  it("gives every tab at least a 44px target", () => {
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: EIGHT });
    for (const tab of [...within(bar()).getAllByRole("link"), more()]) {
      expect(tab.className).toMatch(/min-h-\[52px\]/);
    }
  });
});

/*
 * Slice 1.4b — `railBreakpoint` (WEB-02, W5; 07 `61:17544`). The rail can come
 * in at `md` (768) instead of `lg` (1024), so a 900px window gets the rail
 * rather than the phone chrome. jsdom runs no media queries, so the contract
 * is the breakpoint prefix on the classes that swap the two chromes.
 */
describe("Sidebar rail breakpoint", () => {
  function header() {
    return document.querySelector("header")!;
  }

  it("swaps chromes at lg by default", () => {
    renderSidebar();
    expect(header().className).toMatch(/(^|\s)lg:hidden(\s|$)/);
    expect(desktopRail().className).toMatch(/(^|\s)lg:block(\s|$)/);
    expect(desktopRail().className).not.toMatch(/(^|\s)md:/);
    expect(desktopRail()).toHaveAttribute("data-rail-breakpoint", "lg");
  });

  it("swaps chromes at md when asked", () => {
    renderSidebar({ railBreakpoint: "md" });
    expect(header().className).toMatch(/(^|\s)md:hidden(\s|$)/);
    expect(header().className).not.toMatch(/(^|\s)lg:hidden(\s|$)/);
    expect(desktopRail().className).toMatch(/(^|\s)md:block(\s|$)/);
    expect(desktopRail().className).toMatch(/(^|\s)md:w-64(\s|$)/);
    expect(desktopRail().className).not.toMatch(/(^|\s)lg:/);
    expect(screen.getByTestId("mobile-backdrop").className).toMatch(/(^|\s)md:hidden(\s|$)/);
  });

  it("narrows the md rail to the icon column when collapsed", () => {
    renderSidebar({ railBreakpoint: "md", collapsed: true });
    expect(desktopRail().className).toMatch(/(^|\s)md:w-16(\s|$)/);
  });

  it("hides the bottom bar from the same breakpoint", () => {
    renderSidebar({ railBreakpoint: "md", variant: "bottom-nav", labels: { ...LABELS, more: "More" } });
    expect(document.querySelector('[data-slot="sidebar-bottom-nav"]')!.className).toMatch(/(^|\s)md:hidden(\s|$)/);
  });
});

/* Behaviour the 1.4 changes moved through but no earlier test pinned down. */
describe("Sidebar mobile menu keyboard", () => {
  it("wraps Tab and Shift+Tab inside the open drawer", async () => {
    const user = userEvent.setup();
    renderSidebar({ renderSettingsMenu: settingsMenu });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));
    const dialog = screen.getByRole("dialog");
    const links = within(dialog).getAllByRole("link");
    const last = within(dialog).getByTestId("settings-menu");

    expect(links[0]).toHaveFocus();
    await user.tab({ shift: true });
    expect(last).toHaveFocus();
    await user.tab();
    expect(links[0]).toHaveFocus();
  });

  it("lets Tab move on between the ends of the drawer", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));
    const links = within(screen.getByRole("dialog")).getAllByRole("link");
    await user.tab();
    expect(links[1]).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowDown" });
    expect(links[1]).toHaveFocus();
  });

  it("holds focus in a drawer with nothing focusable", async () => {
    const user = userEvent.setup();
    renderSidebar({ items: [] });
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveFocus();
    const event = fireEvent.keyDown(dialog, { key: "Tab" });
    expect(event).toBe(false);
  });

  it("closes an external row's drawer when it is followed", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await user.click(screen.getByRole("button", { name: LABELS.openMenu }));
    const external = within(screen.getByRole("dialog")).getByRole("link", { name: "Help & Docs" });
    external.addEventListener("click", (e) => e.preventDefault());
    await user.click(external);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

describe("Sidebar rail plumbing", () => {
  it("renders the logo as a button when the app handles its click", async () => {
    const user = userEvent.setup();
    const onLogoClick = vi.fn();
    renderSidebar({ onLogoClick, labels: { ...LABELS, logoButtonAriaLabel: "FiestaBoard home" } });
    const [, desktopLogo] = screen.getAllByRole("button", { name: "FiestaBoard home" });
    await user.click(desktopLogo);
    expect(onLogoClick).toHaveBeenCalledTimes(1);
  });

  it("reports the end of the rail's width transition, and only that", () => {
    const onTransitionEnd = vi.fn();
    renderSidebar({ onTransitionEnd });
    fireEvent.transitionEnd(desktopRail(), { propertyName: "opacity" });
    expect(onTransitionEnd).not.toHaveBeenCalled();
    fireEvent.transitionEnd(desktopRail(), { propertyName: "width" });
    expect(onTransitionEnd).toHaveBeenCalledTimes(1);
  });

  it("re-centres the rail against maxWidth when the window resizes", async () => {
    renderSidebar({ maxWidth: 100, sidebarInset: 12 });
    Object.defineProperty(document.body, "clientWidth", { configurable: true, value: 300 });
    fireEvent(window, new Event("resize"));
    fireEvent(window, new Event("resize"));
    await waitFor(() => expect(desktopRail().style.left).toBe("112px"));
    Object.defineProperty(document.body, "clientWidth", { configurable: true, value: 0 });
  });
});

/* Review of #386: M1, S1–S3, S6, S7 and nits N1–N4. */
describe("Sidebar bottom nav, review follow-ups", () => {
  const MORE_LABELS: SidebarLabels = { ...LABELS, more: "More" };
  const ITEMS: SidebarNavItem[] = [
    { key: "home", href: "#home", icon: Home, label: "Home", active: true },
    { key: "pages", href: "#pages", icon: FileText, label: "Pages" },
    { key: "schedule", href: "#schedule", icon: FileText, label: "Schedule" },
    { key: "docs", href: "https://example.com/docs", icon: HelpCircle, label: "Docs", external: true },
    { key: "integrations", href: "#integrations", icon: Settings, label: "Integrations" },
    { key: "picks", href: "#picks", icon: FileText, label: "Staff Picks" },
  ];
  const bar = () => document.querySelector<HTMLElement>('[data-slot="sidebar-bottom-nav"]')!;
  const more = () => within(bar()).getByRole("button", { name: /^More/ });
  const moreBadge = () => more().querySelector('[data-slot="nav-badge"]');

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty("--bottom-nav-offset");
  });

  it("M1: closes the More drawer when a tab on the bar is followed", async () => {
    const user = userEvent.setup();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: ITEMS });
    await user.click(more());
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(within(bar()).getByRole("link", { name: "Pages" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe("");
  });

  it("M1: closes it for an external tab too", async () => {
    const user = userEvent.setup();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: ITEMS });
    await user.click(more());
    const docs = within(bar()).getByRole("link", { name: "Docs" });
    docs.addEventListener("click", (e) => e.preventDefault());
    await user.click(docs);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("S1: a menu notice alone is a brand dot on More, not an error", () => {
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: ITEMS, menuNotice: "Update available" });
    expect(moreBadge()).toHaveAttribute("data-kind", "dot");
    expect(moreBadge()).toHaveAttribute("data-tone", "brand");
    expect(more()).toHaveAccessibleName("More, Update available");
  });

  it("S1/S2: child badges roll up as a red count summing counts, a dot counting as one", () => {
    renderSidebar({
      variant: "bottom-nav",
      labels: MORE_LABELS,
      items: ITEMS.map((item) =>
        item.key === "integrations"
          ? { ...item, badge: { label: "Needs attention" } }
          : item.key === "picks"
            ? { ...item, badge: { count: 3, label: "3 new" } }
            : item,
      ),
    });
    expect(moreBadge()).toHaveAttribute("data-tone", "destructive");
    expect(moreBadge()).toHaveTextContent("4");
    expect(more()).toHaveAccessibleName("More, Needs attention, 3 new");
  });

  it("S2: caps the rolled-up count at 99+", () => {
    renderSidebar({
      variant: "bottom-nav",
      labels: MORE_LABELS,
      items: ITEMS.map((item) => (item.key === "picks" ? { ...item, badge: { count: 150, label: "150 new" } } : item)),
    });
    expect(moreBadge()).toHaveTextContent("99+");
  });

  it("S2: rows inside the drawer keep their own badges", async () => {
    const user = userEvent.setup();
    renderSidebar({
      variant: "bottom-nav",
      labels: MORE_LABELS,
      items: ITEMS.map((item) =>
        item.key === "integrations" ? { ...item, badge: { label: "Needs attention" } } : item,
      ),
    });
    await user.click(more());
    const row = within(screen.getByRole("dialog")).getByRole("link", { name: "Integrations, Needs attention" });
    expect(row.querySelector('[data-slot="nav-badge"]')).toHaveAttribute("data-tone", "destructive");
  });

  it("S7: keeps the bar clear of the home indicator", () => {
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: ITEMS });
    expect(bar().className).toContain("bottom-[calc(0.75rem+env(safe-area-inset-bottom))]");
  });

  it("N1: a zero count is no badge, on the row and in the roll-up", () => {
    renderSidebar({
      variant: "bottom-nav",
      labels: MORE_LABELS,
      items: ITEMS.map((item) =>
        item.key === "pages" || item.key === "picks" ? { ...item, badge: { count: 0, label: "0 new" } } : item,
      ),
    });
    expect(within(bar()).getByRole("link", { name: "Pages" }).querySelector('[data-slot="nav-badge"]')).toBeNull();
    expect(moreBadge()).toBeNull();
    expect(more()).toHaveAccessibleName("More");
  });

  it("N2: warns in development when bottom-nav has no word for More", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderSidebar({ variant: "bottom-nav", items: ITEMS });
    expect(warn.mock.calls.some(([msg]) => /labels\.more/.test(String(msg)))).toBe(true);
  });

  it("N2: stays quiet when More is labelled", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: ITEMS });
    expect(warn).not.toHaveBeenCalled();
  });

  it("N3: a More holding only the account menu draws no empty list", async () => {
    const user = userEvent.setup();
    renderSidebar({
      variant: "bottom-nav",
      labels: MORE_LABELS,
      items: ITEMS.slice(0, 4),
      renderSettingsMenu: settingsMenu,
    });
    await user.click(more());
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("navigation")).toBeNull();
    expect(within(dialog).getByTestId("settings-menu")).toBeInTheDocument();
  });

  it("N4: names the drawer's list after More, so it is not a second 'Primary navigation'", async () => {
    const user = userEvent.setup();
    renderSidebar({ variant: "bottom-nav", labels: MORE_LABELS, items: ITEMS });
    await user.click(more());
    expect(within(screen.getByRole("dialog")).getByRole("navigation")).toHaveAccessibleName("More");
  });
});

describe("Sidebar hamburger roll-up (S3)", () => {
  const hamburger = () => screen.getByRole("button", { name: LABELS.openMenu });
  const BADGED: SidebarNavItem[] = [
    ...DESTINATIONS,
    {
      key: "integrations",
      href: "#integrations",
      icon: Settings,
      label: "Integrations",
      badge: { label: "Needs attention" },
    },
  ];

  it("counts badges waiting in the closed drawer, in red, and says what they are", () => {
    renderSidebar({ items: BADGED, menuNotice: "Update available" });
    const badge = hamburger().querySelector('[data-slot="nav-badge"]');
    expect(badge).toHaveAttribute("data-tone", "destructive");
    expect(badge).toHaveTextContent("1");
    expect(hamburger()).toHaveAccessibleDescription("Needs attention, Update available");
    // The red count stands for both; the brand dot does not stack on top of it.
    expect(document.querySelector('[data-slot="sidebar-menu-notice"]')).toBeNull();
  });

  it("drops the count while the drawer is open", async () => {
    const user = userEvent.setup();
    renderSidebar({ items: BADGED });
    await user.click(hamburger());
    const close = screen.getByRole("button", { name: LABELS.closeMenu });
    expect(close.querySelector('[data-slot="nav-badge"]')).toBeNull();
    expect(close).not.toHaveAttribute("aria-describedby");
  });

  it("keeps the brand notice dot when nothing in the drawer is badged", () => {
    renderSidebar({ menuNotice: "Update available" });
    expect(hamburger().querySelector('[data-slot="nav-badge"]')).toBeNull();
    expect(document.querySelector('[data-slot="sidebar-menu-notice"]')).not.toBeNull();
    expect(hamburger()).toHaveAccessibleDescription("Update available");
  });
});

describe("Sidebar --bottom-nav-offset (S6)", () => {
  type Listener = () => void;
  let listeners: Listener[] = [];
  let matches = true;
  let queries: string[] = [];

  function stubMatchMedia() {
    listeners = [];
    queries = [];
    vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
      queries.push(query);
      return {
        get matches() {
          return matches;
        },
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: (_: string, l: Listener) => listeners.push(l),
        removeEventListener: (_: string, l: Listener) => {
          listeners = listeners.filter((x) => x !== l);
        },
        dispatchEvent: () => false,
      } as unknown as MediaQueryList;
    });
  }
  const offset = () => document.documentElement.style.getPropertyValue("--bottom-nav-offset");

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.style.removeProperty("--bottom-nav-offset");
    matches = true;
  });

  it("publishes the bar's footprint below the rail breakpoint, and clears it on unmount", () => {
    stubMatchMedia();
    const { unmount } = renderSidebar({ variant: "bottom-nav", labels: { ...LABELS, more: "More" } });
    expect(queries).toContain("(max-width: 1023.98px)");
    expect(offset()).toBe("88px");
    unmount();
    expect(offset()).toBe("");
    expect(listeners).toHaveLength(0);
  });

  it("follows the breakpoint as the window crosses it", () => {
    stubMatchMedia();
    renderSidebar({ variant: "bottom-nav", labels: { ...LABELS, more: "More" }, railBreakpoint: "md" });
    expect(queries).toContain("(max-width: 767.98px)");
    matches = false;
    listeners.forEach((l) => l());
    expect(offset()).toBe("");
    matches = true;
    listeners.forEach((l) => l());
    expect(offset()).toBe("88px");
  });

  it("publishes nothing for the header-menu variant", () => {
    stubMatchMedia();
    renderSidebar();
    expect(offset()).toBe("");
  });
});
