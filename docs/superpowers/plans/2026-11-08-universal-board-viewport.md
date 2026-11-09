# Universal slices 1.5a and 1.5b: BoardViewport and board props

**Goal:** unblock web slice 2.4: boards scroll horizontally, and Actual size is the default. This follows owner rule 9: boards never stretch, they scroll.
**Base:** `origin/alpha` 900fabf6 (8.17.0-alpha.0). **Branch:** `feat/universal-15-board-viewport`.
**Refs (Figma `ZQ8RMELCO6qEOFZUnQu36e`):**

- 02 `Board / Scroll viewport` `36:35275`, which includes:
  - the 3×1 states `36:32556` / `36:32684` / `36:33074` / `36:33465` / `36:33855`;
  - the 2×2 states `36:34244` / `36:34758`;
  - the Flagship states `52:122709` / `52:123105` / `52:123502`.
- 07 `57:27771`.
- 07c `310:68695`.

## Decisions

- **Geometry comes from the rendered board.** BoardViewport renders `BoardDisplay` itself, with `bezel={false}`, and measures the first row's `[data-note-tile]` elements. `board-display.tsx` is file-locked by the perf session, so nothing in it changes. Snap targets are picked from outside with descendant variants. Jev `jev_decide` chose this over a generic children container, and over a three-mode hard floor (p=0.76).
- **The viewport draws its own bezel**, so the frame stays still and clips while the tiles scroll. This matches "Viewport · bezel (clips)", and the fade colour is the bezel colour.
- **`minTile` is the overview threshold.** A Fit view whose tile falls under it is labelled an overview, per the canon rule "no tile under 13 px except a labelled Fit overview". The default is 13, and K14 is a one-line change.
- **One preference for both components.** BoardViewport and `ScaledBoardDisplay` share the R1 precedence through `useBoardPreviewMode`. They also share the existing `fiestaboard:boardPreviewMode` session key.
- **`layout` lives on the ScaledBoardDisplay wrapper.**
  - It sets `data-layout` and `data-size`.
  - It sets the tile size: sm / md / md / lg. An explicit `size` wins.
  - For `full-screen` it adds letterbox centring.
  - With no `layout`, the wrapper is byte-identical.
- **`BoardSizeIndicator format`** defaults to `rows×cols`. `cols×rows` reads "22 × 6", and custom labels receive the format.
- **The 44 px hit target** on the Fit / Actual buttons follows 02 S-1. The 22 px pill is visual only.

## Tasks (TDD)

1. Write the failing tests:
   - `board-preview-mode.test.tsx`;
   - `board-viewport-geometry.test.ts`;
   - `board-viewport.test.tsx`, with geometry stubbed on the prototypes;
   - `scaled-board-display.test.tsx`, a new whole-file test for this legacy file;
   - the `board-size-indicator` format cases.
2. Implement `board-preview-mode.ts`, `board-viewport-geometry.ts` and `board-viewport.tsx`, plus the ScaledBoardDisplay and BoardSizeIndicator props.
3. Add stories:
   - BoardViewport: start, middle, end, Fit overview, 2×2, Flagship narrow, Fits, Web pane, White.
   - ScaledBoardDisplay: `DefaultModeActual` and `Layouts`.
   - BoardSizeIndicator: `ColsByRows`.
4. Update the inventory entry and demo. Add `component-inventory.test.tsx`, which is byte-identical to the one in #384, so the add/add merge is clean.
5. Exports: two lines in `src/index.ts`.
6. Gate: format, lint, typecheck, `test:coverage`, `coverage-changed`, build, `release:test`, and the Storybook axe run in both themes.

## Expected VRT

- **Added:**
  - the BoardViewport stories (9);
  - ScaledBoardDisplay `default-mode-actual` and `layouts`;
  - BoardSizeIndicator `cols-by-rows`.
  - That is 12 stories × 4 shots.
- **Changed:** `foundations-inventory--all-components` ×4. The new BoardViewport row pushes the page down.
- **Nothing else should move.** ScaledBoardDisplay's default DOM gains no attributes. The actual-size scroller gains `role`, `tabindex` and a focus ring that shows only on focus.
