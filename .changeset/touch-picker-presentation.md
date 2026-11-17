---
"@fiestaboard/ui": minor
---

Honor `pickerPresentation` for the touch editor toolbar through the existing `TemplateEditor.toolbarProps` integration. Explicit touch popovers use the shared overlay portal and collision positioning, including a host container, while omitted presentation keeps sheets and `auto` keeps the legacy below 48rem/coarse-pointer policy. Add presentation-aware color help and an optional `PopoverContent` portal container.

Keep touch palette and glyph choices at least 48px wide at the default text size, with minimum grid tracks that preserve enlarged targets and their keyboard order inside scrollable popovers.
