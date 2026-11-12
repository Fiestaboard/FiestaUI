# Universal slice 1.8c: cards (C17, C25)

**Goal.** Ship the page-library card and the board-preview choice card from 08 C17 (`61:25808`), and the
compact PluginCard with install states from 08 C25 (`65:30673`). Everything is additive: no existing
export changes shape, and the existing PluginCard stories render byte-identical DOM.

**Figma (working file `ZQ8RMELCO6qEOFZUnQu36e`, read only).**

| Part               | Live node                                                                       | Notes                                                                                                                                                                                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page card          | 03 `36:8196` (`36:7418` iOS, `36:7808` Android); used in Change Page `36:30293` | Tile-sm board never scaled (owner rule 9); meta row px 4, gap 12; title 16/24 Medium, subtitle 14/20 muted; 16 px chevron; py 8, gap 8                                                                                                                                                                                            |
| Choice card        | 05 `Setup / Display type card` `37:42722` (12 variants)                         | 370 wide, radius-card, pl 10 / pr 14 / py 10, gap 12; 96×60 actual-size preview cropped with a 24 px right edge fade; title Heading/base 16 SemiBold; description 14 muted; meta Mono/label 12 uppercase; 24 px selection circle (2 px input ring → primary fill + check). Selected = 2 px primary ring + `tint/selected` + check |
| Compact PluginCard | 06 Marketplace `42:89748` → `Result · …` rows; Installed `42:89411`             | IconTile md board tone; name + PluginCategoryBadge wrap row (gap 4/8); author line; 44 px outline action; "Works with" display-type row inset 68 px                                                                                                                                                                               |

## Decisions

1. **Name: `PagePreviewCard`, not `PageCard`.** `PageCard` is already exported (the chrome route card).
   Jev `jev_decide` (p = 0.60 over `PageLibraryCard` 0.35) picked `PagePreviewCard`. Logged as a DD-W row.
2. **`ChoiceCard` lives in `forms/`** next to ToggleCard: it holds selection state and submits a value.
   - `ChoiceCardGroup` (single, default) is a real `radiogroup` built on the shared `SelectionGroupRoot`
     (roving tabindex, arrows wrap, Home/End, hidden radio inputs).
   - `ChoiceCardGroup multiple` is a `role="group"` of `role="checkbox"` buttons on Base UI
     `CheckboxGroup`/`Checkbox` (each its own tab stop, Space toggles, hidden checkbox inputs).
   - The indicator is a 24 px circle for radios and a rounded square for checkboxes, so the shape tells
     the two contracts apart; the selected state is never carried by colour alone (ring + fill + check).
   - `ChoiceCardPreview`: the 96×60 board-black window with `offsetX`/`offsetY` crop and the
     `--board-edge-fade` right fade. The board inside is drawn at actual size, never scaled.
3. **`PluginCard variant="compact"`** (the plan's prop name; Figma's draft said `layout`).
   - `installState`: `available` (Install) · `installing` (Button `loading`) · `installed` (check + text) ·
     `needs-setup` (Set up) · `update` (Update). Labels are localizable via `installLabels`.
   - `onInstallAction(state)` fires for the actionable states. `action` still overrides the whole slot.
   - `displayTypes` is a slot: **DisplayTypeChip is slice 1.5c and not on alpha**, so stories pass
     `Chip mono` stand-ins and a DD-W row records it.
   - The default `variant="card"` path is untouched, so no existing PluginCard VRT shot changes.
4. **No glass, no platform chrome** (OWNER RULE). iOS Inter type in 06 maps to the web Archivo scale.

## Tasks (TDD)

1. Red: `page-preview-card.test.tsx`, `choice-card.test.tsx`, `plugin-card.test.tsx` (new; the legacy
   file must reach the whole-file bar).
2. Green: implement the three files.
3. Stories (light/dark via the VRT matrix, mobile leg): PagePreviewCard Default/Selected/AsLink/LongTitle/
   Library; ChoiceCard DisplayTypes/Selected/Multiple/Disabled/Keyboard; PluginCard Compact*/InstallStates.
4. Inventory entries, `src/index.ts` exports, changeset (minor).
5. Checks: format, lint, typecheck, `test:coverage` + changed-file gate, build, `release:test`,
   Storybook axe in both themes; drive keyboard in Chromium.
