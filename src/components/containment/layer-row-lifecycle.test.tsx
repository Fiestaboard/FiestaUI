import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { type LayerItem, LayersPanel } from "./layer-row";

const layers: LayerItem[] = [
  { id: "a", name: "Alpha", meta: "First", bound: true, boundValue: "= 64°" },
  { id: "b", name: "Beta" },
  { id: "c", name: "Gamma", meta: "Third" },
];
const inserted: LayerItem = { id: "x", name: "New" };
const rows = () => screen.getAllByRole("listitem");
const handle = (row: HTMLElement) => row.querySelector<HTMLElement>("[data-slot=sortable-list-handle]")!;

function layout() {
  document.querySelector<HTMLElement>("[data-slot=sortable-list]")!.getBoundingClientRect = () =>
    DOMRect.fromRect({ x: 0, y: 100, width: 300, height: 148 });
  rows().forEach((row, index) => {
    row.getBoundingClientRect = () => DOMRect.fromRect({ x: 0, y: 100 + index * 52, width: 300, height: 44 });
  });
}

function drag(index: number, target: number, pointerId = 1) {
  layout();
  const row = rows()[index];
  const grip = handle(row);
  fireEvent.pointerDown(grip, { button: 0, pointerId, clientY: 122 + index * 52 });
  fireEvent.pointerMove(grip, { pointerId, clientY: 122 + target * 52 + (target > index ? 2 : -2) });
  expect(row).toHaveAttribute("data-dragging");
  return { row, grip };
}

const hostUpdates = [
  ["remove a preceding layer", [layers[1], layers[2]]],
  ["remove another preceding layer", [layers[0], layers[2]]],
  ["prepend an unrelated layer", [inserted, ...layers]],
  ["append an unrelated layer", [...layers, inserted]],
  ["reorder the host list", [layers[2], layers[0], layers[1]]],
  ["remove the dragged layer", layers.slice(0, 2)],
  ["remove every layer", []],
] as const;

