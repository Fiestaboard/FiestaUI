import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FIESTAPANEL_LED_MATRIX_MODEL, FIESTAPANEL_SPLIT_FLAP_MODEL } from "../../lib/plugin-model-fixtures";
import { DisplayPreview } from "./display-preview";
import {
  DEFAULT_TV_ASPECT,
  DEFAULT_TV_DIAGONAL_INCHES,
  fitToScreen,
  resolveTvAspect,
  resolveTvDiagonal,
  TV_SCREEN_MARGIN,
  TvFrame,
  tvFrameGeometry,
} from "./tv-frame";

/*
 * The television is chrome around a board. So the tests read what the
 * accessibility tree sees (the board's own role and name, the chrome
 * hidden, the offline status), what the housing records (data attributes,
 * the CSS variables the geometry sets), and the fit the screen computes
 * from the sizes it measures — jsdom has no layout, so the sizes are
 * stubbed per slot. Appearance is VRT's.
 */

const slot = (name: string) => document.querySelector(`[data-slot=tv-frame${name ? `-${name}` : ""}]`)!;
const CHROME = ["stand", "led", "veil", "gloss"];

/** Give the screen and the board a size, as a browser's layout would. */
function stubSizes(sizes: { screen: [number, number]; board: [number, number] }) {
  const of = (el: HTMLElement) => {
    const s = el.dataset.slot;
    return s === "tv-frame-screen" ? sizes.screen : s === "tv-frame-board" ? sizes.board : [0, 0];
  };
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return of(this)[0];
  });
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockImplementation(function (this: HTMLElement) {
    return of(this)[1];
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    return of(this)[0];
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return of(this)[1];
  });
}

const Board = () => (
  <div role="img" aria-label="Board preview: HELLO">
    HELLO
  </div>
);

