import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../overlays/dropdown-menu";
import { TopNav, TopNavActions, TopNavBrand, TopNavItem, TopNavLink, TopNavList, TopNavMenuTrigger } from "./top-nav";

/*
 * TopNav's promises are the accessibility tree, the two structural decisions
 * it documents (it owns no landmark and no positioning), and the published
 * `data-slot`/`data-active` contract — the things a consumer and a screen
 * reader can actually observe. Tailwind does not run in jsdom, so the pill's
 * fill and the bar's geometry are VRT's problem, not this file's.
 *
 * The exception is the positioning assertion. "Owns no positioning" is a
 * promise about the class string this component emits, not about layout, so
 * the class string is exactly the right thing to assert: it is what a host
 * shell inherits when it drops the bar into a slot it positions itself.
 */

function DocsBar(props: { activeHref?: string; menuActive?: boolean }) {
  return (
    <TopNav>
      <TopNavBrand href="/">FiestaUI</TopNavBrand>
      <TopNavList>
        <TopNavItem>
          <TopNavLink href="/docs" active={props.activeHref === "/docs"}>
            Docs
          </TopNavLink>
        </TopNavItem>
        <TopNavItem>
          <TopNavLink href="/blog" active={props.activeHref === "/blog"}>
            Blog
          </TopNavLink>
        </TopNavItem>
        <TopNavItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <TopNavMenuTrigger active={props.menuActive}>Versions</TopNavMenuTrigger>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem render={<a href="/v5">v5 (current)</a>} />
              <DropdownMenuItem render={<a href="/v4">v4</a>} />
            </DropdownMenuContent>
          </DropdownMenu>
        </TopNavItem>
      </TopNavList>
      <TopNavActions>
        <a href="https://github.com/Fiestaboard/FiestaUI" aria-label="GitHub">
          GH
        </a>
      </TopNavActions>
    </TopNav>
  );
}

function bar(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="top-nav"]');
  if (!el) throw new Error("no [data-slot=top-nav] element rendered");
  return el;
}

describe("TopNav — the landmark decision", () => {
  it("renders no landmark of its own", () => {
    render(<DocsBar />);

    // DECISION 1: the requester swizzles Docusaurus's Navbar/Content, which
    // already renders inside <nav aria-label="Main">. A <nav> here would nest
    // a nav in a nav and put two indistinguishable entries in the landmark
    // list — the same reason NavList is a bare <ul>.
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(bar().tagName).toBe("DIV");
  });

  it("becomes the caller's landmark through asChild, with the caller's localized name", () => {
    render(
      <TopNav asChild>
        <nav aria-label="Principal">
          <TopNavList>
            <TopNavItem>
              <TopNavLink href="/docs">Docs</TopNavLink>
            </TopNavItem>
          </TopNavList>
        </nav>
      </TopNav>,
    );

    const landmark = screen.getByRole("navigation", { name: "Principal" });
    // One element, not a <div> wrapped in a <nav>: asChild renders the
    // caller's element rather than adding one.
    expect(landmark).toHaveAttribute("data-slot", "top-nav");
    expect(within(landmark).getByRole("list")).toBeInTheDocument();
  });

  it("puts the destinations in a real list so AT can count them", () => {
    render(<DocsBar />);

    const list = screen.getByRole("list");
    // Three items: two links and the dropdown's trigger.
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    // The trailing actions are deliberately NOT list items — they are controls
    // of different kinds sharing an edge, not a list of destinations.
    expect(within(list).queryByRole("link", { name: "GitHub" })).not.toBeInTheDocument();
  });
});

describe("TopNav — the positioning decision", () => {
  it("emits no position, no inset and no z-index", () => {
    render(<DocsBar />);

    // DECISION 2: the bar is dropped into shells other people position —
    // Docusaurus's .navbar is already sticky and already carries hideOnScroll's
    // transform. A child that re-declares `fixed` leaves that flow entirely.
    const classes = bar().className.split(/\s+/);
    for (const forbidden of [/^(?:fixed|sticky|absolute)$/, /^(?:top|right|bottom|left|inset)-/, /^z-/]) {
      expect(classes.filter((cls) => forbidden.test(cls))).toEqual([]);
    }
  });

  it("lets the caller pin it, because className wins", () => {
    render(
      <TopNav className="sticky top-0 z-[var(--z-mobile-header)]">
        <TopNavBrand href="/">FiestaUI</TopNavBrand>
      </TopNav>,
    );

    expect(bar()).toHaveClass("sticky", "top-0", "z-[var(--z-mobile-header)]");
    // …and the bar's own surface survives the merge.
    expect(bar()).toHaveClass("bg-background");
  });
});

