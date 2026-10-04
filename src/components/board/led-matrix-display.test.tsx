import { cleanup, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEVICE_MODELS, type DeviceModel } from "../../lib/devices";
import { LedMatrixDisplay } from "./led-matrix-display";

/*
 * The framebuffer is the contract (see docs/superpowers/specs/
 * 2026-10-03-led-matrix-display-design.md) and is asserted byte-for-byte in
 * src/lib/led-matrix.test.ts. These tests cover what the component adds on
 * top of it: the housing, its accessible name and the data attributes the
 * frame is drawn from. How the canvas paints is VRT's job.
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

  it("repaints a message change without scheduling an animation frame", () => {
    const raf = vi.spyOn(window, "requestAnimationFrame");
    try {
      const { rerender } = render(<LedMatrixDisplay message="AB" preset="hub75_64x32" />);
      rerender(<LedMatrixDisplay message="CD" preset="hub75_64x32" />);
      expect(raf).not.toHaveBeenCalled();
      expect(screen.getByRole("img", { name: "LED matrix preview: CD" })).toBeInTheDocument();
    } finally {
      raf.mockRestore();
    }
  });
});
