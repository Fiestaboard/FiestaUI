import { render, screen } from "@testing-library/react";
import * as React from "react";
import { describe, expect, it } from "vitest";

import { ListRowGroup } from "../containment/list-row";
import { AgendaRow, DEFAULT_AGENDA_ROW_LABELS } from "./agenda-row";

/*
 * AgendaRow (slice 1.8d, C24). One row of the phone / mobile-web Schedule
 * agenda, drawn as 07d draws the day list (`322:16890`, `322:19169`) on top
 * of ListRow. These pin the structure and the state words; VRT pins pixels.
 */

function row(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="list-row"]');
  if (!el) throw new Error("no row rendered");
  return el;
}

function slot(name: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-slot="list-row-${name}"]`);
}

describe("AgendaRow", () => {
  it("is a ListRow with the title, the time and detail joined by a middle dot, and a chevron", () => {
    render(<AgendaRow title="Good night" time="9:00 PM – 10:00 PM" detail="Page" />);
    expect(row().dataset.kind).toBe("entry");
    expect(slot("title")?.textContent).toBe("Good night");
    expect(slot("description")?.textContent).toBe("9:00 PM – 10:00 PM · Page");
    expect(slot("meta")).toBeNull();
    const chevron = slot("trailing")?.querySelector("svg");
    expect(chevron).not.toBeNull();
    expect(chevron?.getAttribute("aria-hidden")).toBe("true");
    expect(row().hasAttribute("aria-current")).toBe(false);
  });

  it("shows only the time when there is no detail", () => {
    render(<AgendaRow title="Good night" time="9:00 PM – 10:00 PM" />);
    expect(slot("description")?.textContent).toBe("9:00 PM – 10:00 PM");
  });

  it("drops the chevron when trailing is null, and takes a custom trailing", () => {
    const { rerender } = render(<AgendaRow title="A" time="1" trailing={null} />);
    expect(slot("trailing")).toBeNull();
    rerender(<AgendaRow title="A" time="1" trailing={<span>menu</span>} />);
    expect(slot("trailing")?.textContent).toBe("menu");
  });

  it("marks the now row with the word, a filled ground and aria-current=time", () => {
    render(<AgendaRow kind="now" title="Weekend brunch" time="9:00 AM – 1:00 PM" />);
    expect(row().dataset.kind).toBe("now");
    expect(row().getAttribute("aria-current")).toBe("time");
    expect(row().className).toContain("bg-accent");
    const meta = slot("meta");
    expect(meta?.textContent).toBe(DEFAULT_AGENDA_ROW_LABELS.now);
    expect(meta?.querySelector("span")?.className).toContain("text-foreground");
  });

  it("writes a gap as 'Gap · <default page>' with no tint", () => {
    render(<AgendaRow kind="gap" title="Good morning, Maya" time="1:00 PM – 9:00 PM" detail="Default page" />);
    expect(slot("title")?.textContent).toBe("Gap · Good morning, Maya");
    expect(row().className).not.toMatch(/bg-tint/);
    expect(slot("meta")).toBeNull();
  });

  it("draws a conflict in words and the danger tint, with the description in destructive", () => {
    render(<AgendaRow kind="conflict" title="Happy birthday Sam" time="11:00 AM – 2:00 PM" detail="Page" />);
    expect(row().className).toContain("bg-tint-danger");
    expect(slot("meta")?.textContent).toBe("Overlap");
    expect(slot("meta")?.querySelector("span")?.className).toContain("text-destructive");
    expect(slot("description")?.querySelector("span")?.className).toContain("text-destructive");
  });

  it("takes custom labels and a status override", () => {
    const { rerender } = render(
      <AgendaRow kind="gap" title="Default" time="1" labels={{ gap: "Hueco", conflict: "Choque" }} />,
    );
    expect(slot("title")?.textContent).toBe("Hueco · Default");
    rerender(<AgendaRow kind="conflict" title="X" time="1" labels={{ conflict: "Choque" }} />);
    expect(slot("meta")?.textContent).toBe("Choque");
    rerender(<AgendaRow kind="entry" title="X" time="1" status="Paused" />);
    expect(slot("meta")?.textContent).toBe("Paused");
    rerender(<AgendaRow kind="now" title="X" time="1" status={null} />);
    expect(slot("meta")).toBeNull();
  });

  it("renders as a link row inside a group", () => {
    render(
      <ListRowGroup aria-label="Sunday">
        <li>
          {/* eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content */}
          <AgendaRow title="Good night" time="9:00 PM" render={<a href="/schedule/1" />} />
        </li>
      </ListRowGroup>,
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("/schedule/1");
    expect(link.dataset.slot).toBe("list-row");
    expect(link.textContent).toContain("Good night");
  });

  it("is an <li> inside a group by default and forwards its ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <ListRowGroup aria-label="Sunday">
        <AgendaRow ref={ref} title="Good night" time="9:00 PM" />
      </ListRowGroup>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(ref.current?.tagName).toBe("LI");
  });

  it("keeps the caller's className", () => {
    render(<AgendaRow kind="now" title="X" time="1" className="extra" />);
    expect(row().className).toContain("extra");
    expect(row().className).toContain("bg-accent");
  });
});
