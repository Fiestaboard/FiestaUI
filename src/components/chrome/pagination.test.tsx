import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import {
  Pagination,
  type PaginationLabels,
  type PaginationLinkItem,
  type PaginationLinkProps,
  paginationRange,
} from "./pagination";

/*
 * Pagination's promises are the accessibility tree and the truncation
 * arithmetic, and both are fully visible in jsdom: a named landmark holding a
 * real list, exactly one `aria-current="page"`, chevrons that have names
 * despite having no text, dead ends that are hidden rather than focusable,
 * and a slot range whose LENGTH does not change as the reader walks. The
 * button-shaped fills are VRT's problem — no stylesheet loads here.
 */

const LABELS: PaginationLabels = {
  navigation: "Blog pages",
  previous: "Previous page",
  next: "Next page",
  page: (page) => `Page ${page}`,
  ellipsis: "More pages",
};

function Pager(props: { page: number; totalPages: number; onNavigate?: (page: number) => void }) {
  return (
    <Pagination
      page={props.page}
      totalPages={props.totalPages}
      labels={LABELS}
      renderLink={({ children, ...linkProps }, item) => (
        <a
          href={`/blog/page/${item.page}`}
          {...linkProps}
          onClick={(event) => {
            event.preventDefault();
            props.onNavigate?.(item.page);
          }}
        >
          {children}
        </a>
      )}
    />
  );
}

