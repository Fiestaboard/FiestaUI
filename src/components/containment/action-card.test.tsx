import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CalendarOff, ChevronRight } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import { ActionCard } from "./action-card";

/*
 * What is asserted here is the ACCESSIBILITY TREE and the published
 * `data-slot` / `data-*` contract — the two things a consumer and a screen
 * reader can actually observe. Tailwind does not run in jsdom, so a class
 * assertion would prove only that a string was concatenated; the surface
 * (shadow-card, the radius, the hover recipe) is VRT's job, and the fact that
 * it is Card's surface is guaranteed structurally by composing
 * `cardSurfaceClassName` rather than by a test.
 *
 * The three questions this component exists to settle, and therefore the
 * three things that must not regress:
 *
 *   1. the NAME is the title alone — not title + description + meta;
 *   2. `loading` and `disabled` are different states, not two spellings of
 *      one (Button draws that line and this must draw the same one);
 *   3. the `asChild` form is a real link, not a button wearing an href.
 */

function card(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="action-card"]');
  if (!el) throw new Error("no [data-slot=action-card] element rendered");
  return el;
}

function medallion(): HTMLElement | null {
  return document.querySelector<HTMLElement>('[data-slot="action-card-medallion"]');
}

describe("ActionCard", () => {
  it("takes its accessible name from the title alone", () => {
    render(<ActionCard title="Turn off schedule" description="Stops the schedule for this board." />);

    // If the name came from text content it would read "Turn off schedule
    // Stops the schedule for this board." — the failure mode every
    // hand-rolled version shipped.
    expect(screen.getByRole("button", { name: "Turn off schedule" })).toBeInTheDocument();
  });

  it("announces the description as a description rather than as part of the name", () => {
    render(<ActionCard title="Turn off schedule" description="Stops the schedule for this board." />);

    expect(screen.getByRole("button", { name: "Turn off schedule" })).toHaveAccessibleDescription(
      "Stops the schedule for this board.",
    );
  });

  it("keeps meta out of the name too", () => {
    render(<ActionCard title="Board settings" meta="Beta" />);

    expect(screen.getByRole("button", { name: "Board settings" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Beta/ })).toBeNull();
  });

  it("lets a caller's own aria-label win over the title", () => {
    render(<ActionCard title="Turn off" aria-label="Turn off the kitchen board schedule" />);

    expect(screen.getByRole("button", { name: "Turn off the kitchen board schedule" })).toBeInTheDocument();
  });

  it("does not announce the icon — it is decoration beside the title", () => {
    render(<ActionCard icon={<CalendarOff role="img" aria-label="Calendar with a slash" />} title="Turn off" />);

    // queryByRole honours aria-hidden, which is the question a screen reader
    // asks. The medallion is an aria-hidden IconTile, so a NAMED glyph inside
    // it must still be unreachable.
    expect(screen.queryByRole("img", { name: "Calendar with a slash" })).toBeNull();
    expect(medallion()).toHaveAttribute("aria-hidden", "true");
    // …and the name is untouched by it.
    expect(screen.getByRole("button", { name: "Turn off" })).toBeInTheDocument();
  });

  it("renders no medallion at all when there is no icon and nothing is running", () => {
    render(<ActionCard title="Turn off" />);

    expect(medallion()).toBeNull();
  });

  it("stamps the tone so VRT and consumers can select on it", () => {
    const { rerender } = render(<ActionCard icon={<CalendarOff />} title="Turn off" />);
    expect(card()).toHaveAttribute("data-tone", "muted");
    expect(medallion()).toHaveAttribute("data-tone", "muted");

    rerender(<ActionCard icon={<CalendarOff />} title="Turn off" tone="destructive" />);
    expect(card()).toHaveAttribute("data-tone", "destructive");
    expect(medallion()).toHaveAttribute("data-tone", "destructive");
  });

  describe("loading", () => {
    it("swaps the glyph for a Spinner", () => {
      const { rerender } = render(<ActionCard icon={<CalendarOff data-testid="glyph" />} title="Turn off" />);

      expect(screen.getByTestId("glyph")).toBeInTheDocument();
      expect(medallion()?.querySelector('[data-slot="spinner"]')).toBeNull();

      rerender(<ActionCard icon={<CalendarOff data-testid="glyph" />} title="Turn off" loading />);

      expect(screen.queryByTestId("glyph")).toBeNull();
      expect(medallion()?.querySelector('[data-slot="spinner"]')).not.toBeNull();
    });

    it("shows the Spinner even for a card that has no icon of its own", () => {
      render(<ActionCard title="Turn off" loading />);

      expect(medallion()?.querySelector('[data-slot="spinner"]')).not.toBeNull();
    });

    it("refuses activation", async () => {
      const onClick = vi.fn();
      render(<ActionCard title="Turn off" loading onClick={onClick} />);

      await userEvent.click(screen.getByRole("button", { name: "Turn off" }));

      expect(onClick).not.toHaveBeenCalled();
    });

    it("stays focusable, because focus must not move to <body> mid-wait", async () => {
      render(<ActionCard title="Turn off" loading />);

      const button = screen.getByRole("button", { name: "Turn off" });
      // The native `disabled` attribute would drop it out of the tab order.
      // This is the line Button draws and the reason it draws it.
      expect(button).not.toBeDisabled();
      await userEvent.tab();
      expect(button).toHaveFocus();
    });

    it("keeps its accessible name while busy", () => {
      render(<ActionCard title="Turn off schedule" loading />);

      // Not "Loading". The Spinner is decorative; the card carries aria-busy.
      expect(screen.getByRole("button", { name: "Turn off schedule" })).toBeInTheDocument();
    });
  });

  describe("disabled", () => {
    it("is a real native disabled button", async () => {
      const onClick = vi.fn();
      render(<ActionCard title="Turn off" disabled onClick={onClick} />);

      const button = screen.getByRole("button", { name: "Turn off" });
      expect(button).toBeDisabled();

      await userEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    it("is distinguishable from loading in the accessibility tree and in the DOM", () => {
      const { rerender } = render(<ActionCard title="Turn off" disabled />);

      const disabledCard = card();
      expect(disabledCard).toHaveAttribute("data-disabled", "");
      expect(disabledCard).not.toHaveAttribute("data-loading");
      // "Not available" says nothing about being busy.
      expect(disabledCard).not.toHaveAttribute("aria-busy");

      rerender(<ActionCard title="Turn off" loading />);

      const loadingCard = card();
      expect(loadingCard).toHaveAttribute("data-loading", "");
      expect(loadingCard).not.toHaveAttribute("data-disabled");
      expect(loadingCard).toHaveAttribute("aria-busy", "true");
      expect(loadingCard).toHaveAttribute("aria-disabled", "true");
      expect(loadingCard).not.toBeDisabled();
    });

    it("is not busy and shows no Spinner", () => {
      render(<ActionCard icon={<CalendarOff data-testid="glyph" />} title="Turn off" disabled />);

      expect(screen.getByTestId("glyph")).toBeInTheDocument();
      expect(medallion()?.querySelector('[data-slot="spinner"]')).toBeNull();
    });
  });

  describe("asChild", () => {
    it("renders a real anchor, announced as a link and not as a button", () => {
      render(
        <ActionCard asChild icon={<ChevronRight />} title="Board settings">
          <a href="/boards/kitchen/settings" />
        </ActionCard>,
      );

      const link = screen.getByRole("link", { name: "Board settings" });
      // A real <a href>: right-clickable, middle-clickable, "Open in new tab".
      expect(link.tagName).toBe("A");
      expect(link).toHaveAttribute("href", "/boards/kitchen/settings");
      expect(screen.queryByRole("button")).toBeNull();
    });

    it("puts the card's own content inside the anchor", () => {
      render(
        <ActionCard asChild title="Board settings" description="Name, timezone and hardware.">
          <a href="/settings">ignored</a>
        </ActionCard>,
      );

      const link = screen.getByRole("link", { name: "Board settings" });
      expect(link).toHaveAccessibleDescription("Name, timezone and hardware.");
      // The element belongs to the caller; the CONTENT belongs to the card.
      expect(link).not.toHaveTextContent("ignored");
    });

    it("carries the card classes and slots onto the anchor", () => {
      render(
        <ActionCard asChild icon={<ChevronRight />} title="Board settings">
          <a href="/settings" />
        </ActionCard>,
      );

      expect(card().tagName).toBe("A");
      expect(medallion()).not.toBeNull();
    });

    it("falls back to aria-disabled, since an anchor cannot be disabled", async () => {
      const onClick = vi.fn();
      render(
        <ActionCard asChild title="Board settings" disabled onClick={onClick}>
          <a href="/settings" />
        </ActionCard>,
      );

      const link = screen.getByRole("link", { name: "Board settings" });
      expect(link).toHaveAttribute("aria-disabled", "true");
      expect(link).not.toHaveAttribute("disabled");

      await userEvent.click(link);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  it("fires onClick when it is neither busy nor unavailable", async () => {
    const onClick = vi.fn();
    render(<ActionCard title="Turn off" onClick={onClick} />);

    await userEvent.click(screen.getByRole("button", { name: "Turn off" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not submit the form it sits in", () => {
    render(
      <form>
        <ActionCard title="Turn off" />
      </form>,
    );

    // type="button" comes from Base UI's renderTag default, not from a prop.
    expect(screen.getByRole("button", { name: "Turn off" })).toHaveAttribute("type", "button");
  });

  it("forwards arbitrary button props", () => {
    render(<ActionCard title="Turn off" id="disable-schedule" data-testid="card" />);

    expect(card()).toHaveAttribute("id", "disable-schedule");
    expect(card()).toHaveAttribute("data-testid", "card");
  });
});
