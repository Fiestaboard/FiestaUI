# LayerRow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add C41 LayerRow and LayersPanel for inspecting, selecting, hiding and reordering canvas layers.

**Architecture:** LayerRow composes ListRow, Button and Toggle as sibling controls; LayersPanel delegates pointer/keyboard reordering and announcements to SortableList. State and canvas order remain controlled by the consumer. Locked is protected-text status, not a request to unlock the canvas.

**Tech Stack:** React 19, TypeScript, Base UI, Tailwind v4 tokens, Vitest, Storybook.

**Spec:** `/Volumes/ExtHD/fiestaboard-universal-design/program/briefs/FIESTAUI-SLICE-BRIEF.md`; `briefs/IDE-1.11-RULINGS.md`; working Figma file `ZQ8RMELCO6qEOFZUnQu36e`, C41 set `111:29503` and API card `246:47123`.

## Global Constraints

- No platform prop, glass, or native chrome in Core.
- Reuse existing ListRow, SortableList, Button and Toggle; no additional dependencies.
- The changed-file coverage gate is ≥90% lines and ≥85% branches.
- Worktree only; one minor changeset; PR into alpha; no merge/publish/VRT approval.
- Use 24px compact control targets and 44px touch targets; preserve the 14/16px visible glyphs.
- Browser execution is unavailable on this host; browser play, axe, screenshots and VRT remain pending CI.

## Review Focus

- Selection must not be triggered by visibility, formula, or reorder controls.
- A controlled visibility toggle must emit the next visible value without mutating the supplied state.
- Names and metadata must remain available to assistive technology when visually truncated.
- Disabled panels must suppress every interaction, including reorder.
- Reordering must preserve stable IDs and full item data; Escape restores initial order.

### Task 1: C41 family and integration

**Files:** Create `src/components/containment/layer-row.tsx`, `layer-row.test.tsx`, `layer-row.stories.tsx`; add exports and inventory entries/demo; add `.changeset/universal-layer-row.md`.

**Interfaces:** `LayerRowProps` carries name, meta, type icon, bound/boundValue, locked, selected, visible, disabled, size, dragHandle and select/visibility/formula callbacks. `LayerItem` adds a stable string id to layer content. `LayersPanelProps` carries layers, onReorder(nextLayers), selectedId, onSelect(id), onVisibleChange(id, visible), onOpenFormula(id), disabled, size and accessible name. Reorder returns a copied array in front-to-back display order.

- [x] Write behavior tests for independent controls, controlled visibility, lock status, long content, disabled state, readonly content, touch mode, selection, reordered data and keyboard cancel.
- [x] Run focused Vitest test and observe missing-component failure before implementation.
- [x] Implement the family using sibling controls; keep lock status descriptive. Render move buttons below each focused row so the 300px row never has to fit them inline.
- [x] Run focused tests and confirm all pass.
- [x] Add default/selected/bound/locked/hidden/disabled/touch/long-content/panel stories, light/dark/mobile coverage and meaningful browser play tests. Add inventory and export entries plus minor changeset.
- [x] Run full coverage with one worker and 30s test timeout; run changed-file gate, typecheck, lint, format, build, release tests and Storybook build. Record any failed attempts and exact counts.
- [x] Commit with repository trailer, fetch/merge origin/alpha before push, open PR and write family report. Root arranges independent review and CI evidence. Browser evidence remains explicitly pending.

## Decisions

- Jev `sibling_controls` p=0.56 (confidence 0.47), no contradicted requirements: keeps the inline formula action and avoids nested buttons/listbox complexity.
- Glyph-only Figma controls require larger interactive hit areas. Compact controls use 24px, touch controls 44px; undrawn themes and interaction states use existing tokens. No rendered parity claim until CI evidence arrives.

### Task 2: Review R1 reorder lifecycle correction

**Files:** Extend `src/components/containment/sortable-list.tsx`; add `layer-row-lifecycle.test.tsx`; extend family stories and changeset.

**Interfaces:** No public API change. Existing SortableList cancels active pointer gestures when ordered keys change or disabled becomes true. Keyboard lifts survive exact acknowledged controlled moves, but stop on external structural changes or disabling. Metadata-only updates preserve gestures. No component is remounted to reset state.

- [x] Reproduce source-index corruption and disabled pointer-up commits through LayersPanel using real pointer sequences; add insertion/removal/external-order, metadata, cancellation, focus, keyboard and re-enable cases.
- [x] Observe RED: 16 failures / 6 passes across 22 lifecycle cases.
- [x] Guard current source identity, source/destination bounds and disabled state; invalidate stale gestures before paint while preserving existing DOM/focus.
- [x] Verify all 84 focused tests, then the full suite after the shared source correction: 3417 passed /33 skipped.
- [x] Check coverage: SortableList100% lines/94.36% branches; the four original source files100%/100%.
- [x] Complete static/package/Storybook checks, normal-push updated PR, and hand to root for review round2. Browser parity remains pending.

**Ruling:** A shared correction was necessary: SortableList owns private drag/lift state and has no cancellation API. An adapter-only guard leaves stale state; synthetic cancellation is brittle; remounting breaks DOM/focus continuity. Jev `shared_lifecycle` p=0.91 (confidence0.89), all requirements supported; root reserved the shared source for this branch.

### Task 3: Review R2 acknowledgment lifetime correction

**Files:** Extend `sortable-list.tsx`; add `sortable-list-acknowledgment.test.tsx`.

**Interfaces:** No public API change. Pending keyboard acknowledgment belongs to the exact active lift object. Ending, canceling, blurring or starting another gesture invalidates it. Pointer and standalone move-button requests cannot preserve a subsequent keyboard lift. Same-gesture delayed acknowledgments and metadata renders remain supported.

- [x] Reproduce all terminal routes (Space, Enter, Escape, blur), with delayed acknowledgment before/after a new lift; cover earlier move-button/pointer requests and continuing-lift metadata/acknowledgment behavior.
- [x] Observe RED6failed/6passed across12cases; implement exact-lift scoping and explicit boundary clearing.
- [x] Run family/shared focused suite:96/96passed across5files.
- [x] Run full shared-source coverage/static/build checks:3429passed/33skipped; all five changed files clear the gate; typecheck/lint/format/build/release499/Storybook pass. Normal-push updated PR body/report and hand to root for final review round3. Browser parity remains pending.

**Ruling:** This is one directly reproduced acknowledgment-lifetime cause, settled by source inspection and tests; no new architecture fork or repeat Jev call is needed.
