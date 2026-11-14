# Slice 1.5c: Display type and LED content (C11, C10)

**Date:** 2026-11-11 · **Branch:** `feat/universal-15c-display-type` from `origin/alpha` `aa8fa406` · **Target:** `alpha`

## Goal

1. **C11 `DisplayTypeChip`** (new). The 24 px muted, borderless pill from 02 FB / Display type
   `39:49629`: an icon and a mono label, informational only (filters use `Chip`).
2. **C10 content props** on the existing preview wrapper, `DisplayPreview`, which already dispatches
   every LED and panel model. `led-matrix-display.tsx` is not touched (MASTER-PLAN row 1.5c, R3).
   The props mirror 02 Display / LED & Panel `39:49571`'s `Content` axis:
   - `content="sample"`: the fixed renderer art (Content=Sample);
   - `lines`: Line 1–3 (Content=Message). On an LED, line 2 is board green and line 3 board orange,
     as in the frame; on split-flap the flaps carry no text colour, so the lines are plain.

Jev `jev_decide` (2026-11-11) chose `lines` plus `content="sample"` on `DisplayPreview` over
"lines only" and over a new `DisplayRenderer` component (0.84 / 0.08 / 0.00).

## Figma

| Node           | What                                                                                                                             |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 02 `39:49629`  | FB / Display type: 7 types, h 24, pl 8 / pr 10, gap 6, `muted` fill, radius pill, 14 px icon, Spline Sans Mono Medium 11/16 caps |
| 02 `39:49571`  | Display / LED & Panel: Type × Layout × Content (Sample / Message, Line 1–3)                                                      |
| 08 `59:145389` | C11 card: `<DisplayTypeChip type="flagship" \| "note" \| "note-array" \| "pixoo" \| "tc001" \| "tc002" \| "panel" />`            |
| 08 `59:145321` | C10 card: lines `[l1, l2, l3]` on LedMatrixDisplay + TvFrame                                                                     |

Labels (CANON cols×rows): FLAGSHIP · 22×6, NOTE · 15×3, NOTE ARRAY, PIXOO · 64×64, TC001 · 32×8,
TC002 · TBD, FIESTAPANEL TV. Icons: `BoardIcon` (split-flap), Lucide `GripVertical` (LED), Lucide `Tv` (panel).

## Out of scope (other slices)

- The Now showing card layout: `NowShowingCard`, 1.7b (#393).
- FiestaPanel's Fit / Actual overview header: 1.5d `BoardPreviewModeToggle`.
- FiestaPanel Message in the scroll viewport: `BoardViewport`, 1.5a (#387).
- Swapping #392's compact-story `Chip` stand-ins: a follow-up after #392 and this PR both merge.
  The chip API is ready for it: `<DisplayTypeChip type="pixoo" />`.

## Tasks (test-first)

1. `src/lib/display-content.ts` + test: `displayLinesMarkup(lines, technology)` and
   `displaySampleMessage(model, grid)`; RED first.
2. `DisplayPreview` tests for `lines`, `content="sample"` and precedence (`content="sample"` >
   `cells` > `message` > `lines`); then the props. Default path unchanged, so existing shots stay.
3. `display-type-chip.test.tsx` (labels, icons, `detail`/`label` overrides, `detail={null}`,
   `displayTypeForModel`, separator hidden from AT); then the component.
4. Stories: `App/Board/DisplayTypeChip` (AllTypes, Overrides, InList, mobile) and new
   `DisplayPreview` stories appended (Message lines, Sample) in both themes.
5. `src/index.ts` export lines; inventory entry + demo.
6. Changeset (minor), local checks: format, lint, typecheck, `test:coverage` + changed-file gate,
   `release:test`, test-storybook light and dark.
7. PR into `alpha`; CI; report VRT counts (expect 4 changed inventory shots, new shots added,
   0 existing LED/panel shots changed).
