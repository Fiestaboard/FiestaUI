---
"@fiestaboard/ui": minor
---

`BoardViewport` gets a `layout` prop that places the board the way the screen designs do (slice 1.5e). It uses the same values and the same tile size per layout as `ScaledBoardDisplay`. Without `layout`, nothing changes.

- **`phone-hero`** (Tile sm), **`medium-hero`** (Tile md) and **`full-screen`** (Tile lg) are hero placements, from 07a's Home hero.
  - **Inset:** the tiles sit 12 px across and 16 px down from the bezel's outer edge, as drawn. A 22-column Flagship is 373 px wide, so it fits a 390 px phone with 8 px gutters and does not scroll.
  - **Bezel:** it hugs a board that fits, centred, with 07a's 10 px radius and small shadow.
  - **Settle to fit:** a hero board that is wider than its slot, but fits with every tile still at or above `minTile` (13 px), is shown fitted, with no scroll chrome. A Flagship at 768 px therefore no longer hides one column behind the edge fade. Below the floor, a board scrolls as before.
  - Hero viewports expose `data-layout` and `data-settled`.
- **`pane`** (Tile md) is the editor preview: the default inset and Actual size, with no settling.
- **Export:** `BOARD_VIEWPORT_HERO_INSET` (`{ x: 12, y: 16 }`).
