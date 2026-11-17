# ChoiceChip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement task-by-task.

**Goal:** Ship C30 ChoiceChip and ChoiceChipGroup as one independent alpha PR.
**Architecture:** Reuse SelectionGroupRoot/SelectableItemRoot for named radio groups and standalone controlled filter toggles. A button contains the 32px visual pill; touch size extends its real hit area to 44px. No shared primitive modifications.
**Tech Stack:** React 19, TypeScript, Base UI, Tailwind v4, Lucide Check, Vitest, Storybook/axe.
**Spec:** Program briefs/FIESTAUI-SLICE-BRIEF.md, briefs/IDE-1.11-RULINGS.md, shots/fiestaui-1.11/FIGMA-REFS.md C30; Figma working file ZQ8RMELCO6qEOFZUnQu36e nodes 142:21738 / 142:21730 / 142:21733.

## Global constraints

- Core semantic component only: no platform prop, glass or kit chrome.
- Scope: choice-chip source/tests/stories, additive inventory/exports, own minor changeset, mapping/parity refs.
- ≥90% lines and ≥85% branches for changed product files; full local gates and both-theme/mobile Storybook axe.
- No Docker, main checkout changes, PR comments, merges, publishing or VRT approval. Merge origin/alpha normally before push.
- Read program/codex/WRAPUP before each new step. Parent owns global status and DESIGN-DELTAS.

## Design rulings

- Jev `group_and_toggle` p=0.98: grouped value radios plus standalone selected/onSelectedChange toggles matches proposed API and existing ToggleCard contract. No speculative multiple group API.
- `size="default"` has a 32px hit height; `size="touch"` has 44px minimum height/width and keeps the same 32px visual. Group size is inherited; item override supported. Android 48px belongs to the companion kit.
- Reuse exact Lucide Check identified by Figma. Optional caller icon is decorative and remains beside the selected check.
- Selected pill uses a 1.5px inset outline (Figma) and tint-selected. Focus is on the outer actual hit target, so it composes with selection. Derive hover/focus/disabled/dark from kit tokens; report to parent for DD-W.

## Review focus

- No empty/nameless radio groups; missing grouped value fails clearly.
- Disabled items are skipped by arrows, Home/End and Tab; group disables every item.
- Controlled standalone toggles preserve state until caller updates and do not submit surrounding forms.
- Long labels wrap inside the parent without horizontal overflow; optional icon cannot change the accessible name.
- 32px pill / 44px touch geometry and selected check survive focus and forced colours; selection never vanishes on reselect.

## Task 1: behavior and component

Files: src/components/forms/choice-chip.tsx and choice-chip.test.tsx.
Interface: ChoiceChipGroup(SelectionGroupNameProps & SelectionGroupBaseProps & size), ChoiceChip(label, value?, selected?, onSelectedChange?, icon?, size?, ...buttonProps).

- [x] Write tests pinning group name, single selection, controlled state, arrows/Home/End wrapping and skipping, tab order, forms, group/item disabled, standalone keyboard/cancelled activation, ref/attributes, decorative icon, missing grouped value.
- [x] Run targeted tests and observe missing component RED.
- [x] Implement shared-primitive composition and token pill. Run targeted tests GREEN.

## Task 2: public package and visual evidence

Files: choice-chip.stories.tsx, src/index.ts, src/stories/component-inventory.ts, component-inventory-demos.tsx, own inventory test, .changeset/choice-chip-111a.md, docs/design/choice-chip-code-connect.md, vrt/figma-refs.json.

- [x] Add Default, Selected, Touch, Group, Disabled, WithIcon, LongLabels, SelectedFocused stories and browser assertions for keyboard/geometry/wrapping.
- [x] Add own export/inventory/demo, mapping and two pendingRef parity targets. Minor changeset.
- [ ] Run format:check, lint, typecheck, full tests with coverage and changed-file gate, build, release:test, build-storybook.
- [ ] Run one-worker Storybook axe light/dark, plus mobile/browser checks and save implementation shots with Figma references.
- [ ] Commit, merge origin/alpha, push, open alpha PR. Root supplies independent exact-head reviewer. Fix findings test-first; observe CI/VRT and update family status.

## Execution evidence

- Missing-component RED observed before implementation; 11 behavior tests GREEN after implementation.
- Typecheck, package build, Storybook build and all 499 release guards pass. Full coverage and final static checks ongoing.
- Native Chromium and Storybook runner launch denied by host macOS MachPortRendezvous permission before visiting stories; root owns alternate browser verification.
- Program DD-W95 covers derived states/wrapping; DD-W99 covers C30 sizing/semantics.

## Review R1 repairs

- M1: the unlayered shared `.focus-ring:focus-visible { outline: none }` defeated the layered forced-colors utility. The chip now uses a scoped important `2px solid Highlight` outline and outward 2px offset in forced colors. The pill's selection outline remains independent. No shared theme rule changed.
- M2: horizontal padding now includes Figma's stroke width: 14px token padding + 1px Off / 1.5px On, yielding content offsets15/15.5px and sample widths60/81px while retaining32px visual/44px target heights.
- `.storybook/choice-chip-regression.ts` runs for Default and Selected in each runner theme, checks widths/insets, then emulates forced colors and tabs into the chip to assert visible focus and preserved selection. This is a browser assertion; host execution remains unavailable and CI must supply the result.
- Local compiled-CSS regression reproduced both pre-fix defects and passed after the corrections; it imports the real Storybook stylesheet, including the shared unlayered reset. Evidence is retained in the program's family shots `r1-fix/` directory. Focused unit tests remain11/11.
