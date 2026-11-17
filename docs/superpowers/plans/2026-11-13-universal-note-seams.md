# NoteSeams and NoteFocus implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Separate exact-head review follows through the coordinator.

**Goal:** Implement C40 shared Note-array seam geometry and the controlled Note focus selector from 04b, preserving one host-owned canvas.

**Architecture:** `note-array-geometry.ts` derives row-major 15×3 ranges and overlay positions from shared board dimensions and tile metrics. `NoteSeams` is a decorative overlay over an existing canvas. `NoteFocus` composes SegmentedControl and reports the chosen Note and its zero-based, end-exclusive range; no renderer, template parser or content copy is added.

**Tech stack:** React 19, TypeScript, shared FiestaUI controls/tokens, Vitest, Storybook.

**Spec:** Program briefs/FIESTAUI-SLICE-BRIEF.md, briefs/IDE-1.11-RULINGS.md and shots/fiestaui-1.11/FIGMA-REFS.md C40. Live Figma ZQ8RMELCO6qEOFZUnQu36e: 108:7944, 246:47050, 106:1733, desktop row seam I127:133562;53:99218;127:134953 and phone marker I127:113608;9:16;127:114273. Read-only session a9a66ef9-8b8f-4145-a69f-6b400e40e9ab.

## Constraints and rulings

- Own worktree only; alpha PR, no merge/publish/VRT approval/Figma writes. Check program/codex/WRAPUP before every phase and before PR work.
- Reuse NOTE_COLS, NOTE_ROWS, resolveDimensions and deriveTileMetrics. Default small renderer geometry: 13×18 tiles, 3px gutters, additional 6px physical seam. Both pitches and seam are configurable for editor rows/ruler. No new grid renderer.
- NoteFocus uses the drawn 3px muted track, 2px gap, 10px track radius, 8px pill radius and 32px default controls. Touch uses shared 44px controls; dark/hover/focus/disabled derive existing tokens. Narrow containers scroll without shrinking controls.
- Ruling: `note: number | null`, `onNoteChange(note, range)` plus `notesWide`/`notesTall` replace the page-08 illustrative onPrev/onNext and array string. Arrow/Home/End navigation comes from shared radio semantics, and the host can use the range for the one canvas. Invalid selection shows All notes without firing an unsolicited callback.
- Ruling: separate geometry + overlay, not renderer mutation or per-Note content copies. Jev geometry_overlay p=1.00, all three requirements supported. Shared board renderers remain unchanged. DD-W106 owns the design adaptations.
- Geometry bounds follow existing 1–8 Notes per axis. Invalid metrics fall back to small-board defaults. Seam overlay has no pointer or accessibility-tree behavior; the named NoteFocus group owns selection.
- Native Node26/npmci; native browser blocked by MachPortRendezvous1100 on this host, no retry loops. CI browser/VRT evidence required before claiming parity.

## Review focus

- Non-square arrays and last Note: correct row-major range with no adjacent tiles included.
- NaN/fractional/out-of-range geometry: finite bounds and no runaway allocation.
- Controlled selection after array shrink: exactly one valid radio selection, no state write during render/effect.
- Touch/long labels: every option remains reachable; focus ring stays inside scroll padding.
- Overlay positions: centers of physical seams and selected ranges align with real StaticBoardDisplay tile rectangles, not a duplicate fixture renderer.

## Task 1 — Geometry

- [x] Write literal expected-range, normalization, seam-center and non-square tests; observe RED.
- [x] Implement `src/lib/note-array-geometry.ts` using shared constants/metrics; observe GREEN.

## Task 2 — Components

- [x] Write NoteFocus controlled click/keyboard/disabled/localized/array-shrink tests and NoteSeams decorative/selection integration tests; observe RED.
- [x] Implement `src/components/editor/note-focus.tsx` and `note-seams.tsx`; observe GREEN.

## Task 3 — Examples and package surface

- [x] Add light/dark/mobile-compatible Storybook stories for all Notes, focused Notes, touch, disabled, long labels, and single-canvas integration. Add browser play assertions for keyboard, scrolling, touch targets, seam and selected-region geometry.
- [x] Add only own exports/inventory entries, inventory demos and minor changeset.

## Task 4 — Verification and PR

- [x] Targeted tests, complete coverage (`--maxWorkers=1 --testTimeout=30000`) and changed-file gate 90% lines / 85% branches.
- [ ] Typecheck/lint/format/build, serial release guards, Storybook build. Report initial failures and fixes without masking blocked browser checks.
- [ ] Coordinator review; fix findings. Fetch/merge origin/alpha before push. Commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- [ ] Open alpha PR with required Claude footer, report exact SHA/CI/VRT and program status. No merge or VRT approval.

## Execution ledger

- Node v26.13.1; npmci passed (1009 packages). Figma original PNGs saved under program/shots/fiestaui-1.11/note-seams.

- Geometry/components initially RED (missing modules), then GREEN21. Extreme finite numeric input regression failed with Infinity; safe-metric bound fixed it, GREEN21. Typecheck/format passed. Initial lint import-order failure fixed; full lint passed. Full coverage/package verification in progress.

- Self-review: existing release contrast guard documents primary/10 over muted at4.40:1. The selected pill now uses opaque `bg-tint-selected`, whose brand pairing is already guarded AA in both themes. Geometry/ink/track stay shared. Resize regression was RED (scrollLeft0 vs113), then GREEN22 after observing viewport and track widths; cleanup is tested.
- First full coverage run GREEN3400 passed/33skipped; changed gate all6files passes (NoteFocus100/95.83, other changed source100/100). Build/Storybook and serial release499 passed. Final rerun after the resize/fill improvement underway. Native browser remains blocked; no parity claim.

- Final verification: 145 test files passed/1 skipped; 3401 tests passed/33 skipped. All6 changed source files pass100%lines/100%branches. Final typecheck/lint/format/build/Storybook and package export smoke passed; serial release guards499/499 passed.14 C40 stories indexed. Browser/axe/VRT pendingCI, local Chromium blocked as above. `git fetch origin` confirms alpha remains208499e4.
