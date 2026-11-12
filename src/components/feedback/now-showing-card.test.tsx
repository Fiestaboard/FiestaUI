import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { NowShowingCard } from "./now-showing-card";

const board = <div data-testid="board">BOARD</div>;

describe("NowShowingCard", () => {
  it("is a region named by its header (hero, the web Home card)", () => {
    render(<NowShowingCard display="Kitchen board" title="Dinner note" mode="override" board={board} />);

    const card = screen.getByRole("region", { name: "Now showing · Kitchen board" });
    expect(card).toHaveAttribute("data-slot", "now-showing-card");
    expect(card).toHaveAttribute("data-variant", "hero");
    expect(card).toHaveAttribute("data-mode", "override");
    expect(within(card).getByTestId("board")).toBeInTheDocument();
  });

  it("titles the page as a heading after the mode badge", () => {
    render(<NowShowingCard display="Kitchen board" title="Dinner note" mode="override" board={board} />);

    const heading = screen.getByRole("heading", { name: "Dinner note" });
    expect(heading.tagName).toBe("H3");
    const badge = document.querySelector('[data-slot="now-showing-mode"]')!;
    expect(badge).toHaveTextContent("Override");
    expect(badge).toHaveAttribute("data-slot", "now-showing-mode");
    // Badge precedes the title in reading order.
    expect(badge.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it.each([
    ["schedule", "Schedule Mode", "secondary"],
    ["manual", "Manual Mode", "secondary"],
    ["override", "Override", "default"],
  ] as const)("mode %s reads %s on a %s badge", (mode, label, variant) => {
    render(<NowShowingCard display="Kitchen board" title="Morning commute" mode={mode} board={board} />);
    const badge = document.querySelector('[data-slot="now-showing-mode"]')!;
    expect(badge).toHaveTextContent(label);
    expect(badge).toHaveAttribute("data-variant", variant);
  });

  it("omits the badge without a mode, and takes a custom mode label", () => {
    const { rerender } = render(<NowShowingCard display="Kitchen board" title="Clock" board={board} />);
    expect(document.querySelector('[data-slot="now-showing-mode"]')).toBeNull();
    rerender(
      <NowShowingCard
        display="Kitchen board"
        title="Clock"
        mode="schedule"
        labels={{ modes: { schedule: "Modo Programa" } }}
        board={board}
      />,
    );
    expect(document.querySelector('[data-slot="now-showing-mode"]')).toHaveTextContent("Modo Programa");
  });

  it("renders the meta, description, countdown, outcome and actions slots in order", () => {
    render(
      <NowShowingCard
        display="Kitchen board"
        meta="Flagship 22 × 6 · Maya’s FiestaPi"
        title="Dinner note"
        mode="override"
        board={board}
        description="Until 9:00 PM · then Good night"
        countdown={<div data-testid="countdown" />}
        outcome="Holds until 9:00 PM, then Schedule resumes. Next: Good night."
        actions={<button type="button">Cancel override</button>}
      />,
    );

    const card = screen.getByRole("region");
    const order = [
      screen.getByText("Flagship 22 × 6 · Maya’s FiestaPi"),
      screen.getByTestId("board"),
      screen.getByRole("heading"),
      screen.getByText("Until 9:00 PM · then Good night"),
      screen.getByTestId("countdown"),
      screen.getByText("Holds until 9:00 PM, then Schedule resumes. Next: Good night."),
      screen.getByRole("button", { name: "Cancel override" }),
    ];
    for (let i = 1; i < order.length; i++) {
      expect(order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    expect(screen.getByText("Holds until 9:00 PM, then Schedule resumes. Next: Good night.")).toHaveAttribute(
      "data-slot",
      "outcome-line",
    );
    expect(card.querySelector('[data-slot="now-showing-actions"]')).toContainElement(
      screen.getByRole("button", { name: "Cancel override" }),
    );
  });

  it("renders no empty slot wrappers", () => {
    const { container } = render(<NowShowingCard display="Kitchen board" title="Clock" board={board} />);
    for (const slot of ["now-showing-meta", "now-showing-description", "outcome-line", "now-showing-actions"]) {
      expect(container.querySelector(`[data-slot="${slot}"]`)).toBeNull();
    }
  });

  it("compact: mono eyebrow and badge in the header, title after the board", () => {
    render(
      <NowShowingCard
        variant="compact"
        display="Kitchen board"
        title="Morning commute"
        mode="schedule"
        description="Until 9:00 AM · then Market open"
        board={board}
      />,
    );
    const card = screen.getByRole("region", { name: "Now showing · Kitchen board" });
    expect(card).toHaveAttribute("data-variant", "compact");
    const header = card.querySelector('[data-slot="now-showing-header"]')!;
    expect(within(header as HTMLElement).getByText("Schedule Mode")).toBeInTheDocument();
    expect(header.querySelector('[data-slot="now-showing-label"]')).toHaveClass("font-mono", "uppercase");
    expect(screen.getByTestId("board").compareDocumentPosition(screen.getByRole("heading"))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
  });

  it("shows a decorative status dot by default and a labelled one when given statusLabel", () => {
    const { container, rerender } = render(<NowShowingCard display="Kitchen board" title="Clock" board={board} />);
    const dot = container.querySelector('[data-slot="status-dot"]')!;
    expect(dot).toHaveAttribute("data-status", "success");
    expect(dot).toHaveAttribute("aria-hidden", "true");

    rerender(
      <NowShowingCard display="Kitchen board" title="Clock" board={board} status="danger" statusLabel="Offline" />,
    );
    expect(container.querySelector('[data-slot="status-dot"]')).toHaveAttribute("data-status", "danger");
    expect(screen.getByRole("status")).toHaveTextContent("Offline");
  });

  it("preview state: an outline Preview badge and 'Not sent yet' instead of the live dot", () => {
    render(
      <NowShowingCard state="preview" display="Kitchen board" title="Taco Tuesday" mode="override" board={board} />,
    );
    const card = screen.getByRole("region", { name: "Preview Not sent yet · Kitchen board" });
    expect(card).toHaveAttribute("data-state", "preview");
    expect(card.querySelector('[data-slot="status-dot"]')).toBeNull();
    const preview = card.querySelector('[data-slot="now-showing-preview"]')!;
    expect(preview).toHaveTextContent("Preview");
    expect(preview).toHaveAttribute("data-variant", "outline");
    // A preview is not on the board yet, so it never claims a mode.
    expect(card.querySelector('[data-slot="now-showing-mode"]')).toBeNull();
  });

  it("takes localized header labels and a heading level", () => {
    render(
      <NowShowingCard
        display="Tablero de cocina"
        title="Nota"
        headingLevel={2}
        labels={{ nowShowing: "En pantalla" }}
        board={board}
      />,
    );
    expect(screen.getByRole("region", { name: "En pantalla · Tablero de cocina" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Nota" })).toBeInTheDocument();
  });

  it("forwards root props and keeps a caller's aria-label", () => {
    render(
      <NowShowingCard display="Kitchen board" title="Clock" board={board} className="max-w-sm" aria-label="Kitchen" />,
    );
    const card = screen.getByRole("region", { name: "Kitchen" });
    expect(card).toHaveClass("max-w-sm");
    expect(card).not.toHaveAttribute("aria-labelledby");
  });
});
