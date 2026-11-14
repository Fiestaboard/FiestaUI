import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  BOARD_PREVIEW_MODE_STORAGE_KEY,
  readStoredBoardPreviewMode,
  resolveBoardPreviewMode,
  useBoardPreviewMode,
  writeStoredBoardPreviewMode,
} from "./board-preview-mode";

beforeEach(() => window.sessionStorage.clear());
afterEach(() => window.sessionStorage.clear());

describe("readStoredBoardPreviewMode / writeStoredBoardPreviewMode", () => {
  it("keeps the key ScaledBoardDisplay has always used", () => {
    expect(BOARD_PREVIEW_MODE_STORAGE_KEY).toBe("fiestaboard:boardPreviewMode");
  });

  it("reads null when nothing is stored, so a default can apply", () => {
    expect(readStoredBoardPreviewMode()).toBeNull();
  });

  it("round-trips both modes", () => {
    writeStoredBoardPreviewMode("actual");
    expect(readStoredBoardPreviewMode()).toBe("actual");
    writeStoredBoardPreviewMode("fit");
    expect(readStoredBoardPreviewMode()).toBe("fit");
  });

  it("ignores a value that is not a mode", () => {
    window.sessionStorage.setItem(BOARD_PREVIEW_MODE_STORAGE_KEY, "zoom");
    expect(readStoredBoardPreviewMode()).toBeNull();
  });

  it("swallows storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(readStoredBoardPreviewMode()).toBeNull();
    expect(() => writeStoredBoardPreviewMode("fit")).not.toThrow();
  });
});

describe("resolveBoardPreviewMode (R1 precedence)", () => {
  it("1. the controlled mode wins over everything", () => {
    expect(resolveBoardPreviewMode({ mode: "fit", persist: true, stored: "actual", defaultMode: "actual" })).toBe(
      "fit",
    );
  });

  it("2. the stored value wins over defaultMode when persist is on", () => {
    expect(resolveBoardPreviewMode({ persist: true, stored: "fit", defaultMode: "actual" })).toBe("fit");
  });

  it("2b. the stored value is ignored when persist is off", () => {
    expect(resolveBoardPreviewMode({ persist: false, stored: "fit", defaultMode: "actual" })).toBe("actual");
  });

  it("3. defaultMode applies when nothing is stored", () => {
    expect(resolveBoardPreviewMode({ persist: true, stored: null, defaultMode: "actual" })).toBe("actual");
  });

  it('4. falls back to "fit"', () => {
    expect(resolveBoardPreviewMode({ persist: true, stored: null })).toBe("fit");
    expect(resolveBoardPreviewMode({})).toBe("fit");
  });
});

describe("useBoardPreviewMode", () => {
  it("starts from the stored value and persists a change", () => {
    writeStoredBoardPreviewMode("actual");
    const { result } = renderHook(() => useBoardPreviewMode({ defaultMode: "fit" }));
    expect(result.current[0]).toBe("actual");
    act(() => result.current[1]("fit"));
    expect(result.current[0]).toBe("fit");
    expect(readStoredBoardPreviewMode()).toBe("fit");
  });

  it("does not write when persist is false", () => {
    const { result } = renderHook(() => useBoardPreviewMode({ defaultMode: "actual", persist: false }));
    expect(result.current[0]).toBe("actual");
    act(() => result.current[1]("fit"));
    expect(result.current[0]).toBe("fit");
    expect(readStoredBoardPreviewMode()).toBeNull();
  });

  it("is controlled by mode and reports changes through onModeChange", () => {
    const onModeChange = vi.fn();
    const { result, rerender } = renderHook(
      (p: { mode: "fit" | "actual" }) => useBoardPreviewMode({ ...p, onModeChange }),
      {
        initialProps: { mode: "fit" },
      },
    );
    act(() => result.current[1]("actual"));
    expect(onModeChange).toHaveBeenCalledWith("actual");
    // Still "fit": the parent has not passed the new value down.
    expect(result.current[0]).toBe("fit");
    rerender({ mode: "actual" });
    expect(result.current[0]).toBe("actual");
    // The user's choice is still remembered for the session.
    expect(readStoredBoardPreviewMode()).toBe("actual");
  });
});
