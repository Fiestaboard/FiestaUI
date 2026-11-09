# Universal slices 1.8a and 1.8b: ListRow, context trigger, SortableList

**Program:** FiestaBoard universal redesign, MASTER-PLAN §4.4 rows 1.8a (C16, WEB-18) and 1.8b (P7, WEB-06).
**Unblocks:** web 2.2 (the board context menu) and 2.6 (Collections reorder in `collection-form.tsx`).
**Base:** `origin/alpha` `900fabf6`. Lane B (lists).

## Figma (`ZQ8RMELCO6qEOFZUnQu36e`, read only)

- 08 `61:25752` C16 ListRow candidate; 06 `31:5` / `368:24902` `iOS / List row` Layout=Inline / Stacked (8/16 padding, 12 gap, 32 tile, title + subtitle 2 apart, value beside or under).
- 08 `61:53985` P7 SortableList candidate; 07 `57:66920` Safari touch reorder (44 handle, 64 card rows radius 12, 2px amber lifted stroke, insertion line with a dot, "· moving to position N of M" status).
- 07c §5 `312:74863` desktop keyboard reorder: every row focusable, Space lifts, ↑ ↓ move, Space drops, Esc restores, Move up / Move down on the focused or lifted row, an aria-live line.

## API

- `ListRow { leading, title, description, meta, trailing, layout: auto|inline|stacked, variant: plain|card, size: default|touch, render }`; `ListRowGroup { variant: inset|plain|separated, size }`.
- `DropdownMenu trigger="click"|"context"`. Context mode renders Base UI `ContextMenu.Root/Trigger`; Shift+F10 and the Menu key are handled by the trigger (synthetic `contextmenu` at the focused element, the native echo swallowed, focus returned on close).
- `SortableList<T> { items, getKey, getLabel, onMove(from, to), renderItem, labels, disabled, hideStatus, size }`, `SortableListHandle`, `SortableListMoveButtons { visibility: focus|always }`, `useSortableItem()`, `arrayMove()`, `DEFAULT_SORTABLE_LIST_LABELS`.

## Steps (TDD)

1. Tests first: `list-row.test.tsx`, `sortable-list.test.tsx`, `dropdown-menu.test.tsx` (the legacy file had none; the whole file is now covered). All red.
2. Implement; green. Changed-file coverage ≥90% lines / ≥85% branches on every touched source file.
3. Stories: ListRow (Default, InsetGroup, Layouts, LargeText, Separated, Touch, AsLink, WithContextMenu), SortableList (Default, Touch, Lifted, Dragging, Disabled), DropdownMenu ContextTrigger. Lifted, Dragging and ContextTrigger reach their state in `play`.
4. Inventory: `ListRow` and `SortableList` in Containment, demos, and `component-inventory-demos.test.tsx` (named apart from #384's mount test so the PRs cannot conflict).
5. Exports in `src/index.ts`, one minor changeset.

## Not in this slice

- Swipe actions (06 `36:8594`): native only for now.
- Auto-scroll while dragging near the viewport edge.
- `fui-coarse` / `coarse:` (#385): not used, so no dependency; `size="touch"` carries the 44px handle.
- Code Connect mappings: the repo has no Code Connect setup yet.

## Review round 1 (Opus, READY with should-fixes)

- **S1:** a handled Escape (cancelling a lift or a drag) also stops propagation, so a host Dialog or Sheet stays open.
- **S2:**
  - dragging opens a gap at the target slot, and the line sits in that gap under the dragged card;
  - a lifted row drops `aria-describedby` and is named by its label, so the refocus after a downward move reads only the name;
  - Move buttons are `sr-only` rather than `hidden`;
  - a lifted row has a single 2px ring.
- **S3:** the Shift+F10 and Menu-key echo is swallowed by a document capture listener until that key's keyup plus one task (1s cap). This covers Chrome on Windows, which fires on keyup.
- **S4:**
  - the context area is `select-none` with no touch callout;
  - the vacuous same-task test is replaced by keyup, timeout and reopen tests.
- **S5:** Move buttons are 44px in a `size="touch"` list (TODO: Button `size="touch"` once #385 lands).
- **Nits taken:** `event.repeat` is ignored; `returnFocusRef` is cleared after use; the LargeText story pads in px; the `auto` comment is corrected.
- **Mutants:** the listed survivors are all killed (15 targeted mutants).
