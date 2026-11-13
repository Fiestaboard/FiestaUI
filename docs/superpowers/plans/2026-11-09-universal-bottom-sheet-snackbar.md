# Universal slice 1.3: bottom-sheet detents and snackbar

**Program row:** MASTER-PLAN 1.3 (C3, WEB-05, C18), plus the 1.4f note that the Toaster reads `--bottom-nav-offset` with a `0px` fallback.
**Base:** `origin/alpha` `900fabf6` (8.17.0-alpha.0). **Branch:** `feat/universal-13-sheets-snackbar`.

## Figma references (file `ZQ8RMELCO6qEOFZUnQu36e`, read-only)

| Node                                                           | What it fixes                                                                                                                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 07 `53:100588` Web / Bottom sheet                              | 20px grabber strip, 36×5 pill (`border/input`), "drag to dismiss · 44 hit"; 48px header; popover fill, 16px top radius, `border/default` stroke, modal elevation |
| 07 `57:65460` Colors sheet, open                               | the sheet sits under a live, unscrimmed preview (WEB-05)                                                                                                         |
| 07a `297:7667` Dialog shell · Mobile sheet                     | the same grabber on the mobile dialog shell (`Show back` / `Show content` / `Show footer`)                                                                       |
| 07a `297:7793` Web / Toast                                     | actions on their own row, indented 28, 44px Buttons (secondary, then ghost)                                                                                      |
| 07c "Saved to Pages" toast, Formatting / More / Formula sheets | copy and placement: the toast sits above the bottom bar, 8px from the edges                                                                                      |
| 08 `59:143440` C3                                              | proposed API: `grabber`, snap points, `scrim`, `ToolbarDropdown presentation`                                                                                    |
| 08 `61:29089` C18                                              | proposed API: placement above the nav, `action={{ label: "Undo" }}`                                                                                              |

## Decision

`jev_decide` (p=0.95): extend the existing Dialog-based `SheetContent` with a hand-rolled drag on the grabber, rather than re-basing Sheet on Base UI's `Drawer` (root-level snap points; would change every existing sheet) or switching implementations by prop. It keeps every existing sheet byte-identical and keeps the logic testable under jsdom.

## API

- `SheetContent` (bottom only): `grabber?`, `detents?`, `detent?`, `defaultDetent?`, `onDetentChange?`, `scrim?` (default true), `labels?: { close, grabber }`.
- `ToolbarDropdown`: `presentation?: "popover" | "sheet" | "auto"` (default `"popover"`), `labels.close`.
- `Toaster`: `clearBottomNav?` (default true); action and cancel button styling.

## Tasks (test-first)

1. `sheet.test.tsx` (new): existing contract; grabber; drag dismiss / snap back / cancel; detents with keyboard, tap, controlled and uncontrolled state; scrim; initial focus skips the grabber. Red (27 failing), then green.
2. `toolbar-dropdown.test.tsx` (new): popover contract, including clamping; sheet presentation (Esc, close button, outside press, `closeOnOutsideClick={false}`, trigger re-press, render-prop close); `auto` breakpoint. Red (9), then green.
3. `toaster.test.tsx`: offsets with and without the nav; Undo action (44px, live region, no focus steal); second action as ghost. Red (3), then green.
4. Stories: Sheet `BottomGrabber`, `BottomDetents`, `BottomNoScrim`; ToolbarDropdown `SheetPresentation`, `AutoPresentation`; Toaster `SnackbarActions`, `AboveBottomNav`. All `layout: "fullscreen"` with a fixed page, so VRT captures the viewport.
5. Gates: lint, typecheck, format, `test:coverage` plus the changed-file gate, build, `release:test`, Storybook axe in both themes.

## Out of scope

- `theme.css`: untouched; the 1.1 tokens (`--sheet-grabber-*`, `--touch-target`, `--control-h-touch`) already cover it.
- Inventory and `src/index.ts`: untouched (Sheet, ToolbarDropdown and Toaster are already exported with `export *`).
- The More sheet for the bottom nav (07a `308:36070`): this slice supplies the sheet, and 2.1 assembles it.
- A velocity "flick": snapping is by position only.

## Review round 1 (Opus, `pr-fiestaui-388-review.md`)

- **S1:** with both `action` and `cancel`, the exported `toast` emitters render the pair themselves (primary first), so DOM, tab and reading order match the visual order. Sonner's dismissal rules are kept (`preventDefault` on the primary, `dismissible: false`).
- **S2:** tests now assert that `onOpenChange` / `onClose` was _not_ called after Base UI's async close could run: right-button drag, pointer cancel, `closeOnOutsideClick={false}` in sheet mode, and a 3px-jitter tap that still cycles. Mutants M4, M21 and M22 are killed.
- **S3:** under a grabber the sheet has three regions: a pinned head (`SheetHeader` children, at least 24px tall so it always covers the grabber's hit band), the scrolling body, and a pinned foot. The head lets presses through to the grabber except on its controls.
- **S4:** `aria-valuetext` on the separator, via `labels.detentValue` (default "Half height" / "Full height" / "N% height").
- **S5:** `auto` is `(width < 48rem), (pointer: coarse)`, matching MASTER-PLAN 2.5's touch toolbar.
- **S6:** the close chip keeps its 40px visual and gains a transparent 44px hit area (DESIGN-DELTAS DD-W4).
- **P1:** the sticky footer (07a `297:7667`); new story `overlays-sheet--bottom-sticky-footer`.
- **Nits:** a bold "Visible change" leads the changeset (N1); a rem breakpoint (N2); the Tab-out note in the `presentation` JSDoc (N4); the safe area on the desktop offset (N5); initial focus skips hidden, inert and `aria-disabled` controls (N7).
- **Deferred:** flick velocity, Sonner's type scale and insets (before 2.5), N3 (exit from the release point), N6 (Storybook Tab loop), P2/P3 (noted for 2.1).
