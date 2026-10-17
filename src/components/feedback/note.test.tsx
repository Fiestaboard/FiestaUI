import { render, screen } from "@testing-library/react";
import { Info } from "lucide-react";
import { describe, expect, it } from "vitest";

import { Note } from "./note";
import { Spinner } from "./spinner";

/*
 * Note (#295) is defined as much by what it is NOT as by what it renders: a
 * static explanatory note present at first paint, so it must never become a
 * live region. These tests pin that, plus the icon/title/size API.
 */

function note(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="note"]');
  if (!el) throw new Error("no [data-slot=note] rendered");
  return el;
}

describe("Note", () => {
  it("renders its body copy", () => {
    render(<Note>Transitions only apply through the local API.</Note>);
    expect(screen.getByText("Transitions only apply through the local API.")).toBeInTheDocument();
  });

  it("is not a live region", () => {
    render(<Note icon={<Info />}>Flap speed only affects this screen.</Note>);

    expect(note()).not.toHaveAttribute("role");
    expect(note()).not.toHaveAttribute("aria-live");
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("hides the icon from assistive tech, including a Spinner's own status role", () => {
    render(<Note icon={<Spinner />}>Scanning the network…</Note>);

    const icon = document.querySelector('[data-slot="note-icon"]');
    expect(icon).toHaveAttribute("aria-hidden", "true");
    // The Spinner is inside an aria-hidden subtree, so it is not exposed.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("omits the icon slot when no icon is given", () => {
    render(<Note>No boards found.</Note>);
    expect(document.querySelector('[data-slot="note-icon"]')).toBeNull();
  });

  it("renders an optional title above the body", () => {
    render(<Note title="Board not configured">Add a board to use the debug tools.</Note>);

    const title = document.querySelector('[data-slot="note-title"]');
    expect(title).toHaveTextContent("Board not configured");
    expect(title?.nextElementSibling).toHaveTextContent("Add a board to use the debug tools.");
  });

  it("does not forward title as the native tooltip attribute", () => {
    render(<Note title="Board not configured">Body</Note>);
    expect(note()).not.toHaveAttribute("title");
  });

  it("defaults to the 12px sm size and supports md", () => {
    const { unmount } = render(<Note>Small</Note>);
    expect(note()).toHaveAttribute("data-size", "sm");
    expect(note()).toHaveClass("text-xs");
    unmount();

    render(<Note size="md">Medium</Note>);
    expect(note()).toHaveAttribute("data-size", "md");
    expect(note()).toHaveClass("text-sm");
  });

  it("merges className and forwards native props", () => {
    render(
      <Note className="mt-4" id="api-note" data-testid="n">
        Body
      </Note>,
    );
    expect(screen.getByTestId("n")).toHaveClass("mt-4", "bg-muted/50");
    expect(screen.getByTestId("n")).toHaveAttribute("id", "api-note");
  });
});
