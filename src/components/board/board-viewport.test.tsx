import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { type BoardSize, sizeClasses } from "../../lib/board-metrics";
import { BOARD_PREVIEW_MODE_STORAGE_KEY } from "./board-preview-mode";
import { BOARD_VIEWPORT_HERO_INSET, BOARD_VIEWPORT_PADDING, BoardViewport } from "./board-viewport";
import { ScaledBoardDisplay, type ScaledBoardLayout } from "./scaled-board-display";

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
    // The scroller's own inline padding: 12 by default, the hero inset (9) on a hero layout.
    const pad = Number.parseFloat((this as HTMLElement).style.paddingLeft) || BOARD_VIEWPORT_PADDING;
    return board ? boardWidth(board) + 2 * pad : 0;
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
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getByRole("group", { name: "Board preview" })).not.toHaveAttribute("tabindex");
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
    // Every first-row tile is a snap target, not only the first one.
    expect(region().className).toContain("[&_[data-note-row]:first-child>[data-note-tile]]:snap-start");
    expect(region().className).not.toContain("[data-note-tile]:first-child]");
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
    const live = document.querySelector("[data-slot=board-viewport-live]");
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
  it("re-measures on window resize, once per frame", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 1;
    });
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

describe("BoardViewport: review round 1", () => {
  it("S1: a fitting board is a named group, an overflowing one a region landmark", () => {
    const { rerender } = render(<BoardViewport deviceType="note" message="HI" labels={{ region: "Kitchen" }} />);
    expect(screen.getByRole("group", { name: "Kitchen" })).toBeInTheDocument();
    expect(screen.queryByRole("region")).toBeNull();
    rerender(<BoardViewport {...NOTE_ARRAY} labels={{ region: "Kitchen" }} />);
    expect(screen.getByRole("region", { name: "Kitchen" })).toBeInTheDocument();
  });

  it("S2: the live text waits for the scroll to settle; the visible text does not", () => {
    vi.useFakeTimers();
    try {
      layout.viewport = 280;
      render(<BoardViewport deviceType="flagship" message="GOOD MORNING" />);
      const live = () => document.querySelector("[data-slot=board-viewport-live]");
      expect(live()).toHaveTextContent("Columns 1–16 of 22");
      act(() => scrollTo_(16));
      act(() => scrollTo_(32));
      expect(indicator()).toHaveTextContent("Columns 3–18 of 22");
      expect(live()).toHaveTextContent("Columns 1–16 of 22");
      act(() => {
        vi.advanceTimersByTime(149);
      });
      expect(live()).toHaveTextContent("Columns 1–16 of 22");
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(live()).toHaveTextContent("Columns 3–18 of 22");
      // scrollend settles at once
      act(() => scrollTo_(48));
      act(() => {
        fireEvent(region(), new Event("scrollend"));
      });
      expect(live()).toHaveTextContent("Columns 4–19 of 22");
    } finally {
      vi.useRealTimers();
    }
  });

  it("S2: a mode change is announced at once", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    fireEvent.keyDown(region(), { key: "f" });
    expect(document.querySelector("[data-slot=board-viewport-live]")).toHaveTextContent(
      "Overview · 3 notes · tap Actual to read",
    );
  });

  it("S2: a pending settle is cleared on unmount", () => {
    const clear = vi.spyOn(globalThis, "clearTimeout");
    const { unmount } = render(<BoardViewport {...NOTE_ARRAY} />);
    act(() => scrollTo_(250));
    unmount();
    expect(clear).toHaveBeenCalled();
  });

  it("S3: Fit ↔ Actual keeps the same board node and observes a stable wrapper", () => {
    const observed: Element[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe(el: Element) {
          observed.push(el);
        }
        unobserve() {}
        disconnect() {}
      },
    );
    try {
      render(<BoardViewport {...NOTE_ARRAY} />);
      const before = screen.getByRole("img");
      fireEvent.keyDown(region(), { key: "f" });
      fireEvent.keyDown(region(), { key: "f" });
      expect(screen.getByRole("img")).toBe(before);
      const wrapper = document.querySelector("[data-slot=board-viewport-scaled]");
      expect(observed).toContain(wrapper);
      expect(observed).not.toContain(before);
      expect(wrapper?.isConnected).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("S4: unmount removes the resize listener it added", () => {
    const add = vi.spyOn(window, "addEventListener");
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<BoardViewport {...NOTE_ARRAY} />);
    const added = add.mock.calls.find(([type]) => type === "resize")?.[1];
    expect(added).toBeTypeOf("function");
    unmount();
    expect(remove).toHaveBeenCalledWith("resize", added);
  });

  it("S4: unmount cancels a pending measurement frame", () => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 42);
    const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    const { unmount } = render(<BoardViewport {...NOTE_ARRAY} />);
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    unmount();
    expect(cancel).toHaveBeenCalledWith(42);
  });

  it("P1: the current page is a pill by default, a dot on request", () => {
    const { unmount } = render(<BoardViewport {...NOTE_ARRAY} />);
    const current = () => document.querySelector("[data-slot=board-viewport-dot][data-current=true]");
    expect(current()).toHaveAttribute("data-shape", "pill");
    expect(current()).toHaveClass("h-1.5", "w-4");
    unmount();
    render(<BoardViewport {...NOTE_ARRAY} indicator="dot" />);
    expect(current()).toHaveAttribute("data-shape", "dot");
    expect(current()).toHaveClass("size-2");
    expect(document.querySelector("[data-slot=board-viewport-dot][data-current=false]")).toHaveClass("size-1.5");
  });
});

