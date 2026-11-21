---
"@fiestaboard/ui": patch
---

Shell insets and overlay details (bug bash F, BB-FS-6/-7/-8):

- `railBreakpoint="md"`: the tablet band (768–1023) insets the rail 8px instead of 12 (MainContent `md:pl-[72px]`/`md:pl-[264px]`, PageLayout gutter 16 there), so content starts at x 88 beside the collapsed rail, as 07a's 900 frame draws it. From 1024 nothing moves.
- A bare `PageHeader` (anywhere inside `PageLayout`, not inside a `PageCard`) sits 16px below the page's top from the rail breakpoint up: header top at 28 (24 in the tablet band). `PageLayout` provides its `railBreakpoint` through context, so a wrapping element cannot drop the offset. `PageCard` routes still align with the rail. With `railBreakpoint="md"` the tablet band always insets the rail 8px, whatever `sidebarInset` is.
- The wide Dialog's close sits 24px from the top. While a Dialog, AlertDialog or Sheet scrim is open the root's reserved scrollbar gutter takes the new `--overlay-on-page`, so no undimmed strip runs down the right edge.
- The toast × is 16px (hit area still 44).
