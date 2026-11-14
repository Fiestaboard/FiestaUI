import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WeekCalendar, type WeekCalendarDay, type WeekCalendarEntry } from "./week-calendar";

const DAYS: WeekCalendarDay[] = [
  { id: "mon", label: "MON 9", name: "Monday, November 9" },
  { id: "tue", label: "TUE 10", name: "Tuesday, November 10" },
  { id: "wed", label: "WED 11", name: "Wednesday, November 11" },
];

const ENTRIES: WeekCalendarEntry[] = [
  { id: "mon-morning", day: 0, start: 360, end: 540, title: "Weekday mornings", meta: "Collection" },
  { id: "mon-market", day: 0, start: 540, end: 720, title: "Market open", meta: "Page" },
  {
    id: "mon-gap",
    day: 0,
    start: 720,
    end: 1020,
    title: "Gap · Good morning, Maya",
    meta: "Default page",
    kind: "gap",
  },
  { id: "wed-market", day: 2, start: 600, end: 660, title: "Brunch", meta: "Page", conflict: true },
  { id: "wed-silence", day: 2, start: 1320, end: 1440, title: "Silence", kind: "silence" },
];

function setup(props: Partial<React.ComponentProps<typeof WeekCalendar>> = {}) {
  const onSelect = vi.fn();
  const utils = render(
    <WeekCalendar aria-label="Week of November 9–15" days={DAYS} entries={ENTRIES} onSelect={onSelect} {...props} />,
  );
  return { ...utils, onSelect };
}

/** jsdom lays nothing out; give a day column a real box so pointer maths has something to read. */
function layOut(column: HTMLElement, height: number) {
  column.getBoundingClientRect = () =>
    ({ top: 100, left: 0, right: 80, bottom: 100 + height, width: 80, height, x: 0, y: 100, toJSON() {} }) as DOMRect;
}

