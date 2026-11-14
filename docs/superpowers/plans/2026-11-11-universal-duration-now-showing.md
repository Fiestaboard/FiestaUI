# Slice 1.7b: Duration and Now showing (C15, WEB-11, C14)

**Goal:** the FiestaUI pieces web 2.2 needs to rebuild `ForceSetDialog` as Change Page + duration and to show the
Override state on Home: `DurationChipGroup`, `Countdown`, `OutcomeLine` and `NowShowingCard`.
K1 (the iOS tab-bar accessory) stays excluded.

**Figma (`ZQ8RMELCO6qEOFZUnQu36e`, read only):**

- 08 C15 `61:25166`, 08 C14 `61:23927` (candidate cards), 03 Duration sheet `37:29474` (iOS, reference only).
- Web canon 07a: `Web / DurationChipGroup` `302:2051` + `Web / Duration chip` `302:1954`; Change Page dialog
  `310:27278`; Home · Override active `303:22566` (Now showing card, Countdown `…303:22592`); phone `306:53082`.
- 02 `Board / Mobile` Now showing card `10:1212` (compact card).

## Design calls

1. **Chip look:** Figma's Duration chip (44 px pill; default card + `border-input`; selected `foreground` fill,
   `background` ink, check icon) differs from SegmentedControl's stock tint. `toggle-card.tsx` is locked by 1.2
   (#385), so DurationChipGroup composes `SegmentedControl` / `SegmentedControlItem` and passes an exported cva recipe
   (`durationChipVariants`) through `className`. Semantics (radiogroup, roving focus, Home/End) are SegmentedControl's.
   Jev `jev_decide` 2026-11-11: compose_recipe, p=1.0.
2. **Layout:** `row` (desktop dialog), `grid` (2×2, chips fill; mobile sheet), `auto` (grid below `sm`, row from `sm`;
   viewport breakpoint, not a container query, per the 1.7a lesson).
3. **Options:** `options` are data. `buildDurationOptions({ nextChange })` returns CANON's
   15 min · 1 hr · Until <next change> · Until I cancel (the next-change chip is dropped when there is none).
4. **Outcome line:** `OutcomeLine` is the "Holds until 9:00 PM, then Schedule resumes" sentence, `size="sm"` (dialog,
   14/20) or `"md"` (Home, 16/24), muted. Inside DurationChipGroup it is a polite live region and describes the group.
5. **Countdown:** clock glyph + "2h 42m left" (16/24 semibold) · spacer · "until 9:00 PM" (14/20 muted) + an optional
   6 px decorative progress bar (`bg-muted` track, `bg-primary` remaining). It ticks once per minute boundary (no
   per-second work), uses `role="timer"` (implicit `aria-live="off"`) for the visible text, and a separate sr-only polite
   region that speaks only at thresholds (`announceAt`, default 5 min) and at the end. It reads `Date.now()`, so
   `vi.useFakeTimers()` + `setSystemTime` drive it in tests.
6. **NowShowingCard:** `variant="hero"` (07a web Home card: StatusDot md + "Now showing · Kitchen board" + mono meta;
   board slot; mode badge + 24 px page title; countdown slot; outcome; actions) and `variant="compact"` (02 card: mono
   eyebrow + mode badge; board; 16 px title + meta line). Mode badges: `override` = Badge default (primary),
   `schedule` / `manual` = secondary; `state="preview"` shows the outline "Preview" badge and "Not sent yet".
   It is content only: no glass, no platform chrome (OWNER RULE).

## Tasks (TDD)

1. Red tests for `buildDurationOptions`, `formatRemaining`, DurationChipGroup (radiogroup name, selection, check icon
   only on the selected chip, layouts, outcome live region + describedby), Countdown (minute ticks with fake timers,
   threshold announcements once, end callback, no live text on the visible timer, progress width), OutcomeLine, NowShowingCard
   (variants, mode badge labels, preview state, slots, heading/labelling).
2. Implement `forms/duration-chip-group.tsx` (DurationChipGroup, OutcomeLine) and `feedback/{countdown,now-showing-card}.tsx`.
3. Stories (Default, all states, Mobile 390, dark via the theme toolbar/VRT), inventory entries + demos, `src/index.ts`.
4. `.changeset/duration-now-showing.md` (minor).
5. typecheck, lint, format, `test:coverage` + changed-file coverage, build, release:test, storybook build + axe.
