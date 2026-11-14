# Slice 1.8e: ListRow `selected`

**Why:** web slice 2.1 (FiestaBoard #2480) needs the open row of the Settings list-detail (07e `318:46000`, `320:6520`). Its review (M1) rejected an app-applied `bg-accent`: a square fill on the row paints over the inset group's rounded corners. The kit had no selected state (2.1 gap 3).

**Design (07e Rows `318:47391`):** the selected row is an accent (`#ece6df`, `--accent`) pill, radius 8 (`--radius-md`), inset 4 px inside the group; its title is Text/sm/semibold (others medium).

**API (additive):** `selected?: boolean`, `current?: "page" | "step" | "location" | "date" | "time" | "true"` (default `page`, as NavListLink). Sets `data-selected` and `aria-current` (an explicit `aria-current` prop wins).

**Recipe:** the fill is a `::before` inset 4 px (`before:inset-1 before:rounded-md before:bg-accent`) behind the content (`isolate` + `before:-z-10`). A selected row drops the edge-to-edge hover fill. Unselected rows are byte-identical in markup and classes except that the hover classes moved into their own constant (same class string order is not guaranteed; VRT confirms no visual change).

**Not in scope:** the 07e groups have no hairlines and 4 px group padding; ListRowGroup keeps its dividers (review N4). Raise separately.

**Tests:** selected/unselected attributes, `current`, explicit `aria-current` wins, the inset recipe classes, no square hover when selected, semibold title, a selected link row in a group. Story `Selected` (first, middle and last row open).
