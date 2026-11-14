---
"@fiestaboard/ui": minor
---

Add `ListRow`, `DropdownMenu trigger="context"` and `SortableList` (slices 1.8a and 1.8b).

- **`ListRow`** and **`ListRowGroup`**: one record in a list, with `leading`, `title`, `description`, `meta` and `trailing` slots. `layout="auto"` (the default) keeps the meta beside the text until the text column falls below 10rem, then wraps it under the description, so rows stack at large text sizes; `inline` and `stacked` pin either form. `variant="plain" | "card"`, `size="default" | "touch"` (48px or 56px floor), and `render` for a link or button row. `ListRowGroup` is a `role="list"` (`inset`, `plain` or `separated`) whose rows render as `<li>` and inherit its variant and size.
- **`DropdownMenu trigger="context"`**: the `DropdownMenuTrigger` becomes a context-menu area that opens on right-click, a long press, Shift+F10 or the Menu key. A keyboard open anchors the menu under the focused element and returns focus there on close. The default (`click`) menu is unchanged.
- **`SortableList`**, with `SortableListHandle`, `SortableListMoveButtons`, `useSortableItem` and `arrayMove`: reorder by pointer drag (mouse, pen or touch, with an insertion line), by keyboard (Space lifts, arrows and Home/End move, Space or Enter drops, Escape restores), or with Move up / Move down. Each step is announced in a polite live region that is also the visible status line (`hideStatus` keeps it screen-reader-only). Controlled through `onMove(from, to)`; English `DEFAULT_SORTABLE_LIST_LABELS` are overridable through `labels`. No new dependency.
