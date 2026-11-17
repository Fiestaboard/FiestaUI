import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { type LayerItem, LayersPanel } from "./layer-row";
import { SortableList, SortableListHandle, SortableListMoveButtons } from "./sortable-list";

const initial = ["a", "b", "c"];
function Shared({ items, onMove }: { items: string[]; onMove: (from: number, to: number) => void }) {
  return (
    <SortableList
      items={items}
      getKey={(item) => item}
      getLabel={(item) => item}
      onMove={onMove}
      renderItem={(item) => (
        <>
          <SortableListHandle />
          <span>{item}</span>
          <SortableListMoveButtons />
        </>
      )}
    />
  );
}
function lift(row = screen.getAllByRole("listitem")[0]) {
  act(() => row.focus());
  fireEvent.keyDown(row, { key: " " });
  expect(row).toHaveAttribute("data-lifted");
  return row;
}

function end(row: HTMLElement, route: "Space" | "Enter" | "Escape" | "blur") {
  if (route === "blur") act(() => screen.getAllByRole("listitem")[1].focus());
  else fireEvent.keyDown(row, { key: route === "Space" ? " " : route });
  expect(row).not.toHaveAttribute("data-lifted");
}

describe("SortableList keyboard acknowledgment lifetime", () => {
  it.each(["Space", "Enter", "Escape", "blur"] as const)(
    "does not let an acknowledgment from a lift ended by %s authorize a new lift",
    (route) => {
      const onMove = vi.fn();
      const { rerender } = render(<Shared items={initial} onMove={onMove} />);
      const row = lift();
      fireEvent.keyDown(row, { key: "ArrowDown" });
      expect(onMove).toHaveBeenCalledExactlyOnceWith(0, 1);
      end(row, route);
      lift(row);
      // The earlier gesture's request finally reaches this controlled host.
      rerender(<Shared items={["b", "a", "c"]} onMove={onMove} />);
      expect(row).not.toHaveAttribute("data-lifted");
      expect(row).toHaveFocus();
      fireEvent.keyDown(row, { key: "Escape" });
      expect(onMove.mock.calls).toEqual([[0, 1]]);
    },
  );

  it.each(["Space", "Enter", "Escape", "blur"] as const)(
    "starts a fresh origin when a prior %s acknowledgment arrives before the next lift",
    (route) => {
      const onMove = vi.fn();
      const { rerender } = render(<Shared items={initial} onMove={onMove} />);
      const row = lift();
      fireEvent.keyDown(row, { key: "ArrowDown" });
      end(row, route);
      rerender(<Shared items={["b", "a", "c"]} onMove={onMove} />);
      lift(row);
      fireEvent.keyDown(row, { key: "Escape" });
      expect(onMove.mock.calls).toEqual([[0, 1]]);
    },
  );

  it("preserves an asynchronous acknowledgment within the same lift, including metadata renders", () => {
    const onReorder = vi.fn();
    const layers: LayerItem[] = initial.map((id) => ({ id, name: id }));
    const { rerender } = render(<LayersPanel layers={layers} onReorder={onReorder} />);
    const row = lift();
    fireEvent.keyDown(row, { key: "ArrowDown" });
    const updated = layers.map((layer) => ({ ...layer, meta: "Live metadata" }));
    rerender(<LayersPanel layers={updated} onReorder={onReorder} />);
    expect(row).toHaveAttribute("data-lifted");
    rerender(<LayersPanel layers={[updated[1], updated[0], updated[2]]} onReorder={onReorder} />);
    expect(screen.getAllByRole("listitem")[1]).toBe(row);
    expect(row).toHaveAttribute("data-lifted");
    expect(row).toHaveFocus();
    fireEvent.keyDown(row, { key: "Escape" });
    expect(onReorder).toHaveBeenLastCalledWith(updated);
  });

  it("cancels when a continuing lift receives an order it did not request", () => {
    const onMove = vi.fn();
    const { rerender } = render(<Shared items={initial} onMove={onMove} />);
    const row = lift();
    fireEvent.keyDown(row, { key: "ArrowDown" });
    rerender(<Shared items={["c", "b", "a"]} onMove={onMove} />);
    expect(row).not.toHaveAttribute("data-lifted");
    fireEvent.keyDown(row, { key: "Escape" });
    expect(onMove.mock.calls).toEqual([[0, 1]]);
  });

  it("does not let an earlier move button acknowledgment authorize a keyboard lift", () => {
    const onMove = vi.fn();
    const { rerender } = render(<Shared items={initial} onMove={onMove} />);
    const row = screen.getAllByRole("listitem")[0];
    fireEvent.click(within(row).getByRole("button", { name: "Move down" }));
    lift(row);
    rerender(<Shared items={["b", "a", "c"]} onMove={onMove} />);
    expect(row).not.toHaveAttribute("data-lifted");
    fireEvent.keyDown(row, { key: "Escape" });
    expect(onMove.mock.calls).toEqual([[0, 1]]);
  });

  it("does not let an earlier pointer drop acknowledgment authorize a keyboard lift", () => {
    const onMove = vi.fn();
    const { rerender } = render(<Shared items={initial} onMove={onMove} />);
    const rows = screen.getAllByRole("listitem");
    document.querySelector<HTMLElement>("[data-slot=sortable-list]")!.getBoundingClientRect = () =>
      DOMRect.fromRect({ y: 100, width: 300, height: 148 });
    rows.forEach((row, index) => {
      row.getBoundingClientRect = () => DOMRect.fromRect({ y: 100 + index * 52, width: 300, height: 44 });
    });
    const row = rows[0];
    const grip = row.querySelector<HTMLElement>("[data-slot=sortable-list-handle]")!;
    fireEvent.pointerDown(grip, { button: 0, pointerId: 1, clientY: 122 });
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 180 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(onMove).toHaveBeenCalledExactlyOnceWith(0, 1);
    lift(row);
    rerender(<Shared items={["b", "a", "c"]} onMove={onMove} />);
    expect(row).not.toHaveAttribute("data-lifted");
    fireEvent.keyDown(row, { key: "Escape" });
    expect(onMove.mock.calls).toEqual([[0, 1]]);
  });
});
