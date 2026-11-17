# Universal overlay variants

The 2026-11-17 exports show existing kit overlays with different recipes. Extend
those primitives; do not add a parallel dialog, sheet, or toast engine.

## Evidence and decisions

- Desktop dialogs (`web-2.5/306:32302`, `web-2.12/323:15025`) use a 560px
  popover surface, 14px corners, 24px padding, 16px gaps and a 40px close chip
  with a 44px hit area. Existing generic Dialog remains unchanged by default.
- Mobile confirmations reuse the existing bottom Sheet with grabber and scrim.
  The confirmation recipe uses 16px bottom padding and actions in DOM order.
- Toasts (`306:30304`, `316:91196`) reuse Sonner: 380px desktop, 8px mobile
  side insets, 14/12/14/16 padding, 14px semibold title and 12px description.
  Keep the existing 44px action recipe (actual PNG and prior accepted DD-W4/5).
- Phone pairing `324:20567` is a host page (PageHeader + ConnectPhoneCard),
  not a new fullscreen modal. No operating-system or browser chrome.
- Jev `extend_existing_variants`, probability/confidence 0.98, selected the
  additive approach over a responsive remounting shell or duplicate components.
  Saved exports and source inspection establish the actual requirements.

## Implementation and tests

1. Add failing tests for `DialogContent variant="wide"`, localized close text,
   focus restoration, long title clearance and unchanged default styling.
   Extend existing slots via a shared data variant; retain Base UI semantics.
2. Add failing tests for `SheetContent variant="confirmation"`: implicit
   grabber on bottom sheets, 16px bottom safe-area padding, left-aligned header,
   stacked footer in DOM order. Retain default picker layout and drag behavior.
3. Add failing tests for `Toaster variant="snackbar"` and public `offset` /
   `mobileOffset` forwarding. Preset supplies reference width/type/spacing and
   8px mobile sides. Explicit offsets belong to host layout; unchanged defaults
   retain bottom-nav clearance. No scheduling or toast content policy in the kit.
4. Add light/dark/mobile stories with actual modal focus, action order and toast
   placement assertions. Preserve original screenshots in program/shots/uikit3.
5. Minor changeset, full typecheck/lint/format/unit/build/release checks,
   changed-file coverage (90% lines / 85% branches), Storybook axe/play and
   screenshots. Separate Astra review at the exact committed head, up to three
   rounds. Normal alpha merge/push and PR into alpha; no approval or merge.

## Validation constraints

Host Chromium launch is blocked by the Mac sandbox before rendering. Root will
serialize browser checks in a permitted shared fb-dev-browser container when
available, or report the explicit limitation alongside hosted CI evidence.
No task containers/images/volumes may be created beyond the three shared roles.

## Hosted acceptance follow-up

Actual desktop confirmation images exposed an inherited responsive horizontal margin on the first stacked action. Match the confirmation spacing override at the `sm` breakpoint and assert equal left and right button edges at 320, 390 and 900px. This preserves the default sheet recipe.

Storybook freezes entrance animations at their reversed final frame. Geometry checks now wait only while the surface animation is running, with a bounded wait; they do not await a paused animation's unfinished promise. Current mobile snackbar captures establish a 359px toast in the 375px layout area of a 390px screenshot. Keep that width contract and include concrete viewport, containing-block and toast-state diagnostics for the still-unexplained 320px assertion. No speculative toast sizing change is included.

The production repair passed the full local suite (3,379 passed, 33 skipped), all three changed-source coverage gates, static checks, library/Storybook builds and release checks. Hosted browser acceptance must execute again at the new head.

The next hosted run supplied the missing 320px evidence: `clientWidth` was 320 while both the fixed page and toast containing block were 305px; the toast was correctly 289px with 8px side insets. Measure the independent fixed page fixture for expected dialog/toast widths, and explicitly assert both snackbar insets. This keeps the production sizing and strict geometry contract unchanged while accounting for the rendered gutter. The paused-animation and equal-footer-edge checks passed in that run; only the three width oracles failed.

## Live-Figma continuation (uikit3c1)

Fresh read-only contexts for 316:91801 and shared shell 297:7630 confirm a
remaining variant-level difference: the confirmation footer uses 20px side
insets and its 18px title uses 1.25 line height and -0.025em tracking. Preserve
the existing 48px title/close clearance and all default sheet recipes. The
snackbar drawing uses a plain 16px Check and 14px X; choose those through
Sonner's existing icon extension point only for this variant.

Jev selected targeted variant repair (p=0.77, confidence=0.72) over retaining
all differences as CLOSE (0.18) or rewriting shared defaults (0). The shared
15px scrollbar gutter and inherited Escape-collapse behavior stay explicitly
outside this bounded patch; neither is declared fixed or approved.

1. Add a real rendered variant-switch regression for the success mark and
   extend the existing browser geometry checks for title/insets/icon sizes.
   Record the old glyph failure and existing screenshot/layout failure evidence.
2. Change only the new variant recipes; preserve default icon and sheet paths.
3. Run full local checks serially, including coverage and existing geometry/axe
   stories, then normal alpha merge/push and exact-head independent review/CI.
   Current c6efa03f passes remain historical after a replacement head is pushed.

The independent live review also confirmed a4px title/description gap and24px description/action separation in empty-body confirmation sheets. The variant keeps the48px title/close safety band, removes padding from its empty body, and gives its footer24px top spacing. Populated scrolling-body focus-ring padding and default sheet layout stay intact. Browser geometry assertions cover the actual gaps.

Validation of the final repair:3380 tests passed/33 existing skips; all three changed source files pass the90%lines/85%branches gate (Sheet100/96.87, Dialog100/100, Toaster100/100). Typecheck, lint (one existing diagnostic-console warning), formatting, production build,499 release checks and Storybook build passed. All six FlowShells stories passed their play functions and exact authored geometry/body-axe hooks in light and dark. The local shared0.26 Jest runner failed before tests on platform/resolution setup; the direct run reused the repository0.24.4 story-completion bridge and bundled unchanged authored hooks. Jev selected this bounded validation route with probability1.0/confidence1.0; normal hosted Jest/CI remains required. Logs and12 captures are in program/shots/uikit3-overlays/local-uikit3c1. No default recipes or shared dependencies changed.
