import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LedMatrixDisplay } from "./led-matrix-display";

describe("LED paint work", () => {
  let paints: number;
  let dots: number;
  beforeEach(() => {
    vi.useFakeTimers();
    paints = dots = 0;
    vi.stubGlobal(
      "Path2D",
      class {
        moveTo() {}
        arc() {
          dots++;
        }
        rect() {
          dots++;
        }
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      fillRect() {
        paints++;
      },
      fill() {},
      clearRect() {},
      save() {},
      restore() {},
      drawImage() {},
      putImageData() {},
      createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(
      (cb) => setTimeout(() => cb(performance.now()), 16) as unknown as number,
    );
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(clearTimeout);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([32, 64, 128, 256])("does not redraw a held frame at width %i", (width) => {
    const props = {
      matrixWidth: width,
      matrixHeight: width === 32 ? 8 : width,
      transition: { kind: "flip" as const, halfFlap: false, stagger: 0 },
    };
    const { rerender } = render(<LedMatrixDisplay {...props} message="A" />);
    const initialPaints = paints;
    const initialDots = dots;
    rerender(<LedMatrixDisplay {...props} message="Z" />);
    vi.advanceTimersByTime(64);
    // The old frame is still displayed for the entire first 80ms step.
    expect(paints).toBe(initialPaints);
    expect(dots).toBe(initialDots);
    vi.advanceTimersByTime(16);
    expect(paints).toBe(initialPaints + 1);
    const afterStep = paints;
    vi.advanceTimersByTime(64);
    expect(paints).toBe(afterStep);
  });

  it("invalidates geometry when matrix dimensions and pitch change but canvas dimensions stay equal", () => {
    const { rerender } = render(<LedMatrixDisplay message="" matrixWidth={16} matrixHeight={8} size={6} />);
    expect(dots).toBe(16 * 8);
    dots = 0;
    rerender(<LedMatrixDisplay message="" matrixWidth={32} matrixHeight={16} size={3} />);
    // Both backing stores are 96×48, but their LED grids are different.
    expect(dots).toBe(32 * 16);
    expect(paints).toBe(2);
  });

  it("repaints unchanged pixels when appearance changes", () => {
    const { rerender } = render(<LedMatrixDisplay message="A" glow />);
    rerender(<LedMatrixDisplay message="A" glow={false} />);
    rerender(<LedMatrixDisplay message="A" glow={false} pixelShape="square" />);
    expect(paints).toBe(3);
  });

  it("does not keep painting after settling or unmount", () => {
    const { rerender, unmount } = render(<LedMatrixDisplay message="A" transition="wipe" />);
    rerender(<LedMatrixDisplay message="Z" transition="wipe" />);
    vi.advanceTimersByTime(512);
    const settled = paints;
    vi.advanceTimersByTime(1000);
    expect(paints).toBe(settled);
    rerender(<LedMatrixDisplay message="B" transition="wipe" />);
    unmount();
    const stopped = paints;
    vi.advanceTimersByTime(1000);
    expect(paints).toBe(stopped);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("skips identical frames in the many-colour bitmap path too", () => {
    const rgba = new Uint8ClampedArray(16 * 8 * 4);
    for (let i = 0; i < 16 * 8; i++) rgba.set([i, 100, 255, 255], i * 4);
    const props = {
      matrixWidth: 16,
      matrixHeight: 8,
      transition: "flip" as const,
      layers: [{ x: 0, y: 0, width: 16, height: 8, rgba }],
    };
    const { rerender } = render(<LedMatrixDisplay {...props} message="A" />);
    const initialPaints = paints;
    const initialDots = dots;
    rerender(<LedMatrixDisplay {...props} message="Z" />);
    vi.advanceTimersByTime(160);
    // The opaque bitmap covers the changing characters; displayed RGB is constant.
    expect(paints).toBe(initialPaints);
    expect(dots).toBe(initialDots);
  });
});
