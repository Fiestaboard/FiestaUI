# DataSourceSwitch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Supply the shared Live / Sample / Missing preview selector as a radiogroup with Figma's tab appearance.

**Architecture:** Reuse `SelectionGroupRoot` and `SelectableItemRoot`; keep the C33 visual recipe in one new Core component. The host owns preview side effects and chooses the options. Jev selected this over extending legacy SegmentedControl (probability 0.98).

**Tech Stack:** React, TypeScript, Base UI, Tailwind v4, Vitest, Storybook.

**Spec:** Program `briefs/IDE-1.11-RULINGS.md` and `shots/fiestaui-1.11/FIGMA-REFS.md`, C33 `109:3048`.

## Global Constraints

- No platform prop, Figma writes, merge, publish, PR comments, VRT approvals, or edits to main worktrees.
- One minor changeset; alpha base; normal merge of origin/alpha before push.
- Radiogroup semantics; default options Live, Sample, Missing; host may pass Live and Sample only.
- Use semantic tokens: muted container, background selected item, foreground and muted ink, shadow-sm, focus-ring.
- Default geometry: padding 3, gap 2, container radius 8, item radius 6, item px12/py6, text14/20. Touch/coarse target floor44; no platform skins.

## Review Focus

- Keyboard arrows and Home/End skip disabled options and never clear selection.
- Controlled changes report a value without overriding the host's current value.
- The two-option desktop form never renders a hidden Missing control.
- Form submission includes only the selected enabled option.
- Localized long labels and 200% text remain readable at narrow widths; focus remains visible.

## Task 1: DataSourceSwitch family

**Files:** New `src/components/forms/data-source-switch{,.test,.stories}.tsx`; additive exports and inventory entries; `vrt/figma-refs.json`; `.changeset/data-source-switch-111.md`.

**Interfaces:** `DataSource = "live" | "sample" | "missing"`; `DataSourceOption {value: DataSource; label?: string; disabled?: boolean}`; `DataSourceSwitch` has typed `value/defaultValue/onValueChange`, `options`, `size="default"|"touch"`, required accessible group name and shared form/disabled props.

- [ ] Write tests for default naming/selection, keyboard, disabled, controlled, two-option, form, localized label and ref contracts; run to observe missing implementation failure.
- [ ] Implement the component on shared radio machinery; verify tests and typecheck.
- [ ] Add each selected state, desktop two-choice, touch/mobile, disabled, localized and theme stories; inventory and minor changeset; add parity manifest references.
- [ ] Run full local static/unit/coverage/build/release checks; Storybook axe both themes plus browser geometry, keyboard, 200% text and parity captures.
- [ ] Merge current origin/alpha, commit and push; create family PR, obtain independent exact-head Astra review, fix findings, wait for CI and record VRT counts.
