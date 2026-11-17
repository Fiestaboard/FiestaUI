# ProblemItem and SentLog Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Root assigns the independent final review.

**Goal:** Implement C44 problem content and the last twenty send outcomes for the inspector, desktop console, and save warning.

**Architecture:** ProblemItem composes ListRow, Alert, StatusDot, and Button with explicit row/card presentation and stacked/inline row layout. Diagnostic content is a ReactNode slot for the independently owned TraceStep. SentLog renders caller-ordered, preformatted records without parsing dates or hub results.

**Tech Stack:** React 19, TypeScript, Tailwind v4 tokens, Base UI-backed FiestaUI primitives, Vitest, Storybook.

**Spec:** `/Volumes/ExtHD/fiestaboard-universal-design/program/briefs/FIESTAUI-SLICE-BRIEF.md`, `briefs/IDE-1.11-RULINGS.md`; Figma `ZQ8RMELCO6qEOFZUnQu36e` nodes C44 `247:41123`, `174:76473`, `177:25919`, `184:159319`, `125:101873`.

## Global Constraints

- Core has no platform prop, glass, native chrome, parsing, routing, or hub side effects.
- Reuse drawn library primitives. Dark and interaction states derive from semantic tokens.
- Changed source must reach at least 90% lines and 85% branches.
- Tests use native Node 26 with one worker and a 30-second timeout. Browser sandbox failure is a limitation, never a parity or axe pass.
- One minor changeset and PR into alpha. Normal merge before push; no rebase, force push, merge, publish, comments, or VRT approval.
- Check the exact program/codex/WRAPUP guard before steps and PR creation.

## Review Focus

- Multiple fixes and jump remain independent native buttons, keyboard-operable and non-submitting.
- Long localized labels, narrow containers, and diagnostic content wrap without clipping.
- Error/warning and shown/held/paused are named beyond their color; static content does not announce assertively.
- Empty logs and more than twenty items keep deterministic caller order without mutation or timestamp parsing.
- Card, stacked row, inline console, touch, and both themes reuse shared primitives.

## Decisions

- Live Figma code and screenshots fetched read-only, session `7af155a4-335f-4d2d-86e3-20e494f22686`. Original PNGs saved under `program/shots/problem-item/`.
- Jev `jev_decide` selected `explicit_presentations`, p=1.0, versus one responsive row or an Alert in every context. This preserves the three drawn contexts without app one-offs.
- The save card's fixes are siblings below its tinted Alert. Row fixes sit below the diagnostic content. Jump remains a separate trailing action.
- TraceStep is an independent branch dependency when needed by the drawn mobile story; do not recreate it.

## Task 1: ProblemItem and SentLog

**Files:** Create `src/components/feedback/problem-item.tsx`, `sent-log.tsx` and their tests.

**Interfaces:** ProblemItem consumes severity (`error|warning`), message, optional detail/diagnostic, fixes `{id,label,onClick,variant?,disabled?}`, optional onJump, labels, disabled, size (`default|touch`), presentation (`row|card`), layout (`stacked|inline`). SentLog consumes readonly `{id,at,outcome,message?,dateTime?}` records and localizable labels, with list/summary presentation.

- [x] Write tests for roles, full content, each severity/outcome, events, keyboard, disabled behavior, form isolation, refs, localization, omission, and the twenty-record bound.
- [x] Run targeted tests and confirm the missing feature fails.
- [x] Implement the smallest shared primitive composition satisfying tests and the fetched design.
- [x] Run targeted tests with coverage and inspect each changed source file.

## Task 2: Stories and public package

**Files:** Create both story files, minor changeset, and add only this family's entries to `src/index.ts` and both component inventories.

- [x] Add stacked mobile/desktop inline/save card examples, diagnostics with TraceStep, errors/warnings, empty/twenty outcomes, long text, disabled, light/dark/touch stories.
- [x] Add browser play assertions for keyboard events, non-overflow, and touch targets.
- [x] Run typecheck, lint, format, full coverage suite, changed-file gate, build, serial release tests, and Storybook build.
- [ ] Record exact evidence, browser limitations, head and CI in the owned report.
- [ ] Normal merge origin/alpha, commit, push, create the PR, and hand the exact head to root for independent review.

## Execution log

- Design inspection and Jev decision complete. Dependencies installed with a per-slice external cache on native Node 26.13.1.
- Authorized dependency: normally merged TraceStep PR #419 at `441ed753`; no dependency source changes. Root recorded DD-W109.
- Initial targeted run: 16 passed, both new source files 100% lines/branches. First full run: 3,410 passed / 33 skipped, 145 files passed / one skipped. Type/lint/format, package build, Storybook build and 499 serial release checks passed.
- Browser runner attempted once; Chromium launch failed with macOS bootstrap permission 1100 before any test. No local axe, rendered parity or implementation screenshot claim.
- Review found a translated visible jump label could retain an English accessible name. Added a failing regression (one failed / ten passed), then derived the accessible name directly from the translated visible label. Final full verification follows this fix.
- The next full suite passed 3,411 / 33 skipped. A final semantic check reproduced two failures for relative timestamp markup: localized labels such as Yesterday must be spans unless the host supplies a machine-readable datetime. SentLog now selects time/span without parsing the timestamp.
- Final source checks: 17 targeted tests; full suite 3,411 passed / 33 skipped (145 passed files / one skipped); all six changed source files including the dependency and inventory have 100% lines and branches. Typecheck, lint, format, build, Storybook build and package export smoke pass. Package dry run contains 637 files. Serial release checks remain 499/499; no release machinery changed.
- Source is ready for independent review. Fifteen owned stories use the shared light/dark × desktop/mobile matrix. Native browser parity/axe remains unverified, with one recorded failed launch and no retries. Hosted CI, VRT counts and independent review remain pending at PR creation.
