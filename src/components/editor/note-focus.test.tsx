import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { NoteFocus } from "./note-focus";

describe("NoteFocus", () => {
  it("reports the selected canvas range while leaving state controlled", async () => {
    const user = userEvent.setup();
    const onNoteChange = vi.fn();
    const { rerender } = render(<NoteFocus note={null} onNoteChange={onNoteChange} />);
    expect(screen.getByRole("radiogroup", { name: "Focus note" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    await user.click(screen.getByRole("radio", { name: "Note 4" }));
    expect(onNoteChange).toHaveBeenCalledExactlyOnceWith(4, {
      note: 4,
      rowStart: 3,
      rowEnd: 6,
      columnStart: 15,
      columnEnd: 30,
    });
    expect(screen.getByRole("radio", { name: "All notes" })).toBeChecked();
    rerender(<NoteFocus note={4} onNoteChange={onNoteChange} />);
    expect(screen.getByRole("radio", { name: "Note 4" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "All notes" }));
    expect(onNoteChange).toHaveBeenLastCalledWith(null, null);
  });

  it("uses one radio tab stop and row-major keyboard selection on a non-square array", async () => {
    const user = userEvent.setup();
    function Example() {
      const [note, setNote] = useState<number | null>(1);
      return <NoteFocus notesWide={3} notesTall={1} note={note} onNoteChange={setNote} />;
    }
    render(<Example />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Note 1" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Note 2" })).toBeChecked();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Note 3" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "All notes" })).toBeChecked();
    await user.keyboard("{ArrowLeft}{Home}");
    expect(screen.getByRole("radio", { name: "All notes" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("radio", { name: "All notes" })).not.toHaveFocus();
  });

  it("does not activate disabled options", () => {
    const onNoteChange = vi.fn();
    render(<NoteFocus note={2} onNoteChange={onNoteChange} disabled size="touch" />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
      fireEvent.click(radio);
    }
    expect(onNoteChange).not.toHaveBeenCalled();
  });

  it("falls back to All notes after shrinking, without emitting a synthetic change", () => {
    const onNoteChange = vi.fn();
    const { rerender } = render(<NoteFocus note={4} onNoteChange={onNoteChange} />);
    rerender(<NoteFocus note={4} notesWide={1} notesTall={1} onNoteChange={onNoteChange} />);
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("radio", { name: "All notes" })).toBeChecked();
    expect(onNoteChange).not.toHaveBeenCalled();
  });

  it("localizes the group and options independently of their values", async () => {
    const onNoteChange = vi.fn();
    const user = userEvent.setup();
    render(
      <NoteFocus
        note={null}
        onNoteChange={onNoteChange}
        labels={{ group: "Aperçu", allNotes: "Toutes", note: (n) => `Écran ${n}` }}
      />,
    );
    expect(screen.getByRole("radiogroup", { name: "Aperçu" })).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Écran 2" }));
    expect(onNoteChange).toHaveBeenLastCalledWith(2, {
      note: 2,
      rowStart: 0,
      rowEnd: 3,
      columnStart: 15,
      columnEnd: 30,
    });
  });

  it("keeps the selection visible after viewport or label widths change", () => {
    const callbacks = new Map<Element, () => void>();
    const original = globalThis.ResizeObserver;
    globalThis.ResizeObserver = class {
      private elements: Element[] = [];
      constructor(private callback: () => void) {}
      observe(element: Element) {
        this.elements.push(element);
        callbacks.set(element, this.callback);
      }
      unobserve(element: Element) {
        callbacks.delete(element);
      }
      disconnect() {
        this.elements.forEach((element) => callbacks.delete(element));
      }
    } as unknown as typeof ResizeObserver;
    try {
      const { container, unmount } = render(<NoteFocus note={4} onNoteChange={() => {}} />);
      const viewport = container.querySelector<HTMLElement>('[data-slot="note-focus"]')!;
      const option = screen.getByRole("radio", { name: "Note 4" });
      vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 10, right: 110, width: 100 } as DOMRect);
      vi.spyOn(option, "getBoundingClientRect").mockReturnValue({ left: 160, right: 220 } as DOMRect);
      act(() => callbacks.get(viewport)?.());
      expect(viewport.scrollLeft).toBe(113);
      vi.mocked(option.getBoundingClientRect).mockReturnValue({ left: 20, right: 80 } as DOMRect);
      act(() => callbacks.get(viewport.firstElementChild!)?.());
      expect(viewport.scrollLeft).toBe(113);
      unmount();
      expect(callbacks.has(viewport)).toBe(false);
    } finally {
      globalThis.ResizeObserver = original;
    }
  });

  it("scrolls only its own viewport to reveal a controlled selection", () => {
    const { container, rerender } = render(<NoteFocus note={null} onNoteChange={() => {}} />);
    const viewport = container.querySelector<HTMLElement>('[data-slot="note-focus"]')!;
    vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue({ left: 10, right: 110, width: 100 } as DOMRect);
    vi.spyOn(screen.getByRole("radio", { name: "Note 4" }), "getBoundingClientRect").mockReturnValue({
      left: 160,
      right: 220,
    } as DOMRect);
    rerender(<NoteFocus note={4} onNoteChange={() => {}} />);
    expect(viewport.scrollLeft).toBe(113);
    vi.spyOn(screen.getByRole("radio", { name: "All notes" }), "getBoundingClientRect").mockReturnValue({
      left: -90,
      right: -20,
    } as DOMRect);
    rerender(<NoteFocus note={null} onNoteChange={() => {}} />);
    expect(viewport.scrollLeft).toBe(10);
  });
});
