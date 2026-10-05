import { createHash } from "node:crypto";

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "../../lib/plugin-model-fixtures";
import { BoardDisplay } from "./board-display";
import { DisplayPreview } from "./display-preview";
import { LedMatrixDisplay } from "./led-matrix-display";
import { ScaledBoardDisplay } from "./scaled-board-display";
import { StaticBoardDisplay } from "./static-board-display";

/*
 * `bezel={false}`: a board that draws only its tiles (the Apple TV app shows
 * FiestaPanel's flaps on the TV's black with no housing around them). The
 * default is the housing every consumer has always had, and the snapshots
 * below were recorded from the commit before the prop existed (f65322a), so
 * they hold the DOM byte-identical for a caller that never passes it: the
 * housing in full, readable, and a digest of the whole render.
 */

/** The housing as a reviewer can read it: the tile grid collapsed to a count. */
function housingOf(container: HTMLElement): string {
  const clone = container.cloneNode(true) as HTMLElement;
  const rows = clone.querySelectorAll("[data-note-row]");
  const grid = rows[0]?.parentElement;
  if (grid) {
    const tiles = clone.querySelectorAll("[data-note-tile]").length;
    grid.innerHTML = `<!-- ${rows.length} rows, ${tiles} tiles -->`;
  }
  return clone.innerHTML;
}

const digest = (container: HTMLElement) => createHash("sha256").update(container.innerHTML).digest("hex");

/** What a frameless housing must not carry: any of the bezel's paint. */
function expectBare(board: HTMLElement) {
  expect(board).toHaveAttribute("data-bezel", "false");
  expect(board.className).not.toMatch(/border|rounded|p-\d|px-|py-/);
  expect(board.style.backgroundColor).toBe("");
  expect(board.style.borderColor).toBe("");
  expect(board.style.boxShadow).toBe("");
  // The surface under the tiles: no padding, no gradient.
  const surface = board.firstElementChild as HTMLElement;
  expect(surface.className).not.toMatch(/p-\d|px-|py-/);
  expect(surface.getAttribute("style")).toBeNull();
}