describe("BoardViewport: re-review nits", () => {
  it("R-N1: an overview lights every page as a dot, even with the pill indicator", () => {
    render(<BoardViewport {...NOTE_ARRAY} defaultMode="fit" />);
    const dots = [...document.querySelectorAll("[data-slot=board-viewport-dot]")];
    expect(dots).toHaveLength(3);
    for (const dot of dots) {
      expect(dot).toHaveAttribute("data-shape", "dot");
      expect(dot).toHaveClass("size-2");
      expect(dot).not.toHaveClass("w-4");
    }
  });

  it("R-N2: the visible indicator text stays hidden from AT (the live span speaks)", () => {
    render(<BoardViewport {...NOTE_ARRAY} hint="swipe" />);
    const text = document.querySelector("[data-slot=board-viewport-indicator-text]");
    expect(text).toHaveTextContent("Note 1 of 3");
    expect(text).toHaveAttribute("aria-hidden", "true");
  });
});

describe("BoardViewport: shared toggle and header sync (slice 1.5d)", () => {
  it("renders the shared BoardPreviewModeToggle at the touch size (02 S-1: 44 px on any pointer)", () => {
    render(<BoardViewport {...NOTE_ARRAY} />);
    const group = screen.getByRole("group", { name: "Preview size" });
    expect(group).toHaveAttribute("data-slot", "board-preview-mode-toggle");
    expect(group).toHaveAttribute("data-size", "touch");
    expect(fitButton()).toHaveClass("h-5.5", "before:min-h-touch", "before:min-w-touch");
  });

  it("showModeToggle={false} hides the pills but keeps F, reporting through onModeChange", () => {
    const onModeChange = vi.fn();
    render(<BoardViewport {...NOTE_ARRAY} showModeToggle={false} onModeChange={onModeChange} persist={false} />);
    expect(screen.queryByRole("group", { name: "Preview size" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    fireEvent.keyDown(region(), { key: "f" });
    expect(onModeChange).toHaveBeenCalledWith("fit");
    expect(document.querySelector("[data-slot=board-viewport]")).toHaveAttribute("data-mode", "fit");
  });

  it("drops the empty toggle row when the toggle is hidden and there is no title", () => {
    render(<BoardViewport {...NOTE_ARRAY} showModeToggle={false} />);
    const root = document.querySelector("[data-slot=board-viewport]") as HTMLElement;
    expect(root.firstElementChild).toHaveAttribute("data-slot", "board-viewport-bezel");
  });

  it("keeps the title row when the toggle is hidden", () => {
    render(<BoardViewport {...NOTE_ARRAY} showModeToggle={false} title="NOTE ARRAY 3×1" />);
    expect(screen.getByText("NOTE ARRAY 3×1")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("a host-driven Fit → Actual (a header toggle) also returns to the start of the board", () => {
    const { rerender } = render(<BoardViewport {...NOTE_ARRAY} mode="fit" showModeToggle={false} />);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<BoardViewport {...NOTE_ARRAY} mode="actual" showModeToggle={false} />);
    expect(scrollTo).toHaveBeenLastCalledWith({ left: 0, behavior: "auto" });
    scrollTo.mockClear();
    rerender(<BoardViewport {...NOTE_ARRAY} mode="fit" showModeToggle={false} />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does not jump on mount in Actual size", () => {
    render(<BoardViewport {...NOTE_ARRAY} mode="actual" />);
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("does not pass showModeToggle onto the board", () => {
    render(<BoardViewport {...NOTE_ARRAY} showModeToggle={false} />);
    expect(screen.getByRole("img")).not.toHaveAttribute("showModeToggle");
  });
});

describe("BoardViewport: layout (slice 1.5e)", () => {
  const root = () => document.querySelector("[data-slot=board-viewport]") as HTMLElement;
  const bezel = () => document.querySelector("[data-slot=board-viewport-bezel]") as HTMLElement;
  const scroller = () => document.querySelector("[data-slot=board-viewport-scroller]") as HTMLElement;
  // Which tile scale a board renders at, read from its tile classes.
  const tileSize = (container: ParentNode = document): BoardSize | undefined => {
    const html = container.querySelector("[data-slot=board-display]")?.innerHTML ?? "";
    return (["sm", "md", "lg"] as const).find((size) => html.includes(sizeClasses[size]));
  };
  const scaled = () => document.querySelector("[data-slot=board-viewport-scaled]") as HTMLElement;
  // 07a phone hero: a 390 frame with 8 px gutters → a 374 px bezel → 368 inside its 3 px border.
  const PHONE_SCROLLER = 368;
  const FLAGSHIP = { deviceType: "flagship", message: "DINNER AT 7" } as const;

  it("without a layout, renders exactly as before: 12 px padding, full-width rounded-xl bezel", () => {
    render(<BoardViewport deviceType="note" message="HI" />);
    expect(root()).not.toHaveAttribute("data-layout");
    expect(root()).not.toHaveAttribute("data-settled");
    expect(scroller().style.padding).toBe(`${BOARD_VIEWPORT_PADDING}px`);
    expect(bezel().className).toContain("rounded-xl");
    expect(bezel().className).not.toContain("w-fit");
    expect(bezel().style.boxShadow).toBe("");
  });

  it("the 07a hero inset is 12 px across and 16 px down from the bezel's outer edge", () => {
    expect(BOARD_VIEWPORT_HERO_INSET).toEqual({ x: 12, y: 16 });
  });

  it("phone-hero: the Flagship fits at Tile sm in the 390 phone slot, where the default scrolls", () => {
    layout.viewport = PHONE_SCROLLER;
    const { unmount } = render(<BoardViewport {...FLAGSHIP} size="sm" />);
    expect(root()).toHaveAttribute("data-overflow", "true");
    unmount();

    render(<BoardViewport {...FLAGSHIP} layout="phone-hero" />);
    expect(root()).toHaveAttribute("data-layout", "phone-hero");
    expect(root()).toHaveAttribute("data-overflow", "false");
    expect(root()).toHaveAttribute("data-settled", "false");
    expect(screen.queryByRole("region")).toBeNull();
    expect(indicator()).toBeNull();
    // 3 px border + 9 / 13 px padding = 12 / 16 from the outer edge, as drawn.
    expect(scroller().style.padding).toBe("13px 9px");
    expect(scroller().style.scrollPaddingLeft).toBe("9px");
    // Tile sm (13 × 18), not md's responsive steps.
    expect(tileSize()).toBe("sm");
    // 07a's StaticBoardDisplay bezel: radius 10 and its small shadow.
    expect(bezel().className).toContain("rounded-lg");
    expect(bezel().className).not.toContain("rounded-xl");
    expect(bezel().style.boxShadow).toContain("0 2px 4px rgba(0,0,0,0.4)");
  });

  it("G4: a hero bezel hugs a board that fits, centred; an overflowing one fills the slot", () => {
    render(<BoardViewport deviceType="note" message="HI" layout="phone-hero" />);
    expect(bezel().className).toContain("w-fit");
    expect(bezel().className).toContain("max-w-full");
    expect(bezel().className).toContain("mx-auto");
    cleanup();
    render(<BoardViewport {...NOTE_ARRAY} layout="phone-hero" />);
    expect(root()).toHaveAttribute("data-overflow", "true");
    expect(bezel().className).not.toContain("w-fit");
  });

  it("an explicit size wins over the layout's", () => {
    render(<BoardViewport deviceType="note" message="HI" layout="phone-hero" size="md" />);
    expect(tileSize()).toBe("md");
  });

  it("each layout picks the same tile size as ScaledBoardDisplay's", () => {
    const layouts: ScaledBoardLayout[] = ["phone-hero", "medium-hero", "pane", "full-screen"];
    for (const l of layouts) {
      const a = render(<BoardViewport deviceType="note" message="HI" layout={l} />);
      const viewportTile = tileSize(a.container);
      a.unmount();
      const b = render(<ScaledBoardDisplay deviceType="note" message="HI" layout={l} />);
      const scaledTile = b.container.querySelector("[data-slot=scaled-board-display]")?.getAttribute("data-size");
      b.unmount();
      expect(viewportTile, l).toBeDefined();
      expect(viewportTile, l).toBe(scaledTile);
    }
  });

  it("medium-hero at 768: a board one column too wide settles to fit, with no scroll chrome", () => {
    // Tile md at the md: step (24 px, gap 5): 633 px of Flagship in a 639 px bezel.
    layout = { ...layout, tileWidth: 24, gap: 5, viewport: 633 };
    render(<BoardViewport {...FLAGSHIP} layout="medium-hero" />);
    expect(root()).toHaveAttribute("data-settled", "true");
    expect(root()).toHaveAttribute("data-overview", "false");
    expect(root()).toHaveAttribute("data-overflow", "false");
    expect(screen.queryByRole("region")).toBeNull();
    expect(screen.getByRole("group", { name: "Board preview" })).not.toHaveAttribute("tabindex");
    expect(screen.queryByRole("button")).toBeNull();
    expect(indicator()).toBeNull();
    expect(fade("end")).toBeNull();
    expect(scaled().style.transform).toBe(`scale(${615 / 633})`);
    // A settled board's bezel fills the slot (its width comes from the slot).
    expect(bezel().className).not.toContain("w-fit");
  });

  it("the default never settles: the same 768 board scrolls one column", () => {
    layout = { ...layout, tileWidth: 24, gap: 5, viewport: 633 };
    render(<BoardViewport {...FLAGSHIP} size="md" />);
    expect(root()).toHaveAttribute("data-overflow", "true");
    expect(indicator()).toHaveTextContent("Columns 1–21 of 22");
  });

  it("pane does not settle: the editor reads its board at Actual size", () => {
    layout = { ...layout, tileWidth: 24, gap: 5, viewport: 633 };
    render(<BoardViewport {...FLAGSHIP} layout="pane" />);
    expect(root()).toHaveAttribute("data-settled", "false");
    expect(root()).toHaveAttribute("data-overflow", "true");
    expect(scroller().style.padding).toBe(`${BOARD_VIEWPORT_PADDING}px`);
  });

  it("never settles under the tile floor: a 3×1 array on a phone hero still scrolls", () => {
    render(<BoardViewport {...NOTE_ARRAY} layout="phone-hero" />);
    expect(root()).toHaveAttribute("data-settled", "false");
    expect(root()).toHaveAttribute("data-overflow", "true");
    expect(indicator()).toHaveTextContent("Note 1 of 3");
  });

  it("settles exactly at the tile floor, but scrolls just below it", () => {
    // Flagship: 22 × 24 px tiles + 21 × 5 px gaps = 633 px.
    // The 334.5 px scroller minus 18 px hero padding gives scale 0.5:
    // fitted tiles are exactly 12 px, so equality must remain readable.
    layout = { ...layout, tileWidth: 24, gap: 5, viewport: 334.5 };
    const { rerender } = render(<BoardViewport {...FLAGSHIP} layout="medium-hero" minTile={12} />);
    expect(root()).toHaveAttribute("data-settled", "true");
    expect(scaled().style.transform).toBe("scale(0.5)");
    expect(screen.queryByRole("region")).toBeNull();
    expect(indicator()).toBeNull();

    rerender(<BoardViewport {...FLAGSHIP} layout="medium-hero" minTile={12.01} />);
    expect(root()).toHaveAttribute("data-settled", "false");
    expect(region()).toBeInTheDocument();
    expect(indicator()).not.toBeNull();
  });

  it("anchors fitted boards at the top left so scaling keeps tiles inside the measured box", () => {
    layout = { ...layout, tileWidth: 24, gap: 5, viewport: 633 };
    render(<BoardViewport {...FLAGSHIP} layout="medium-hero" />);
    expect(root()).toHaveAttribute("data-settled", "true");
    expect(scaled().style.transform).toContain("scale(");
    expect(scaled().style.transformOrigin).toBe("top left");
  });

  it("settling respects a host's minTile", () => {
    layout = { ...layout, tileWidth: 24, gap: 5, viewport: 633 };
    render(<BoardViewport {...FLAGSHIP} layout="medium-hero" minTile={24} />);
    expect(root()).toHaveAttribute("data-settled", "false");
    expect(root()).toHaveAttribute("data-overflow", "true");
  });

  it("full-screen uses Tile lg and the hero inset, and settles", () => {
    render(<BoardViewport deviceType="note" message="HI" layout="full-screen" />);
    expect(tileSize()).toBe("lg");
    expect(scroller().style.padding).toBe("13px 9px");
  });

  it("a white hero board takes the white shadow", () => {
    render(<BoardViewport deviceType="note" message="HI" boardType="white" layout="phone-hero" />);
    expect(bezel().style.boxShadow).toContain("rgba(0,0,0,0.1)");
  });
});
