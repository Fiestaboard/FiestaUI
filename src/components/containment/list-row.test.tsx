import { fireEvent, render, screen, within } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../overlays/dropdown-menu";
import { ListItem } from "../typography/list";
import { ListRow, ListRowChevron, ListRowGroup, ListRowItem } from "./list-row";

/*
 * ListRow (slice 1.8a, C16). Appearance is VRT's job; this pins the
 * structure the web slices build on:
 *
 *   * the five slots render in reading order, and an empty slot renders no
 *     wrapper (so a row without a leading tile does not keep its gap);
 *   * the layout axis: `inline` keeps the meta beside the text, `stacked`
 *     always drops it under the description, `auto` lets it wrap only when
 *     the text column would fall below a rem-based floor (large text);
 *   * a row inside a ListRowGroup is an <li> in a role="list", and takes the
 *     group's row variant unless it sets its own;
 *   * `render` swaps the element (a link row, a button row) and the row
 *     forwards every prop and ref, which is what lets a context-menu trigger
 *     or a sortable item wrap it.
 */

function row(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="list-row"]');
  if (!el) throw new Error("no [data-slot=list-row] rendered");
  return el;
}

function slot(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-slot="list-row-${name}"]`);
}

describe("ListRow", () => {
  it("renders every slot in reading order", () => {
    render(
      <ListRow
        leading={<span>tile</span>}
        title="Schedule Mode"
        description="Pages change on their own"
        meta="On"
        trailing={<span>chevron</span>}
      />,
    );

    const order = Array.from(row().querySelectorAll<HTMLElement>("[data-slot^='list-row-']")).map((el) =>
      el.dataset.slot?.replace("list-row-", ""),
    );
    expect(order).toEqual(["leading", "body", "text", "title", "description", "meta", "trailing"]);
    expect(row()).toHaveTextContent("Schedule ModePages change on their ownOn");
  });

  it("renders no wrapper for an empty slot", () => {
    render(<ListRow title="FiestaPi" />);

    expect(slot("title")).toHaveTextContent("FiestaPi");
    for (const name of ["leading", "description", "meta", "trailing"]) {
      expect(slot(name)).toBeNull();
    }
  });

  it("is a plain div by default, with no role and no tab stop", () => {
    render(<ListRow title="FiestaPi" />);

    expect(row().tagName).toBe("DIV");
    expect(row()).not.toHaveAttribute("role");
    expect(row()).not.toHaveAttribute("tabindex");
  });

  it.each([
    ["inline", "inline"],
    ["stacked", "stacked"],
    ["auto", "auto"],
  ] as const)("stamps data-layout=%s", (layout, expected) => {
    render(<ListRow title="Schedule Mode" meta="On" layout={layout} />);
    expect(row()).toHaveAttribute("data-layout", expected);
  });

  it("defaults to the auto layout", () => {
    render(<ListRow title="Schedule Mode" meta="On" />);
    expect(row()).toHaveAttribute("data-layout", "auto");
  });

  it("puts the meta on its own line when stacked", () => {
    render(<ListRow title="Schedule Mode" meta="On" layout="stacked" />);
    expect(slot("meta")?.className).toContain("basis-full");
  });

  it("lets the meta wrap only past a rem floor when auto", () => {
    render(<ListRow title="Schedule Mode" meta="On" layout="auto" />);
    // The text column's flex-basis is in rem, so it grows with the reader's
    // font size and the meta wraps under it at large text sizes.
    expect(slot("text")?.className).toMatch(/flex-\[1_1_\d+rem\]/);
    expect(slot("meta")?.className).not.toContain("basis-full");
  });

  it("keeps the meta beside the text when inline", () => {
    render(<ListRow title="Schedule Mode" meta="On" layout="inline" />);
    expect(slot("text")?.className).toContain("flex-1");
    expect(slot("meta")?.className).not.toContain("basis-full");
  });

  it.each(["plain", "card"] as const)("stamps data-variant=%s", (variant) => {
    render(<ListRow title="Market open" variant={variant} />);
    expect(row()).toHaveAttribute("data-variant", variant);
  });

  it.each(["default", "touch"] as const)("stamps data-size=%s", (size) => {
    render(<ListRow title="Market open" size={size} />);
    expect(row()).toHaveAttribute("data-size", size);
  });

  // BB-FK-9, owner ruling 2026-11-21: a touch row is the native 05 Setup /
  // Row (`35:17332`): min-h 60, px 16, py 10, gap 12, title 16/24 medium,
  // subtitle 14/20 muted.
  it("draws a touch row as the 05 Setup row", () => {
    render(<ListRow title="Market open" description="Weekdays" size="touch" />);
    const c = row().className.split(/\s+/);
    expect(c).toEqual(expect.arrayContaining(["min-h-15", "py-2.5", "px-4", "gap-3"]));
    expect(c).not.toContain("min-h-14");
    const title = row().querySelector('[data-slot="list-row-title"]')!;
    expect(title.className.split(/\s+/)).toEqual(expect.arrayContaining(["text-base", "font-medium"]));
    const description = row().querySelector('[data-slot="list-row-description"]')!;
    expect(description.className.split(/\s+/)).toEqual(expect.arrayContaining(["text-sm", "text-muted-foreground"]));
  });

  it("keeps the dense default row as it was (48px floor, 14px title)", () => {
    render(<ListRow title="Market open" />);
    expect(row().className.split(/\s+/)).toEqual(expect.arrayContaining(["min-h-12", "py-2"]));
  });

  it("never styles Base UI's data-pressed (it means 'popup open' on a menu trigger)", () => {
    render(<ListRow title="Market open" variant="card" />);
    expect(row().className).not.toMatch(/data-\[pressed\]/);
  });

  it("renders as the element passed to render, keeping its own props", () => {
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content
    render(<ListRow render={<a href="/displays/kitchen" />} title="Kitchen board" />);

    const link = screen.getByRole("link", { name: "Kitchen board" });
    expect(link).toBe(row());
    expect(link).toHaveAttribute("href", "/displays/kitchen");
  });

  it("forwards props and a ref to its root", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ListRow ref={ref} title="Kitchen board" aria-label="Kitchen board row" data-testid="r" />);

    expect(ref.current).toBe(row());
    expect(row()).toHaveAttribute("aria-label", "Kitchen board row");
    expect(row()).toHaveAttribute("data-testid", "r");
  });

  it("keeps its own data-slot when a context-menu trigger renders it, and opens the menu", async () => {
    render(
      <DropdownMenu trigger="context">
        <DropdownMenuTrigger asChild>
          <ListRow title="Kitchen board" />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Rename</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(row()).toHaveTextContent("Kitchen board");
    fireEvent.contextMenu(row(), { clientX: 10, clientY: 10 });
    expect(await screen.findByRole("menu")).toBeInTheDocument();
    expect(row()).toHaveAttribute("data-popup-open");
  });

  it("keeps row text selectable when there is no context trigger", () => {
    render(<ListRow title="Kitchen board" />);
    expect(row()).not.toHaveClass("select-none");
  });

  it("gives only link and button rows the hover fill", () => {
    render(<ListRow title="Kitchen board" />);
    expect(row().className).toContain("[&:is(a,button)]:hover:bg-accent");
    expect(row().className).not.toMatch(/(^|\s)hover:bg-accent/);
  });

  it("merges a caller className", () => {
    render(<ListRow title="Kitchen board" className="custom-row" />);
    expect(row().className).toContain("custom-row");
  });
});

describe("ListRow selected (slice 1.8e, 07e list-detail)", () => {
  it("is not selected by default: no data-selected, no aria-current", () => {
    render(<ListRow title="Network" />);
    expect(row()).not.toHaveAttribute("data-selected");
    expect(row()).not.toHaveAttribute("aria-current");
  });

  it("marks the row as the current page", () => {
    render(<ListRow title="Network" selected />);
    expect(row()).toHaveAttribute("data-selected", "");
    expect(row()).toHaveAttribute("aria-current", "page");
  });

  it("takes another kind of current, as NavListLink does", () => {
    render(<ListRow title="Network" selected current="location" />);
    expect(row()).toHaveAttribute("aria-current", "location");
  });

  it("lets an explicit aria-current win", () => {
    render(<ListRow title="Network" selected aria-current="step" />);
    expect(row()).toHaveAttribute("aria-current", "step");
  });

  it("draws the 07e inset pill: an accent fill 4px inside the row, radius md, behind the content", () => {
    render(<ListRow title="Network" selected />);
    const cls = row().className;
    // The fill is a pseudo-element inset from the row's edges, so it never
    // reaches the group's rounded corners or its dividers.
    expect(cls).toContain("isolate");
    expect(cls).toContain("before:inset-1");
    expect(cls).toContain("before:rounded-md");
    expect(cls).toContain("before:bg-accent");
    expect(cls).toContain("before:-z-10");
    // The row itself paints no fill of its own.
    expect(cls).not.toMatch(/(^|\s)bg-accent(\s|$)/);
  });

  it("does not take the edge-to-edge hover fill while selected", () => {
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content
    render(<ListRow title="Network" selected render={<a href="/settings/network" />} />);
    expect(row().className).not.toContain("[&:is(a,button)]:hover:bg-accent");
  });

  it("sets the selected title in semibold (07e Text/sm/semibold)", () => {
    render(<ListRow title="Network" selected />);
    expect(slot("title")).toHaveClass("font-semibold");
    expect(slot("title")).not.toHaveClass("font-medium");
  });

  it("an unselected title stays medium", () => {
    render(<ListRow title="Network" />);
    expect(slot("title")).toHaveClass("font-medium");
  });

  it("a selected link row inside a group is the group's current item", () => {
    render(
      <ListRowGroup aria-label="Hub">
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content */}
          <ListRow render={<a href="/settings/network" />} title="Network" selected />
        </li>
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content */}
          <ListRow render={<a href="/settings/system" />} title="System" />
        </li>
      </ListRowGroup>,
    );
    expect(screen.getByRole("link", { name: "Network" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "System" })).not.toHaveAttribute("aria-current");
  });
});

describe("ListRowGroup", () => {
  it("is a role=list whose rows are list items", () => {
    render(
      <ListRowGroup aria-label="Displays">
        <ListRow title="Kitchen board" />
        <ListRow title="Hallway" />
      </ListRowGroup>,
    );

    const list = screen.getByRole("list", { name: "Displays" });
    expect(list.tagName).toBe("UL");
    // Explicit, because Safari drops list semantics from list-style:none.
    expect(list).toHaveAttribute("role", "list");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("listitem")[0]).toHaveAttribute("data-slot", "list-row");
  });

  it.each([
    ["inset", "plain"],
    ["plain", "plain"],
    ["separated", "card"],
  ] as const)("a %s group gives its rows the %s variant", (variant, rowVariant) => {
    render(
      <ListRowGroup variant={variant}>
        <ListRow title="Kitchen board" />
      </ListRowGroup>,
    );

    expect(document.querySelector('[data-slot="list-row-group"]')).toHaveAttribute("data-variant", variant);
    expect(row()).toHaveAttribute("data-variant", rowVariant);
  });

  it("lets a row override the group's variant", () => {
    render(
      <ListRowGroup variant="separated">
        <ListRow title="Kitchen board" variant="plain" />
      </ListRowGroup>,
    );
    expect(row()).toHaveAttribute("data-variant", "plain");
  });

  it("passes its size to rows that do not set one", () => {
    render(
      <ListRowGroup size="touch">
        <ListRow title="Kitchen board" />
        <ListRow title="Hallway" size="default" />
      </ListRowGroup>,
    );
    const rows = document.querySelectorAll('[data-slot="list-row"]');
    expect(rows[0]).toHaveAttribute("data-size", "touch");
    expect(rows[1]).toHaveAttribute("data-size", "default");
  });

  it("a row rendered as a link inside a group keeps the link element", () => {
    render(
      <ListRowGroup>
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content */}
          <ListRow render={<a href="/a" />} title="A" />
        </li>
      </ListRowGroup>,
    );
    expect(screen.getByRole("link", { name: "A" })).toHaveAttribute("data-slot", "list-row");
  });
});

/*
 * BB-B-20: axe `aria-required-children` on the Creator IDE Explorer. A
 * role="list" may only own listitems, and a ListRow with `render` (a link or
 * button row) used to become a direct <a>/<button> child of the group's <ul>.
 * These pin the axe rule structurally (jsdom runs no axe): every element
 * child of the list is an <li>, no <li> sits inside another, and the
 * interactive row keeps its own element, slot, props and ref.
 */
describe("ListRowGroup list semantics (BB-B-20)", () => {
  function expectValidList(list: HTMLElement, items: number) {
    for (const child of Array.from(list.children)) {
      expect(child.tagName, `direct child ${child.outerHTML.slice(0, 80)}`).toBe("LI");
    }
    expect(list.querySelectorAll("li li")).toHaveLength(0);
    expect(within(list).getAllByRole("listitem")).toHaveLength(items);
  }

  it.each(["inset", "plain", "separated"] as const)(
    "a %s group's rows are listitems with and without render",
    (variant) => {
      const ref = React.createRef<HTMLDivElement>();
      render(
        <ListRowGroup variant={variant} aria-label="Pages">
          <ListRow title="Plain row" />
          {/* eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content */}
          <ListRow ref={ref} render={<a href="/pages/a" />} title="Link row" data-testid="link-row" />
          <ListRow render={<button type="button" />} title="Button row" />
          <ListRow render={<div />} title="Div row" />
        </ListRowGroup>,
      );

      const list = screen.getByRole("list", { name: "Pages" });
      expectValidList(list, 4);

      const link = screen.getByRole("link", { name: "Link row" });
      expect(link).toHaveAttribute("data-slot", "list-row");
      expect(link).toHaveAttribute("data-testid", "link-row");
      expect(ref.current).toBe(link);
      expect(link.parentElement?.parentElement).toBe(list);
      expect(screen.getByRole("button", { name: "Button row" }).parentElement?.tagName).toBe("LI");
      // The row variant still comes from the group through the wrapper.
      expect(link).toHaveAttribute("data-variant", variant === "separated" ? "card" : "plain");
      // A wrapped plain row follows its <li>'s corners (inset first/last);
      // a card row keeps its own radius.
      if (variant === "separated") {
        expect(link).toHaveClass("rounded-xl");
        expect(link).not.toHaveClass("rounded-[inherit]");
      } else {
        expect(link).toHaveClass("rounded-[inherit]");
      }
      // A row that is the <li> itself is unchanged.
      expect(screen.getByText("Plain row").closest('[data-slot="list-row"]')).not.toHaveClass("rounded-[inherit]");
    },
  );

  it("keeps a single listitem when the row is already wrapped in an <li>, ListItem or ListRowItem", () => {
    render(
      <ListRowGroup aria-label="Pages">
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content */}
          <ListRow render={<a href="/a" />} title="Raw li" />
        </li>
        <ListItem>
          <ListRow render={<button type="button" />} title="ListItem" />
        </ListItem>
        <ListRowItem>
          <ListRow title="ListRowItem" />
        </ListRowItem>
      </ListRowGroup>,
    );
    expectValidList(screen.getByRole("list", { name: "Pages" }), 3);
  });

  it("does not wrap a row rendered as an <li>", () => {
    render(
      <ListRowGroup aria-label="Pages">
        <ListRow render={<li data-testid="own-li" />} title="Own li" />
      </ListRowGroup>,
    );
    expectValidList(screen.getByRole("list", { name: "Pages" }), 1);
    expect(screen.getByTestId("own-li")).toHaveAttribute("data-slot", "list-row");
  });

  it("a group nested inside an item wraps its own link rows again", () => {
    render(
      <ListRowGroup aria-label="Outer">
        <ListRowItem>
          <ListRowGroup aria-label="Inner">
            {/* eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content */}
            <ListRow render={<a href="/inner" />} title="Inner link" />
          </ListRowGroup>
        </ListRowItem>
      </ListRowGroup>,
    );
    const inner = screen.getByRole("list", { name: "Inner" });
    for (const child of Array.from(inner.children)) expect(child.tagName).toBe("LI");
    expect(within(inner).getAllByRole("listitem")).toHaveLength(1);
  });

  it("does not wrap a link row outside a group", () => {
    // eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content
    const { container } = render(<ListRow render={<a href="/a" />} title="Alone" />);
    expect(container.firstElementChild?.tagName).toBe("A");
  });
});

// BB-FK-9: the 05 Setup row's trailing chevron is 16px (lucide's own default
// is 24). ListRowChevron is that affordance, so no host sizes it by hand.
describe("ListRowChevron", () => {
  it("is a 16px decorative chevron in the trailing slot", () => {
    render(<ListRow title="Network" trailing={<ListRowChevron />} />);
    const trailing = row().querySelector('[data-slot="list-row-trailing"]')!;
    const svg = trailing.querySelector("svg")!;
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("data-slot", "list-row-chevron");
    expect(svg.getAttribute("class")!.split(/\s+/)).toContain("size-4");
  });

  it("mirrors in right-to-left text and takes a className", () => {
    render(<ListRowChevron className="text-foreground" />);
    const svg = document.querySelector('[data-slot="list-row-chevron"]')!;
    expect(svg.getAttribute("class")!.split(/\s+/)).toEqual(
      expect.arrayContaining(["rtl:-scale-x-100", "text-foreground"]),
    );
  });
});
