import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEVICE_MODELS, type DeviceModel } from "../../lib/devices";
import * as transitions from "../../lib/led-transitions";
import { LedMatrixDisplay } from "./led-matrix-display";
import { reducedMotionQuery } from "./reduced-motion";

// The component imports `planLedTransition` from this module; wrapping it in
// a spy lets the tests see what was planned, from where, and how often the
// plan was sampled.
vi.mock("../../lib/led-transitions", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../../lib/led-transitions")>();
  return { ...mod, planLedTransition: vi.fn(mod.planLedTransition) };
});
const planSpy = transitions.planLedTransition as unknown as ReturnType<typeof vi.fn>;

/*
 * The framebuffer is the contract (see docs/superpowers/specs/
 * 2026-10-03-led-matrix-display-design.md) and is asserted byte-for-byte in
 * src/lib/led-matrix.test.ts; the transitions over it in
 * src/lib/led-transitions.test.ts. These tests cover what the component adds
 * on top of them: the housing, its accessible name, the data attributes the
 * frame is drawn from, the transition it resolves to and the animation loop
 * that paints it. How the canvas paints is VRT's job.
 */

describe("LedMatrixDisplay", () => {
  beforeEach(() => {
    // jsdom has no canvas backend; it logs "not implemented" and returns null.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  it("names the board from its message and hides the canvas", () => {
    render(<LedMatrixDisplay message={"hello {red}world\nline two"} preset="hub75_64x32" />);
    const board = screen.getByRole("img", { name: "LED matrix preview: HELLO WOR LINE TWO" });
    expect(board.querySelector("canvas")).toHaveAttribute("aria-hidden", "true");
    expect(board).toHaveAttribute("data-matrix-width", "64");
    expect(board).toHaveAttribute("data-matrix-height", "32");
    expect(board).toHaveAttribute("data-model", "hub75_64x32");
  });

  it("names only the text that fits", () => {
    render(<LedMatrixDisplay message="GOOD MORNING EVERYONE" preset="awtrix" />);
    expect(screen.getByRole("img", { name: "LED matrix preview: GOOD MOR" })).toBeInTheDocument();
  });

  it("uses the empty label with no message, and the no-text label for a message that draws none", () => {
    render(<LedMatrixDisplay message={null} />);
    expect(screen.getByRole("img", { name: "Empty LED matrix display" })).toBeInTheDocument();
    cleanup();
    render(<LedMatrixDisplay message="{63}{66}" preset="hub75_64x32" />);
    expect(screen.getByRole("img", { name: "LED matrix preview" })).toBeInTheDocument();
  });

  it("takes a fixed label, or a label builder fed the clipped text", () => {
    render(<LedMatrixDisplay message="GOOD MORNING EVERYONE" preset="awtrix" previewLabel="Lobby ticker" />);
    expect(screen.getByRole("img", { name: "Lobby ticker" })).toBeInTheDocument();
    cleanup();
    render(<LedMatrixDisplay message="GOOD MORNING EVERYONE" preset="awtrix" messageLabel={(t) => `Ticker: ${t}`} />);
    expect(screen.getByRole("img", { name: "Ticker: GOOD MOR" })).toBeInTheDocument();
  });

  it("lets explicit dimensions override a preset", () => {
    render(<LedMatrixDisplay message="HI" preset="awtrix" matrixWidth={64} />);
    const board = screen.getByRole("img");
    expect(board).toHaveAttribute("data-matrix-width", "64");
    expect(board).toHaveAttribute("data-matrix-height", "8");
    expect(board).toHaveAttribute("data-font", "3x5");
  });

  it("renders a default 64×32 in the 5x7 face without a preset or model", () => {
    render(<LedMatrixDisplay message="HI" />);
    const board = screen.getByRole("img");
    expect(board).toHaveAttribute("data-matrix-width", "64");
    expect(board).toHaveAttribute("data-matrix-height", "32");
    expect(board).toHaveAttribute("data-font", "5x7");
    expect(board).not.toHaveAttribute("data-model");
  });

  it("sizes the canvas from the pitch before it paints — a named size or a number of px", () => {
    render(<LedMatrixDisplay message="HI" preset="awtrix" size="lg" />);
    const canvas = screen.getByRole("img").querySelector("canvas")!;
    expect(canvas.parentElement!.style.width).toBe(`${32 * 9}px`);
    expect(canvas).toHaveAttribute("width", `${32 * 9}`);
    expect(canvas).toHaveAttribute("height", `${8 * 9}`);
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="awtrix" size={12} />);
    expect(screen.getByRole("img").querySelector("canvas")!.parentElement!.style.width).toBe(`${32 * 12}px`);
  });

  it("marks a monochrome board, from the preset or the prop", () => {
    render(<LedMatrixDisplay message="HI" preset="max7219" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-monochrome", "");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="awtrix" monochrome="#ffb000" />);
    expect(screen.getByRole("img")).toHaveAttribute("data-monochrome", "");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="awtrix" />);
    expect(screen.getByRole("img")).not.toHaveAttribute("data-monochrome");
  });

  it("names mixed-case text as drawn", () => {
    render(<LedMatrixDisplay message="Now playing" preset="hub75_128x64" letterCase="mixed" />);
    expect(screen.getByRole("img", { name: "LED matrix preview: Now playing" })).toBeInTheDocument();
  });

  it("names block-colour text by its letters, and an icon by its label", () => {
    render(<LedMatrixDisplay message="{black/white:ON} AIR {icon:sun}" preset="hub75_128x64" />);
    expect(screen.getByRole("img", { name: "LED matrix preview: ON AIR sun" })).toBeInTheDocument();
  });

  describe("device models", () => {
    it("takes geometry, face, colour and look from a built-in model, over the preset", () => {
      render(<LedMatrixDisplay message="HI" model="divoom_pixoo64" preset="awtrix" />);
      const pixoo = screen.getByRole("img");
      expect(pixoo).toHaveAttribute("data-model", "divoom_pixoo64");
      expect(pixoo).toHaveAttribute("data-matrix-width", "64");
      expect(pixoo).toHaveAttribute("data-matrix-height", "64");
      expect(pixoo).toHaveAttribute("data-font", "3x5");
      expect(pixoo).toHaveAttribute("data-pixel-shape", "square");
      expect(pixoo).not.toHaveAttribute("data-unknown-model");
      cleanup();
      render(<LedMatrixDisplay message="HI" model="max7219_4in1" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-monochrome", "");
    });

    it("draws the shape the model's appearance says, and the prop overrides it", () => {
      render(<LedMatrixDisplay message="HI" preset="hub75_64x32" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-pixel-shape", "round");
      cleanup();
      render(<LedMatrixDisplay message="HI" preset="hub75_64x32" pixelShape="square" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-pixel-shape", "square");
      cleanup();
      render(<LedMatrixDisplay message="HI" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-pixel-shape", "round");
    });

    it("takes a model object — a plugin's — with its own appearance", () => {
      const plugin: DeviceModel = {
        ...DEVICE_MODELS.hub75_64x32,
        id: "acme_sign_96x16",
        label: "ACME Sign 96×16",
        geometry: { kind: "pixels", width: 96, height: 16 },
        appearance: { pixelShape: "square", dotRatio: 0.9, offColor: "#101010", substrateColor: "#000000" },
        legacy: undefined,
      };
      render(<LedMatrixDisplay message="HI" model={plugin} />);
      const board = screen.getByRole("img");
      expect(board).toHaveAttribute("data-model", "acme_sign_96x16");
      expect(board).toHaveAttribute("data-matrix-width", "96");
      expect(board).toHaveAttribute("data-matrix-height", "16");
      expect(board).toHaveAttribute("data-pixel-shape", "square");
      expect(board.querySelector("canvas")!.style.backgroundColor).toBe("rgb(0, 0, 0)");
    });

    it("reports an unknown model id and falls back to the explicit or default size — never a flagship", () => {
      render(<LedMatrixDisplay message="HI" model="no_such_device" />);
      const board = screen.getByRole("img");
      expect(board).toHaveAttribute("data-unknown-model", "no_such_device");
      expect(board).not.toHaveAttribute("data-model");
      expect(board).toHaveAttribute("data-matrix-width", "64");
      expect(board).toHaveAttribute("data-matrix-height", "32");
      cleanup();
      render(<LedMatrixDisplay message="HI" model="no_such_device" matrixWidth={32} matrixHeight={8} font="3x5" />);
      const sized = screen.getByRole("img");
      expect(sized).toHaveAttribute("data-unknown-model", "no_such_device");
      expect(sized).toHaveAttribute("data-matrix-width", "32");
      expect(sized).toHaveAttribute("data-matrix-height", "8");
    });
  });

  it("repaints a message change without scheduling an animation frame when the transition is none", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    try {
      const { rerender } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="none" />);
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="none" />);
      expect(raf).not.toHaveBeenCalled();
      expect(screen.getByRole("img", { name: "LED matrix preview: CD" })).toBeInTheDocument();
      cleanup();
      // No preset or model: no device to ask, so the default is none too.
      const bare = render(<LedMatrixDisplay message="AB" matrixWidth={64} matrixHeight={32} />);
      bare.rerender(<LedMatrixDisplay message="CD" matrixWidth={64} matrixHeight={32} />);
      expect(raf).not.toHaveBeenCalled();
    } finally {
      raf.mockRestore();
    }
  });

  describe("transition resolution", () => {
    it("takes its default transition from the device model, and 'none' or a kind overrides it", () => {
      render(<LedMatrixDisplay message="HI" preset="hub75_64x32" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "flip");
      expect(screen.getByRole("img")).toHaveAttribute("data-transition-source", "default");
      cleanup();
      render(<LedMatrixDisplay message="HI" preset="pixoo64" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "flip");
      cleanup();
      render(<LedMatrixDisplay message="HI" preset="awtrix" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "none");
      cleanup();
      render(<LedMatrixDisplay message="HI" preset="hub75_64x32" transition="slide" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "slide");
      expect(screen.getByRole("img")).toHaveAttribute("data-transition-source", "explicit");
      cleanup();
      render(<LedMatrixDisplay message="HI" preset="hub75_64x32" transition="none" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "none");
      cleanup();
      // No preset: no device to ask, so a change snaps.
      render(<LedMatrixDisplay message="HI" matrixWidth={64} matrixHeight={32} />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "none");
      cleanup();
      // ...but an explicit choice runs as written.
      render(<LedMatrixDisplay message="HI" matrixWidth={64} matrixHeight={32} transition="wipe" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "wipe");
    });

    it("resolves a choice the device cannot run to its default and says so", () => {
      render(<LedMatrixDisplay message="HI" preset="awtrix" transition="slide" />);
      const board = screen.getByRole("img");
      expect(board).toHaveAttribute("data-transition", "none");
      expect(board).toHaveAttribute("data-transition-source", "fallback");
      expect(board).toHaveAttribute("data-transition-fallback", "slide");
      cleanup();
      render(<LedMatrixDisplay message="HI" preset="hub75_64x32" transition="slide" />);
      expect(screen.getByRole("img")).not.toHaveAttribute("data-transition-fallback");
    });

    it("applies the device frame budget, by model id or object, and takes a spec object", () => {
      render(<LedMatrixDisplay message="HI" model="divoom_pixoo64" />);
      const pixoo = screen.getByRole("img");
      expect(pixoo).toHaveAttribute("data-transition", "flip");
      expect(pixoo).toHaveAttribute("data-transition-frames", "32");
      expect(pixoo).toHaveAttribute("data-matrix-width", "64");
      cleanup();
      render(<LedMatrixDisplay message="HI" model={DEVICE_MODELS.divoom_pixoo64} transition={{ kind: "fade" }} />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "fade");
      expect(screen.getByRole("img")).toHaveAttribute("data-transition-frames", "32");
      cleanup();
      render(<LedMatrixDisplay message="HI" preset="hub75_64x32" transition={{ kind: "flip", stepMs: 40 }} />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "flip");
      expect(screen.getByRole("img")).not.toHaveAttribute("data-transition-frames");
    });

    it("snaps on an unknown model id — no device, so no default", () => {
      render(<LedMatrixDisplay message="HI" model="no_such_device" />);
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "none");
      expect(screen.getByRole("img")).toHaveAttribute("data-unknown-model", "no_such_device");
    });
  });

  it("announces message changes through a polite live region only when asked", () => {
    const { rerender } = render(<LedMatrixDisplay message="N 2 MIN" preset="hub75_64x32" announceUpdates />);
    const region = document.querySelector('[data-slot="led-matrix-display-announcer"]')!;
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region.textContent).toBe(""); // armed empty: mounting is not news
    rerender(<LedMatrixDisplay message="N 1 MIN" preset="hub75_64x32" announceUpdates />);
    expect(region).toHaveTextContent("N 1 MIN");
    cleanup();
    render(<LedMatrixDisplay message="HI" preset="hub75_64x32" />);
    expect(document.querySelector('[data-slot="led-matrix-display-announcer"]')).toBeNull();
  });

  it("keeps the live region outside the image", () => {
    render(<LedMatrixDisplay message="HI" preset="hub75_64x32" announceUpdates />);
    const region = document.querySelector('[data-slot="led-matrix-display-announcer"]')!;
    expect(screen.getByRole("img").contains(region)).toBe(false);
  });

  describe("transitions", () => {
    // Drive rAF from fake timers at 16ms a tick, so a 480ms wipe is ~30 ticks.
    let raf: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      vi.useFakeTimers();
      planSpy.mockClear();
      raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number;
      });
      vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => clearTimeout(id));
    });
    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("plans a transition on a message change, samples it every tick, and settles on the new frame", () => {
      const { rerender } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="wipe" />);
      expect(planSpy).not.toHaveBeenCalled(); // the first paint is static
      expect(raf).not.toHaveBeenCalled();
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="wipe" />);
      expect(planSpy).toHaveBeenCalledTimes(1);
      const plan = planSpy.mock.results[0].value as transitions.LedTransition;
      expect(plan.durationMs).toBe(480);
      const frameAt = vi.spyOn(plan, "frameAt");
      vi.advanceTimersByTime(240);
      const midCalls = frameAt.mock.calls.length;
      expect(midCalls).toBeGreaterThanOrEqual(10);
      expect(frameAt.mock.calls.every(([t]) => t < 480)).toBe(true);
      vi.advanceTimersByTime(2000);
      // Settled: no more samples, and the last one was before the end — the
      // final paint is the memoized frame itself, not frameAt(duration).
      const settledCalls = frameAt.mock.calls.length;
      expect(settledCalls).toBeGreaterThan(midCalls);
      vi.advanceTimersByTime(1000);
      expect(frameAt.mock.calls.length).toBe(settledCalls);
      expect(screen.getByRole("img", { name: "LED matrix preview: CD" })).toBeInTheDocument();
    });

    it("plans the flip from the device's resolved spec: a Pixoo gets one frame per step under its budget", () => {
      const { rerender } = render(<LedMatrixDisplay message="AB" model="divoom_pixoo64" />);
      rerender(<LedMatrixDisplay message="CD" model="divoom_pixoo64" />);
      expect(planSpy).toHaveBeenCalledTimes(1);
      expect(planSpy.mock.calls[0][2]).toEqual({ kind: "flip", stepMs: 80, halfFlap: false, maxFrames: 32 });
      const plan = planSpy.mock.results[0].value as transitions.LedTransition;
      expect(plan.frameCount).toBe(14); // the default flip, whole, inside 32
    });

    it("cancels the animation frame on unmount", () => {
      const { rerender, unmount } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="fade" />);
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="fade" />);
      vi.advanceTimersByTime(50);
      const plan = planSpy.mock.results[0].value as transitions.LedTransition;
      const frameAt = vi.spyOn(plan, "frameAt");
      unmount();
      expect(window.cancelAnimationFrame).toHaveBeenCalled();
      vi.advanceTimersByTime(1000);
      expect(frameAt).not.toHaveBeenCalled();
    });

    it("retargets a message that lands mid-flight from the point the first transition had reached", () => {
      const { rerender } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="fade" />);
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="fade" />);
      const first = planSpy.mock.results[0].value as transitions.LedTransition;
      const layoutAt = vi.spyOn(first, "layoutAt");
      const frameAt = vi.spyOn(first, "frameAt");
      vi.advanceTimersByTime(160);
      rerender(<LedMatrixDisplay message="EF" preset="hub75_64x32" transition="fade" />);
      expect(planSpy).toHaveBeenCalledTimes(2);
      const [from, to, , fromFrame] = planSpy.mock.calls[1];
      expect(from).toBe(layoutAt.mock.results.at(-1)!.value);
      expect(fromFrame).toBe(frameAt.mock.results.at(-1)!.value);
      expect(to.text).toBe("EF");
      const elapsed = layoutAt.mock.calls.at(-1)![0];
      expect(elapsed).toBeGreaterThan(100);
      expect(elapsed).toBeLessThan(480);
    });
  });

  it("snaps instead of animating under prefers-reduced-motion", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    planSpy.mockClear();
    // The module-scope query is what the hook reads (one MediaQueryList per
    // document); the setup stub hands out a fresh object per call.
    Object.defineProperty(reducedMotionQuery, "matches", { value: true, configurable: true });
    try {
      const { rerender } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" transition="flip" />);
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" transition="flip" />);
      expect(raf).not.toHaveBeenCalled();
      expect(planSpy).not.toHaveBeenCalled();
      expect(screen.getByRole("img")).toHaveAttribute("data-transition", "none");
      expect(screen.getByRole("img", { name: "LED matrix preview: CD" })).toBeInTheDocument();
    } finally {
      Object.defineProperty(reducedMotionQuery, "matches", { value: false, configurable: true });
      raf.mockRestore();
    }
  });
});

