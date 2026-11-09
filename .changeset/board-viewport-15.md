---
"@fiestaboard/ui": minor
---

Boards that are wider than their slot can now scroll instead of shrinking (slices 1.5a and 1.5b).

- **New `BoardViewport`.** The board scrolls sideways inside a fixed bezel.
  - An edge fade (`--board-edge-fade`) marks each side that has more board.
  - Scrolling snaps one Note at a time on a note array, one column of Notes on a multi-row array, and one tile column on other boards.
  - The indicator reads "Note 1 of 3", "Column 1 of 2 · 4 notes" or "Columns 1–16 of 22". The current page is a pill (web 07) by default; `indicator="dot"` gives mobile 02's dot. Screen readers hear the indicator once a scroll settles.
  - The scroller is a `region` landmark only while the board overflows; a board that fits is a named `group`. In a list, give each board its own `labels.region`.
  - The viewport is a labelled region. ← → move a page, Home / End jump to the ends, and F toggles Fit / Actual size. Scrolling is instant under reduced motion.
  - Fit is the opt-in overview. When it scales a tile below `minTile` (default 13 px), it is labelled "Overview · … · tap Actual to read".
  - Actual size is the default. A board that fits shows no controls.
- **`ScaledBoardDisplay`** gains `defaultMode`, `persist`, a controlled `mode` with `onModeChange`, and `layout` (`phone-hero`, `medium-hero`, `pane` or `full-screen`).
  - The mode resolves in this order: `mode`, then the session's stored choice (when `persist`, which defaults to true), then `defaultMode`, then `"fit"`.
  - With no new props, it renders exactly as before.
  - Its actual-size scroller is now a focusable, named region (`scrollRegionLabel`).
- **`BoardSizeIndicator`** gains `format="cols×rows"`, which reads "22 × 6".
- **Shared Fit / Actual preference.** Both components use one session key.
  - A Fit or Actual tap on any preview carries over to previews mounted later in the session, whatever their board type.
  - Previews already on screen don't follow each other live.
  - Hosts that control `mode` should pass `persist={false}`, so their state doesn't leak into other previews.
- **New exports:** `useBoardPreviewMode`, `resolveBoardPreviewMode`, `readStoredBoardPreviewMode` and `writeStoredBoardPreviewMode` share one Fit / Actual preference across both components.
