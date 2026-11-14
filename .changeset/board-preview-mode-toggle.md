---
"@fiestaboard/ui": minor
---

Fit / Actual size has one toggle, and fit-scaled boards have clean corners (slice 1.5d).

- **New `BoardPreviewModeToggle`.** The Fit / Actual size pills (Figma `ScaledBoardDisplay / Size toggle`): 22 px pills, 11 px text, 4 px apart; the active one is `border-primary` on `primary/10`.
  - It is controlled: pass `mode` and `onModeChange`. Put it in `EditorPreview`'s `headerAction` and drive the board from the same state; BoardViewport's F key reports through the same `onModeChange`, so the two stay in sync.
  - The tap target is 44 px without moving the layout: under the opted-in `coarse:` layer at `size="default"`, on any pointer at `size="touch"` (the #385 touch axis).
  - `labels` (`previewSize`, `fit`, `actual`) localise it.
- **One source.** `BoardViewport` and `ScaledBoardDisplay` now render this toggle. BoardViewport uses `size="touch"`; its pills are 22 px tall (were 21). ScaledBoardDisplay's pills are 22 px tall (were about 26), so a note array's board sits a few pixels higher.
- **`showModeToggle`** on `BoardViewport` and `ScaledBoardDisplay` (default `true`). Pass `false` when the host shows the toggle itself, so a preview never shows two. F still works in BoardViewport.
- **BoardViewport** returns to the start of the board on any switch to Actual size, including one made by a host through a controlled `mode`.
- **ScaledBoardDisplay corners.** The fit container clipped the board at its square bounding box, so the bezel's drop shadow showed only as grey square notches at the corners (a light square frame in dark). The fit box now reserves room for the original shadow and scales the board and shadow together into the available width. This removes the notches without discarding the shadow or letting it spill outside the slot. Bezel-free boards retain the full slot width.
