# BoardMinimap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add C35's controlled, accessible board overview with a viewport frame, click-to-jump, drag-to-pan and keyboard panning.

**Architecture:** Compose the existing StaticBoardDisplay at Tile sm with no bezel, fitted inside a labeled overview. Viewport geometry uses the same measured grid so the outline stays aligned. Hosts control the visible window and follow the caret by updating that prop. Jev chose this shared renderer over an arbitrary thumbnail slot or a duplicate renderer (p=0.98).

**Tech Stack:** React, TypeScript, existing FiestaUI tokens, Vitest/Testing Library, Storybook/axe.

**Spec:** program/briefs/FIESTAUI-SLICE-BRIEF.md, IDE-1.11-RULINGS.md and shots/fiestaui-1.11/FIGMA-REFS.md in the universal-design hub. Live Figma C35 `109:30654`, default `109:8976`, card `246:27148`.

## Global Constraints

- Core only; no platform prop, glass, haptics or new renderer/dependency.
- A labeled overview may scale below Tile sm; editor boards retain their floor.
- Light/dark/mobile stories; ≥90% lines and ≥85% branches for changed files.
- Minor changeset; PR targets alpha; never merge/publish, approve VRT or comment on PRs.
- Live frame: card padding10, gap8, radius10, popover fill/border; thumb240 wide; header and hint12/16; viewport2px primary. Existing dark/focus/disabled recipes cover undrawn states.

## Review Focus

- Far-edge click/drag keeps the complete viewport inside board bounds.
- Dragging preserves grab offset; pointer cancellation and Escape restore initial origin.
- Controlled updates following a caret refresh caption and frame without internal state drift.
- Invalid or resized viewport dimensions normalize consistently for pixels, caption and callbacks.
- Keyboard navigation remains usable without a pointer and disabled controls never emit jumps.

### Task 1: Shared renderer and navigation

**Files:** new `src/components/board/board-minimap.tsx` and `board-minimap.test.tsx`.
**Interface:** `BoardMinimap` takes `board: StaticBoardDisplayProps` (rendering geometry/content), `viewport: {column,row,columns,rows}` (1-based), `onJump({column,row})`, optional `disabled`, localized `labels`, and root props. The viewport is controlled. Board dimensions come from existing `resolveDimensions`.

- [ ] Write failing behavior tests for caption/current viewport, controlled rerender, arrow/Shift/Home/End navigation, pointer jump bounds, grabbed-frame movement, cancellation, disabled and normalized input.
- [ ] Run targeted test and observe missing export failure.
- [ ] Implement with measured StaticBoardDisplay grid, shared geometry, native focusable navigation surface, pointer capture and keyboard support.
- [ ] Run targeted tests and coverage; fix meaningful uncovered branches.

### Task 2: Stories, public API, parity and release checks

**Files:** new `board-minimap.stories.tsx`, local Figma content fixtures for stories, own additions to `src/index.ts`, `src/stories/component-inventory.ts`, `component-inventory-demos.tsx`, `.changeset/board-minimap-111c.md`.

- [ ] Add all five drawn viewports, dark/mobile, keyboard/drag, disabled and narrow/long-label stories; keep dynamic board content as data.
- [ ] Verify exact 240px overview geometry and all five outline locations in a real browser; compare figma-/impl- pairs in program/shots/fiestaui-1.11/minimap.
- [ ] Run typecheck, lint, format:check, full test:coverage and changed-file gate, build, release:test and light/dark Storybook axe on own stories.
- [ ] Commit with repo trailer, merge origin/alpha and push normally; open own PR body ending with required attribution.
- [ ] Independent astra code/parity review at exact head, fix findings, observe CI; report VRT without approval.