/** The visible text of the pager's slots, in order. */
function slotText(): string[] {
  const list = within(screen.getByRole("navigation", { name: "Blog pages" })).getByRole("list");
  return within(list)
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

describe("Pagination", () => {
  it("renders a named nav landmark wrapping a real list", () => {
    render(<Pager page={1} totalPages={12} />);

    // The name is required and localized: an unnamed nav is indistinguishable
    // from the site nav in a landmark list.
    const nav = screen.getByRole("navigation", { name: "Blog pages" });
    expect(within(nav).getByRole("list")).toBeInTheDocument();
  });

  it("renders nothing at all when there is only one page", () => {
    const { container } = render(<Pager page={1} totalPages={1} />);

    // An empty named landmark is worse than no pager.
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("marks exactly one link aria-current='page', and keeps it a link", () => {
    render(<Pager page={4} totalPages={12} />);

    const current = screen.getByRole("link", { name: "Page 4" });
    expect(current).toHaveAttribute("aria-current", "page");

    // Unlike a breadcrumb's tail, the current page IS a real destination
    // (reload, share, back), so it stays focusable.
    const marked = screen.getAllByRole("link").filter((link) => link.getAttribute("aria-current") === "page");
    expect(marked).toHaveLength(1);
  });

  it("names every numbered link so the name contains its visible text", () => {
    render(<Pager page={1} totalPages={12} />);

    // SC 2.5.3, Label in Name: "Page 4" contains "4", so voice control can
    // still say "click 4".
    const link = screen.getByRole("link", { name: "Page 3" });
    expect(link).toHaveTextContent("3");
  });

  it("gives the bare chevrons accessible names", () => {
    render(<Pager page={4} totalPages={12} />);

    // They render as icons with no text; without the labels they would
    // announce as "link" and nothing else.
    expect(screen.getByRole("link", { name: "Previous page" })).toHaveAttribute("rel", "prev");
    expect(screen.getByRole("link", { name: "Next page" })).toHaveAttribute("rel", "next");
  });

  it("hides Previous on the first page instead of offering a dead link", () => {
    render(<Pager page={1} totalPages={12} />);

    expect(screen.queryByRole("link", { name: "Previous page" })).not.toBeInTheDocument();
    // The box stays, so the strip keeps its width — but it is out of the
    // accessibility tree and out of the tab order.
    const dead = document.querySelector("[data-slot='pagination-previous']");
    expect(dead).toHaveAttribute("aria-hidden", "true");
    expect(dead?.tagName).toBe("SPAN");
    expect(screen.getByRole("link", { name: "Next page" })).toBeInTheDocument();
  });

  it("hides Next on the last page", () => {
    render(<Pager page={12} totalPages={12} />);

    expect(screen.queryByRole("link", { name: "Next page" })).not.toBeInTheDocument();
    expect(document.querySelector("[data-slot='pagination-next']")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("link", { name: "Previous page" })).toBeInTheDocument();
  });

  it("steps one page at a time through renderLink's item", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<Pager page={6} totalPages={12} onNavigate={onNavigate} />);

    await user.click(screen.getByRole("link", { name: "Previous page" }));
    expect(onNavigate).toHaveBeenLastCalledWith(5);

    await user.click(screen.getByRole("link", { name: "Next page" }));
    expect(onNavigate).toHaveBeenLastCalledWith(7);

    await user.click(screen.getByRole("link", { name: "Page 12" }));
    expect(onNavigate).toHaveBeenLastCalledWith(12);
  });

  it("routes every link through renderLink rather than emitting its own anchors", () => {
    const renderLink = vi.fn(({ children, ...props }: PaginationLinkProps, item: PaginationLinkItem) => (
      <a href={`/p/${item.page}`} {...props}>
        {children}
      </a>
    ));
    render(<Pagination page={2} totalPages={5} labels={LABELS} renderLink={renderLink} />);

    // Nothing here is a plain <a> the component built: an SPA consumer that
    // did not get this hook would full-page-reload on every click.
    for (const link of screen.getAllByRole("link")) {
      expect(link).toHaveAttribute("href", expect.stringMatching(/^\/p\/\d+$/));
    }
    expect(renderLink.mock.calls.map(([, item]) => item.kind)).toContain("previous");
    expect(renderLink.mock.calls.map(([, item]) => item.kind)).toContain("next");
  });

  it("announces the elided run instead of dropping it silently", () => {
    render(<Pager page={6} totalPages={20} />);

    // Two gaps, each named — a reader who hears "1" then "5" otherwise has no
    // explanation for the jump.
    expect(screen.getAllByText("More pages")).toHaveLength(2);
  });

  it("clamps an out-of-range page rather than rendering a broken strip", () => {
    render(<Pager page={99} totalPages={5} />);

    expect(screen.getByRole("link", { name: "Page 5" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("link", { name: "Next page" })).not.toBeInTheDocument();
  });

  it("keeps the strip the same width as the reader walks through it", () => {
    const { rerender } = render(<Pager page={1} totalPages={20} />);
    const widths = [slotText().length];

    for (const page of [2, 6, 10, 15, 19, 20]) {
      rerender(<Pager page={page} totalPages={20} />);
      widths.push(slotText().length);
    }

    // A pager that resizes under the cursor moves the target the reader is
    // aiming at. Every page must render the same number of slots.
    expect(new Set(widths).size).toBe(1);
  });
});

describe("paginationRange", () => {
  it("renders a short range whole, with no ellipsis", () => {
    expect(paginationRange({ page: 3, totalPages: 5 })).toEqual([1, 2, 3, 4, 5]);
  });

  it("elides only the far side near an end", () => {
    expect(paginationRange({ page: 1, totalPages: 12 })).toEqual([1, 2, 3, 4, 5, "ellipsis", 12]);
    expect(paginationRange({ page: 12, totalPages: 12 })).toEqual([1, "ellipsis", 8, 9, 10, 11, 12]);
  });

  it("elides both sides in the middle", () => {
    expect(paginationRange({ page: 6, totalPages: 12 })).toEqual([1, "ellipsis", 5, 6, 7, "ellipsis", 12]);
  });

  it("renders a one-page gap as that page, never as an ellipsis", () => {
    // "…" is no narrower than "4" and takes a destination away, so a gap of
    // exactly one is always filled.
    expect(paginationRange({ page: 5, totalPages: 9 })).toEqual([1, "ellipsis", 4, 5, 6, "ellipsis", 9]);
    expect(paginationRange({ page: 4, totalPages: 9 })).toEqual([1, 2, 3, 4, 5, "ellipsis", 9]);
  });

  it("widens the window with siblingCount and boundaryCount", () => {
    expect(paginationRange({ page: 24, totalPages: 48, siblingCount: 2, boundaryCount: 2 })).toEqual([
      1,
      2,
      "ellipsis",
      22,
      23,
      24,
      25,
      26,
      "ellipsis",
      47,
      48,
    ]);
  });

  it("clamps the page and degrades to an empty range below one page", () => {
    expect(paginationRange({ page: 0, totalPages: 4 })).toEqual([1, 2, 3, 4]);
    expect(paginationRange({ page: 99, totalPages: 4 })).toEqual([1, 2, 3, 4]);
    expect(paginationRange({ page: 1, totalPages: 0 })).toEqual([]);
  });
});
