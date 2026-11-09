import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BOARD_PREVIEW_MODE_STORAGE_KEY } from "./board-preview-mode";
import { BOARD_VIEWPORT_PADDING, BoardViewport } from "./board-viewport";

/*
 * jsdom has no layout, so the geometry BoardViewport measures is stubbed on
 * the prototypes: tiles are `tileWidth` wide with `gap` between them and a
 * `seam` at every Note boundary (note arrays), and the scroller is
 * `viewport` wide. Everything else is the real component and real BoardDisplay.
 */
interface Layout {
  tileWidth: number;
  gap: number;
  seam: number;
  viewport: number;
}

const reducedMotion = vi.hoisted(() => ({ value: false }));
vi.mock("./reduced-motion", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./reduced-motion")>();
  return { ...actual, useReducedMotion: () => reducedMotion.value };
});

let layout: Layout;
let scrollLeft = 0;
const scrollTo = vi.fn();

function tileIndex(el: Element): number {
  return Array.prototype.indexOf.call(el.parentElement?.children ?? [], el);
}

function tileLeft(c: number, notes: boolean): number {
  return c * (layout.tileWidth + layout.gap) + (notes ? Math.floor(c / 15) * layout.seam : 0);
}

function boardWidth(el: Element): number {
  const row = el.querySelector("[data-note-row]");
  const n = row?.children.length ?? 0;
  const notes = el.querySelector("[data-note-col-seam]") !== null;
  return n === 0 ? 0 : tileLeft(n - 1, notes) + layout.tileWidth;
}

function isScroller(el: Element) {
  return el.getAttribute("data-slot") === "board-viewport-scroller";
}

beforeEach(() => {
  window.sessionStorage.clear();
  reducedMotion.value = false;
  scrollLeft = 0;
  scrollTo.mockReset();
  layout = { tileWidth: 13, gap: 3, seam: 10, viewport: 370 };
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
    if (this.getAttribute("data-slot") === "board-display") return boardWidth(this);
    if (this.hasAttribute("data-note-tile")) return layout.tileWidth;
    return 0;
  });
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
    return this.getAttribute("data-slot") === "board-display" ? 60 : 0;
  });
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
    return isScroller(this) ? layout.viewport : 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockImplementation(function (this: HTMLElement) {
    if (!isScroller(this)) return 0;
    const board = this.querySelector("[data-slot=board-display]");
    return board ? boardWidth(board) + 2 * BOARD_VIEWPORT_PADDING : 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollLeft", "get").mockImplementation(() => scrollLeft);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute("data-note-tile")) {
      const notes = this.parentElement?.querySelector("[data-note-col-seam]") !== null;
      const left = tileLeft(tileIndex(this), notes);
      return new DOMRect(left, 0, layout.tileWidth, 18);
    }
    return new DOMRect(0, 0, 0, 0);
  });
  (HTMLElement.prototype as unknown as { scrollTo: typeof scrollTo }).scrollTo = scrollTo;
});

afterEach(() => {
  window.sessionStorage.clear();
  delete (HTMLElement.prototype as unknown as { scrollTo?: unknown }).scrollTo;
});

const region = () => screen.getByRole("region", { name: "Board preview" });
const fitButton = () => screen.getByRole("button", { name: "Fit" });
const actualButton = () => screen.getByRole("button", { name: "Actual size" });
const indicator = () => document.querySelector("[data-slot=board-viewport-indicator]");
const fade = (side: "start" | "end") => document.querySelector(`[data-slot=board-viewport-fade][data-side=${side}]`);

function scrollTo_(left: number) {
  scrollLeft = left;
  fireEvent.scroll(region());
}

// 3×1 note array at Tile sm: 45 tiles on a 16 px pitch plus a 10 px seam per
// Note → pages at 0, 250, 500; board 737; scroller 370 → max scroll 391.
const NOTE_ARRAY = { deviceType: "note_array", notesWide: 3, notesTall: 1, message: "LOBBY" } as const;

