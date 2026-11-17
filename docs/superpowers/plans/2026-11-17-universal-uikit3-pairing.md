# Universal account and pairing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Promote the missing shared account and device activation grammar and safely extend the existing phone pairing component.

**Architecture:** Reuse ConnectPhoneCard for Figma's PairingQR, extend ListRow for SessionRow, and compose Card for DeviceCodeCard. DeviceCodeInput uses one native text input with decorative cells, preserving native editing and one accessible field. Authentication, timers, revocation, grouping and application routing remain host responsibilities.

**Tech Stack:** React 19, TypeScript, existing Base UI/Tailwind v4 primitives, Vitest/Testing Library, Storybook.

**Spec:** `/Volumes/ExtHD/fiestaboard-universal-design/program/shots/web-2.12/FIGMA-REFS.md` (07e SessionRow 321:9076/322:31855, PairingQR 323:15025/324:20567, DeviceCodeCard 327:38256/327:42191); DESIGN-DELTAS DD-W79/DD-W81.

## Global Constraints

- Figma is the goalpost. The UI must look and feel like the design, with NO one-offs.
- No platform chrome or glass; only existing tokens and primitives.
- No duplicate PairingQR export: adoption uses ConnectPhoneCard.
- Expired, claimed, loading and error codes must be absent from the DOM; loopback refusal remains.
- Host supplies localized text, validation policy, actions and status announcements.
- No dependencies, no network access in components, no application account policy.
- Only this worktree and the assigned program/status/uikit3-pairing.md are writable task destinations.
- Root owns shared status, review, Docker/browser allocation, integration and VRT approvals.

## Review Focus

- Current browser never exposes a sign-out action, even if the host accidentally supplies one.
- Spent QR content must disappear, including live-to-terminal transitions; localized status stays perceivable.
- A pasted hyphenated code, selection replacement, backspace and ref/native form attributes still work as one field.
- Long session names, badge labels and timestamps wrap at 390/498px without squeezing the action or overflowing.
- Activation actions retain primary-first phone order and semantic headings across all host-owned result states.

## Audit and decisions

ConnectPhoneCard already implements the complete QR panel and phone instructions. Its expired state currently retains a scannable QR under opacity; DD-W81 requires removal. SessionRow, DeviceCodeCard and a segmented field have no alpha equivalents. WizardShell requires progress and full-screen staging, so it is not the activation card.

Jev selected one native input with decorative cells (p=0.95; confidence 0.94), over eight focus-routed fields (0.03) or an unsegmented field (0). Verify this advice with interaction and browser tests. Normalization removes separators/whitespace and uppercases; no alphabet restriction beyond letters/digits, since the host owns device-code policy.

## Task 1: Safe ConnectPhoneCard lifecycle

**Files:** modify `src/components/onboarding/connect-phone-card.tsx`, `.test.tsx`, `.stories.tsx`.

**Interfaces:** extend state to `live | expired | claimed | loading | error`; optional localized `status` slot. Existing live props and defaults remain.

- [x] Write regression tests for every non-live state and live-to-expired/claimed transitions removing the actual QR node and countdown; status announced politely.
- [x] Run `npm test -- src/components/onboarding/connect-phone-card.test.tsx --maxWorkers=1`; expect missing behavior failures.
- [x] Render QR only when live, safe decorative placeholder otherwise, localized status region, and matching light/dark/mobile stories.
- [x] Repeat focused command; expect pass. Commit with required trailer.

## Task 2: SessionRow

**Files:** create `src/components/onboarding/session-row.tsx`, `.test.tsx`, `.stories.tsx`.

**Interfaces:** `SessionRowProps`: name, kind (`browser | phone | tv`), kindLabel, optional description/lastConnected/lastShown ReactNode slots, current, compact, badgeVariant, and signOut `{label, onClick, disabled?}`. Root supports li props/ref and lives in ListRowGroup; internal ListRow remains noninteractive.

- [x] Write tests for list semantics, kind icon/badge metadata, distinct timestamp slots, current suppression, enabled/disabled sign out, localization, optional content and root ref.
- [x] Run `npm test -- src/components/onboarding/session-row.test.tsx --maxWorkers=1`; expect missing component failure.
- [x] Compose ListRow/IconTile/Badge/Button; preserve 12px inset, 32px icon, 14px name and 12px metadata; compact stacks timestamps/actions with 44px button.
- [x] Repeat focused command; expect pass. Add browser/phone/TV/password/long-copy and light/dark/mobile stories. Commit.

## Task 3: DeviceCodeInput and DeviceCodeCard

**Files:** create `src/components/onboarding/device-code-input.tsx`, `.test.tsx`, `.stories.tsx`; `device-code-card.tsx`, `.test.tsx`, `.stories.tsx`.

**Interfaces:** controlled `DeviceCodeInput({value: string, onValueChange(value): void, ...nativeInputProps})`, fixed eight-character four-four grouping, forwarding native input label/ref/form/invalid/disabled/readOnly. `DeviceCodeCard({title, description?, brand?, account?, children?, primaryAction?, secondaryAction?, footer?, ...divProps})` composes the shared card; host owns result state and action behavior.

- [x] Write input interaction tests for typing, normalization/paste, controlled updates, select-all replacement, backspace, invalid, disabled, readOnly, labels/ref and form value.
- [x] Write card tests for associated heading/description and header/content/action order, optional slots, localized content and host action behavior.
- [x] Run both files with maxWorkers=1; expect missing components.
- [x] Implement native field plus aria-hidden cells and responsive 440px card, 24px phone/32px desktop padding, primary-first phone/secondary-first desktop actions.
- [x] Repeat focused tests; expect pass. Add entry/approval/expired/used/denied and light/dark/mobile stories. Commit.

## Task 4: Adoption and complete verification

**Files:** additive exports in `src/index.ts`; entries in `src/stories/component-inventory.ts` and demos; inventory adoption test; minor `.changeset`.

**Interfaces:** public SessionRow, DeviceCodeInput and DeviceCodeCard exports and types; existing ConnectPhoneCard remains canonical PairingQR implementation.

- [x] Add public export/inventory tests, observe red, add own export/entry/demo additions, then observe green.
- [x] Run typecheck, lint, format:check, full tests with maxWorkers=1, build, release:test, full coverage and changed-file gate. Preserve logs in `.tmp/uikit3-pairing/`.
- [x] Build Storybook; request root browser slot for light/dark/mobile axe and screenshots.
- [x] Record audit/decisions/check results in assigned program status; request independent exact-head review from root.
- [ ] Commit, merge current origin/alpha normally, repeat affected checks after integration, push and open own PR into alpha with mandated footer. No merge/rebase/publish/VRT approval/PR comments.

## Local verification and handoff

Full suite: 146 files passed, one skipped; 3408 tests passed, 33 skipped. All seven changed source files pass 90% lines / 85% branches. Final presentation-only corrections follow the frozen PNGs (100px identity header, 4px title gap, 16px phone action gap) and pass focused tests plus typecheck/lint/format/build/release:test/Storybook build. Release checks: 499 passed. Browser/axe and independent review are delegated to the coordinator because host Chromium cannot launch and shared Docker is unavailable. No visual parity or axe completion is claimed.
