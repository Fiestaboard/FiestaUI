---
"@fiestaboard/ui": minor
---

Fix `ListRowGroup` list semantics (axe `aria-required-children`, BB-B-20). A `ListRow` with `render` (a link or button row) inside a group now wraps itself in an `<li>`, so `<ListRowGroup><ListRow render={<a />} /></ListRowGroup>` is valid in every group variant. Rows already inside a raw `<li>` or `ListItem` child of the group do not wrap again. Add `ListRowItem`, the `<li>` that holds a row when the item needs more than the row; `HubDiscoveryRow` and `SessionRow` use it.
