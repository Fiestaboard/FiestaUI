# Slice 1.8d: Schedule rows (C24, C26)

**Goal.** Three new pieces for the phone Schedule and Settings › Notifications:
`AgendaRow`, `WeekStrip` + `DayChip`, and `NotificationRow`.

**Refs (Figma `ZQ8RMELCO6qEOFZUnQu36e`, read only).**

- 08 C24 `65:30041` (proposal `<ScheduleAgendaRow kind time page display fix/>`, `<DayChip day selected hasGap/>`, `<WeekStrip/>`), 08 C26 `65:31531` (`<NotificationRow kind title reason enabled onToggle permission/>`).
- Native: 06 `FB / Agenda entry` `31:104` (Entry / Now / Gap / Conflict), 06 `FB / Day chip` `31:115`, 06 iPhone Notifications `50:53263`.
- **Web goalpost** (DD-W20 precedent: 07d is web, 06 is native): 07d Schedule · List (M) `322:16890`, Schedule · Day (S) `322:19169`; 07 PWA Notifications `59:13890`; 07e §8 `329:48335` (needs HTTPS), `337:60272` (blocked by the browser).

## Decisions

1. **AgendaRow is a ListRow (#389)** drawn as 07d draws the day list: title, "9:00 AM – 1:00 PM · Page" description, a trailing chevron, and the state as a word in the meta slot ("Now"). Kinds:
   - `entry`: plain row.
   - `now`: `bg-accent` (07d's filled row), the word "Now" in the foreground, `aria-current="time"`.
   - `gap`: title "Gap · <default page>" (07d), no tint.
   - `conflict`: 07d's list draws none, so this is 06's: `--tint-danger` ground, the description and the word "Overlap" in `--destructive`.
   - 06's coloured time bar, stacked start/end column and badges are native only (state is still words, as 06's own description asks).
2. **WeekStrip / DayChip are SegmentedControl / SegmentedControlItem** (07d draws the strip as touch-size SegmentedControl pills "Thu 5"). `hasGap` is the one thing taken from 06: a 6 px `--warning` dot plus visually hidden ", has a gap". Jev `jev_decide` → `segmented_07d`, p 0.97.
3. **NotificationRow is a ListRow with a trailing touch Switch** (07 PWA "Switch (44 hit)"). The switch is named by the title and described by the reason. `permission`: `granted` / `ask-on-first` keep the switch live; `denied` / `unavailable` disable it, show it off, and append "blocked by the browser" / "needs HTTPS" to the reason (07e §8). Copy is host content; the defaults are overridable `labels`.
4. 08's `fix={{label,onPress}}` is not a row prop: a link or button row cannot hold a second control. The conflict fix lives in the entry form / inspector (07d draws it there). A plain (non-link) row can still pass its own `trailing`.

## Tasks (test first)

1. `agenda-row.test.tsx`, `day-chip.test.tsx`, `notification-row.test.tsx` red.
2. Implement in `src/components/schedule/` and `src/components/forms/notification-row.tsx`.
3. Stories (every kind/state, light/dark/mobile via VRT), inventory entries + demos, `index.ts` exports, changeset.
4. Local checks: typecheck, lint, format, test:coverage, build, release:test, Storybook a11y.
5. DD-W row, status doc, shots, PR.