describe("LayersPanel controlled reorder lifecycle", () => {
  it("never emits stale source indices after deletion during pointer drag", () => {
    const reorder = vi.fn();
    const { rerender } = render(<LayersPanel layers={layers} onReorder={reorder} />);
    const { grip } = drag(2, 0);
    rerender(<LayersPanel layers={layers.slice(1)} onReorder={reorder} />);
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(reorder).not.toHaveBeenCalled();
  });

  it("never commits pointer-up after the host disables the active drag", () => {
    const reorder = vi.fn();
    const { rerender } = render(<LayersPanel layers={layers} onReorder={reorder} />);
    const { grip } = drag(0, 2);
    rerender(<LayersPanel layers={layers} onReorder={reorder} disabled />);
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(reorder).not.toHaveBeenCalled();
  });

  it.each(hostUpdates)("cancels an active pointer gesture when the host will %s", (_case, next) => {
    const reorder = vi.fn();
    const { rerender } = render(<LayersPanel layers={layers} onReorder={reorder} />);
    const { row, grip } = drag(2, 0);
    rerender(<LayersPanel layers={next} onReorder={reorder} />);
    expect(document.querySelector("[data-dragging]")).toBeNull();
    expect(document.querySelector("[data-slot=sortable-list-indicator]")).toBeNull();
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 110 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(reorder).not.toHaveBeenCalled();
    if (next.some((item) => item.id === "c")) {
      expect(row).toHaveFocus();
      expect(rows()).toContain(row);
    }
  });

  it("keeps a pointer gesture for unchanged IDs and commits updated full records", () => {
    const reorder = vi.fn();
    const { rerender } = render(<LayersPanel layers={layers} onReorder={reorder} />);
    const { row, grip } = drag(2, 0);
    rerender(<LayersPanel layers={[...layers]} onReorder={reorder} />);
    expect(row).toHaveAttribute("data-dragging");
    const updated = { ...layers[2], name: "Gamma updated", meta: "New metadata", bound: true, boundValue: "= 72°" };
    rerender(<LayersPanel layers={[layers[0], layers[1], updated]} onReorder={reorder} />);
    expect(row).toHaveAttribute("data-dragging");
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(reorder).toHaveBeenCalledExactlyOnceWith([updated, layers[0], layers[1]]);
    expect(row).toHaveFocus();
  });

  it("cancels on disable, ignores stale pointer events after re-enable and permits a new drag", () => {
    const reorder = vi.fn();
    const { rerender } = render(<LayersPanel layers={layers} onReorder={reorder} />);
    const { grip } = drag(0, 2);
    rerender(<LayersPanel layers={layers} onReorder={reorder} disabled />);
    expect(document.querySelector("[data-dragging]")).toBeNull();
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 240 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(reorder).not.toHaveBeenCalled();
    rerender(<LayersPanel layers={layers} onReorder={reorder} />);
    fireEvent.pointerMove(grip, { pointerId: 1, clientY: 240 });
    fireEvent.pointerUp(grip, { pointerId: 1 });
    expect(reorder).not.toHaveBeenCalled();
    const next = drag(0, 2, 2);
    fireEvent.pointerUp(next.grip, { pointerId: 2 });
    expect(reorder).toHaveBeenCalledExactlyOnceWith([layers[1], layers[2], layers[0]]);
  });

  it("cancels with pointercancel and Escape without a commit", () => {
    const reorder = vi.fn();
    render(<LayersPanel layers={layers} onReorder={reorder} />);
    const first = drag(0, 2);
    fireEvent.pointerCancel(first.grip, { pointerId: 1 });
    fireEvent.pointerUp(first.grip, { pointerId: 1 });
    expect(document.querySelector("[data-dragging]")).toBeNull();
    const second = drag(2, 0, 2);
    fireEvent.keyDown(second.row, { key: "Escape" });
    fireEvent.pointerUp(second.grip, { pointerId: 2 });
    expect(document.querySelector("[data-dragging]")).toBeNull();
    expect(reorder).not.toHaveBeenCalled();
  });

  it.each(hostUpdates)("ends a keyboard lift when the host will %s", (_case, next) => {
    const reorder = vi.fn();
    const { rerender } = render(<LayersPanel layers={layers} onReorder={reorder} />);
    const row = rows()[2];
    act(() => row.focus());
    fireEvent.keyDown(row, { key: " " });
    expect(row).toHaveAttribute("data-lifted");
    rerender(<LayersPanel layers={next} onReorder={reorder} />);
    expect(document.querySelector("[data-lifted]")).toBeNull();
    fireEvent.keyDown(row, { key: "ArrowUp" });
    fireEvent.keyDown(row, { key: "Escape" });
    expect(reorder).not.toHaveBeenCalled();
  });

  it("ends keyboard lift on disable and does not resume it after re-enable", () => {
    const reorder = vi.fn();
    const { rerender } = render(<LayersPanel layers={layers} onReorder={reorder} />);
    const row = rows()[0];
    act(() => row.focus());
    fireEvent.keyDown(row, { key: " " });
    rerender(<LayersPanel layers={layers} onReorder={reorder} disabled />);
    expect(row).not.toHaveAttribute("data-lifted");
    fireEvent.keyDown(row, { key: "ArrowDown" });
    rerender(<LayersPanel layers={layers} onReorder={reorder} />);
    fireEvent.keyDown(row, { key: "ArrowDown" });
    expect(reorder).not.toHaveBeenCalled();
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "ArrowDown" });
    expect(reorder).toHaveBeenCalledExactlyOnceWith([layers[1], layers[0], layers[2]]);
  });

  it("preserves selection button identity and focus through unrelated insertion", () => {
    const onSelect = vi.fn();
    const { rerender } = render(
      <LayersPanel layers={layers} onReorder={() => {}} onSelect={onSelect} selectedId="b" />,
    );
    const button = screen.getByRole("button", { name: "Beta" });
    act(() => button.focus());
    rerender(<LayersPanel layers={[inserted, ...layers]} onReorder={() => {}} onSelect={onSelect} selectedId="b" />);
    expect(screen.getByRole("button", { name: "Beta" })).toBe(button);
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("retains ordinary controlled keyboard steps, rollback and focus without remounting", () => {
    function Controlled() {
      const [items, setItems] = useState(layers);
      return <LayersPanel layers={items} onReorder={setItems} />;
    }
    render(<Controlled />);
    const row = rows()[0];
    act(() => row.focus());
    fireEvent.keyDown(row, { key: " " });
    fireEvent.keyDown(row, { key: "ArrowDown" });
    fireEvent.keyDown(row, { key: "ArrowDown" });
    expect(rows()[2]).toBe(row);
    expect(row).toHaveAttribute("data-lifted");
    expect(row).toHaveFocus();
    fireEvent.keyDown(row, { key: "Escape" });
    expect(rows()[0]).toBe(row);
    expect(row).not.toHaveAttribute("data-lifted");
    expect(row).toHaveFocus();
    expect(within(row).getByText("= 64°")).toBeInTheDocument();
  });
});
