import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Countdown, formatRemaining } from "./countdown";

const MIN = 60_000;
const HOUR = 60 * MIN;
// 6:18 PM local; the override started at 5:00 PM and holds until 9:00 PM.
const NOW = new Date(2026, 10, 11, 18, 18, 0).getTime();
const START = new Date(2026, 10, 11, 17, 0, 0).getTime();
const END = new Date(2026, 10, 11, 21, 0, 0).getTime();

describe("formatRemaining", () => {
  it.each([
    [2 * HOUR + 42 * MIN, "2h 42m left"],
    [2 * HOUR + 41 * MIN + 1, "2h 42m left"], // a started minute still counts
    [2 * HOUR, "2h left"],
    [42 * MIN, "42m left"],
    [MIN, "1m left"],
    [1, "1m left"],
    [0, "0m left"],
    [-5, "0m left"],
  ])("%d ms reads %s", (ms, expected) => {
    expect(formatRemaining(ms)).toBe(expected);
  });
});

describe("Countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the remaining time and the end time", () => {
    render(<Countdown endsAt={END} />);

    expect(screen.getByRole("timer")).toHaveTextContent("2h 42m left");
    expect(screen.getByText("until 9:00 PM")).toBeInTheDocument();
  });

  it("keeps the visible timer out of live announcements", () => {
    render(<Countdown endsAt={END} />);
    const timer = screen.getByRole("timer");
    // role="timer" is implicitly aria-live="off"; nothing may turn it back on.
    expect(timer).not.toHaveAttribute("aria-live");
    expect(timer.closest("[aria-live]:not([aria-live='off'])")).toBeNull();
  });

  it("ticks once per minute boundary, not per second", () => {
    vi.setSystemTime(END - (42 * MIN + 30_000)); // 42m 30s left → reads 43m
    render(<Countdown endsAt={END} />);
    expect(screen.getByRole("timer")).toHaveTextContent("43m left");
    expect(vi.getTimerCount()).toBe(1);

    act(() => vi.advanceTimersByTime(29_999));
    expect(screen.getByRole("timer")).toHaveTextContent("43m left");
    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole("timer")).toHaveTextContent("42m left");
    act(() => vi.advanceTimersByTime(MIN));
    expect(screen.getByRole("timer")).toHaveTextContent("41m left");
    expect(vi.getTimerCount()).toBe(1);
  });

  it("announces only at the thresholds and at the end", () => {
    const onEnd = vi.fn();
    vi.setSystemTime(END - 6 * MIN);
    const { container } = render(<Countdown endsAt={END} onEnd={onEnd} />);
    const live = container.querySelector('[data-slot="countdown-announcer"]')!;
    expect(live).toHaveAttribute("aria-live", "polite");
    expect(live).toHaveClass("sr-only");
    expect(live).toHaveTextContent("");

    act(() => vi.advanceTimersByTime(MIN)); // 5m left: the default threshold
    expect(live).toHaveTextContent("5m left");

    act(() => vi.advanceTimersByTime(MIN)); // 4m left: no new announcement
    expect(live).toHaveTextContent("5m left");

    act(() => vi.advanceTimersByTime(4 * MIN)); // 0: ended
    expect(live).toHaveTextContent("Override ended");
    expect(screen.getByRole("timer")).toHaveTextContent("Ending now");
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(container.querySelector('[data-slot="countdown"]')).toHaveAttribute("data-state", "ended");
  });

  it("does not announce a threshold it was already past when it mounted", () => {
    vi.setSystemTime(END - 3 * MIN);
    const { container } = render(<Countdown endsAt={END} />);
    act(() => vi.advanceTimersByTime(MIN));
    expect(container.querySelector('[data-slot="countdown-announcer"]')).toHaveTextContent("");
  });

  it("takes custom thresholds", () => {
    vi.setSystemTime(END - 16 * MIN);
    const { container } = render(<Countdown endsAt={END} announceAt={[15 * MIN, MIN]} />);
    const live = container.querySelector('[data-slot="countdown-announcer"]')!;
    act(() => vi.advanceTimersByTime(MIN));
    expect(live).toHaveTextContent("15m left");
    act(() => vi.advanceTimersByTime(14 * MIN));
    expect(live).toHaveTextContent("1m left");
  });

  it("calls onEnd immediately when mounted after the end", () => {
    const onEnd = vi.fn();
    render(<Countdown endsAt={NOW - MIN} onEnd={onEnd} />);
    expect(screen.getByRole("timer")).toHaveTextContent("Ending now");
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it("restarts when endsAt changes", () => {
    const { rerender } = render(<Countdown endsAt={END} />);
    rerender(<Countdown endsAt={NOW + 15 * MIN} />);
    expect(screen.getByRole("timer")).toHaveTextContent("15m left");
    expect(vi.getTimerCount()).toBe(1);
  });

  it("clears its timer on unmount", () => {
    const { unmount } = render(<Countdown endsAt={END} />);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("draws a decorative progress bar of the time remaining when it knows the start", () => {
    const { container } = render(<Countdown endsAt={END} startedAt={START} />);
    const track = container.querySelector('[data-slot="countdown-progress"]')!;
    expect(track).toHaveAttribute("aria-hidden", "true");
    const fill = track.querySelector<HTMLElement>('[data-slot="countdown-progress-fill"]')!;
    // 2h 42m of 4h remaining.
    expect(fill.style.width).toBe("67.5%");
  });

  it("omits the progress bar without a start, or when asked", () => {
    const { container, rerender } = render(<Countdown endsAt={END} />);
    expect(container.querySelector('[data-slot="countdown-progress"]')).toBeNull();
    rerender(<Countdown endsAt={END} startedAt={START} progress={false} />);
    expect(container.querySelector('[data-slot="countdown-progress"]')).toBeNull();
  });

  it("clamps progress to [0, 100]", () => {
    const { container, rerender } = render(<Countdown endsAt={END} startedAt={END} />);
    const fill = () => container.querySelector<HTMLElement>('[data-slot="countdown-progress-fill"]')!;
    expect(fill().style.width).toBe("100%");
    rerender(<Countdown endsAt={NOW - MIN} startedAt={START} />);
    expect(fill().style.width).toBe("0%");
  });

  it("accepts Date objects, an explicit until label and localized labels", () => {
    render(
      <Countdown
        endsAt={new Date(END)}
        startedAt={new Date(START)}
        untilLabel="hasta las 21:00"
        labels={{ remaining: (ms) => `quedan ${Math.ceil(ms / MIN)} min`, ended: "Terminando" }}
      />,
    );
    expect(screen.getByRole("timer")).toHaveTextContent("quedan 162 min");
    expect(screen.getByText("hasta las 21:00")).toBeInTheDocument();
  });

  it("formats the end time in a given locale and time zone", () => {
    render(<Countdown endsAt={Date.UTC(2026, 10, 12, 5, 0)} locale="en-US" timeZone="America/Los_Angeles" />);
    expect(screen.getByText("until 9:00 PM")).toBeInTheDocument();
  });

  it("can hide the until label", () => {
    const { container } = render(<Countdown endsAt={END} untilLabel={null} />);
    expect(container.querySelector('[data-slot="countdown-until"]')).toBeNull();
  });

  it("forwards root props", () => {
    const { container } = render(<Countdown endsAt={END} className="mt-4" data-testid="cd" />);
    const root = container.querySelector('[data-slot="countdown"]');
    expect(root).toHaveClass("mt-4");
    expect(root).toHaveAttribute("data-state", "running");
    expect(screen.getByTestId("cd")).toBe(root);
  });
});
