import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { OtherDisplaysCard, ScheduleModeCard, UpNextCard } from "./home-supporting-cards";

describe("UpNextCard", () => {
  it("renders only the supplied authoritative events in source order", () => {
    const { rerender } = render(
      <UpNextCard
        display="Kitchen board"
        items={[
          {
            id: "next",
            time: "9:00 PM",
            dateTime: "2026-11-17T21:00:00-08:00",
            title: "Good night",
            description: "Schedule · Page",
          },
          { id: "later", time: "Tomorrow", title: "Morning commute" },
        ]}
      />,
    );
    const card = screen.getByRole("region", { name: "Up next · Kitchen board" });
    expect(
      within(card)
        .getAllByRole("listitem")
        .map((row) => row.textContent),
    ).toEqual(["9:00 PMGood nightSchedule · Page", "TomorrowMorning commute"]);
    expect(screen.getByText("9:00 PM")).toHaveAttribute("datetime", "2026-11-17T21:00:00-08:00");
    expect(screen.getByText("Tomorrow").tagName).toBe("SPAN");
    rerender(<UpNextCard size="compact" items={[{ id: "next", time: "9:00 PM", title: "Good night" }]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.queryByText("Morning commute")).not.toBeInTheDocument();
  });

  it("keeps the host's empty explanation and action without manufacturing an event", () => {
    render(
      <UpNextCard
        items={[]}
        empty="No upcoming change is available."
        actions={<a href="/schedule">View Schedule</a>}
      />,
    );
    expect(screen.getByRole("region", { name: "Up next" })).toHaveTextContent("No upcoming change is available.");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Schedule" })).toHaveAttribute("href", "/schedule");
  });

  it("provides honest default empty copy", () => {
    render(<UpNextCard items={[]} />);
    expect(screen.getByText("No upcoming change is available.")).toBeInTheDocument();
  });

  it("leaves override wording and localization to the supplied content", () => {
    render(
      <UpNextCard
        labels={{ title: "À suivre" }}
        display="Cuisine"
        headingLevel={2}
        items={[{ id: "resume", time: "21:00", title: "Reprise du programme", description: "Bonne nuit · Programme" }]}
      />,
    );
    expect(screen.getByRole("heading", { level: 2, name: "À suivre · Cuisine" })).toBeInTheDocument();
    expect(screen.getByText("Reprise du programme")).toBeInTheDocument();
    expect(screen.queryByText("Good night")).not.toBeInTheDocument();
  });

  it("honors an explicit region name and forwards the root ref", () => {
    const ref = React.createRef<HTMLElement>();
    render(<UpNextCard ref={ref} aria-label="Upcoming changes" items={[]} />);
    expect(ref.current).toBe(screen.getByRole("region", { name: "Upcoming changes" }));
    expect(ref.current).not.toHaveAttribute("aria-labelledby");
  });
});

describe("OtherDisplaysCard", () => {
  it("omits the whole card when there are no peers", () => {
    const { container } = render(<OtherDisplaysCard items={[]} actions={<button>All displays</button>} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders named status and inert previews without claiming status for an unknown peer", () => {
    const { container } = render(
      <OtherDisplaysCard
        items={[
          {
            id: "desk",
            name: "Desk Pixoo",
            description: "Collection · Desk agenda",
            preview: <button>Preview control</button>,
            status: "success",
            statusLabel: "Online",
          },
          { id: "entry", name: "Entry clock", description: "Status unavailable" },
          { id: "offline", name: "Study board", status: "danger", statusLabel: "Offline" },
        ]}
      />,
    );
    const card = screen.getByRole("region", { name: "Other displays" });
    expect(within(card).getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getAllByRole("status").map((dot) => dot.textContent)).toEqual(["Online", "Offline"]);
    expect(screen.queryByRole("button", { name: "Preview control" })).not.toBeInTheDocument();
    expect(container.querySelector('[data-slot="other-display-preview"]')).toHaveAttribute("inert");
    expect(within(screen.getByText("Entry clock").closest("li")!).queryByRole("status")).not.toBeInTheDocument();
  });

  it("selects a peer by keyboard only when a host callback is supplied", async () => {
    const selected = vi.fn();
    const user = userEvent.setup();
    render(
      <OtherDisplaysCard
        items={[
          { id: "desk", name: "Desk Pixoo", onSelect: selected },
          { id: "clock", name: "Entry clock" },
        ]}
        actions={<a href="/displays">All displays</a>}
      />,
    );
    await user.tab();
    expect(screen.getByRole("button", { name: "Desk Pixoo" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(selected).toHaveBeenCalledTimes(1);
    await user.tab();
    expect(screen.getByRole("link", { name: "All displays" })).toHaveFocus();
  });

  it("localizes its heading and honors an external labelledby", () => {
    render(
      <>
        <h2 id="peers">Écrans</h2>
        <OtherDisplaysCard
          aria-labelledby="peers"
          labels={{ title: "Autres écrans" }}
          headingLevel={4}
          items={[{ id: "desk", name: "Bureau", status: "neutral" }]}
        />
      </>,
    );
    expect(screen.getByRole("region", { name: "Écrans" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Autres écrans", level: 4 })).toBeInTheDocument();
  });
});

describe("ScheduleModeCard", () => {
  it("requests a mode change but remains controlled until the host updates checked", async () => {
    const changed = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <ScheduleModeCard
        checked={false}
        onCheckedChange={changed}
        description="Evening commute stays until you change it."
      />,
    );
    const toggle = screen.getByRole("switch", { name: "Schedule Mode" });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAccessibleDescription("Evening commute stays until you change it.");
    await user.click(toggle);
    expect(changed).toHaveBeenCalledWith(true, expect.anything());
    expect(toggle).toHaveAttribute("aria-checked", "false");
    rerender(<ScheduleModeCard checked onCheckedChange={changed} description="The hub will change pages." />);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("region", { name: "Schedule Mode is on" })).toBeInTheDocument();
  });

  it("associates the visible label with the switch", () => {
    const changed = vi.fn();
    render(<ScheduleModeCard checked={false} onCheckedChange={changed} description="Nothing changes on its own." />);
    fireEvent.click(screen.getByText("Schedule Mode", { selector: "label" }));
    expect(changed).toHaveBeenCalledWith(true, expect.anything());
  });

  it("disables requests while the host is busy and preserves its action", async () => {
    const changed = vi.fn();
    render(
      <ScheduleModeCard
        checked={false}
        disabled
        aria-busy="true"
        onCheckedChange={changed}
        description="Nothing changes on its own."
        actions={<button>View Schedule</button>}
      />,
    );
    await userEvent.setup().click(screen.getByRole("switch"));
    expect(changed).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Schedule Mode is off" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "View Schedule" })).toBeEnabled();
  });

  it("localizes titles and the switch name", () => {
    const { rerender } = render(
      <ScheduleModeCard
        size="compact"
        checked={false}
        description="La page reste affichée."
        onCheckedChange={() => {}}
        labels={{ off: "Programme désactivé", on: "Programme activé", switch: "Mode Programme" }}
      />,
    );
    expect(screen.getByRole("region", { name: "Programme désactivé" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Mode Programme" })).toBeInTheDocument();
    rerender(
      <ScheduleModeCard
        checked
        onCheckedChange={() => {}}
        description="Le programme est actif."
        labels={{ on: "Programme activé" }}
      />,
    );
    expect(screen.getByRole("region", { name: "Programme activé" })).toBeInTheDocument();
  });
});