describe("BoardViewport: a board that fits", () => {
  it("draws no chrome: no toggle, no indicator, no fade, not a tab stop", () => {
    render(<BoardViewport deviceType="note" message="HI" title="NOTE · 15×3" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(indicator()).toBeNull();
    expect(fade("start")).toBeNull();
    expect(fade("end")).toBeNull();
    expect(region()).not.toHaveAttribute("tabindex");
    expect(screen.getByText("NOTE · 15×3")).toBeInTheDocument();
    expect(document.querySelector("[data-slot=board-viewport]")).toHaveAttribute("data-overflow", "false");
  });

  it("renders the board bare inside its own clipping bezel", () => {
    render(<BoardViewport deviceType="note" message="HI" />);
    expect(screen.getByRole("img", { name: "Board display: HI" })).toHaveAttribute("data-bezel", "false");
    const bezel = document.querySelector("[data-slot=board-viewport-bezel]") as HTMLElement;
    expect(bezel.style.backgroundColor).toBe("var(--color-board-bezel-dark)");
  });

  it("draws the light bezel for a white board", () => {
    render(<BoardViewport deviceType="note" message="HI" boardType="white" />);
    const bezel = document.querySelector("[data-slot=board-viewport-bezel]") as HTMLElement;
    expect(bezel.style.backgroundColor).toBe("var(--color-board-bezel-light)");
  });
});

describe("BoardViewport: Actual size (default)", () => {
  it("defaults to Actual size, with the toggle reflecting it", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    expect(actualButton()).toHaveAttribute("aria-pressed", "true");
    expect(fitButton()).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector("[data-slot=board-viewport]")).toHaveAttribute("data-mode", "actual");
  });

  it("is a labelled, focusable scroll region described by the indicator", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    expect(region()).toHaveAttribute("tabindex", "0");
    const id = region().getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)).toHaveTextContent("Note 1 of 3");
  });

  it('reads "Note 1 of 3" and fades only the end at the start', () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    expect(indicator()).toHaveTextContent("Note 1 of 3");
    expect(fade("start")).toHaveAttribute("data-visible", "false");
    expect(fade("end")).toHaveAttribute("data-visible", "true");
  });

  it("follows the scroll: middle fades both sides, end fades the start", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    act(() => scrollTo_(250));
    expect(indicator()).toHaveTextContent("Note 2 of 3");
    expect(fade("start")).toHaveAttribute("data-visible", "true");
    expect(fade("end")).toHaveAttribute("data-visible", "true");
    act(() => scrollTo_(391));
    expect(indicator()).toHaveTextContent("Note 3 of 3");
    expect(fade("end")).toHaveAttribute("data-visible", "false");
  });

  it("marks the current page dot", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    const dots = document.querySelectorAll("[data-slot=board-viewport-dot]");
    expect(dots).toHaveLength(3);
    expect(dots[0]).toHaveAttribute("data-current", "true");
    expect(dots[1]).toHaveAttribute("data-current", "false");
  });

  it("snaps per Note on a note array, aligned past the bezel padding", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    expect(region().className).toContain("snap-mandatory");
    expect(region().className).toContain("[data-note-col-seam]");
    expect(region().style.scrollPaddingLeft).toBe(`${BOARD_VIEWPORT_PADDING}px`);
  });

  it("snaps per column on a flagship", () => {
    layout.viewport = 280;
    render(<BoardViewport deviceType="flagship" message="GOOD MORNING" />);
    expect(region().className).not.toContain("[data-note-col-seam]");
    expect(region().className).toContain("snap-start");
  });

  it('reads "Column 1 of 2 · 4 notes" on a 2×2 array', () => {
    render(<BoardViewport deviceType="note_array" notesWide={2} notesTall={2} message="LOBBY" />);
    expect(indicator()).toHaveTextContent("Column 1 of 2 · 4 notes");
  });

  it('reads "Columns 1–16 of 22" on a flagship, with a progress bar', () => {
    layout.viewport = 280;
    render(<BoardViewport deviceType="flagship" message="GOOD MORNING" />);
    expect(indicator()).toHaveTextContent("Columns 1–16 of 22");
    const thumb = document.querySelector("[data-slot=board-viewport-progress-thumb]") as HTMLElement;
    expect(thumb.style.width).toBe(`${(16 / 22) * 100}%`);
    expect(thumb.style.left).toBe("0%");
    act(() => scrollTo_(64));
    expect(indicator()).toHaveTextContent("Columns 5–20 of 22");
  });

  it("appends the hint after the indicator, outside the live text", () => {
    render(<BoardViewport {...NOTE_ARRAY} hint="swipe" />);
    expect(indicator()).toHaveTextContent("Note 1 of 3 · swipe");
    const live = document.querySelector("[data-slot=board-viewport-indicator] [aria-live]");
    expect(live).toHaveTextContent(/^Note 1 of 3$/);
  });

  it("localises every string", () => {
    render(
      <BoardViewport
        {...NOTE_ARRAY}
        labels={{
          region: "Vista previa",
          previewSize: "Tamaño",
          fit: "Ajustar",
          actual: "Tamaño real",
          note: (i, n) => `Nota ${i} de ${n}`,
        }}
      />,
    );
    expect(screen.getByRole("region", { name: "Vista previa" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Tamaño" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar" })).toBeInTheDocument();
    expect(indicator()).toHaveTextContent("Nota 1 de 3");
  });
});

