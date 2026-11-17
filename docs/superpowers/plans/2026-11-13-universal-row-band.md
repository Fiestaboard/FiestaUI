# RowBand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship C37 RowBand with controlled selection and shared click/context menus.

**Architecture:** Compose Button and DropdownMenu with the Figma gutter bracket, shared tokens, and Lucide GripVertical. The host supplies row bounds and action callbacks; an optional dragHandle composes existing SortableList or editor drag behavior. Core does not mutate templates.

**Tech Stack:** React 19, TypeScript, Tailwind 4, Base UI, Vitest, Storybook, Playwright.

**Spec:** `/Volumes/ExtHD/fiestaboard-universal-design/program/briefs/FIESTAUI-SLICE-BRIEF.md`, IDE-1.11-RULINGS.md; read-only Figma `ZQ8RMELCO6qEOFZUnQu36e`, `108:7323`, `246:45642`.

## Global Constraints

- One minor changeset; one PR into alpha; no platform prop, native chrome, or template mutation.
- Local typecheck, lint, format, full units, build, release guards; changed-file coverage ≥90% lines / ≥85% branches; Storybook axe both themes.
- Existing @2x refs and local implementation evidence. No Docker. One browser worker.
- Check program/codex/WRAPUP before every step. Root owns shared coordination files.

## Review Focus

- Selection must remain controlled and keyboard operable.
- Menu events must not toggle selection; disabled actions must not fire.
- Context keyboard open must return focus on Escape, and long press must share the same actions.
- Custom drag handles must compose without nesting interactive controls.
- Long/localized labels and narrow viewports must remain readable without horizontal overflow.

## Task 1: RowBand and consumer integration

**Files:** Create `src/components/editor/row-band{,.test,.stories}.tsx`; additive exports in `src/index.ts`, inventory and demos; own minor changeset; additive parity refs.

**Interfaces:** `RowBandProps` carries `label: string`, `rows: readonly [number, number]`, optional `meta`, controlled `selected/onSelectedChange`, data-driven `menu: readonly RowBandMenuItem[]`, `menuLabel`, `formatRows`, `dragHandle`, disabled, and normal root div props. `RowBandMenuItem` supplies id, label, onSelect and optional disabled. Host owns row validity and height via className/style.

- [x] Write behavioral tests for selection, menu callback isolation, context/keyboard opening, disabled state, locale copy, and drag-handle composition.
- [x] Run the targeted tests; expected missing RowBand import failure (feature absent).
- [x] Implement RowBand using Button/DropdownMenu; use Figma width 176, height 160, r6, bracket left4/w3/caps10/h3, content left16/top6/gap2, type12/16, selected accent and primary bracket. Selected grip16 at right6/bottom6 inside an accessible hit target.
- [x] Run targeted tests; expected pass. Add light/dark/mobile, long-copy, disabled, menu, and draggable composition stories. Add own inventory/demo, exports, changeset, and parity manifest entries.
- [ ] Run full required checks; expected pass; inspect light/dark/mobile screenshots and browser interactions, save evidence and update report.
- [ ] Commit with required attribution; merge origin/alpha before push; open own PR; report exact head and limitations to root for independent review.

## Rulings

Jev `compose_handle`, probability 1.0: reuse caller drag composition instead of adding a second drag engine. Selection and menus work within RowBand; movement/snippet persistence remain host actions. The default selected grip opens the actions menu; with a custom grip, a separate visible menu button is retained. Undrawn dark/focus/hover/disabled and visible menu affordances use core tokens; request DD-W from root.

## Execution evidence

Twelve tests failed against an empty component and then passed with the implementation. Typecheck, format, package and Storybook builds pass; import-order correction verified by targeted ESLint. Full coverage/release tests encountered existing timer/event failures under host load175–179; logs retained, verification remains open. Native Chromium cannot start under macOS sandbox (MachPort1100/SIGTRAP). Root will inspect hosted CI VRT and axe, then request an independent review. Figma remains read-only; the Code Connect template is local and unpublished.
