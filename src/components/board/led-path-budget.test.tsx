import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LedMatrixDisplay } from "./led-matrix-display";

type Dot = { shape: string; args: number[] };
class RecordingPath {
  dots: Dot[] = [];
  moveTo() {}
  arc(...args: number[]) {
    this.dots.push({ shape: "arc", args });
  }
  rect(...args: number[]) {
    this.dots.push({ shape: "rect", args });
  }
  roundRect(...args: number[]) {
    this.dots.push({ shape: "roundRect", args });
  }
}

describe("Safari LED path budget", () => {
  const fills: { color: string; dots: Dot[] }[] = [];
  beforeEach(() => {
    fills.length = 0;
    vi.stubGlobal("Path2D", RecordingPath);
    vi.stubGlobal("devicePixelRatio", 2);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
      () =>
        ({
          fillStyle: "",
          fill(this: { fillStyle: string }, path: RecordingPath) {
            fills.push({ color: this.fillStyle, dots: [...path.dots] });
          },
          fillRect() {},
          clearRect() {},
          save() {},
          restore() {},
          drawImage() {},
          putImageData() {},
          createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
        }) as unknown as CanvasRenderingContext2D,
    );
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it.each(["solid", "many colors"])("keeps shared antialiased coverage in one fill for compact %s dots", (content) => {
    vi.stubGlobal("devicePixelRatio", 1.25);
    const width = 64,
      height = 64;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let p = 0; p < width * height; p++) rgba.set([content === "solid" ? 255 : p % 256, 100, 255, 255], p * 4);
    render(
      <LedMatrixDisplay
        matrixWidth={width}
        matrixHeight={height}
        pixelShape="square"
        size={1}
        glow={false}
        transition="none"
        layers={[{ x: 0, y: 0, width, height, rgba }]}
      />,
    );
    // At fractional DPR, separate source-over fills darken shared edge
    // coverage. The compact rect path must keep the original combined fill.
    expect(fills.filter((fill) => fill.color === "#171717")).toHaveLength(1);
    expect(fills.every((fill) => fill.dots.length === width * height)).toBe(true);
  });

  for (const content of ["blank", "solid", "many colors"] as const) {
    it.each([
      { pixelShape: "square" as const, size: 6, shape: "roundRect", ratio: 0.82 },
      { pixelShape: "square" as const, size: 3, shape: "rect", ratio: 0.82 },
      { pixelShape: "round" as const, size: 6, shape: "arc", ratio: 0.72 },
    ])(`bounds native fill complexity without losing ${content} $shape dots`, ({ pixelShape, size, shape, ratio }) => {
      // The 192×96 panel that stalled native Safari for 6–8 seconds at DPR 2.
      const width = 192,
        height = 96;
      const rgba = new Uint8ClampedArray(width * height * 4);
      const expected: Dot[] = [];
      const lit: Dot[] = [];
      const step = size * 2,
        dot = step * ratio;
      for (let p = 0; p < width * height; p++) {
        const cx = ((p % width) + 0.5) * step,
          cy = (Math.floor(p / width) + 0.5) * step;
        const args =
          shape === "arc"
            ? [cx, cy, dot / 2, 0, Math.PI * 2]
            : [cx - dot / 2, cy - dot / 2, dot, dot, ...(shape === "roundRect" ? [dot * 0.15] : [])];
        const geometry = { shape, args };
        expected.push(geometry);
        if (content !== "blank" && p % 17 !== 0) {
          rgba.set([content === "solid" ? 255 : p % 256, 100, 255, 255], p * 4);
          lit.push(geometry);
        }
      }
      render(
        <LedMatrixDisplay
          matrixWidth={width}
          matrixHeight={height}
          pixelShape={pixelShape}
          size={size}
          glow={false}
          transition="none"
          layers={[{ x: 0, y: 0, width, height, rgba }]}
        />,
      );

      // Native CoreGraphics stalls on a single giant composite path even when
      // JS tracing is fast. Count dots per submitted fill, not just fill calls.
      expect(fills.length).toBeGreaterThan(0);
      expect(Math.max(...fills.map((fill) => fill.dots.length))).toBeLessThanOrEqual(128);
      expect(fills.filter((fill) => fill.color === "#171717").flatMap((fill) => fill.dots)).toEqual(expected);
      const paintedLit = fills.filter((fill) => fill.color !== "#171717");
      expect(paintedLit.every((fill) => fill.color === (content === "solid" ? "#ff64ff" : "#ffffff"))).toBe(true);
      expect(paintedLit.flatMap((fill) => fill.dots)).toEqual(content === "solid" ? [...lit, ...lit] : lit);
    });
  }
});
