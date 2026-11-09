---
"@fiestaboard/ui": minor
---

Bottom sheets and snackbar actions (slice 1.3). All additive; existing sheets, dropdowns and toasts render as before.

- `SheetContent side="bottom"` gains `grabber` (a 36×5 drag handle with a 44px hit area; drag down to dismiss), `detents` (`"half"`, `"full"` or viewport fractions) with `detent` / `defaultDetent` / `onDetentChange`, and `scrim={false}` for a sheet that leaves the page visible. With detents the grabber is a keyboard-operable `role="separator"` (↑/↓, Home/End, Enter/Space). `labels.close` and `labels.grabber` localize the close button and the grabber. New exports: `SheetDetent`, `SheetLabels`, `SheetContentProps`, `DEFAULT_SHEET_LABELS`.
- `ToolbarDropdown presentation="popover" | "sheet" | "auto"` (default `"popover"`). `sheet` shows the panel as a non-modal bottom sheet with no scrim, titled by `label`; `auto` uses it below 640px. New `labels.close`.
- `Toaster` lifts bottom-anchored toasts above the mobile bottom nav by reading `--bottom-nav-offset` (falls back to `0px`; opt out with `clearBottomNav={false}`). Toast actions (`toast(msg, { action, cancel })`) now render as 44px buttons on their own row: `action` with the secondary fill, `cancel` as a ghost button after it. Apps already passing `action` will see the new layout.