describe("BoardViewport: keyboard", () => {
  it("→ and ← move one Note, smoothly", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 250, behavior: "smooth" });
    act(() => scrollTo_(250));
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 391, behavior: "smooth" });
    fireEvent.keyDown(region(), { key: "ArrowLeft" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
  });

  it("stops at the ends", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.keyDown(region(), { key: "ArrowLeft" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
    act(() => scrollTo_(391));
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 391, behavior: "smooth" });
  });

  it("Home and End jump to the ends", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.keyDown(region(), { key: "End" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 391, behavior: "smooth" });
    fireEvent.keyDown(region(), { key: "Home" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "smooth" });
  });

  it("scrolls instantly under reduced motion", () => {
    reducedMotion.value = true;
    render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 250, behavior: "auto" });
  });

  it("prevents the native arrow scroll it replaces", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    const event = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    region().dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("leaves modified arrows and other keys alone", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.keyDown(region(), { key: "ArrowRight", altKey: true });
    fireEvent.keyDown(region(), { key: "ArrowRight", metaKey: true });
    fireEvent.keyDown(region(), { key: "f", ctrlKey: true });
    fireEvent.keyDown(region(), { key: "x" });
    expect(scrollTo).not.toHaveBeenCalled();
    expect(actualButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("F toggles Fit / Actual size", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.keyDown(region(), { key: "f" });
    expect(fitButton()).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(region(), { key: "F" });
    expect(actualButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to scrollLeft where scrollTo is missing", () => {
    delete (HTMLElement.prototype as unknown as { scrollTo?: unknown }).scrollTo;
    const set = vi.spyOn(HTMLElement.prototype, "scrollLeft", "set").mockImplementation(() => {});
    render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(set).toHaveBeenLastCalledWith(250);
  });
});

describe("BoardViewport: Fit overview", () => {
  it("scales the board to the slot and labels it an overview below the tile floor", () => {
    render(<BoardViewport {...NOTE_ARRAY} defaultMode="fit" />);
    // 346 / 737 × 13 ≈ 6.2 px tiles: under the 13 px floor.
    expect(indicator()).toHaveTextContent("Overview · 3 notes · tap Actual to read");
    const scaled = document.querySelector("[data-slot=board-viewport-scaled]") as HTMLElement;
    expect(scaled.style.transform).toBe(`scale(${346 / 737})`);
    const box = scaled.parentElement as HTMLElement;
    expect(box.style.width).toBe(`${346}px`);
    expect(box.style.height).toBe(`${60 * (346 / 737)}px`);
    expect(document.querySelector("[data-slot=board-viewport]")).toHaveAttribute("data-overview", "true");
    // every dot is lit: the whole array is on screen
    const dots = document.querySelectorAll("[data-slot=board-viewport-dot]");
    expect([...dots].every((d) => d.getAttribute("data-current") === "true")).toBe(true);
  });

  it("drops the scroll hint from an overview", () => {
    render(<BoardViewport {...NOTE_ARRAY} defaultMode="fit" hint="swipe" />);
    expect(indicator()).not.toHaveTextContent("swipe");
  });

  it("does not fade, snap or page while fitted", () => {
    render(<BoardViewport {...NOTE_ARRAY} defaultMode="fit" />);
    expect(fade("start")).toBeNull();
    expect(region().className).not.toContain("snap-mandatory");
    fireEvent.keyDown(region(), { key: "ArrowRight" });
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("is a plain fit, not an overview, when the fitted tile clears minTile", () => {
    render(<BoardViewport {...NOTE_ARRAY} defaultMode="fit" minTile={6} />);
    expect(document.querySelector("[data-slot=board-viewport]")).toHaveAttribute("data-overview", "false");
    expect(indicator()).toBeNull();
  });

  it("names columns, not notes, in a flagship overview", () => {
    layout.viewport = 120;
    render(<BoardViewport deviceType="flagship" message="HI" defaultMode="fit" />);
    expect(indicator()).toHaveTextContent("Overview · 22 columns · tap Actual to read");
  });

  it("tapping Actual size returns to the start of the board", () => {
    render(<BoardViewport {...NOTE_ARRAY} defaultMode="fit" />);
    fireEvent.click(actualButton());
    expect(actualButton()).toHaveAttribute("aria-pressed", "true");
    expect(indicator()).toHaveTextContent("Note 1 of 3");
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "auto" });
  });
});

describe("BoardViewport: mode precedence (R1)", () => {
  it("remembers Fit for the session", () => {
    const { unmount } = render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.click(fitButton());
    expect(window.sessionStorage.getItem(BOARD_PREVIEW_MODE_STORAGE_KEY)).toBe("fit");
    unmount();
    render(<BoardViewport {...NOTE_ARRAY} />);
    expect(fitButton()).toHaveAttribute("aria-pressed", "true");
  });

  it("persist={false} neither reads nor writes the session", () => {
    window.sessionStorage.setItem(BOARD_PREVIEW_MODE_STORAGE_KEY, "fit");
    render(<BoardViewport {...NOTE_ARRAY} persist={false} />);
    expect(actualButton()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(fitButton());
    expect(window.sessionStorage.getItem(BOARD_PREVIEW_MODE_STORAGE_KEY)).toBe("fit");
    fireEvent.click(actualButton());
    expect(window.sessionStorage.getItem(BOARD_PREVIEW_MODE_STORAGE_KEY)).toBe("fit");
  });

  it("a controlled mode wins and reports taps", () => {
    const onModeChange = vi.fn();
    window.sessionStorage.setItem(BOARD_PREVIEW_MODE_STORAGE_KEY, "actual");
    render(<BoardViewport {...NOTE_ARRAY} mode="fit" onModeChange={onModeChange} />);
    expect(fitButton()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(actualButton());
    expect(onModeChange).toHaveBeenCalledWith("actual");
    expect(fitButton()).toHaveAttribute("aria-pressed", "true");
  });
});

describe("BoardViewport: measurement", () => {
  it("re-measures on window resize", () => {
    layout.viewport = 2000;
    render(<BoardViewport {...NOTE_ARRAY} />);
    expect(screen.queryByRole("button")).toBeNull();
    layout.viewport = 370;
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(actualButton()).toBeInTheDocument();
  });

  it("re-measures when a ResizeObserver fires, once per frame", () => {
    const callbacks: ResizeObserverCallback[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) {
          callbacks.push(cb);
        }
        observe() {}
        unobserve() {}
        disconnect = disconnect;
      },
    );
    const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
    layout.viewport = 2000;
    const { unmount } = render(<BoardViewport {...NOTE_ARRAY} />);
    layout.viewport = 370;
    act(() => callbacks[0]([], {} as ResizeObserver));
    expect(actualButton()).toBeInTheDocument();
    expect(raf).toHaveBeenCalled();
    unmount();
    expect(disconnect).toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("treats an unmeasured (0-wide) slot as fitting", () => {
    layout.viewport = 0;
    render(<BoardViewport {...NOTE_ARRAY} />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("passes board props through and keeps the root className on the wrapper", () => {
    render(<BoardViewport {...NOTE_ARRAY} rootClassName="mt-4" className="board-x" />);
    expect(document.querySelector("[data-slot=board-viewport]")).toHaveClass("mt-4");
    expect(screen.getByRole("img")).toHaveClass("board-x");
  });
});
