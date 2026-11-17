import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BoardMinimap } from "./board-minimap";

const board = { deviceType: "panel" as const, gridCols: 96, gridRows: 24, message: "LOBBY" };
const viewport = { column: 1, row: 1, columns: 44, rows: 12 };
const control = () => screen.getByRole("button", { name: "Board minimap" });
function rect() {
  vi.spyOn(control(), "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 240,
    bottom: 80.1033,
    width: 240,
    height: 80.1033,
    toJSON: () => ({}),
  });
}

describe("BoardMinimap", () => {
  it.each([
    { deviceType: "note_array" as const, notesWide: 2, notesTall: 1 },
    { deviceType: "panel" as const, gridCols: 96, gridRows: 3 },
  ])("keeps shallow boards inside an accessible hit area: $deviceType", (shallow) => {
    const { container } = render(
      <BoardMinimap board={shallow} viewport={{ column: 1, row: 1, columns: 10, rows: 1 }} onJump={vi.fn()} />,
    );
    expect(parseFloat(control().style.height)).toBeGreaterThanOrEqual(44);
    const thumbnail = container.querySelector<HTMLElement>('[data-slot="board-minimap-thumbnail"]')!;
    expect(parseFloat(thumbnail.style.top)).toBeGreaterThan(0);
  });

  it("maps the centered shallow thumbnail without treating its padded hit area as board rows", () => {
    const onJump = vi.fn();
    render(
      <BoardMinimap
        board={{ deviceType: "panel", gridCols: 96, gridRows: 3 }}
        viewport={{ column: 1, row: 1, columns: 10, rows: 1 }}
        onJump={onJump}
      />,
    );
    vi.spyOn(control(), "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 240,
      bottom: 44,
      width: 240,
      height: 44,
      toJSON: () => ({}),
    });
    fireEvent.pointerDown(control(), { pointerId: 1, button: 0, clientX: 120, clientY: 22 });
    expect(onJump).toHaveBeenLastCalledWith({ column: 44, row: 2 });
    fireEvent.pointerMove(control(), { pointerId: 1, clientX: 120, clientY: 0 });
    expect(onJump).toHaveBeenLastCalledWith({ column: 44, row: 1 });
    fireEvent.pointerMove(control(), { pointerId: 1, clientX: 120, clientY: 44 });
    expect(onJump).toHaveBeenLastCalledWith({ column: 44, row: 3 });
  });

  it("labels the thumbnail as an overview and follows a controlled caret window", () => {
    const { rerender } = render(<BoardMinimap board={board} viewport={viewport} onJump={vi.fn()} />);
    expect(screen.getByText("OVERVIEW · 96 × 24")).toBeInTheDocument();
    expect(screen.getByText("Cols 1–44 · Rows 1–12")).toBeInTheDocument();
    expect(control()).toHaveAccessibleDescription(/Cols 1–44.*arrow keys/i);
    rerender(<BoardMinimap board={board} viewport={{ ...viewport, column: 53, row: 13 }} onJump={vi.fn()} />);
    expect(screen.getByText("Cols 53–96 · Rows 13–24")).toBeInTheDocument();
  });

  it("pans one cell, pages with Shift and clamps each edge", async () => {
    const onJump = vi.fn();
    render(<BoardMinimap board={board} viewport={{ ...viewport, column: 10, row: 5 }} onJump={onJump} />);
    control().focus();
    const user = userEvent.setup();
    await user.keyboard("{ArrowRight}{ArrowLeft}{ArrowDown}{ArrowUp}");
    expect(onJump.mock.calls.map(([point]) => point)).toEqual([
      { column: 11, row: 5 },
      { column: 9, row: 5 },
      { column: 10, row: 6 },
      { column: 10, row: 4 },
    ]);
    onJump.mockClear();
    await user.keyboard("{Shift>}{ArrowRight}{ArrowDown}{ArrowLeft}{ArrowUp}{/Shift}{Home}{End}");
    expect(onJump.mock.calls.map(([point]) => point)).toEqual([
      { column: 53, row: 5 },
      { column: 10, row: 13 },
      { column: 1, row: 5 },
      { column: 10, row: 1 },
      { column: 1, row: 1 },
      { column: 53, row: 13 },
    ]);
  });

  it("clicks outside the frame to center that board location and clamps at the edges", () => {
    const onJump = vi.fn();
    render(<BoardMinimap board={board} viewport={viewport} onJump={onJump} />);
    rect();
    fireEvent.pointerDown(control(), { pointerId: 1, button: 0, clientX: 239, clientY: 79 });
    expect(onJump).toHaveBeenLastCalledWith({ column: 53, row: 13 });
    fireEvent.pointerUp(control(), { pointerId: 1 });
    fireEvent.pointerDown(control(), { pointerId: 2, button: 0, clientX: 120, clientY: 40 });
    expect(onJump).toHaveBeenLastCalledWith({ column: 27, row: 7 });
  });

  it("preserves the grab offset when dragging the frame and restores on cancellation", () => {
    const onJump = vi.fn();
    render(<BoardMinimap board={board} viewport={viewport} onJump={onJump} />);
    rect();
    fireEvent.pointerDown(control(), { pointerId: 3, button: 0, clientX: 20, clientY: 20 });
    expect(onJump).not.toHaveBeenCalled();
    fireEvent.pointerMove(control(), { pointerId: 3, clientX: 60, clientY: 40 });
    expect(onJump).toHaveBeenLastCalledWith({ column: 17, row: 7 });
    fireEvent.pointerCancel(control(), { pointerId: 3 });
    expect(onJump).toHaveBeenLastCalledWith({ column: 1, row: 1 });
  });

  it("normalizes invalid and oversized viewports together with the rendered board", () => {
    const onJump = vi.fn();
    render(
      <BoardMinimap board={board} viewport={{ column: NaN, row: -4, columns: 300, rows: Infinity }} onJump={onJump} />,
    );
    expect(screen.getByText("Cols 1–96 · Rows 1–24")).toBeInTheDocument();
    fireEvent.keyDown(control(), { key: "End" });
    expect(onJump).toHaveBeenCalledWith({ column: 1, row: 1 });
  });

  it("does not emit any navigation while disabled", async () => {
    const onJump = vi.fn();
    render(<BoardMinimap board={board} viewport={viewport} onJump={onJump} disabled />);
    expect(control()).toBeDisabled();
    await userEvent.click(control());
    fireEvent.keyDown(control(), { key: "End" });
    fireEvent.pointerDown(control(), { pointerId: 4, button: 0, clientX: 200, clientY: 70 });
    expect(onJump).not.toHaveBeenCalled();
  });
  it("keeps the full-height Den TV viewport at its drawn126.792px height", () => {
    const { container } = render(
      <BoardMinimap
        board={{ deviceType: "panel", gridCols: 29, gridRows: 12 }}
        viewport={{ column: 1, row: 1, columns: 21, rows: 12 }}
        onJump={vi.fn()}
      />,
    );
    const frame = container.querySelector<HTMLElement>("[data-slot=board-minimap-viewport]")!;
    expect(parseFloat(frame.style.height)).toBeCloseTo(126.792, 2);
  });

  it("supports keyboard activation and ignores unrelated keys", async () => {
    const onJump = vi.fn();
    render(<BoardMinimap board={board} viewport={viewport} onJump={onJump} />);
    control().focus();
    await userEvent.keyboard("x{Escape}");
    expect(onJump).not.toHaveBeenCalled();
    await userEvent.keyboard("{Enter}");
    expect(onJump).toHaveBeenCalledWith({ column: 27, row: 7 });
  });

  it("cancels an active drag with Escape and ignores later movement", () => {
    const onJump = vi.fn();
    render(<BoardMinimap board={board} viewport={viewport} onJump={onJump} />);
    rect();
    fireEvent.pointerDown(control(), { pointerId: 1, button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(control(), { pointerId: 2, clientX: 80, clientY: 50 });
    expect(onJump).not.toHaveBeenCalled();
    fireEvent.pointerMove(control(), { pointerId: 1, clientX: 80, clientY: 50 });
    fireEvent.keyDown(control(), { key: "Escape" });
    expect(onJump).toHaveBeenLastCalledWith({ column: 1, row: 1 });
    onJump.mockClear();
    fireEvent.pointerMove(control(), { pointerId: 1, clientX: 100, clientY: 60 });
    fireEvent.pointerUp(control(), { pointerId: 1 });
    expect(onJump).not.toHaveBeenCalled();
  });

  it("ignores secondary buttons and invalid surface geometry", () => {
    const onJump = vi.fn();
    render(
      <BoardMinimap
        board={{ message: "HELLO" }}
        viewport={{ column: 1, row: 1, columns: 10, rows: 3 }}
        onJump={onJump}
      />,
    );
    expect(screen.getByText("OVERVIEW · 22 × 6")).toBeInTheDocument();
    fireEvent.pointerDown(control(), { pointerId: 1, button: 2, clientX: 20, clientY: 20 });
    fireEvent.pointerDown(control(), { pointerId: 1, button: 0, clientX: 20, clientY: 20 });
    expect(onJump).not.toHaveBeenCalled();
  });

  it("uses physical Note seams and localized captions", () => {
    const onJump = vi.fn();
    const { container } = render(
      <BoardMinimap
        board={{ deviceType: "note_array", notesWide: 2, notesTall: 2 }}
        viewport={{ column: 16, row: 4, columns: 15, rows: 3 }}
        onJump={onJump}
        labels={{
          control: "Navigate Notes",
          overview: (c, r) => `Overview ${c} by ${r}`,
          viewport: (c, end, r, last) => `${c}-${end}/${r}-${last}`,
          hint: "Jump",
          keyboard: "Arrows pan",
        }}
      />,
    );
    expect(screen.getByText("Overview 30 by 6")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Navigate Notes" })).toHaveAccessibleDescription(
      "16-30/4-6 Jump Arrows pan",
    );
    const frame = container.querySelector<HTMLElement>("[data-slot=board-minimap-viewport]")!;
    expect(parseFloat(frame.style.left)).toBeCloseTo(122.164, 2);
    expect(parseFloat(frame.style.width)).toBeCloseTo(115.431, 2);
  });
});