describe("WeekCalendar", () => {
  it("names the calendar and one group per day, from the day's full name", () => {
    setup();
    const root = screen.getByRole("group", { name: "Week of November 9–15" });
    expect(root).toHaveAttribute("data-slot", "week-calendar");
    expect(screen.getByRole("group", { name: "Monday, November 9" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Wednesday, November 11" })).toBeInTheDocument();
  });

  it("prints the mono day labels but hides them from assistive tech (the groups carry the names)", () => {
    const { container } = setup();
    const header = container.querySelector('[data-slot="week-calendar-header"]');
    expect(header).toHaveAttribute("aria-hidden", "true");
    expect(header).toHaveTextContent("MON 9");
    expect(header).toHaveTextContent("WED 11");
  });

  it("labels every second hour in the gutter (6 AM … 10 PM: 07d draws 6 AM–11 PM) and draws a line every hour", () => {
    const { container } = setup();
    const labels = [...container.querySelectorAll('[data-slot="week-calendar-hour-label"]')].map((n) => n.textContent);
    expect(labels).toEqual(["6 AM", "8 AM", "10 AM", "12 PM", "2 PM", "4 PM", "6 PM", "8 PM", "10 PM"]);
    expect(container.querySelectorAll('[data-slot="week-calendar-hour-line"]')).toHaveLength(17);
  });

  it("honours startHour, endHour and hourHeight", () => {
    const { container } = setup({ startHour: 8, endHour: 12, hourHeight: 40, entries: [] });
    const body = container.querySelector('[data-slot="week-calendar-body"]') as HTMLElement;
    expect(body.style.height).toBe("160px");
    const labels = [...container.querySelectorAll('[data-slot="week-calendar-hour-label"]')].map((n) => n.textContent);
    expect(labels).toEqual(["8 AM", "10 AM"]);
  });

  it("places a block from its minutes: 1 px below the hour line, 3 px short (07d)", () => {
    setup();
    const block = screen.getByRole("button", { name: /Market open/ });
    // 9:00 AM is 3 h after 6 AM at 34 px an hour.
    expect(block.style.top).toBe("103px");
    expect(block.style.height).toBe("99px");
  });

  it("clamps a block to the visible hours and leaves out one that is entirely outside them", () => {
    setup({
      entries: [
        { id: "early", day: 0, start: 300, end: 420, title: "Early" },
        { id: "night", day: 1, start: 60, end: 120, title: "Night" },
      ],
    });
    const early = screen.getByRole("button", { name: /Early/ });
    expect(early.style.top).toBe("1px");
    expect(early.style.height).toBe("31px");
    expect(screen.queryByRole("button", { name: /Night/ })).toBeNull();
  });

  it("puts the time and states in the block's description, not its name", () => {
    setup({
      entries: [
        { id: "x", day: 0, start: 540, end: 720, title: "Market open", meta: "Page", conflict: true, off: true },
      ],
    });
    const block = screen.getByRole("button", { name: "Market open" });
    expect(block).toHaveAccessibleDescription("Page, 9:00 AM to 12:00 PM, Overlaps another entry, Off");
  });

  it("localizes the state words and times", () => {
    setup({
      entries: [{ id: "x", day: 0, start: 540, end: 1440, title: "Markt", conflict: true }],
      labels: { conflict: "Überschneidung", off: "Aus" },
      formatTime: (m) => `${Math.floor(m / 60)}h`,
    });
    expect(screen.getByRole("button", { name: "Markt" })).toHaveAccessibleDescription("9h to 24h, Überschneidung");
  });

  it("marks kinds and states on the block for styling", () => {
    setup({ selectedId: "wed-market" });
    expect(screen.getByRole("button", { name: /Gap · Good morning/ })).toHaveAttribute("data-kind", "gap");
    expect(screen.getByRole("button", { name: /Silence/ })).toHaveAttribute("data-kind", "silence");
    expect(screen.getByRole("button", { name: /Weekday mornings/ })).toHaveAttribute("data-kind", "entry");
    const brunch = screen.getByRole("button", { name: /Brunch/ });
    expect(brunch).toHaveAttribute("data-conflict", "");
    expect(brunch).toHaveAttribute("data-selected", "");
    expect(brunch).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("button", { name: /Market open/ })).not.toHaveAttribute("aria-current");
  });

  it("draws the meta line only when there is one", () => {
    setup();
    const silence = screen.getByRole("button", { name: /Silence/ });
    expect(silence.querySelector('[data-slot="week-calendar-entry-meta"]')).toBeNull();
    const market = screen.getByRole("button", { name: /Market open/ });
    expect(market.querySelector('[data-slot="week-calendar-entry-meta"]')).toHaveTextContent("Page");
  });

  it("puts each block in its own day group, in time order", () => {
    setup();
    const monday = screen.getByRole("group", { name: "Monday, November 9" });
    expect(
      within(monday)
        .getAllByRole("button")
        .map((b) => b.getAttribute("data-entry-id")),
    ).toEqual(["mon-morning", "mon-market", "mon-gap"]);
  });

  it("selects on click and on Enter", async () => {
    const user = userEvent.setup();
    const { onSelect } = setup();
    await user.click(screen.getByRole("button", { name: /Market open/ }));
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "mon-market" }));
    screen.getByRole("button", { name: /Brunch/ }).focus();
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ id: "wed-market" }));
  });

  describe("roving focus", () => {
    it("is one tab stop: the selected block, or else the first block in reading order", async () => {
      const user = userEvent.setup();
      const { unmount } = setup();
      await user.tab();
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-morning");
      const tabbable = screen.getAllByRole("button").filter((b) => b.tabIndex === 0);
      expect(tabbable).toHaveLength(1);
      unmount();
      setup({ selectedId: "wed-market" });
      await user.tab();
      expect(document.activeElement).toHaveAttribute("data-entry-id", "wed-market");
    });

    it("↑ ↓ move within a day and stop at its ends; Home / End jump", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      await user.keyboard("{ArrowDown}");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-market");
      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-gap");
      await user.keyboard("{Home}");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-morning");
      await user.keyboard("{ArrowUp}");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-morning");
      await user.keyboard("{End}");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-gap");
      // The block that took focus becomes the tab stop.
      expect((document.activeElement as HTMLElement).tabIndex).toBe(0);
      expect(screen.getByRole("button", { name: /Weekday mornings/ }).tabIndex).toBe(-1);
    });

    it("← → go to the nearest block in time on the next day that has one, skipping empty days", async () => {
      const user = userEvent.setup();
      setup();
      screen.getByRole("button", { name: /Market open/ }).focus();
      await user.keyboard("{ArrowRight}");
      // Tuesday is empty; Wednesday's 10:00 brunch is nearest to 9:00.
      expect(document.activeElement).toHaveAttribute("data-entry-id", "wed-market");
      await user.keyboard("{ArrowRight}");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "wed-market");
      await user.keyboard("{ArrowLeft}");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-market");
      await user.keyboard("{ArrowLeft}");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-market");
    });

    it("leaves other keys alone", async () => {
      const user = userEvent.setup();
      setup();
      await user.tab();
      await user.keyboard("a");
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-morning");
    });

    it("keeps a tab stop when the selected id is not on the grid", async () => {
      const user = userEvent.setup();
      setup({ selectedId: "nope" });
      await user.tab();
      expect(document.activeElement).toHaveAttribute("data-entry-id", "mon-morning");
    });
  });

  describe("now line", () => {
    it("draws on the given day at the given minute, decorative", () => {
      const { container } = setup({ now: { day: 1, minute: 581 } });
      const line = container.querySelector('[data-slot="week-calendar-now"]') as HTMLElement;
      expect(line).toHaveAttribute("aria-hidden", "true");
      expect(line.closest('[data-slot="week-calendar-day"]')).toHaveAttribute("data-day-id", "tue");
      // 9:41 AM is 221 min after 6 AM; 221 × 34 / 60 ≈ 125.23.
      expect(parseFloat(line.style.top)).toBeCloseTo(125.23, 1);
    });

    it("is not drawn outside the visible hours or on a day that is not shown", () => {
      const { container, rerender } = setup({ now: { day: 1, minute: 120 } });
      expect(container.querySelector('[data-slot="week-calendar-now"]')).toBeNull();
      rerender(<WeekCalendar aria-label="w" days={DAYS} entries={[]} now={{ day: 9, minute: 600 }} />);
      expect(container.querySelector('[data-slot="week-calendar-now"]')).toBeNull();
    });
  });

  it("renders an empty week with no tab stop and no crash", () => {
    const { container } = setup({ entries: [] });
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(container.querySelectorAll('[data-slot="week-calendar-day"]')).toHaveLength(3);
  });

  it("passes className and extra props to the root", () => {
    setup({ className: "max-w-xl", id: "cal" } as never);
    const root = screen.getByRole("group", { name: "Week of November 9–15" });
    expect(root).toHaveClass("max-w-xl");
    expect(root).toHaveAttribute("id", "cal");
  });

  describe("drag to create (pointer only)", () => {
    function dayColumn(name: string) {
      return screen.getByRole("group", { name }).closest('[data-slot="week-calendar-day"]') as HTMLElement;
    }

    it("is off without onCreate", () => {
      const { container } = setup();
      const column = dayColumn("Tuesday, November 10");
      layOut(column, 612);
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 200, pointerId: 1 });
      expect(container.querySelector('[data-slot="week-calendar-draft"]')).toBeNull();
      expect(column).not.toHaveAttribute("data-creatable");
    });

    it("a mouse drag proposes a 15-minute-snapped range and reports it on release", () => {
      const onCreate = vi.fn();
      const { container } = setup({ onCreate });
      const column = dayColumn("Tuesday, November 10");
      expect(column).toHaveAttribute("data-creatable", "");
      layOut(column, 612);
      // y = 102 → 3 h → 9:00 AM. Drag to y = 145 → 9:75.88 min → snaps to 10:15, range end 10:30.
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 202, pointerId: 1 });
      fireEvent.pointerMove(column, { pointerType: "mouse", clientY: 245, pointerId: 1 });
      const draft = container.querySelector('[data-slot="week-calendar-draft"]') as HTMLElement;
      expect(draft).toHaveAttribute("aria-hidden", "true");
      expect(draft).toHaveTextContent("9:00 AM – 10:30 AM");
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: 245, pointerId: 1 });
      expect(onCreate).toHaveBeenCalledWith({ day: 1, start: 540, end: 630 });
      expect(container.querySelector('[data-slot="week-calendar-draft"]')).toBeNull();
    });

    it("dragging upwards keeps the range ordered", () => {
      const onCreate = vi.fn();
      setup({ onCreate });
      const column = dayColumn("Tuesday, November 10");
      layOut(column, 612);
      fireEvent.pointerDown(column, { pointerType: "pen", button: 0, clientY: 202, pointerId: 2 });
      fireEvent.pointerMove(column, { pointerType: "pen", clientY: 160, pointerId: 2 });
      fireEvent.pointerUp(column, { pointerType: "pen", clientY: 160, pointerId: 2 });
      // y 60 → 105.88 min after 6 → 7:45; anchor 9:00 → range 7:45–9:15.
      expect(onCreate).toHaveBeenCalledWith({ day: 1, start: 465, end: 555 });
    });

    it("a click without a drag proposes one hour, clamped to the end of the grid", () => {
      const onCreate = vi.fn();
      setup({ onCreate, endHour: 24 });
      const column = dayColumn("Tuesday, November 10");
      layOut(column, 612);
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 202, pointerId: 1 });
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: 202, pointerId: 1 });
      expect(onCreate).toHaveBeenLastCalledWith({ day: 1, start: 540, end: 600 });
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 100 + 600, pointerId: 1 });
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: 100 + 600, pointerId: 1 });
      expect(onCreate).toHaveBeenLastCalledWith({ day: 1, start: 1410, end: 1440 });
    });

    it("never starts from touch, a secondary button, or a press on a block", () => {
      const onCreate = vi.fn();
      const { container } = setup({ onCreate });
      const column = dayColumn("Monday, November 9");
      layOut(column, 612);
      fireEvent.pointerDown(column, { pointerType: "touch", button: 0, clientY: 202, pointerId: 3 });
      fireEvent.pointerUp(column, { pointerType: "touch", clientY: 260, pointerId: 3 });
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 2, clientY: 202, pointerId: 1 });
      fireEvent.pointerUp(column, { pointerType: "mouse", button: 2, clientY: 260, pointerId: 1 });
      const block = screen.getByRole("button", { name: /Market open/ });
      fireEvent.pointerDown(block, { pointerType: "mouse", button: 0, clientY: 210, pointerId: 1 });
      fireEvent.pointerUp(block, { pointerType: "mouse", clientY: 260, pointerId: 1 });
      expect(onCreate).not.toHaveBeenCalled();
      expect(container.querySelector('[data-slot="week-calendar-draft"]')).toBeNull();
    });

    it("ignores moves and releases from another pointer, and Escape cancels", () => {
      const onCreate = vi.fn();
      const { container } = setup({ onCreate });
      const column = dayColumn("Tuesday, November 10");
      layOut(column, 612);
      fireEvent.pointerMove(column, { pointerType: "mouse", clientY: 260, pointerId: 1 });
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: 260, pointerId: 1 });
      expect(onCreate).not.toHaveBeenCalled();
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 202, pointerId: 1 });
      fireEvent.pointerMove(column, { pointerType: "mouse", clientY: 260, pointerId: 9 });
      expect(container.querySelector('[data-slot="week-calendar-draft"]')).toHaveTextContent("9:00 AM – 10:00 AM");
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: 260, pointerId: 9 });
      expect(onCreate).not.toHaveBeenCalled();
      act(() => {
        fireEvent.keyDown(window, { key: "Escape" });
      });
      expect(container.querySelector('[data-slot="week-calendar-draft"]')).toBeNull();
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: 260, pointerId: 1 });
      expect(onCreate).not.toHaveBeenCalled();
    });

    it("pointercancel drops the draft; other keys do not", () => {
      const onCreate = vi.fn();
      const { container } = setup({ onCreate });
      const column = dayColumn("Tuesday, November 10");
      layOut(column, 612);
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 202, pointerId: 1 });
      act(() => {
        fireEvent.keyDown(window, { key: "a" });
      });
      expect(container.querySelector('[data-slot="week-calendar-draft"]')).not.toBeNull();
      fireEvent.pointerCancel(column, { pointerType: "mouse", pointerId: 1 });
      expect(container.querySelector('[data-slot="week-calendar-draft"]')).toBeNull();
      expect(onCreate).not.toHaveBeenCalled();
    });

    it("clamps a drag above or below the grid to its edges", () => {
      const onCreate = vi.fn();
      setup({ onCreate, endHour: 24 });
      const column = dayColumn("Tuesday, November 10");
      layOut(column, 612);
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 202, pointerId: 1 });
      fireEvent.pointerMove(column, { pointerType: "mouse", clientY: -500, pointerId: 1 });
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: -500, pointerId: 1 });
      expect(onCreate).toHaveBeenLastCalledWith({ day: 1, start: 360, end: 555 });
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 202, pointerId: 1 });
      fireEvent.pointerMove(column, { pointerType: "mouse", clientY: 5000, pointerId: 1 });
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: 5000, pointerId: 1 });
      expect(onCreate).toHaveBeenLastCalledWith({ day: 1, start: 540, end: 1440 });
    });

    it("snaps to snapMinutes", () => {
      const onCreate = vi.fn();
      setup({ onCreate, snapMinutes: 30 });
      const column = dayColumn("Tuesday, November 10");
      layOut(column, 612);
      // y 112 → 197.6 min after 6 → 9:17 → floors to 9:00 at a 30-minute snap.
      fireEvent.pointerDown(column, { pointerType: "mouse", button: 0, clientY: 212, pointerId: 1 });
      fireEvent.pointerMove(column, { pointerType: "mouse", clientY: 230, pointerId: 1 });
      fireEvent.pointerUp(column, { pointerType: "mouse", clientY: 230, pointerId: 1 });
      // y 130 → 229 min → 9:49 → 9:30; end = 9:30 + 30.
      expect(onCreate).toHaveBeenLastCalledWith({ day: 1, start: 540, end: 600 });
    });
  });
});