describe("TvFrame", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("inputs", () => {
    it("reads the aspect as a number or a pair, and falls back for anything else", () => {
      expect(resolveTvAspect(undefined)).toBe(DEFAULT_TV_ASPECT);
      expect(resolveTvAspect(2)).toBe(2);
      expect(resolveTvAspect({ w: 9, h: 16 })).toBeCloseTo(9 / 16);
      expect(resolveTvAspect(0)).toBe(DEFAULT_TV_ASPECT);
      expect(resolveTvAspect(-1)).toBe(DEFAULT_TV_ASPECT);
      expect(resolveTvAspect(Number.NaN)).toBe(DEFAULT_TV_ASPECT);
      expect(resolveTvAspect({ w: 16, h: 0 })).toBe(DEFAULT_TV_ASPECT);
    });

    it("clamps the diagonal to FiestaBoard's 3–200 and defaults to 55", () => {
      expect(resolveTvDiagonal(undefined)).toBe(DEFAULT_TV_DIAGONAL_INCHES);
      expect(resolveTvDiagonal(65)).toBe(65);
      expect(resolveTvDiagonal(1)).toBe(3);
      expect(resolveTvDiagonal(400)).toBe(200);
      expect(resolveTvDiagonal(Number.NaN)).toBe(DEFAULT_TV_DIAGONAL_INCHES);
    });
  });

  describe("geometry", () => {
    it("gives a bigger set a thinner bezel and a smaller stand, relative to its width", () => {
      const small = tvFrameGeometry(32, 16 / 9);
      const mid = tvFrameGeometry(55, 16 / 9);
      const large = tvFrameGeometry(85, 16 / 9);
      expect(small.bezel).toBeGreaterThan(mid.bezel);
      expect(mid.bezel).toBeGreaterThan(large.bezel);
      expect(small.footWidth).toBeGreaterThan(mid.footWidth);
      expect(mid.footWidth).toBeGreaterThan(large.footWidth);
      expect(mid.standScale).toBe(1);
      // Subtle: a 55" bezel is under 1% of the set's width, a 32" under 1.5%.
      expect(mid.bezel).toBeLessThan(0.01);
      expect(small.bezel).toBeLessThan(0.015);
      // The chin is thicker than the side bezel, as on a real cabinet.
      expect(mid.chin).toBeGreaterThan(mid.bezel);
    });

    it("keeps the stand within bounds at the ends of the range", () => {
      expect(tvFrameGeometry(3, 16 / 9).standScale).toBe(1.5);
      // √(55/200) ≈ 0.52 would be a sliver of a stand; the floor holds it.
      expect(tvFrameGeometry(200, 16 / 9).standScale).toBe(0.55);
      expect(tvFrameGeometry(85, 16 / 9).standScale).toBeCloseTo(Math.sqrt(55 / 85));
    });
  });

  describe("fitToScreen", () => {
    it("fills the width when the board is wider than the screen's aspect, else the height", () => {
      // 1000×562 screen (16:9), margin 4% of 562 ≈ 22.5px each side.
      const screen = { width: 1000, height: 562 };
      const inset = TV_SCREEN_MARGIN * 562;
      const wide = fitToScreen(screen, { width: 500, height: 100 });
      expect(wide.axis).toBe("width");
      expect(wide.scale).toBeCloseTo((1000 - 2 * inset) / 500);
      const tall = fitToScreen(screen, { width: 100, height: 100 });
      expect(tall.axis).toBe("height");
      expect(tall.scale).toBeCloseTo((562 - 2 * inset) / 100);
    });

    it("scales up as well as down, and is 1 with nothing measured", () => {
      expect(fitToScreen({ width: 1000, height: 562 }, { width: 100, height: 50 }).scale).toBeGreaterThan(1);
      expect(fitToScreen({ width: 100, height: 56 }, { width: 1000, height: 500 }).scale).toBeLessThan(1);
      expect(fitToScreen({ width: 0, height: 0 }, { width: 100, height: 50 })).toEqual({ scale: 1, axis: null });
      expect(fitToScreen({ width: 100, height: 50 }, { width: 0, height: 0 })).toEqual({ scale: 1, axis: null });
    });

    it("honours the margin, taken from the screen's shorter side on every edge", () => {
      expect(fitToScreen({ width: 200, height: 100 }, { width: 200, height: 100 }, 0).scale).toBe(1);
      // 10% of 100 is 10px a side: 180/200 by width, 80/100 by height; the height binds.
      const fit = fitToScreen({ width: 200, height: 100 }, { width: 200, height: 100 }, 0.1);
      expect(fit.scale).toBeCloseTo(0.8);
      expect(fit.axis).toBe("height");
    });
  });

  describe("accessibility", () => {
    it("hides every piece of chrome and leaves the board's own role and name alone", () => {
      render(
        <TvFrame>
          <Board />
        </TvFrame>,
      );
      for (const name of CHROME) expect(slot(name)).toHaveAttribute("aria-hidden", "true");
      expect(slot("")).not.toHaveAttribute("role");
      expect(slot("")).not.toHaveAttribute("aria-label");
      expect(slot("body")).not.toHaveAttribute("aria-hidden");
      expect(slot("screen")).not.toHaveAttribute("aria-hidden");
      expect(slot("board")).not.toHaveAttribute("aria-hidden");
      expect(screen.getByRole("img", { name: "Board preview: HELLO" })).toBeInTheDocument();
      expect(screen.getAllByRole("img")).toHaveLength(1);
    });

    it("offline: the status is announced and the board is hidden from everyone", () => {
      render(
        <TvFrame offline>
          <Board />
        </TvFrame>,
      );
      expect(screen.getByRole("status")).toHaveTextContent("No signal");
      expect(slot("")).toHaveAttribute("data-offline", "");
      expect(slot("board")).toHaveAttribute("aria-hidden", "true");
      expect(slot("board")).toHaveStyle({ visibility: "hidden" });
      expect(screen.queryByRole("img")).toBeNull();
      // The standby LED lights amber, from the board palette.
      expect((slot("led") as HTMLElement).style.backgroundColor).toBe("var(--color-board-orange)");
    });

    it("online: the status region is present and empty, so going offline announces", () => {
      render(
        <TvFrame>
          <Board />
        </TvFrame>,
      );
      expect(screen.getByRole("status")).toBeEmptyDOMElement();
      expect(slot("")).not.toHaveAttribute("data-offline");
      expect((slot("led") as HTMLElement).style.backgroundColor).not.toBe("var(--color-board-orange)");
    });

    it("takes its own offline wording", () => {
      render(<TvFrame offline offlineLabel="Panel unreachable" />);
      expect(screen.getByRole("status")).toHaveTextContent("Panel unreachable");
    });
  });

  describe("the set", () => {
    it("defaults to a 55-inch 16:9 set on its stand, showing, undimmed", () => {
      render(<TvFrame />);
      const root = slot("") as HTMLElement;
      expect(root).toHaveAttribute("data-diagonal", "55");
      expect(root).toHaveAttribute("data-aspect", (16 / 9).toFixed(4));
      expect(root).toHaveAttribute("data-stand", "");
      expect(root).not.toHaveAttribute("data-dimmed");
      expect(root).not.toHaveAttribute("data-offline");
      expect(slot("stand")).toBeInTheDocument();
      expect(slot("screen")).toHaveStyle({ aspectRatio: `${16 / 9}` });
      expect(slot("veil")).toHaveStyle({ opacity: "0" });
    });

    it("sizes the bezel, chin and stand from the diagonal, in container units with a floor", () => {
      render(<TvFrame diagonalInches={32} />);
      const small = (slot("") as HTMLElement).style.getPropertyValue("--tv-bezel");
      const smallFoot = (slot("") as HTMLElement).style.getPropertyValue("--tv-foot-w");
      cleanup();
      render(<TvFrame diagonalInches={85} />);
      const large = (slot("") as HTMLElement).style.getPropertyValue("--tv-bezel");
      const largeFoot = (slot("") as HTMLElement).style.getPropertyValue("--tv-foot-w");
      const cqw = (v: string) => Number(/([\d.]+)cqw/.exec(v)![1]);
      expect(small).toMatch(/^max\(2px, [\d.]+cqw\)$/);
      expect(cqw(small)).toBeGreaterThan(cqw(large));
      expect(cqw(smallFoot)).toBeGreaterThan(cqw(largeFoot));
      expect((slot("") as HTMLElement).style.containerType).toBe("inline-size");
    });

    it("takes the aspect as a number or a pair and clamps the diagonal", () => {
      render(<TvFrame aspect={{ w: 9, h: 16 }} diagonalInches={999} />);
      expect(slot("")).toHaveAttribute("data-aspect", (9 / 16).toFixed(4));
      expect(slot("")).toHaveAttribute("data-diagonal", "200");
      expect(slot("screen")).toHaveStyle({ aspectRatio: `${9 / 16}` });
      cleanup();
      render(<TvFrame aspect={2} />);
      expect(slot("")).toHaveAttribute("data-aspect", "2.0000");
    });

    it("veils the screen, not the cabinet, by the dim level, clamped to 0–1", () => {
      render(<TvFrame dimmed={0.6} />);
      expect(slot("veil")).toHaveStyle({ opacity: "0.6" });
      expect(slot("")).toHaveAttribute("data-dimmed", "0.6");
      expect(slot("screen").contains(slot("veil"))).toBe(true);
      cleanup();
      render(<TvFrame dimmed={1.5} />);
      expect(slot("veil")).toHaveStyle({ opacity: "1" });
      cleanup();
      render(<TvFrame dimmed={-1} />);
      expect(slot("veil")).toHaveStyle({ opacity: "0" });
      expect(slot("")).not.toHaveAttribute("data-dimmed");
    });

    it("leaves the stand off for a wall mount", () => {
      render(<TvFrame stand={false} />);
      expect(document.querySelector("[data-slot=tv-frame-stand]")).toBeNull();
      expect(slot("")).not.toHaveAttribute("data-stand");
    });

    it("passes className to the housing", () => {
      render(<TvFrame className="max-w-xl" />);
      expect(slot("")).toHaveClass("max-w-xl");
    });
  });

  describe("fit", () => {
    it("scales the board to the screen's height when the board is squarer than the screen", () => {
      stubSizes({ screen: [1000, 562], board: [500, 300] });
      render(
        <TvFrame>
          <Board />
        </TvFrame>,
      );
      const expected = (562 - 2 * TV_SCREEN_MARGIN * 562) / 300;
      expect(slot("screen")).toHaveAttribute("data-fit", "height");
      expect(slot("screen")).toHaveAttribute("data-fit-scale", expected.toFixed(4));
      expect((slot("board") as HTMLElement).style.transform).toBe(`translate(-50%, -50%) scale(${expected})`);
      expect((slot("board") as HTMLElement).style.width).toBe("max-content");
    });

    it("scales the board to the screen's width when the board is wider than the screen", () => {
      stubSizes({ screen: [360, 640], board: [500, 300] });
      render(
        <TvFrame aspect={{ w: 9, h: 16 }}>
          <Board />
        </TvFrame>,
      );
      const expected = (360 - 2 * TV_SCREEN_MARGIN * 360) / 500;
      expect(slot("screen")).toHaveAttribute("data-fit", "width");
      expect(slot("screen")).toHaveAttribute("data-fit-scale", expected.toFixed(4));
    });

    it("is scale 1 and unbound with nothing to measure (SSR, jsdom)", () => {
      render(
        <TvFrame>
          <Board />
        </TvFrame>,
      );
      expect(slot("screen")).not.toHaveAttribute("data-fit");
      expect(slot("screen")).toHaveAttribute("data-fit-scale", "1.0000");
    });
  });

  describe("around DisplayPreview's renderers", () => {
    it("keeps the split-flap and LED boards' own names inside the screen", () => {
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
      render(
        <TvFrame>
          <DisplayPreview model={FIESTAPANEL_SPLIT_FLAP_MODEL} message="HELLO" />
        </TvFrame>,
      );
      expect(slot("screen").contains(screen.getByRole("img", { name: "Board preview: HELLO" }))).toBe(true);
      cleanup();
      render(
        <TvFrame>
          <DisplayPreview model={FIESTAPANEL_LED_MATRIX_MODEL} message="HELLO" />
        </TvFrame>,
      );
      expect(slot("screen").contains(screen.getByRole("img", { name: "LED matrix preview: HELLO" }))).toBe(true);
    });
  });
});
