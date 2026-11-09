---
"@fiestaboard/ui": minor
---

Bottom sheets and snackbar actions (slice 1.3).

- **Visible change:** toasts that pass `action` (and `cancel`) now render them as 44px buttons on their own row under the text: `action` with the secondary fill first, `cancel` as a ghost button after it, in that order in the DOM and tab order too. Toasts without actions are unchanged.
- `SheetContent side="bottom"` gains `grabber` (a 36×5 drag handle with a 44px hit area; drag down to dismiss), `detents` (`"half"`, `"full"` or viewport fractions) with `detent` / `defaultDetent` / `onDetentChange`, and `scrim={false}` for a sheet that leaves the page visible. With detents the grabber is a keyboard-operable `role="separator"` (↑/↓, Home/End, Enter/Space) with `aria-valuetext` ("Half height"). Under a grabber, a direct `SheetHeader` child is pinned above the scrolling body and a direct `SheetFooter` child is pinned below it (sticky footer). `labels.close`, `labels.grabber` and `labels.detentValue` localize the sheet. The close chip gains a 44px hit area. New exports: `SheetDetent`, `SheetLabels`, `SheetContentProps`, `DEFAULT_SHEET_LABELS`.
- `ToolbarDropdown presentation="popover" | "sheet" | "auto"` (default `"popover"`). `sheet` shows the panel as a non-modal bottom sheet with no scrim, titled by `label`; `auto` uses it below 48rem or on a coarse pointer. New `labels.close`.
- `Toaster` lifts bottom-anchored toasts above the mobile bottom nav by reading `--bottom-nav-offset` (falls back to `0px`) plus the bottom safe area; opt out with `clearBottomNav={false}`.
