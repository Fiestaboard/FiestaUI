import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BOARD_PREVIEW_MODE_STORAGE_KEY } from "./board-preview-mode";
import { ScaledBoardDisplay } from "./scaled-board-display";

const fit = () => screen.getByRole("button", { name: "Fit" });
const actual = () => screen.getByRole("button", { name: "Actual size" });
const root = () => document.querySelector("[data-slot=scaled-board-display]") as HTMLElement;
const NOTE_ARRAY = { deviceType: "note_array", notesWide: 3, message: "HI" } as const;
const realGetComputedStyle = window.getComputedStyle.bind(window);

beforeEach(() => window.sessionStorage.clear());
afterEach(() => window.sessionStorage.clear());

describe("ScaledBoardDisplay: Fit / Actual size toggle", () => {
  it("only offers the toggle for a note array", () => {
    render(<ScaledBoardDisplay deviceType="flagship" message="HI" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it('defaults to "fit", as it always has', () => {
    render(<ScaledBoardDisplay {...NOTE_ARRAY} />);
    expect(fit()).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByTestId("actual-size-scroll")).toBeNull();
  });

  it("switches to an actual-size scroller and remembers it for the session", () => {
    const { unmount } = render(<ScaledBoardDisplay {...NOTE_ARRAY} />);
    fireEvent.click(actual());
    expect(screen.getByTestId("actual-size-scroll")).toBeInTheDocument();
    expect(window.sessionStorage.getItem(BOARD_PREVIEW_MODE_STORAGE_KEY)).toBe("actual");
    unmount();
    render(<ScaledBoardDisplay {...NOTE_ARRAY} />);
    expect(actual()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(fit());
    expect(screen.queryByTestId("actual-size-scroll")).toBeNull();
  });

  it("makes the actual-size scroller a named, focusable region", () => {
    render(<ScaledBoardDisplay {...NOTE_ARRAY} defaultMode="actual" persist={false} scrollRegionLabel="Vista" />);
    const region = screen.getByRole("region", { name: "Vista" });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toBe(screen.getByTestId("actual-size-scroll"));
  });

  it("uses the localised labels", () => {
    render(
      <ScaledBoardDisplay {...NOTE_ARRAY} previewSizeLabel="Tamaño" fitModeLabel="Ajustar" actualModeLabel="Real" />,
    );
    expect(screen.getByRole("group", { name: "Tamaño" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ajustar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Real" })).toBeInTheDocument();
  });

  it("keeps a flagship fitted even when another board left actual in storage", () => {
    window.sessionStorage.setItem(BOARD_PREVIEW_MODE_STORAGE_KEY, "actual");
    render(<ScaledBoardDisplay deviceType="flagship" message="HI" />);
    expect(screen.queryByTestId("actual-size-scroll")).toBeNull();
  });
});

describe("ScaledBoardDisplay: defaultMode and persist (R1)", () => {
  it('defaultMode="actual" applies when nothing is stored', () => {
    render(<ScaledBoardDisplay {...NOTE_ARRAY} defaultMode="actual" />);
    expect(actual()).toHaveAttribute("aria-pressed", "true");
  });

  it("a stored Fit outranks defaultMode (the tap lasts the session)", () => {
    window.sessionStorage.setItem(BOARD_PREVIEW_MODE_STORAGE_KEY, "fit");
    render(<ScaledBoardDisplay {...NOTE_ARRAY} defaultMode="actual" />);
    expect(fit()).toHaveAttribute("aria-pressed", "true");
  });

  it("persist={false} ignores and never writes the session", () => {
    window.sessionStorage.setItem(BOARD_PREVIEW_MODE_STORAGE_KEY, "fit");
    render(<ScaledBoardDisplay {...NOTE_ARRAY} defaultMode="actual" persist={false} />);
    expect(actual()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(fit());
    fireEvent.click(actual());
    expect(window.sessionStorage.getItem(BOARD_PREVIEW_MODE_STORAGE_KEY)).toBe("fit");
  });

  it("a controlled mode outranks storage and reports taps through onModeChange", () => {
    const onModeChange = vi.fn();
    window.sessionStorage.setItem(BOARD_PREVIEW_MODE_STORAGE_KEY, "fit");
    const { rerender } = render(<ScaledBoardDisplay {...NOTE_ARRAY} mode="actual" onModeChange={onModeChange} />);
    expect(actual()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(fit());
    expect(onModeChange).toHaveBeenCalledWith("fit");
    expect(actual()).toHaveAttribute("aria-pressed", "true");
    rerender(<ScaledBoardDisplay {...NOTE_ARRAY} mode="fit" onModeChange={onModeChange} />);
    expect(fit()).toHaveAttribute("aria-pressed", "true");
  });

  it("does not leak the new props onto the board", () => {
    render(<ScaledBoardDisplay {...NOTE_ARRAY} defaultMode="actual" persist={false} layout="pane" />);
    const board = screen.getByRole("img");
    expect(board).not.toHaveAttribute("mode");
    expect(board).not.toHaveAttribute("layout");
  });
});

describe("ScaledBoardDisplay: layout wrapper (C8)", () => {
  it("adds nothing when no layout is given", () => {
    render(<ScaledBoardDisplay message="HI" />);
    expect(root()).not.toHaveAttribute("data-layout");
    expect(root().className).toBe("w-full min-w-0");
  });

  it.each([
    ["phone-hero", "sm"],
    ["medium-hero", "md"],
    ["pane", "md"],
    ["full-screen", "lg"],
  ] as const)("layout=%s stamps the wrapper and picks Tile %s", (layout, size) => {
    render(<ScaledBoardDisplay message="HI" layout={layout} />);
    expect(root()).toHaveAttribute("data-layout", layout);
    expect(root()).toHaveAttribute("data-size", size);
  });

  it("an explicit size beats the layout's tile size", () => {
    render(<ScaledBoardDisplay message="HI" layout="full-screen" size="sm" />);
    expect(root()).toHaveAttribute("data-size", "sm");
  });

  it("full-screen letterboxes: fills its slot and centres the board", () => {
    render(<ScaledBoardDisplay message="HI" layout="full-screen" />);
    expect(root()).toHaveClass("h-full", "flex", "flex-col", "items-center", "justify-center");
  });

  it("applies the layout in actual-size mode too", () => {
    render(<ScaledBoardDisplay {...NOTE_ARRAY} layout="pane" defaultMode="actual" />);
    expect(root()).toHaveAttribute("data-layout", "pane");
  });
});

describe("ScaledBoardDisplay: fit measurement", () => {
  function stubLayout({ slot, board }: { slot: number; board: number }) {
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.dataset.testSlot === "true" ? slot : 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("data-slot") === "board-display" ||
        this.firstElementChild?.getAttribute("data-slot") === "board-display"
        ? board
        : 0;
    });
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (this: HTMLElement) {
      return this.getAttribute("data-slot") === "board-display" ||
        this.firstElementChild?.getAttribute("data-slot") === "board-display"
        ? 100
        : 0;
    });
    const real = realGetComputedStyle;
    vi.spyOn(window, "getComputedStyle").mockImplementation((el: Element) => {
      const style = real(el);
      if ((el as HTMLElement).dataset?.testSlot === "true") {
        return { ...style, overflowX: "hidden", paddingLeft: "10px", paddingRight: "10px" } as CSSStyleDeclaration;
      }
      return style;
    });
  }

  it("scales down to the content box of the closest overflow ancestor", () => {
    stubLayout({ slot: 420, board: 800 });
    render(
      <div data-test-slot="true">
        <ScaledBoardDisplay message="HI" />
      </div>,
    );
    const scaled = screen.getByRole("img").parentElement?.parentElement as HTMLElement;
    // (420 - 20) / 800
    expect(scaled.style.transform).toBe("scale(0.5)");
    expect((scaled.parentElement as HTMLElement).style.width).toBe("400px");
    expect((scaled.parentElement as HTMLElement).style.height).toBe("50px");
  });

  it("never scales up", () => {
    stubLayout({ slot: 2000, board: 800 });
    render(
      <div data-test-slot="true">
        <ScaledBoardDisplay message="HI" />
      </div>,
    );
    const scaled = screen.getByRole("img").parentElement?.parentElement as HTMLElement;
    expect(scaled.style.transform).toBe("scale(1)");
  });

  it("recomputes once per frame when observed sizes change, and cleans up", () => {
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
    let queued: FrameRequestCallback | null = null;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      queued = cb;
      return 7;
    });
    const cancel = vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    stubLayout({ slot: 2000, board: 800 });
    const { unmount } = render(
      <div data-test-slot="true">
        <ScaledBoardDisplay message="HI" />
      </div>,
    );
    stubLayout({ slot: 420, board: 800 });
    act(() => {
      callbacks[0]([], {} as ResizeObserver);
      callbacks[0]([], {} as ResizeObserver); // coalesced into the same frame
    });
    act(() => queued?.(0));
    const scaled = screen.getByRole("img").parentElement?.parentElement as HTMLElement;
    expect(scaled.style.transform).toBe("scale(0.5)");
    act(() => callbacks[0]([], {} as ResizeObserver));
    unmount();
    expect(disconnect).toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith(7);
    vi.unstubAllGlobals();
  });

  it("falls back to its own container when no ancestor caps the width", () => {
    render(<ScaledBoardDisplay message="HI" />);
    const scaled = screen.getByRole("img").parentElement?.parentElement as HTMLElement;
    expect(scaled.style.transform).toBe("scale(1)");
  });
});
