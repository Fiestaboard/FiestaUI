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
