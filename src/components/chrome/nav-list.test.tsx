import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  NavList,
  NavListItem,
  NavListLink,
  NavListSection,
  NavListSectionContent,
  NavListSectionTrigger,
} from "./nav-list";

/*
 * NavList's promises all live in the accessibility tree: a real list of real
 * list items, exactly one `aria-current` in it, a disclosure button whose
 * `aria-expanded` tracks its panel, and a collapsed section that removes its
 * links from BOTH the accessibility tree and the tab order. Every assertion
 * below is queried the way an assistive technology reaches it; the active
 * pill's fill is VRT's problem, not this file's.
 */

function DocsNav(props: {
  activeHref?: string;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const { activeHref, ...section } = props;
  return (
    <nav aria-label="Docs">
      <NavList>
        <NavListItem>
          <NavListLink href="/docs" active={activeHref === "/docs"}>
            Getting started
          </NavListLink>
        </NavListItem>
        <NavListSection {...section}>
          <NavListSectionTrigger>Components</NavListSectionTrigger>
          <NavListSectionContent>
            <NavListItem>
              <NavListLink href="/docs/button" active={activeHref === "/docs/button"}>
                Button
              </NavListLink>
            </NavListItem>
            <NavListItem>
              <NavListLink href="/docs/chip" active={activeHref === "/docs/chip"}>
                Chip
              </NavListLink>
            </NavListItem>
          </NavListSectionContent>
        </NavListSection>
        <NavListItem>
          <NavListLink href="/docs/tokens" active={activeHref === "/docs/tokens"}>
            Tokens
          </NavListLink>
        </NavListItem>
      </NavList>
    </nav>
  );
}

describe("NavList", () => {
  it("renders a list whose items are the rows, inside the consumer's landmark", () => {
    render(<DocsNav />);

    // The landmark belongs to the caller — NavList is deliberately not a <nav>,
    // so dropping it into an existing sidebar or menu adds no second landmark.
    const list = within(screen.getByRole("navigation", { name: "Docs" })).getByRole("list");
    // Three top-level rows: two links and the collapsed section.
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  });

  it("marks the active row with aria-current and leaves every other row unmarked", () => {
    render(<DocsNav activeHref="/docs" defaultOpen />);

    expect(screen.getByRole("link", { name: "Getting started" })).toHaveAttribute("aria-current", "page");
    for (const name of ["Button", "Chip", "Tokens"]) {
      expect(screen.getByRole("link", { name })).not.toHaveAttribute("aria-current");
    }
  });

  it("exposes the active row as a data attribute for consumer styling", () => {
    render(<DocsNav activeHref="/docs/tokens" />);

    const active = screen.getByRole("link", { name: "Tokens" });
    expect(active).toHaveAttribute("data-active", "");
    expect(active).toHaveAttribute("data-slot", "nav-list-link");
    expect(screen.getByRole("link", { name: "Getting started" })).not.toHaveAttribute("data-active");
  });

  it("lets a table of contents say aria-current='location' instead of 'page'", () => {
    render(
      <NavList>
        <NavListItem>
          <NavListLink href="#tokens" active current="location">
            Tokens
          </NavListLink>
        </NavListItem>
      </NavList>,
    );

    // A TOC entry is a position within the current page, not a different page:
    // "page" on an in-page anchor tells a screen-reader user they have arrived
    // somewhere they have not.
    expect(screen.getByRole("link", { name: "Tokens" })).toHaveAttribute("aria-current", "location");
  });

  it("gives every row its own tab stop, in document order", async () => {
    const user = userEvent.setup();
    render(<DocsNav defaultOpen />);

    // Links are not a composite widget: this is a list of independent
    // destinations, so it takes N tab stops and no arrow-key handling — the
    // opposite of ToggleGroup's roving tabindex.
    await user.tab();
    expect(screen.getByRole("link", { name: "Getting started" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Components" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Button" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Chip" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Tokens" })).toHaveFocus();
  });

  it("renders the caller's element through asChild so a router Link keeps the row's contract", () => {
    render(
      <NavList>
        <NavListItem>
          <NavListLink asChild active>
            <a href="/router-owned" data-testid="router-link">
              Overview
            </a>
          </NavListLink>
        </NavListItem>
      </NavList>,
    );

    const link = screen.getByRole("link", { name: "Overview" });
    expect(link).toHaveAttribute("data-testid", "router-link");
    expect(link).toHaveAttribute("href", "/router-owned");
    expect(link).toHaveAttribute("data-slot", "nav-list-link");
    expect(link).toHaveAttribute("aria-current", "page");
  });
});

describe("NavListSection", () => {
  it("starts collapsed, and a collapsed section hides its links from AT and the tab order", async () => {
    const user = userEvent.setup();
    render(<DocsNav />);

    const trigger = screen.getByRole("button", { name: "Components" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("link", { name: "Button" })).not.toBeInTheDocument();

    // The tab order must agree with the accessibility tree: a hidden row that
    // still takes a tab stop is the classic collapsed-menu focus trap.
    await user.tab();
    await user.tab();
    expect(trigger).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "Tokens" })).toHaveFocus();
  });

  it("expands on click and nests the section's rows in their own list", async () => {
    const user = userEvent.setup();
    render(<DocsNav />);

    const trigger = screen.getByRole("button", { name: "Components" });
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // A sub-list nested inside the section's own <li> — the markup that makes
    // AT announce "list, 2 items" for the subtree instead of flattening it.
    const section = trigger.closest("li");
    expect(section).not.toBeNull();
    const sublist = within(section as HTMLElement).getByRole("list");
    expect(within(sublist).getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Button" })).toBeInTheDocument();
  });

  it("toggles from the keyboard with Enter and Space", async () => {
    const user = userEvent.setup();
    render(<DocsNav />);

    const trigger = screen.getByRole("button", { name: "Components" });
    trigger.focus();

    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("reports the open state as a single boolean, not Base UI's (open, eventDetails) pair", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<DocsNav onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Components" }));

    // The extra argument leaks into `onOpenChange={setOpen}` call sites as a
    // bogus second setState argument — the same normalisation Toggle does.
    expect(onOpenChange).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(true);
  });

  it("honours a controlled open prop", () => {
    const { rerender } = render(<DocsNav open={false} onOpenChange={() => {}} />);
    expect(screen.queryByRole("link", { name: "Button" })).not.toBeInTheDocument();

    rerender(<DocsNav open onOpenChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Components" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: "Button" })).toBeInTheDocument();
  });

  it("keeps the caret out of the accessibility tree", () => {
    render(<DocsNav defaultOpen />);

    // The chevron duplicates aria-expanded; announcing it would make the
    // trigger read "Components, chevron".
    const trigger = screen.getByRole("button", { name: "Components" });
    expect(trigger.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(trigger).toHaveAccessibleName("Components");
  });
});
