# PreviewStatus and EditStateChip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship C29 preview display status, independent edit-state chips and an accessible Problems action for the creator IDE.

**Architecture:** Compose existing Badge and Button with token typography and responsive wrapping. Display state and edit state are separate typed props. Callers supply message, localized labels and Problems navigation; the family owns neither editor state nor Inspector routing.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest/Testing Library, Storybook/axe/Playwright.

**Spec:** `/Volumes/ExtHD/fiestaboard-universal-design/program/briefs/FIESTAUI-SLICE-BRIEF.md`, `briefs/IDE-1.11-RULINGS.md`, `shots/fiestaui-1.11/FIGMA-REFS.md` C29; Figma `ZQ8RMELCO6qEOFZUnQu36e` set `171:163202`, Testing context `186:167857`.

## Global Constraints

- Tier 1 Core only: no platform prop, glass or platform chrome.
- One PR into alpha; normal merge before push; no force, merge, publish or VRT approval.
- Node 26 host, no Docker; isolated worktree only; port 6212, one browser worker.
- Changed source files: ≥90% lines and ≥85% branches.
- All checks: typecheck, lint, format:check, test, build, release:test, Storybook axe light/dark/mobile.
- Check `program/codex/WRAPUP` before each step and PR; finish current step, commit/push and stop if present.
- Root owns DESIGN-DELTAS; send evidence/delta requests, never edit it here.

## Review Focus

- Display live with an unsaved/testing edit must not imply the edit is live: independent status props and cross-product tests.
- Zero, singular and plural problems retain useful localized accessible names: all three count paths and custom label formatter.
- Problems opens once on click, Enter or Space without submitting an enclosing form; disabled action cannot open.
- Long translated labels, messages and 200% text stay visible at 320–402 px, with ≥44 px touch actions: browser geometry checks and captures.
- Caller save-time copy and hidden optional states remain coherent after rerender: saved label, controlled transitions and no-action rendering tests.

---

### Task 1: Family behavior and integration

**Files:** Create `src/components/editor/{preview-status,edit-state-chip}.{tsx,test.tsx,stories.tsx}`; add exports in `src/index.ts`, entries in `src/stories/component-inventory.ts` and demos in `src/stories/component-inventory-demos.tsx`; create `.changeset/preview-status-111.md`; additive `vrt/figma-refs.json` refs and local Code Connect reference documentation.

**Interfaces:**

- `PreviewDisplayState = "live" | "scheduled" | "not-scheduled"`.
- `EditState = "unsaved" | "draft" | "testing" | "saved"`.
- `EditStateChip({state, label?, ...spanProps})`: passive Badge content; explicit labels allow translated/saved-time copy.
- `PreviewStatus({display, message, displayLabel?, editState?, editStateLabel?, size?:"default"|"touch", ...divProps, ...problemsAction})`.
- `problemsAction` is a union: absent, or `{problems:number, onOpenProblems:()=>void, problemsLabel?:(count:number)=>string, problemsDisabled?:boolean}`; counts are finite nonnegative integers (invalid counts normalize to zero).
- `problemsDirection?:"right"|"down"` chooses the drawn text chevron `›` / `↓`, hidden from AT.

- [x] Write tests for all states, independent state combinations, localized copy, optional action, count formatting/normalization, keyboard activation, disabled, no submit and controlled changes.
- [x] Run tests and observe missing feature failure; implement minimal Badge/Button composition; rerun.
- [x] Add stories for Figma reference states, independent edit states, saved/zero/disabled, keyboard navigation, touch, long translations and 200% text.
- [x] Add inventory, exports, changeset, Figma parity refs and Code Connect mapping reference.
- [ ] Run full gates and changed-file coverage; fix failures with evidence.

### Task 2: Browser parity and delivery

**Files:** evidence under `program/shots/fiestaui-1.11/ui111a-preview-status/`; status `program/status/ui111a-preview-status.md`.

**Interfaces:** use Task 1 story IDs and data slots; no extra production API.

- [ ] Build/serve Storybook on 6212 and use one Chromium worker to run story axe light/dark plus mobile geometry, keyboard, font loading and screenshots.
- [ ] Compare all reference states, inspect dark and narrow/large-text shots; record intentional wrapping/derived-state deltas with root.
- [ ] Commit with existing Claude Opus 5.5 trailer; request root's exact-head independent review; address findings.
- [ ] Fetch/merge alpha, rerun affected checks if changed, push normally and create one alpha PR with required footer.
- [ ] Inspect CI and VRT counts; write exact checks/head/evidence/limitations into status; leave unmerged.

## Execution log

- Initial tree clean at `208499e4`, no prior PR. Read-only Figma context supplied full source plus set screenshot and in-context screenshot; no static assets in C29.
- Ruling: display/edit separation follows IDE rulings; saved chip uses secondary Badge styling; active editing chips use primary at Figma 20 px; dark/interaction styles follow existing tokens. Root records DD-W.
- Ruling: preserve full text with wrapping instead of Figma single-line ellipsis; default desktop 32 px, coarse/touch 44 px. Problems remains outside the polite status region.
- Initial npm ci hit sandbox-protected default cache; retry uses the writable ui111a cache, without changing dependencies.

- TDD: 25 tests failed against null placeholders, then 25 passed after implementation. Default npm cache sandbox failure resolved by writable shared cache.
- Design decisions recorded by coordinator as DD-W95 and DD-W98. Local parserless Code Connect template remains unpublished; no Figma mutation.
- In-context Testing image confirms zero Problems has no arrow; regression observed red then green. Final focused26/26pass. Whole-suite attempts interrupted under host overload; coordinator serializes full verification. Package and initial Storybook builds pass; release guards498/499(initial preexisting timing-bound failure). No whole-suite or coverage claim yet.
- Storybook argument inference intersected the absent/present action union into `never`. The story uses explicit concrete args (sharing production state types) while production retains its paired union. Typecheck passes after this correction; full lint passes. The second delayed typecheck also eventually returned0, so host contention—not a proven compiler hang—is recorded.
