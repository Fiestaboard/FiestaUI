# Home supporting cards implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supply the missing Up next, Other displays, and Manual Mode supporting cards for web 2.2b without duplicating existing kit primitives.

**Architecture:** Add three presentational cards in one focused module. Share the existing Card surface, ListRow, StatusDot, Label, and touch Switch. The host supplies authoritative events, previews, selection callbacks, translated copy, and action buttons; it owns layout and Schedule semantics.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vitest, Storybook, Playwright/axe.

**Spec:** `/Volumes/ExtHD/fiestaboard-universal-design/program/briefs/FIESTAUI-SLICE-BRIEF.md`, `program/shots/web-2.2b/FIGMA-REFS.md`, actual saved Figma screenshots, and `program/DESIGN-DELTAS.md` DD-W74.

## Global constraints

- Existing alpha `208499e4` includes Card, ListRow, StatusDot, Switch and NowShowingCard; do not recreate them.
- Card skin uses `cardSurfaceClassName`; 20px padding, small semibold headings, 14px timeline spacing, 64px time column, 12px other-card spacing.
- No fetching, clock, recurrence calculation, routing, fixed peer visibility, or native platform chrome.
- DD-W74: web currently supplies one future H2 event; missing/invalid/past H2 becomes an honest empty card. Extra rows require authoritative hub data.
- Host replaces Up next with Manual Mode at every width, hides Other displays below 768px/with zero peers, and uses the fixed 274px pane at >=1024px.
- Dark uses kit tokens; no colors invented for this family. Preview slots are inert, decorative thumbnails.
- Add only own exports and inventory entries. Minor changeset. No Docker and no changes outside this worktree except the owned status file.
- Full typecheck, lint, format, test, build, release guards; >=90% changed-file lines and >=85% branches; light/dark/mobile browser axe.

## Review focus

- Localized or long content at 274px and 390px must wrap without clipping; exercise in a dedicated story and browser geometry check.
- Empty upcoming data must preserve its explanatory text and host action; test the empty branch and custom translation.
- Missing status must not claim a display is online; test absent and named status separately.
- Peer preview descendants must not become hidden keyboard stops; test inert preview and real selection keyboard interaction.
- Manual toggle must remain controlled during async host state; test unchanged checked value until rerender, disabled interaction, and description association.

## Design decisions

The root accepted this API proposal after the audit. Components are leaf recipes rather than a Home container: existing layout primitives already cover the pane and the host owns its breakpoint rules. An array of explicit upcoming items preserves source order without implying that the kit discovers future events. The default English copy is replaceable. No genuine unresolved implementation fork required Jev.

## Task 1: Card family and behavior

**Files:** `src/components/feedback/home-supporting-cards.tsx`, adjacent `.test.tsx`.

**Interfaces:** `UpNextCard` accepts display, explicit items (`id`, `time`, optional `dateTime`, `title`, optional description), empty copy, actions, heading level and labels. `OtherDisplaysCard` accepts explicit items (`id`, name, description, preview, status and accessible status label, optional selection callback), actions and labels. `ScheduleModeCard` accepts description, controlled checked/onCheckedChange, disabled, actions and labels.

- [x] Write failing tests for ordered input, empty state, override copy, named/custom regions, inert previews, optional status, zero peers, keyboard selection and controlled switch.
- [x] Run focused tests and confirm missing implementation causes RED.
- [x] Implement the family from the shared primitives.
- [x] Run focused tests and confirm GREEN; inspect changed-file coverage.

## Task 2: Public adoption and visual evidence

**Files:** `src/index.ts`, own entries in `src/stories/component-inventory.ts` and `component-inventory-demos.tsx`, `src/components/feedback/home-supporting-cards.stories.tsx`, `.changeset/uikit3-home.md`.

- [x] Add public exports, inventory demos and minor changeset.
- [x] Add default one-authoritative-event, override, empty, manual/disabled, zero-peer, peer/offline, mobile and long-content stories with token theme support.
- [x] Run full required static/unit/build/release checks and changed-file coverage.
- [ ] Coordinate the shared browser with root, then run story axe in light/dark and narrow layout checks. Save screenshots outside the repository.
- [ ] Request root's independent review; resolve material findings with regression tests.
- [ ] Merge `origin/alpha` normally before push; create the reviewable PR into alpha, without merge or VRT approval.

## Execution ledger

- Audit: no existing UpNextCard, OtherDisplaysCard or ScheduleModeCard found. Figma desktop, Manual Mode and phone references inspected. Root accepted API/scope.
- Task 1: initial stub run12 failed/1 passed; implementation13/13 GREEN. Full coverage run3397 passed/33 skipped; new card module100% lines/branches. Native canvas warnings are jsdom limitations, not failed tests.
- Phone reference: explicit compact size uses16px padding,10px gap and70px time column; desktop stays20/14/64. Browser geometry assertions were written before the style change but cannot execute locally because root's host browser smoke is sandbox-blocked. Root owns shared browser validation.
- Gate follow-up: the inventory demo introduced one unexercised enabled-state description branch (4/5,80%). Added a real toggle integration test; full coverage rerun passed3398 tests/33 skipped. All four changed source files now have100% lines and branches.
- Verification: typecheck, lint, format:check, npm test (3397 passed/33 skipped before the additional demo test), library build, release:test (499/499), Storybook build (11 stories), final full coverage and changed-file gate passed. Logs remain in the worktree's ignored `.task-evidence/` directory.
- Parent directed opening the PR after source/static/coverage checks even while the unavailable local browser remains explicitly pending; hosted CI and independent review provide the next checks.
