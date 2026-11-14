---
"@fiestaboard/ui": minor
---

Duration chips, Countdown and NowShowingCard (universal slice 1.7b; C15, WEB-11, C14).

- New `DurationChipGroup`, built on `SegmentedControl` (same radiogroup, arrow keys and Home/End): 44px pill chips that fill with the foreground colour and show a check when selected, `layout="row" | "grid" | "auto"` (2×2 below `sm`), and an `outcome` sentence rendered under the chips as a polite live region that also describes the group. `buildDurationOptions({ nextChange })` returns CANON's 15 min · 1 hr · Until <next change> · Until I cancel. Also exports `OutcomeLine` (`size="sm" | "md"`), `durationChipVariants`, `durationChipGroupVariants`, `outcomeLineVariants` and `DEFAULT_DURATION_OPTION_LABELS`.
- New `Countdown`: "2h 42m left" with "until 9:00 PM" (formatted with `locale` / `timeZone`, or `untilLabel`) and an optional decorative bar when `startedAt` is known. It re-renders once per minute, never per second; the visible text is `role="timer"` (not announced), and a hidden polite region speaks only at `announceAt` thresholds (default 5 minutes) and once at the end (`onEnd`). Exports `formatRemaining` and `DEFAULT_COUNTDOWN_LABELS`.
- New `NowShowingCard` (`variant="hero" | "compact"`): status dot and "Now showing · <display>" header, a board slot, a mode badge (Schedule Mode / Manual Mode / Override), the page title, and countdown, outcome and actions slots. `state="preview"` shows "Preview · Not sent yet". Exports `DEFAULT_NOW_SHOWING_CARD_LABELS`.