describe("bezel", () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("default: the housing, byte-identical to before the prop existed", () => {
    it("StaticBoardDisplay", () => {
      const { container } = render(<StaticBoardDisplay message="HI {63}" deviceType="note" />);
      expect(housingOf(container)).toMatchSnapshot();
      expect(digest(container)).toMatchSnapshot();
      const html = container.innerHTML;
      cleanup();
      render(<StaticBoardDisplay message="HI {63}" deviceType="note" bezel />);
      expect(screen.getByRole("img").parentElement!.parentElement!.innerHTML).toBe(html);
    });

    it("BoardDisplay", () => {
      const { container } = render(<BoardDisplay message="HI {63}" deviceType="note" />);
      expect(housingOf(container)).toMatchSnapshot();
      expect(digest(container)).toMatchSnapshot();
      const html = container.innerHTML;
      cleanup();
      render(<BoardDisplay message="HI {63}" deviceType="note" bezel />);
      expect(screen.getByRole("img").parentElement!.parentElement!.innerHTML).toBe(html);
    });

    it("BoardDisplay, the static path", () => {
      const { container } = render(<BoardDisplay message="HI {63}" deviceType="note" isStatic />);
      expect(housingOf(container)).toMatchSnapshot();
      expect(digest(container)).toMatchSnapshot();
    });

    it("LedMatrixDisplay", () => {
      const { container } = render(<LedMatrixDisplay message="HI" matrixWidth={16} matrixHeight={8} font="3x5" />);
      expect(container.innerHTML).toMatchSnapshot();
      const html = container.innerHTML;
      cleanup();
      render(<LedMatrixDisplay message="HI" matrixWidth={16} matrixHeight={8} font="3x5" bezel />);
      expect(screen.getByRole("img").parentElement!.parentElement!.innerHTML).toBe(html);
    });
  });

  describe("bezel={false}: only the tiles, still named", () => {
    it("StaticBoardDisplay keeps its grid, gutters, seams, materials, role and name", () => {
      render(
        <StaticBoardDisplay message="HI {63}" deviceType="note_array" notesWide={2} notesTall={1} bezel={false} />,
      );
      const board = screen.getByRole("img", { name: "Board preview: HI" });
      expect(board).toHaveAttribute("data-slot", "static-board-display");
      expectBare(board);
      expect(board).toHaveStyle({ width: "fit-content" });
      expect(board.querySelectorAll("[data-note-tile]")).toHaveLength(3 * 30);
      expect(board.querySelectorAll("[data-note-col-seam]").length).toBeGreaterThan(0);
      // The gutters are the grid's gap, which stays; the tiles' own leaf
      // body and colour fill are theirs, not the housing's.
      const grid = board.querySelector("[data-note-row]")!.parentElement!;
      expect(grid.className).toMatch(/gap-/);
      const tile = board.querySelector("[data-note-tile]") as HTMLElement;
      expect(tile.style.backgroundColor).toBe("var(--color-board-surface-dark)");
      expect(tile.style.boxShadow).not.toBe("");
      const colourTile = board.querySelector("[data-note-row]")!.children[3] as HTMLElement; // the {63}
      expect(colourTile.style.backgroundColor).not.toBe("");
      expect(colourTile.style.backgroundColor).not.toBe("var(--color-board-surface-dark)");
    });

    it("StaticBoardDisplay: className still lands on the housing, and the white board is bare the same way", () => {
      render(<StaticBoardDisplay message="HI" deviceType="note" boardType="white" bezel={false} className="mx-2" />);
      const board = screen.getByRole("img");
      expectBare(board);
      expect(board).toHaveClass("mx-2");
      expect((board.querySelector("[data-note-tile]") as HTMLElement).style.backgroundColor).toBe(
        "var(--color-board-surface-light)",
      );
    });

    it("BoardDisplay, both paths, keeps its grid, role, name and the preview hook", () => {
      render(<BoardDisplay message="HI {63}" deviceType="note" bezel={false} />);
      let board = screen.getByRole("img", { name: "Board display: HI" });
      expect(board).toHaveAttribute("data-slot", "board-display");
      expect(board).toHaveAttribute("data-board-preview", "");
      expectBare(board);
      expect(board.querySelectorAll("[data-note-tile]")).toHaveLength(45);
      expect(board.querySelector('[data-testid="char-tile-0-0"]')).toBeInTheDocument();
      cleanup();
      render(<BoardDisplay message="HI {63}" deviceType="note" bezel={false} isStatic />);
      board = screen.getByRole("img", { name: "Board display: HI" });
      expectBare(board);
      expect(board.querySelectorAll("[data-note-tile]")).toHaveLength(45);
    });

    it("BoardDisplay still runs the flap cascade without a bezel", () => {
      vi.useFakeTimers();
      try {
        const { rerender } = render(<BoardDisplay message="A" deviceType="note" bezel={false} />);
        const tile = () => screen.getByTestId("char-tile-0-0");
        expect(tile()).toHaveAttribute("data-current-char", "A");
        expect(tile()).toHaveAttribute("data-is-transitioning", "false");
        rerender(<BoardDisplay message="C" deviceType="note" bezel={false} />);
        // The first flap is immediate; the tile is mid-cascade with its flap
        // layers mounted (the hinge seam is one of them).
        expect(tile()).toHaveAttribute("data-is-transitioning", "true");
        expect(tile()).toHaveAttribute("data-current-char", "B");
        expect(tile().style.perspective).toBe("800px");
        act(() => {
          vi.advanceTimersByTime(80);
        });
        expect(tile()).toHaveAttribute("data-current-char", "C");
        expect(tile()).toHaveAttribute("data-is-transitioning", "false");
        expectBare(screen.getByRole("img"));
      } finally {
        vi.useRealTimers();
      }
    });

    it("LedMatrixDisplay keeps the substrate and the canvas, role and name", () => {
      render(
        <LedMatrixDisplay message="HI" matrixWidth={16} matrixHeight={8} font="3x5" bezel={false} className="mx-2" />,
      );
      const board = screen.getByRole("img", { name: "LED matrix preview: HI" });
      expect(board).toHaveAttribute("data-bezel", "false");
      expect(board).toHaveClass("mx-2", "min-w-0", "max-w-full");
      expect(board.className).not.toMatch(/border|rounded|p-\d|sm:p-/);
      expect(board.getAttribute("style")).toBeNull();
      const canvas = board.querySelector("canvas")!;
      expect(canvas).toHaveAttribute("width", "96");
      expect(canvas.style.backgroundColor).not.toBe("");
    });

    it("ScaledBoardDisplay passes it through", () => {
      render(<ScaledBoardDisplay message="HI" deviceType="note" bezel={false} />);
      expectBare(screen.getByRole("img", { name: "Board display: HI" }));
      expect(document.querySelector("[data-slot=scaled-board-display]")).toBeInTheDocument();
    });
  });

  describe("DisplayPreview", () => {
    const tvBoard = () => document.querySelector("[data-slot=tv-frame-board]")!;

    it("frame='tv' with a split-flap model: bare flaps on the screen, fitted by the grid", () => {
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" frame="tv" />);
      const board = screen.getByRole("img", { name: "Board preview: HI" });
      expectBare(board);
      expect(tvBoard().contains(board)).toBe(true);
      cleanup();
      // The animated renderer too.
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" frame="tv" animated />);
      expectBare(screen.getByRole("img", { name: "Board display: HI" }));
      cleanup();
      // Any split-flap model on the TV, not only FiestaPanel's.
      render(<DisplayPreview model="vestaboard_note" message="HI" frame="tv" />);
      expectBare(screen.getByRole("img"));
    });

    it("frame='tv' with an LED model keeps the housing unless told otherwise (open: spec §7.5)", () => {
      render(<DisplayPreview model={FIESTAPANEL_LED_MATRIX_MODEL} message="HI" frame="tv" />);
      let board = screen.getByRole("img", { name: "LED matrix preview: HI" });
      expect(board).not.toHaveAttribute("data-bezel");
      expect(board).toHaveClass("border-[3px]");
      expect(board.style.backgroundColor).not.toBe("");
      cleanup();
      render(<DisplayPreview model={FIESTAPANEL_LED_MATRIX_MODEL} message="HI" frame="tv" bezel={false} />);
      board = screen.getByRole("img", { name: "LED matrix preview: HI" });
      expect(board).toHaveAttribute("data-bezel", "false");
      expect(board.getAttribute("style")).toBeNull();
    });

    it("outside a TV the housing is drawn, and an explicit bezel wins either way", () => {
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" />);
      expect(screen.getByRole("img")).not.toHaveAttribute("data-bezel");
      expect(screen.getByRole("img").style.backgroundColor).toBe("var(--color-board-bezel-dark)");
      cleanup();
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" bezel={false} />);
      expectBare(screen.getByRole("img"));
      cleanup();
      render(<DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HI" frame="tv" bezel />);
      expect(screen.getByRole("img")).not.toHaveAttribute("data-bezel");
      expect(screen.getByRole("img").style.backgroundColor).toBe("var(--color-board-bezel-dark)");
    });
  });
});
