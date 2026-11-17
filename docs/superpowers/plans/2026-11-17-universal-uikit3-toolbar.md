# Universal uikit3 touch toolbar implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Native execution is already authorized; root supplies the independent review.

**Goal:** Let the existing touch editor toolbar honor picker presentation without clipping popovers or replacing the editor integration.

**Architecture:** Forward `pickerPresentation` through the existing touch toolbar and `TemplateEditor.toolbarProps` route. Preserve the omitted touch sheet default and legacy `auto` query (below48rem OR coarse). Touch popovers use the existing shared Popover engine, with an additive portal container prop; default-size dropdown behavior remains intact.

**Tech stack:** React19, TypeScript, Base UI, TipTap, Vitest, Storybook browser interactions.

**Spec:** `/Volumes/ExtHD/fiestaboard-universal-design/program/status/uikit3-shell-schedule-audit.md`; web2.5 references and DD-W75 repair note.

## Global constraints

- Sheets below640, touch tool choice below768/coarse, preview dock below1024 are host policies; do not redefine legacy `auto`.
- No new toolbar/editor bridge. Root owns Dialog, Sheet, Toaster.
- Keep horizontally scrolling tools and44px minimum targets. Prefer popovers above docked touch tools and clamp to viewport.
- Minor changeset, light/dark/mobile stories,90% changed-file lines and85% branches, full local checks.
- Host browser launches are blocked; author geometry acceptance for permitted shared container/CI and report pending honestly.
- Check program/codex/WRAPUP before new steps. No merge/rebase/force push/publish/PR comments.

## Review focus

1. Popovers at both edges escape toolbar clipping, stay inside viewport and remain reachable above a docked bar (browser story geometry).
2. Resizing an open picker changes presentation without replacing the real editor or losing history (integration test).
3. Portal host contains the toolbar and touch popover; clicks inside remain usable (dropdown/integration test).
4. Popover focus return must not move TipTap's insertion caret or lose selected text (real editor test).
5. Default sheets, legacy auto and default-size dropdown dismissal remain compatible (existing and new tests).

## Task1: presentation and portal contract

Files: editor/template-editor-toolbar.tsx, template-editor-toolbar-touch.tsx, toolbar-dropdown.tsx and tests; overlays/popover.tsx and focused test.

Interfaces: existing `pickerPresentation?: ToolbarDropdownPresentation`; additive `PopoverContent.container` and `ToolbarDropdown.container` portal host. Touch dropdown defaults are supplied by TouchToolbar as sheet.

- [x] Write failing tests for touch popover escape/host containment, dismissal/focus, open presentation changes and all touch picker faces.
- [x] Run focused Vitest and observe missing-popover failures.
- [x] Forward presentation/container, using shared Popover only for touch popovers and retaining default-size behavior.
- [x] Run focused tests and coverage; fix behavioral gaps.

## Task2: real editor and geometry acceptance

Files: new template-editor-toolbar-integration.test.tsx and template-editor-toolbar-integration.stories.tsx; own changeset.

- [x] Write failing real editor tests for caret variable insertion/history, selection color/icon, alignment/wrap, Size and presentation changes through toolbarProps.
- [x] Verify tests fail on original behavior and pass with implementation.
- [x] Add real-editor light/dark/mobile/host-container stories with geometry assertions for unclipped edge popovers and44px targets, resize-safe presentation and editor persistence.
- [x] Run full typecheck, lint, format:check, test(maxWorkers1), coverage, build, release:test, and changed-file90/85 gate; build Storybook. Browser acceptance remains pending until permitted runtime.
- [x] Prepare validated changes for commit and a PR into alpha; normal origin/alpha sync and root independent review follow.

## Decisions and execution ledger

- Jev `touch_shared` p=1.0: keep default-size legacy panel, use shared Popover for touch. Advice verified against existing overlay/source APIs. Additive Popover container scope granted by root. Cost if wrong: touch focus behavior or portal theme inheritance requires adjustment; regression tests and browser geometry gate cover adoption.
- User autonomous execution authorization supersedes interactive skill approval gates.

- Task1 complete: presentation/portal RED12 failures → focused GREEN; every touch picker exercised, omitted sheet and legacy auto retained. Keyboard and outside-dismissal regressions pass. Actual shared popup role confirmed with a failing trigger assertion; touch `aria-haspopup="dialog"` then passes.
- Task2 local implementation complete: real TipTap insertion, selected LED colors/icons, history after open presentation changes, alignment/wrap, Size and repeated color insertion pass. Browser geometry and open-state VRT stories are authored; runtime browser acceptance remains pending.
- Final immutable verification: `npm test -- --coverage --maxWorkers=1` →144 files passed/1 skipped;3389 tests passed/33 skipped,211.48s. `typecheck`, `lint` (no warnings), `format:check`, `build`, `build-storybook`, `release:test` (499/499) pass. Changed-file gate passes all4 source files at90% lines/85% branches.
- No browser success claimed: host Playwright is blocked before launch. Permitted shared container/CI must execute geometry, axe and VRT. Root provides independent review after commit.

## Independent review round1 repair

- M1 fixed: a previous popover Escape dismissal left a return-focus ref set through a later sheet opening and sheet-to-popover switch. Return-focus intent is now rendered state, reset on a new sheet/default toggle and imperative picker commit; genuine Escape still restores the trigger.
- Durable real-editor regressions cover both `vestaboard_v1` and `led_5x7`: Escape, reopen sheet, switch the open picker to popover, commit, assert editor focus and immediately type at the insertion caret. Both failed with the actual Variables trigger focused before the repair; focused suite34/34 passes after it.
- Serialized full verification: `npm test -- --coverage --maxWorkers=1 --pool=threads --testTimeout=30000` passes3391 tests/33 skipped,144 files/1 skipped,187.81s. All4 PR source files pass the90/85 changed-file gate. Typecheck and lint pass. The CLI timeout accommodates shared host contention; no persistent test threshold changed.
- S1 deferred to permitted browser acceptance: explicitly exercise open-picker767↔768 touch/default mode changes. This is a nonblocking browser coverage improvement; source behavior is not changed speculatively.
- Root provides round2 review at the new committed head. Browser geometry, axe and VRT readiness remain separate pending gates.

