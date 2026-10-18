import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BoardDisplay, type BoardDisplayProps } from "./board-display";
import { reducedMotionQuery } from "./reduced-motion";

const sizes: Array<[string, number, number, Partial<BoardDisplayProps>]> = [
  ["Note", 3, 15, { deviceType: "note" }],
  ["Flagship", 6, 22, {}],
  ["2×2 Notes", 6, 30, { deviceType: "note_array", notesWide: 2, notesTall: 2 }],
  ["large panel", 12, 64, { deviceType: "panel", gridRows: 12, gridCols: 64 }],
  ["8×8 Notes", 24, 120, { deviceType: "note_array", notesWide: 8, notesTall: 8 }],
];
const message = (char: string, rows: number, cols: number) => Array(rows).fill(char.repeat(cols)).join("\n");
const tiles = (container: HTMLElement) => [...container.querySelectorAll<HTMLElement>("[data-current-char]")];

describe("split-flap animation scheduling", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it.each(sizes)(
    "%s shares one timer for every changed tile, then releases it",
    (_name, rows, cols, props) => {
      const { container, rerender, unmount } = render(<BoardDisplay {...props} message={message("A", rows, cols)} />);
      expect(vi.getTimerCount()).toBe(0);
      rerender(<BoardDisplay {...props} message={message("D", rows, cols)} />);
      const all = tiles(container);
      expect(all).toHaveLength(rows * cols);
      expect(all.every((tile) => tile.dataset.currentChar === "B")).toBe(true);
      expect(vi.getTimerCount()).toBe(1);
      act(() => vi.advanceTimersByTime(80));
      expect(all.every((tile) => tile.dataset.currentChar === "C")).toBe(true);
      act(() => vi.advanceTimersByTime(80));
      expect(all.every((tile) => tile.dataset.currentChar === "D")).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      unmount();
      expect(vi.getTimerCount()).toBe(0);
    },
    30_000,
  );

  it("retargets in flight without restarting the cadence, including a speed change", () => {
    const { container, rerender, unmount } = render(<BoardDisplay deviceType="note" message="AA" />);
    rerender(<BoardDisplay deviceType="note" message="ZZ" />);
    act(() => vi.advanceTimersByTime(40));
    rerender(<BoardDisplay deviceType="note" message="FF" />);
    act(() => vi.advanceTimersByTime(40));
    expect(tiles(container)[0].dataset.currentChar).toBe("C");
    rerender(<BoardDisplay deviceType="note" message="FF" flapSpeed="quick" />);
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(48));
    expect(tiles(container)[0].dataset.currentChar).toBe("D");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("shares loading and message-change work at the same cadence across boards", () => {
    const boards = (next: boolean) => (
      <>
        <BoardDisplay deviceType="note" message="A" isLoading />
        <BoardDisplay deviceType="note" message={next ? "Z" : "A"} />
        <BoardDisplay deviceType="note" message={next ? "Z" : "A"} flapSpeed="quick" />
      </>
    );
    const { rerender, unmount } = render(boards(false));
    rerender(boards(true));
    expect(vi.getTimerCount()).toBe(2);
    act(() => vi.advanceTimersByTime(160));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("gives a new flap its full duration when another board's tick is about to fire", () => {
    const boards = (message: string) => (
      <>
        <BoardDisplay deviceType="note" message="A" isLoading />
        <BoardDisplay deviceType="note" message={message} />
      </>
    );
    const { container, rerender } = render(boards("A"));
    act(() => vi.advanceTimersByTime(79));
    rerender(boards("D"));
    const secondBoardTile = tiles(container)[45];
    expect(secondBoardTile.dataset.currentChar).toBe("B");
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(1));
    expect(secondBoardTile.dataset.currentChar).toBe("B");
    act(() => vi.advanceTimersByTime(79));
    expect(secondBoardTile.dataset.currentChar).toBe("C");
    act(() => vi.advanceTimersByTime(80));
    expect(secondBoardTile.dataset.currentChar).toBe("D");
  });

  it("keeps a board in one batch when the clock advances during tile registration", () => {
    const { container, rerender } = render(<BoardDisplay deviceType="note" message={message("A", 3, 15)} />);
    let clock = 0;
    let registering = true;
    vi.spyOn(performance, "now").mockImplementation(() => (registering ? clock++ : 80));
    rerender(<BoardDisplay deviceType="note" message={message("D", 3, 15)} />);
    registering = false;
    act(() => vi.advanceTimersByTime(80));
    expect(tiles(container).every((tile) => tile.dataset.currentChar === "C")).toBe(true);
  });

  it("stops all work when animation is disabled mid-flight", () => {
    const { container, rerender } = render(<BoardDisplay message="AAAA" />);
    rerender(<BoardDisplay message="ZZZZ" />);
    rerender(<BoardDisplay message="ZZZZ" animationsEnabled={false} />);
    expect(vi.getTimerCount()).toBe(0);
    expect(
      tiles(container)
        .slice(0, 4)
        .every((tile) => tile.dataset.currentChar === "Z"),
    ).toBe(true);
  });

  it.each(["sm", "md", "lg"] as const)("restarts each %s flap without replacing its animated DOM layers", (size) => {
    const { container, rerender } = render(<BoardDisplay message="A" size={size} />);
    rerender(<BoardDisplay message="Z" size={size} />);
    const tile = tiles(container)[0];
    const layers = [...tile.querySelectorAll<HTMLElement>("[style*='animation:']")];
    expect(layers).toHaveLength(3);
    const animations = layers.map((layer) => layer.style.animation);
    act(() => vi.advanceTimersByTime(80));
    expect([...tile.querySelectorAll("[style*='animation:']")]).toEqual(layers);
    expect(layers.every((layer) => layer.isConnected)).toBe(true);
    expect(layers.map((layer) => layer.style.animation)).not.toEqual(animations);
    expect(tile.dataset.currentChar).toBe("C");
  });

  it("restarts a reused flap even when React batches multiple drum steps", () => {
    const { container, rerender } = render(<BoardDisplay message="A" />);
    rerender(<BoardDisplay message="Z" />);
    const layer = tiles(container)[0].querySelector<HTMLElement>("[style*='animation:']")!;
    const animation = layer.style.animation;
    act(() => vi.advanceTimersByTime(160));
    expect(layer.isConnected).toBe(true);
    expect(layer.style.animation).not.toBe(animation);
    expect(tiles(container)[0].dataset.currentChar).toBe("D");
  });

  it("hands loading over to the latest target and releases the shared clock", () => {
    const { container, rerender } = render(<BoardDisplay deviceType="note" message="A" isLoading />);
    act(() => vi.advanceTimersByTime(80));
    rerender(<BoardDisplay deviceType="note" message="E" />);
    expect(tiles(container)[0].dataset.currentChar).toBe("C");
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(160));
    expect(tiles(container)[0].dataset.currentChar).toBe("E");
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not schedule loading or transitions under reduced motion", () => {
    Object.defineProperty(reducedMotionQuery, "matches", { value: true, configurable: true });
    try {
      const { container, rerender } = render(<BoardDisplay message="A" isLoading />);
      rerender(<BoardDisplay message="Z" />);
      expect(vi.getTimerCount()).toBe(0);
      expect(tiles(container)[0].dataset.currentChar).toBe("Z");
    } finally {
      Object.defineProperty(reducedMotionQuery, "matches", { value: false, configurable: true });
    }
  });
});
