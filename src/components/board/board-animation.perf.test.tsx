/** Opt-in CPU/work benchmark: FIESTA_BOARD_BENCH=1 npx vitest run this-file.
 * jsdom does not paint: these numbers measure JS/DOM work, never GPU time or FPS.
 */
import { appendFileSync } from "node:fs";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, it, vi } from "vitest";

import { BoardDisplay } from "./board-display";
import { LedMatrixDisplay } from "./led-matrix-display";

const report = (data: unknown) => {
  const line = JSON.stringify(data) + "\n";
  if (process.env.FIESTA_BOARD_BENCH_OUT) appendFileSync(process.env.FIESTA_BOARD_BENCH_OUT, line);
  else process.stdout.write(line);
};
const realHrtime = process.hrtime.bigint;
const now = () => Number(realHrtime()) / 1e6;
const text = (char: string, rows: number, cols: number) => Array(rows).fill(char.repeat(cols)).join("\n");

describe.skipIf(process.env.FIESTA_BOARD_BENCH !== "1")("board animation CPU/work benchmark", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it.each([
    [3, 15],
    [6, 22],
    [12, 64],
    [24, 120],
    [96, 128],
  ])(
    "flap %i×%i",
    (rows, cols) => {
      vi.useFakeTimers();
      // A direct timer driver avoids fake-timer priority-queue cost dominating
      // the 12,288-tile case. Each scheduled callback still runs once per step.
      let nextId = 0;
      let clock = 0;
      vi.spyOn(performance, "now").mockImplementation(() => clock);
      const timers = new Map<number, { callback: () => void; repeat: boolean }>();
      vi.spyOn(globalThis, "setInterval").mockImplementation(((callback: () => void) => {
        timers.set(++nextId, { callback, repeat: true });
        return nextId;
      }) as typeof setInterval);
      vi.spyOn(globalThis, "setTimeout").mockImplementation(((callback: () => void) => {
        timers.set(++nextId, { callback, repeat: false });
        return nextId;
      }) as typeof setTimeout);
      vi.spyOn(globalThis, "clearInterval").mockImplementation((id) => {
        timers.delete(Number(id));
      });
      vi.spyOn(globalThis, "clearTimeout").mockImplementation((id) => {
        timers.delete(Number(id));
      });
      const board = (char: string) => (
        <BoardDisplay deviceType="panel" gridRows={rows} gridCols={cols} message={text(char, rows, cols)} />
      );
      const { rerender, container } = render(board("A"));
      const start = now();
      rerender(board("Z"));
      const prepareMs = now() - start;
      const activeTimers = timers.size;
      const mutations = new MutationObserver(() => {});
      mutations.observe(container, { childList: true, subtree: true });
      let addedNodes = 0;
      const playbackStart = now();
      for (let i = 0; i < 5; i++) {
        clock += 80;
        act(() => {
          for (const [id, timer] of [...timers]) {
            if (!timer.repeat) timers.delete(id);
            timer.callback();
          }
        });
        for (const record of mutations.takeRecords()) addedNodes += record.addedNodes.length;
      }
      mutations.disconnect();
      report({ kind: "flap", rows, cols, prepareMs, playbackMs: now() - playbackStart, activeTimers, addedNodes });
    },
    120_000,
  );

  it.each(
    [32, 64, 128, 256].flatMap((width) =>
      ["flip", "cascade", "fade", "wipe", "slide", "dissolve", "bitmap-flip"].map((kind) => [width, kind] as const),
    ),
  )(
    "LED %i %s",
    (width, kind) => {
      vi.useFakeTimers();
      let dots = 0;
      let paints = 0;
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
        clearRect() {},
        fill() {},
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
      const height = width === 32 ? 8 : width;
      const rgba = new Uint8ClampedArray(width * height * 4);
      if (kind === "bitmap-flip") {
        for (let i = 0; i < width * height; i++) rgba.set([i & 255, (i >> 8) & 255, 255, 255], i * 4);
      }
      const layers = kind === "bitmap-flip" ? [{ x: 0, y: 0, width, height, rgba }] : undefined;
      const board = (char: string) => (
        <LedMatrixDisplay
          matrixWidth={width}
          matrixHeight={height}
          message={text(char, Math.floor(height / 8), Math.floor(width / 6))}
          transition={(kind === "bitmap-flip" ? "flip" : kind) as "flip"}
          layers={layers}
        />
      );
      const { rerender } = render(board("A"));
      dots = paints = 0;
      const start = now();
      rerender(board("Z"));
      const prepareMs = now() - start;
      const playbackStart = now();
      vi.advanceTimersByTime(480);
      report({ kind, width, height, prepareMs, playbackMs: now() - playbackStart, dots, paints });
    },
    120_000,
  );
});
