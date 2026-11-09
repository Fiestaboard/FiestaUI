"use client";

/**
 * The board preview's Fit / Actual size mode, shared by `ScaledBoardDisplay`
 * and `BoardViewport` so one tap means the same thing on every preview in a
 * tab.
 *
 * Precedence (MASTER-PLAN R1), highest first:
 *
 *   1. the controlled `mode` prop;
 *   2. the value stored in `sessionStorage`, only when `persist` (default true);
 *   3. `defaultMode`;
 *   4. `"fit"`.
 *
 * Storage is `sessionStorage`, not `localStorage`, on purpose: a user who taps
 * Fit keeps it for the session only, and a fresh tab returns to the app's
 * default.
 */

import { useCallback, useState } from "react";

export type BoardPreviewMode = "fit" | "actual";

/** The key ScaledBoardDisplay has always persisted its mode under. */
export const BOARD_PREVIEW_MODE_STORAGE_KEY = "fiestaboard:boardPreviewMode";

/** The stored mode, or `null` when there is none (or storage is unavailable). */
export function readStoredBoardPreviewMode(): BoardPreviewMode | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(BOARD_PREVIEW_MODE_STORAGE_KEY);
    return stored === "fit" || stored === "actual" ? stored : null;
  } catch {
    // sessionStorage can throw (private mode, blocked storage).
    return null;
  }
}

/** Store the mode for the session. Best-effort: failures are swallowed. */
export function writeStoredBoardPreviewMode(mode: BoardPreviewMode): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BOARD_PREVIEW_MODE_STORAGE_KEY, mode);
  } catch {
    // Ignore: persistence is best-effort.
  }
}

export interface BoardPreviewModeOptions {
  /** Controlled mode. Wins over everything else. */
  mode?: BoardPreviewMode;
  /** Called with the new mode when the user changes it. */
  onModeChange?: (mode: BoardPreviewMode) => void;
  /** The mode to start in when nothing is stored. Default `"fit"`. */
  defaultMode?: BoardPreviewMode;
  /** Read and write the session's stored mode. Default `true`. */
  persist?: boolean;
}

/** The R1 precedence as a pure function. */
export function resolveBoardPreviewMode({
  mode,
  persist = true,
  stored = null,
  defaultMode,
}: {
  mode?: BoardPreviewMode;
  persist?: boolean;
  stored?: BoardPreviewMode | null;
  defaultMode?: BoardPreviewMode;
}): BoardPreviewMode {
  if (mode) return mode;
  if (persist && stored) return stored;
  return defaultMode ?? "fit";
}

/**
 * The preview mode as `[mode, setMode]`, resolved by the R1 precedence. The
 * stored value is read once, on mount (lazily, so SSR renders `defaultMode`).
 * `setMode` stores the choice when `persist`, updates the uncontrolled state,
 * and calls `onModeChange`.
 */
export function useBoardPreviewMode({
  mode,
  onModeChange,
  defaultMode,
  persist = true,
}: BoardPreviewModeOptions): [BoardPreviewMode, (next: BoardPreviewMode) => void] {
  const [internal, setInternal] = useState<BoardPreviewMode>(() =>
    resolveBoardPreviewMode({ persist, stored: persist ? readStoredBoardPreviewMode() : null, defaultMode }),
  );
  const setMode = useCallback(
    (next: BoardPreviewMode) => {
      setInternal(next);
      if (persist) writeStoredBoardPreviewMode(next);
      onModeChange?.(next);
    },
    [persist, onModeChange],
  );
  return [mode ?? internal, setMode];
}
