import { render, screen, within } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";

import { SentLog, type SentLogItem } from "./sent-log";

const items: SentLogItem[] = [
  { id: "shown", at: "7:41 AM", dateTime: "2026-11-13T07:41:00-08:00", outcome: "shown", message: "to Den TV · é → E" },
  { id: "held", at: "6:55 AM", outcome: "held", message: "re-rendered when Silence ends 7:00 AM" },
  { id: "paused", at: "Yesterday", outcome: "paused", message: "Den TV paused 8:31–9:00 PM" },
];

describe("SentLog", () => {
  it.each(["list", "summary"] as const)("renders all outcomes as readable text in %s presentation", (presentation) => {
    render(<SentLog items={items} presentation={presentation} />);
    const list = screen.getByRole("list", { name: "Sent" });
    const rows = within(list).getAllByRole("listitem");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("7:41 AM");
    expect(rows[0]).toHaveTextContent("Sent");
    expect(rows[0]).toHaveTextContent("to Den TV · é → E");
    expect(rows[1]).toHaveTextContent("Held");
    expect(rows[2]).toHaveTextContent("Paused");
    expect(screen.getByText("7:41 AM")).toHaveAttribute("datetime", items[0].dateTime);
    expect(screen.getByText("Yesterday")).not.toHaveAttribute("datetime");
    expect(screen.getByText("Yesterday").tagName).toBe("SPAN");
    expect(screen.queryByRole("log")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("bounds the log to the first twenty records without sorting or mutating caller input", () => {
    const records = Object.freeze(
      Array.from({ length: 23 }, (_, i) => Object.freeze({ id: `${i}`, at: `Time ${i}`, outcome: "shown" as const })),
    );
    render(<SentLog items={records} />);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(20);
    expect(rows[0]).toHaveTextContent("Time 0");
    expect(rows[19]).toHaveTextContent("Time 19");
    expect(screen.queryByText("Time 20")).toBeNull();
    expect(records).toHaveLength(23);
  });

  it("renders an empty state without an empty list or a live announcement", () => {
    render(<SentLog items={[]} />);
    expect(screen.getByText("Nothing sent yet")).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("localizes heading, empty copy and each outcome", () => {
    const labels = { heading: "Enviado", empty: "Sin envíos", shown: "Mostrado", held: "Retenido", paused: "Pausado" };
    const { rerender } = render(<SentLog items={items} labels={labels} />);
    expect(screen.getByRole("list", { name: "Enviado" })).toBeInTheDocument();
    for (const text of ["Mostrado", "Retenido", "Pausado"]) expect(screen.getByText(text)).toBeVisible();
    rerender(<SentLog items={[]} labels={labels} />);
    expect(screen.getByText("Sin envíos")).toBeVisible();
  });

  it("forwards root attributes/ref and updates keyed records without keeping stale outcomes", () => {
    const ref = React.createRef<HTMLDivElement>();
    const { rerender } = render(
      <SentLog ref={ref} id="history" className="custom" data-testid="history" items={items} />,
    );
    expect(ref.current).toBe(screen.getByTestId("history"));
    expect(ref.current).toHaveClass("custom");
    expect(ref.current).toHaveAttribute("id", "history");
    rerender(<SentLog items={[{ ...items[0], outcome: "paused", message: undefined }]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("Paused")).toBeVisible();
    expect(screen.queryByText("Held")).toBeNull();
  });
});