describe("TopNavLink", () => {
  it("marks the active row with aria-current and leaves every other row unmarked", () => {
    render(<DocsBar activeHref="/docs" />);

    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Blog" })).not.toHaveAttribute("aria-current");
  });

  it("exposes the active row as a data attribute for consumer styling", () => {
    render(<DocsBar activeHref="/blog" />);

    const active = screen.getByRole("link", { name: "Blog" });
    expect(active).toHaveAttribute("data-active", "");
    expect(active).toHaveAttribute("data-slot", "top-nav-link");
    expect(screen.getByRole("link", { name: "Docs" })).not.toHaveAttribute("data-active");
  });

  it("lets a section row say aria-current='location' instead of 'page'", () => {
    render(
      <TopNavList>
        <TopNavItem>
          <TopNavLink href="/docs" active current="location">
            Docs
          </TopNavLink>
        </TopNavItem>
      </TopNavList>,
    );

    expect(screen.getByRole("link", { name: "Docs" })).toHaveAttribute("aria-current", "location");
  });

  it("renders the caller's element through asChild so a router Link keeps the row's contract", () => {
    render(
      <TopNavList>
        <TopNavItem>
          <TopNavLink asChild active>
            <a href="/router-owned" data-testid="router-link">
              Docs
            </a>
          </TopNavLink>
        </TopNavItem>
      </TopNavList>,
    );

    const link = screen.getByRole("link", { name: "Docs" });
    expect(link).toHaveAttribute("data-testid", "router-link");
    expect(link).toHaveAttribute("href", "/router-owned");
    expect(link).toHaveAttribute("data-slot", "top-nav-link");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  it("renders the brand through asChild too", () => {
    render(
      <TopNav>
        <TopNavBrand asChild>
          <a href="/home" data-testid="router-brand">
            FiestaUI
          </a>
        </TopNavBrand>
      </TopNav>,
    );

    const brand = screen.getByRole("link", { name: "FiestaUI" });
    expect(brand).toHaveAttribute("data-testid", "router-brand");
    expect(brand).toHaveAttribute("href", "/home");
    expect(brand).toHaveAttribute("data-slot", "top-nav-brand");
    // The brand is the site's mark, not a nav row: it never paints a pill.
    expect(brand).not.toHaveAttribute("aria-current");
  });
});

describe("TopNav — keyboard navigation", () => {
  it("gives every row its own tab stop, in document order", async () => {
    const user = userEvent.setup();
    render(<DocsBar />);

    // Links are not a composite widget: this is a row of independent
    // destinations, so it takes N tab stops and no arrow-key handling — the
    // APG's own guidance for a link list, and the same call NavList made.
    await user.tab();
    expect(screen.getByRole("link", { name: "FiestaUI" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Docs" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Blog" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Versions" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "GitHub" })).toHaveFocus();
  });

  it("opens the menu from the keyboard and moves focus into it", async () => {
    const user = userEvent.setup();
    render(<DocsBar />);

    const trigger = screen.getByRole("button", { name: "Versions" });
    trigger.focus();
    await user.keyboard("{ArrowDown}");

    // ArrowDown-to-open and the highlight are Base UI's, inherited by handing
    // it this button rather than re-argued here.
    const menu = await screen.findByRole("menu");
    await waitFor(() => expect(within(menu).getByRole("menuitem", { name: "v5 (current)" })).toHaveFocus());
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<DocsBar />);

    const trigger = screen.getByRole("button", { name: "Versions" });
    await user.click(trigger);
    expect(await screen.findByRole("menu")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe("TopNavMenuTrigger — the DropdownMenu composition", () => {
  it("is a menu button whose ARIA comes from Base UI", async () => {
    const user = userEvent.setup();
    render(<DocsBar />);

    const trigger = screen.getByRole("button", { name: "Versions" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toHaveAttribute("data-popup-open");
    // A bare <button>, so it never submits a form it happens to sit in.
    expect(trigger).toHaveAttribute("type", "button");

    await user.click(trigger);
    await screen.findByRole("menu");

    await waitFor(() => expect(trigger).toHaveAttribute("aria-expanded", "true"));
    // The caret's rotation reads this attribute; nothing is plumbed to it.
    expect(trigger).toHaveAttribute("data-popup-open", "");
  });

  it("opens the shipped DropdownMenu surface, with real links inside it", async () => {
    const user = userEvent.setup();
    render(<DocsBar />);

    await user.click(screen.getByRole("button", { name: "Versions" }));

    const menu = await screen.findByRole("menu");
    // The panel is DropdownMenuContent — the package's --popover surface —
    // rather than a hand-rolled .dropdown__menu rule set.
    expect(menu).toHaveAttribute("data-slot", "dropdown-menu-content");

    const items = within(menu).getAllByRole("menuitem");
    expect(items.map((item) => item.textContent)).toEqual(["v5 (current)", "v4"]);
    // Rendered as anchors, so middle-click, copy-link and open-in-new-tab all
    // still work on what are, after all, navigation destinations.
    expect(items[0]).toHaveAttribute("href", "/v5");
    expect(items[1]).toHaveAttribute("href", "/v4");
  });

  it("paints the pill when the current page is inside the menu, without claiming to be that page", () => {
    render(<DocsBar menuActive />);

    const trigger = screen.getByRole("button", { name: "Versions" });
    expect(trigger).toHaveAttribute("data-active", "");
    // aria-current belongs to the menu item that points at the page, not to
    // the button that opens the menu.
    expect(trigger).not.toHaveAttribute("aria-current");
  });

  it("keeps the caret out of the accessibility tree", () => {
    render(<DocsBar />);

    const trigger = screen.getByRole("button", { name: "Versions" });
    expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(trigger).toHaveAccessibleName("Versions");
  });
});