## CI artifact acceptance repair

- M2 observed in the exact `0a45e9a3` CI mobile Icon screenshot: five intrinsic-width columns produced approximately24px-wide targets despite48px height. Root's Jev `shared_target_minimum` advice (probability/confidence1.00) selected the existing shared touch recipes over a fixed popup width. The source repair adds minimum widths to touch glyph, swatch and code62 buttons; default recipes remain unchanged.
- At200% root text size, the same spacing token enlarges those targets. Jev `minimum_tracks_scroll` selected matching minimum grid tracks and the existing scrollable popup (probability0.94/confidence0.93), preserving the four-column color keyboard map and five-column icon order without overlapping targets or adding resize observers.
- Actual light/dark integration CI failures at the old head isolated the painted-bar3px-gap assertion: portal containment and hit checks passed. Root's Jev `test_control_clearance` advice (probability/confidence1.00) selected actual anchor/control clearance because the supplied references do not specify a painted-bar gap. The shared4px anchor offset is unchanged. The runner now requires docked popup clearance from the anchor and no overlap or obstruction of visible toolbar controls.
- Browser acceptance now measures every Icon, Text color, Block color and tile choice at320/390/640/900/1280 and320 at200% text. Each target must measure at least44px in both dimensions, own its four edge hit points, and fit fully within the popup and viewport after scrolling. Open Text color and Colors stories join Icon for the light/dark and desktop/mobile CI matrices. The screenshot establishes the original failure; these new browser assertions are authored but have not run locally.
- Focused existing picker/editor tests:5 files,67 passed. Frozen full coverage:144 files passed/1 skipped;3391 tests passed/33 skipped,109.96s. All5 changed source files pass90% lines/85% branches; the newly touched picker is96% lines/96.66% branches. Typecheck, lint, format, production build, Storybook build and499 release-tool tests pass. Built Storybook CSS contains both minimum-track grid rules.
- Root supplies final independent review and exact-head CI/artifact acceptance after delivery. No source-ready or parity-ready claim is inferred from local checks alone; S1 remains the separate nonblocking mode-switch browser follow-up.

## Remaining M2 Brush consumers

- Final round3 source review found two remaining grids in the Brush popup: the other production consumer of the shared touch swatch recipe still had four zero-minimum tracks, and the touch stamp picker put44px cells in six zero-minimum tracks. Both can overlap within the capped popup, especially at200% text. This is source/CSS contract evidence; no local browser failure is claimed.
- Applied the same approved minimum-track policy to Brush swatches and the shared touch stamp grid. Four- and six-column layouts remain fixed, the stamp keyboard map remains six columns, and the default eight-column stamp recipe is unchanged. A production consumer search confirms the shared swatch recipe is used only by ColorPickerContent and Brush, now both covered.
- Authored the Brush browser case before the source repair: every swatch, eraser and stamp must pass the existing44px/four-edge-hit/full-containment checks at320/390/640/900/1280 and320 at200%. The real TemplateEditor host also selects Red and A, verifies the popup closes, and verifies the selected brush after reopening. This remains pending actual CI execution; no JSDOM class-mirror test was substituted for geometry.
- Focused existing charset, code62, touch picker and editor tests:5 files/67 passed, including six-column ArrowDown/Up and default eight-column navigation/snapshots. Frozen full coverage:144 files passed/1 skipped,3391 tests passed/33 skipped,116.91s. All6 changed source files pass90/85; DrawCharPickerContent is91.17% lines/97.36% branches. Typecheck, lint, format, production build, Storybook build and499 release-tool tests pass. Built CSS contains the six-column minimum-track rule.
- Root coordinates the reviewer's exact-delta continuation and final exact-head CI/browser/visual acceptance. S1 remains separately nonblocking. No new Jev fork was needed: this completes the already selected minimum-track policy in its remaining consumers.

## Exact-head CI timeout diagnosis

- At `f73f27cd`, hosted light2 job133890126392 in run44036366258 reports three Jest15s timeouts: LedIconPopover, LedTextColorPopover and ColorPopover. No geometry assertion is reported;190 other stories pass, including the larger Brush case. The current log does not distinguish an unmet popup-fit predicate from traversal delay.
- Exact-head normal390px Icon, Text color and Brush PNGs were inspected from `program/shots/uikit3-toolbar/ci-44036366258-f73f27cd`. The controls appear separated and the popup surfaces contained. These screenshots do not cover320px/200% and cannot establish the timed probe's outcome.
- Jev `bounded_diagnostics` selected staged evidence before batching the traversal or raising Jest's timeout (probability/confidence1.00). The helper now bounds visible/fit/scroll waits at2.5s, reports completed-case fit/traversal durations, emits one slow-stage marker after10s, and attaches popup/viewport/current-target geometry to failures. Jest's15s budget and every dimension, four-edge-hit, full-containment and scrolling assertion remain unchanged.
- This delta changes only the browser test helper and this ledger. Typecheck, lint, full format check and Storybook build pass. No product fix, executed browser pass or geometry/parity readiness is established. Product source retains the `f73f27cd` full3391/33, six-file coverage and release499 evidence; those suites are not redundantly rerun for test-only diagnostics. Root owns the next exact-head CI execution and independent review.
