---
"@fiestaboard/ui": minor
---

Honor `pickerPresentation` for the touch editor toolbar through the existing `TemplateEditor.toolbarProps` integration. Explicit touch popovers use the shared overlay portal and collision positioning, including a host container, while omitted presentation keeps sheets and `auto` keeps the legacy below 48rem/coarse-pointer policy. Add presentation-aware color help and an optional `PopoverContent` portal container.