describe("LedMatrixDisplay painting", () => {
  /** A matchMedia stub that records every query and lets a test fire its change. */
  function installMatchMedia() {
    const queries: Array<{ media: string; listeners: Set<() => void> }> = [];
    const original = window.matchMedia;
    window.matchMedia = (media: string) => {
      const listeners = new Set<() => void>();
      queries.push({ media, listeners });
      return {
        media,
        matches: false,
        onchange: null,
        addEventListener: (_type: string, fn: () => void) => listeners.add(fn),
        removeEventListener: (_type: string, fn: () => void) => listeners.delete(fn),
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      } as unknown as MediaQueryList;
    };
    return { queries, restore: () => void (window.matchMedia = original) };
  }

  const setDpr = (value: number) => Object.defineProperty(window, "devicePixelRatio", { value, configurable: true });

  it("re-arms the resolution query after every change, so 1 → 2 → 1.5 repaints each time", () => {
    const mm = installMatchMedia();
    const getContext = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    try {
      setDpr(1);
      const { unmount } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" />);
      expect(mm.queries.map((q) => q.media)).toEqual(["(resolution: 1dppx)"]);
      const paintsAtMount = getContext.mock.calls.length;
      expect(paintsAtMount).toBeGreaterThan(0);

      // The window moves to a 2x monitor: the 1x query stops matching.
      setDpr(2);
      for (const fn of mm.queries[0].listeners) fn();
      expect(getContext.mock.calls.length).toBe(paintsAtMount + 1);
      // The old query is released and one for the new ratio is armed.
      expect(mm.queries[0].listeners.size).toBe(0);
      expect(mm.queries.map((q) => q.media)).toEqual(["(resolution: 1dppx)", "(resolution: 2dppx)"]);

      // And again, to 1.5x: only the live query is listened to, and it fires a paint.
      setDpr(1.5);
      for (const fn of mm.queries[1].listeners) fn();
      expect(getContext.mock.calls.length).toBe(paintsAtMount + 2);
      expect(mm.queries[1].listeners.size).toBe(0);
      expect(mm.queries.at(-1)?.media).toBe("(resolution: 1.5dppx)");

      unmount();
      expect(mm.queries.every((q) => q.listeners.size === 0)).toBe(true);
    } finally {
      getContext.mockRestore();
      mm.restore();
      setDpr(1);
    }
  });

  it("allocates the bloom ImageData once per matrix size, not on every paint", () => {
    // A 2D context with just what paintLedFrame calls, counting ImageData allocations.
    const createImageData = vi.fn((w: number, h: number) => ({
      width: w,
      height: h,
      data: new Uint8ClampedArray(w * h * 4),
    }));
    const ctx = {
      fillStyle: "",
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "low",
      fillRect() {},
      fill() {},
      save() {},
      restore() {},
      drawImage() {},
      putImageData() {},
      createImageData,
    };
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
    const hadPath2D = "Path2D" in globalThis;
    if (!hadPath2D) {
      (globalThis as { Path2D?: unknown }).Path2D = class {
        moveTo() {}
        arc() {}
        rect() {}
        roundRect() {}
      };
    }
    try {
      const { rerender } = render(<LedMatrixDisplay message="AB" matrixWidth={16} matrixHeight={8} font="3x5" />);
      expect(createImageData).toHaveBeenCalledTimes(1);
      rerender(<LedMatrixDisplay message="CD" matrixWidth={16} matrixHeight={8} font="3x5" />);
      rerender(<LedMatrixDisplay message="EF" matrixWidth={16} matrixHeight={8} font="3x5" />);
      expect(createImageData).toHaveBeenCalledTimes(1);
      // A different matrix size needs a new buffer.
      rerender(<LedMatrixDisplay message="EF" matrixWidth={24} matrixHeight={8} font="3x5" />);
      expect(createImageData).toHaveBeenCalledTimes(2);
      expect(createImageData).toHaveBeenLastCalledWith(24, 8);
    } finally {
      getContext.mockRestore();
      if (!hadPath2D) delete (globalThis as { Path2D?: unknown }).Path2D;
    }
  });
});
