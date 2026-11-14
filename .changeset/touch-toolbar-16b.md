---
"@fiestaboard/ui": minor
---

The template editor gets a touch toolbar with bottom-sheet pickers, and the editor can say what the board will drop (slice 1.6b).

- **`TemplateEditorToolbar size="touch"`.** A 60 px bar of labelled 52 px tools (new `EditorTool`), with no hover-only tooltips. Every picker opens as a non-modal bottom sheet with a grabber, so the live preview above stays visible.
  - **Split-flap:** Variables · Colors · Formatting · Formula │ Undo · Redo · More.
  - **LED:** Variables · Text color · Icon · Size · Formula · More. Undo and Redo move into More.
  - **`capabilities`** (`"split-flap"` or `"led-text"`) picks the tool set. When it is unset, it is derived from `charset`.
  - Tools disable rather than disappear when there is nothing to insert, so the bar never reflows.
  - The Colors sheet stays open while you add tiles. The Formatting sheet holds the snippets plus line alignment. More holds cut, copy and paste, Draw on board, sync from board, the wrap switch, and the host's own rows (`moreContent`).
  - The LED Size sheet comes from the host (`renderSizePicker`). Without it, Size is disabled.
  - **Draw mode on touch:** the bar becomes Brush · Undo · Redo · Done. Brush opens a sheet with 48 px colour swatches, the eraser and 44 px stamp cells.
  - `container` portals the bar into a host dock.
  - New labels have English defaults.
- **`pickerPresentation`** on the default toolbar passes `"popover"`, `"sheet"` or `"auto"` to its pickers. The default is `"popover"`, which is unchanged.
- **`ToolbarDropdown`** gains `size="touch"` (a labelled tool trigger, `accent` while open), plus `detents` and `defaultDetent` for the sheet presentation.
- **`ColorPickerContent`** gains `size="touch"` (48 px swatches in a full-width grid) and `sections`, which picks the groups that render. It also exports `colorSwatchClassName`.
- **`DrawCharPickerContent`** gains `size="touch"`: 44 px cells in six columns, and the arrow keys follow the column count.
- **New `EditorWarning`** with `EditorWarningAction`.
  - `kind="line-overflow"` is the validated card: a "Line 4" badge, "24 of 22 columns · 2 cut off", detail, who checked it, and fix buttons (32 px, or 44 px at `size="touch"`).
  - `kind="line-limit"` is the warning box shown when a page is longer than the board.
  - Both are polite status regions on the `Alert` surfaces.

At the default size, nothing changes.
