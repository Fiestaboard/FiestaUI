import { fireEvent, render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../overlays/dropdown-menu";
import { ListRow, ListRowGroup } from "./list-row";

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

  it("gives a touch row a 56px floor", () => {
    render(<ListRow title="Market open" size="touch" />);
    expect(row().className).toContain("min-h-14");
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

  it("merges a caller className", () => {
    render(<ListRow title="Kitchen board" className="custom-row" />);
    expect(row().className).toContain("custom-row");
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
