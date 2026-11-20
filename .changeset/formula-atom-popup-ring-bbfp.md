---
"@fiestaboard/ui": minor
---

`FormulaAtom` shows its source as written inside an uppercase host such as the template editor (it resets `text-transform` itself), and every state is one 22 px shape: the error edge is an inset ring instead of a 1 px border that made error atoms 24 px (BB-FP-10, BB-FP-12). New `valueColor` prop: a board colour name, code or `{code}` that a `COLOR()` result lights, shown as `=` and that colour's tile instead of the raw code; `value` stays the accessible text. `value` is now optional: undefined or `""` draws no value segment (no empty box), still 22 px tall; an empty result that should show is formatted by the caller (e.g. `= ""`). The `DropdownMenu` (and its submenu and context mode) and `Select` popups no longer draw the browser focus outline around the whole popup when opened with the mouse; the popover surface keeps its 1 px border and shadow (BB-FP-4).
