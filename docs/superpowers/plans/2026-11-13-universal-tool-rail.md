# ToolRail Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship the C42 canvas tool rail with persistent tool selection, accessible keyboard navigation, and the Figma geometry.

**Architecture:** Compose existing ToggleGroup/Toggle and Button primitives. The host owns `selected` and receives `onSelectedChange`; Undo/Redo are separate actions. Native Lucide components are exact matches for Figma's named Lucide assets.

**Tech Stack:** React 19, Base UI, TypeScript, Tailwind v4 semantic tokens, Vitest, Storybook/Playwright/axe.

**Spec:** program/briefs/FIESTAUI-SLICE-BRIEF.md and IDE-1.11-RULINGS.md in the universal-design workspace. Figma working file `ZQ8RMELCO6qEOFZUnQu36e`, set `111:29624`, Brush `111:29504`, Pan `111:29550`, Rectangle `111:29587`, tier card `246:47205`.

## Global Constraints

- Tier 1 Core; no platform props or platform chrome.
- 44 px targets, 18 px icons, 4 px gaps/padding, card/border tokens, 8 px control radius. Vertical complete rail is 54 × 443 px.
- Existing tokens derive undrawn dark, focus, hover, press and disabled states; horizontal is the same geometry transposed.
- Default tool order follows the live component: Pan, Brush, Eraser, Fill, Rectangle, Circle, Text. Eyedropper is supported because C42's API names it.
- User opted out of questions. Normal push/PR authorized; no merge, publish, comments, force push, Figma writes or VRT approvals.
- Per-worktree native dependencies; one browser worker. Check WRAPUP before each step.
- Changed source gate: ≥90% lines and ≥85% branches. Minor changeset.

## Review Focus

- Re-activating the selected tool must never clear selection.
- Arrow navigation must not change the tool while users move toward history actions.
- Disabled and dynamically removed tools must remain usable through the primitive's roving focus behavior.
- A horizontal rail on a narrow screen must retain 44 px targets and scroll to keyboard focus.
- Localized icon labels and optional history actions must be named and work independently of selection.

## Task 1: ToolRail and public examples

**Files:** Create `src/components/editor/tool-rail{,.test,.stories}.tsx`; add only own lines to `src/index.ts`, `src/stories/component-inventory.ts`, `src/stories/component-inventory-demos.tsx`, and `vrt/figma-refs.json`; add `.changeset/tool-rail.md`.

**Interfaces:** `ToolRailTool` is pan/brush/eraser/fill/eyedropper/rectangle/circle/text. `ToolRailProps` has `tools?`, `selected`, `onSelectedChange`, `orientation?`, `disabled?`, `disabledTools?`, `onUndo?`, `onRedo?`, `canUndo?`, `canRedo?`, `labels?` and ordinary div props. Defaults show Figma's seven tools. Callbacks render history actions; unavailable history actions are disabled. Arrow keys move focus within tools, Space/Enter select, Tab reaches history.

- [x] Write behavioral tests for controlled selection, persistent selection, pointer/keyboard activation, orientation, disabled tools/actions, ordering, localization and dynamic updates.
- [x] Run focused tests and observe missing component failure.
- [x] Implement the minimal component with existing primitives and tokens; run focused tests green.
- [x] Add Brush/Pan/Rectangle, horizontal, mobile, disabled, localized and interactive stories; add inventory/export/minor changeset/parity mapping.
- [ ] Run typecheck, lint, format, unit suite, coverage gate, build, release guards and story axe in both themes.
- [ ] Capture and inspect Figma/implementation image pairs at desktop/mobile in light/dark, including active keyboard focus; save program report.
- [ ] Commit, merge origin/alpha, push, open PR into alpha. Parent owns independent review and CI monitoring.

## Decisions and execution ledger

- Jev `jev_decide`: `toggle_group_and_actions` p=0.45 (toolbar composition 0.39), confidence 0.34. Follow existing tested primitives with nonempty controlled value. Cost: history actions have separate Tab stops, documented and tested.
- Code Connect: repo has no configured setup. Per coordinator direction, record node/source traceability and local parity refs; no Figma mapping writes.
- Dependency install initially failed because default npm cache is outside writable roots; retry with isolated writable cache under workspace.

- Build and Storybook build passed locally; focused tests 10/10 passed. Full coverage/static checks remain active. Browser launch is blocked by the macOS sandbox; coordinator owns CI captures/parity review.
- Jev failure classification: timing contention for LED budget (0.82), schedule timeouts (0.70), release cadence (0.90); cascading async for charset act failures (0.86). Advisory; preserve full logs and retry affected files serially.

### Review round 1: restore keyboard re-entry after tool changes

- Reviewer reproduced the installed ToggleGroup retaining its highlighted index after the last focused tool is removed or disabled. Added both exact regressions: focus Brush, change the tools/disabledTools, leave for a preceding button, Tab back to Pan, and activate Pan with Enter. Both failed before the fix; the previous removal test had not focused the removed tool.
- Jev `declarative_tabstop` p=0.88 (DOM repair0.05; keyed remount0.04). Track the last focused tool by identity locally and derive an enabled tab stop, falling back to the first enabled tool. Base UI still owns arrow navigation; controlled selection is unchanged, and no shared primitive is modified.
- Added a guard that disabling another tool preserves the focused element and leaves arrow/Space selection working. All13 focused tests pass; ToolRail coverage is100% lines and96.66% branches, meeting the changed-source gate.
- Coordinator serial retry of the initial eight failing files passed233/233; the release cascade retry passed3/3. No full-suite repeat for this scoped fix; final full verification and rendered parity remain coordinator-owned.

### Review round 2: navigate current order without a stale private index

- The first fix repaired Tab entry but retained Base UI's stale private navigation index when a surviving focused tool moved. Verified Rectangle `[pan, brush, rectangle]` → `[brush, rectangle]` and added removal, reorder, insertion, disabled-sibling, Home/End, Tab re-entry, RTL, modifier, other-axis and canceled-event cases in both orientations.
- Inspected installed public ToggleGroup/Toolbar APIs: neither exposes controlled highlighted index. The controlled Composite API is `@internal`. Jev chose the supported public keyboard-event override p=0.76, over the internal Composite API0.08 and keyed remount0.01.
- ToolRail now handles its navigation keys through `event.preventBaseUIHandler()`, deriving order and position from current enabled button elements. `useDirection` is public. Existing ToggleGroup/Toggle still supply selection, native activation, disabled behavior and styles. No shared primitive or internal API changes; focused DOM nodes are retained. This supersedes the earlier ledger statement that Base UI owns arrow navigation.
- Finalized regressions were rerun against the previous committed source and then the restored fix. Focused coverage reaches100% lines/96.36% branches; static checks and package build pass. Full-suite repeat and rendered parity remain coordinator-owned.
- Test correction: an initial extra probe attempted to send keys to a natively disabled focused button, which user-event correctly suppresses before any component handler. Replaced those extra probes with dynamic disabled-sibling skipping on an enabled focused button; the existing focus→disable→Tab regressions remain unchanged. The final test matrix was independently red-checked against the previous source after this correction.
