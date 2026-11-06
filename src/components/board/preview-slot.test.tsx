import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PreviewSlot } from "./preview-slot";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function measuredPreview(width: number, height: number, availableWidth: number, availableHeight: number) {
  const size = { width, height, availableWidth, availableHeight };
  const observers = new Map<Element, () => void>();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      private targets = new Set<Element>();
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        this.targets.add(target);
        observers.set(target, () => this.callback([], this as unknown as ResizeObserver));
      }
      unobserve(target: Element) {
        this.targets.delete(target);
        observers.delete(target);
      }
      disconnect() {
        for (const target of this.targets) observers.delete(target);
        this.targets.clear();
      }
    },
  );
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(() => size.availableWidth);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(() => size.availableHeight);
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(() => size.width);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => size.height);
  render(
    <PreviewSlot>
      <div role="img" aria-label="Board preview" />
    </PreviewSlot>,
  );
  const content = screen.getByRole("img").parentElement!;
  const slot = content.parentElement!;
  const resize = (target: Element) => act(() => observers.get(target)?.());
  return { size, content, slot, resize };
}

describe("PreviewSlot", () => {
  it.each([
    [400, 100, 300, 168, 0.75],
    [100, 400, 300, 168, 0.42],
    [100, 40, 300, 168, 1],
  ])(
    "fits a %s × %s preview without cropping or upscaling",
    (width, height, availableWidth, availableHeight, scale) => {
      vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(availableWidth);
      vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(availableHeight);
      vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(width);
      vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(height);
      render(
        <PreviewSlot>
          <div role="img" aria-label="Board preview" />
        </PreviewSlot>,
      );
      expect(screen.getByRole("img").parentElement).toHaveStyle({ transform: `translate(-50%, -50%) scale(${scale})` });
    },
  );

  it("refits when the available slot or preview content changes size", () => {
    const { size, content, slot, resize } = measuredPreview(400, 100, 300, 168);
    expect(content).toHaveStyle({ transform: "translate(-50%, -50%) scale(0.75)" });

    size.availableWidth = 120;
    resize(slot);
    expect(content).toHaveStyle({ transform: "translate(-50%, -50%) scale(0.3)" });

    Object.assign(size, { width: 100, height: 400, availableWidth: 300 });
    resize(content);
    expect(content).toHaveStyle({ transform: "translate(-50%, -50%) scale(0.42)" });

    size.height = 40;
    resize(content);
    expect(content).toHaveStyle({ transform: "translate(-50%, -50%) scale(1)" });
  });

  it("retains a usable scale while hidden and refits when measurement returns", () => {
    const { size, content, slot, resize } = measuredPreview(400, 100, 0, 168);
    expect(content).toHaveStyle({ transform: "translate(-50%, -50%) scale(1)" });

    size.availableWidth = 300;
    resize(slot);
    expect(content).toHaveStyle({ transform: "translate(-50%, -50%) scale(0.75)" });

    size.availableWidth = 0;
    resize(slot);
    expect(content).toHaveStyle({ transform: "translate(-50%, -50%) scale(0.75)" });

    size.availableWidth = 600;
    resize(slot);
    expect(content).toHaveStyle({ transform: "translate(-50%, -50%) scale(1)" });
  });
});
