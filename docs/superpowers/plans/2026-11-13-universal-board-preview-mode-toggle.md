# Slice 1.5d: BoardPreviewModeToggle and the ScaledBoardDisplay corner fix

**Row:** MASTER-PLAN 1.5d (from the #391 review, S4, and the 391–393 Fable parity review, §4.2).
**Figma:** 07 `57:64661` (docked preview header: `ScaledBoardDisplay / Size toggle`, 114×22, two pills with a 4 px gap, each px 10 / py 4, 11 px, rounded-full; active = `border-primary` + `primary/10`), 07 `53:137378` (pane header). The library component is 36:32551.
**Base:** `origin/alpha` `4b624d2d` (after #385, #387, #391 and #392).

## Goal

There is one Fit / Actual size toggle. EditorPreview's `headerAction`, BoardViewport and ScaledBoardDisplay all render it. A ScaledBoardDisplay fit board no longer shows grey square corner notches.

## Conditions and how they are met

1. **One source.** `BoardPreviewModeToggle` is extracted from #387's `PreviewSizeToggle` (the pill styling in `board-viewport.tsx`). BoardViewport and ScaledBoardDisplay both render it, and both of the old private copies are deleted.
2. **Controlled.** The toggle takes `mode` and `onModeChange` (both required). BoardViewport now resets the scroll on any Fit → Actual change, including one that comes from a host. A header toggle and the viewport's F key therefore drive one host state.
3. **≥44 px target.** The toggle uses #385's touch-axis vocabulary (`lib/touch.ts`).
   - `size="default"` gets the `COARSE_HIT_AREA` (44 px under `coarse:`).
   - `size="touch"` gets the `TOUCH_HIT_AREA` (always 44 px) plus the C21 press.
   - The pill keeps the 22 px layout height from Figma, so the 22 px EditorPreview header does not grow.
   - BoardViewport passes `touch`, which keeps its always-44 rule (02 S-1).
   - Jev `jev_decide` chose the pill hit-area axis (p=0.72). It rejected 44 px boxes everywhere (0.01) and a box/pill layout variant (0.03).
4. **No double toggle.** ScaledBoardDisplay and BoardViewport both gain `showModeToggle` (default `true`). A host that puts the toggle in the header passes `false` and controls `mode`. F still works in BoardViewport.
5. **Corners.** The middle box of the fit container has the exact post-scale size. It clips at the board's measured border-radius × scale. The grey notches go in every browser, the board's geometry is unchanged, and the inset highlights stay.
   - The outer drop shadow of a fit-scaled board is no longer drawn. Before, it was only visible as the notches.
   - Jev `jev_decide` chose this radius clip on the middle box (p=0.86). It rejected `overflow-clip-margin` (no Safari, and the shadow spills past the dock), removing the clip, and padding the clip box (which shrinks the board).

## Steps (test-first)

1. `board-preview-mode-toggle.test.tsx`: the group name, `aria-pressed`, `onModeChange`, the labels, the hit-area classes per size, the pill classes and the `data-slot`s. Red, then write the component, then green.
2. ScaledBoardDisplay tests: `showModeToggle={false}` (with a controlled mode), the shared pill markup, and the radius clip (computed radius × scale; none for `bezel={false}`). Red, then green.
3. BoardViewport tests: `showModeToggle={false}` keeps F and hides the row when there is no title; a host-driven Fit → Actual change resets the scroll; the toggle is the shared component at `touch`. Red, then green.
4. Stories:
   - BoardPreviewModeToggle: Default, Touch, Coarse (the hit area shown), and InEditorPreview (header + BoardViewport, synced).
   - ScaledBoardDisplay: HiddenToggle.
   - EditorPreview: NoteArray now uses the header toggle; a new DockedSizeToggle story at 390.
5. Inventory entry, `src/index.ts` export and a minor changeset.
6. Local gates, the Storybook a11y runner, a PR, and the VRT report by family.
