# Slice 1.5e: BoardViewport `layout` (phone hero, 768, G4)

**Goal:** a host can render 07a's phone hero (`306:53082`): the Flagship fits at Tile sm at 390 px with 8 px gutters, inset as drawn. The 768 px "one column hidden behind the fade" state goes away. Without the new prop, BoardViewport renders exactly as before.

**Stacked on:** #401 (1.5d), because 1.5d locks `board-viewport.tsx`.

## Evidence (Figma, measured with `get_metadata` / `get_design_context`)

- **07a phone hero** `I306:53086;53:99261;306:53097`: StaticBoardDisplay 373 × 155 at x = 8. Tiles start 12 px from the bezel's outer edge horizontally and 16 px vertically. The 3 px stroke is drawn inside. Radius 10; shadow `0 2 4 rgba(0,0,0,.4)` plus `inset 0 1 1 rgba(255,255,255,.06)`.
- **02 viewport** `36:35275` / `52:122709`: tiles 12 px from the outer edge (a 1 px border + 11). The "Fits" state `36:32556` draws the bezel across the full 370 px slot, with the board centred.
- **07a desktop** `303:22566`: BoardDisplay 790 = card content width = board 742 + 2 × 24. Hug and fill coincide there, so it is ambiguous.
- **Kit today:** 3 px border + 12 px padding = 15 px from the outer edge. At Tile sm the Flagship needs 349 + 30 = 379 px against 374 → it scrolls.
- **768:** the board is 633 px (Tile md at the md: step) in a 639 px bezel. Even at the 12 px hero inset it overflows by 18 px. Fit would be ×0.972, which puts the tile at 23.3 px, far above the 13 px floor.

## Decision (Jev `jev_decide`, p = 0.91: `layout_presets_nearfit`)

`layout?: ScaledBoardLayout`, the same union and the same tile size per layout as ScaledBoardDisplay:

| layout        | tile size (unless `size`) | inset (outer edge → tiles)                  | bezel width                  | settles to fit |
| ------------- | ------------------------- | ------------------------------------------- | ---------------------------- | -------------- |
| none          | `size`                    | 15 px (3 + 12), unchanged                   | fills the slot               | no             |
| `phone-hero`  | sm                        | 12 / 16 (3 + 9 / 13), radius 10, 07a shadow | hugs the board while it fits | yes            |
| `medium-hero` | md                        | 12 / 16                                     | hugs while it fits           | yes            |
| `pane`        | md                        | 15 px (default)                             | fills                        | no             |
| `full-screen` | lg                        | 12 / 16                                     | hugs while it fits           | yes            |

- **Settles to fit:** when Actual size overflows but the fitted tile stays ≥ `minTile`, the board renders fitted with no scroll chrome (no toggle, indicator or fade; a named group, not a tab stop). Below the floor it scrolls as before, so the owner rule holds.
- **Hug only while the board fits:** an overflowing or settled bezel fills the slot. This avoids a circular width, because a fitted box is sized from the scroller.
- **G4 ruling:** the default stays a full-width bezel, as 02 `36:32556` draws it. Hero layouts hug, as 07a draws its hero (StaticBoardDisplay / BoardDisplay hug their content). 07a desktop is ambiguous, so this is recorded as a DD-W delta with a designer ask.

## Tasks (TDD)

1. Tests: no `layout` keeps padding 12, `rounded-xl`, full width and no `data-layout`; phone-hero fits a 349 px Flagship in a 368 px scroller (the 390 case) where the default scrolls; size per layout, with an explicit `size` winning; the hug/fill switch; medium-hero settles at 768 (633 in 633 → ×615/633, no chrome, not an overview); no settle under the floor (phone-hero 3×1 array) or in `pane`; layout sizes equal ScaledBoardDisplay's `data-size`.
2. Implement in `board-viewport.tsx`, taking the inset from the layout in `deriveView` / the fit maths.
3. Stories: `PhoneHero` (390 frame with 8 px gutters, light/dark/mobile), `MediumHero768`, `HeroHugs`.
4. Changeset (minor), DD-W row, status, shots; local checks; PR stacked on #401.
