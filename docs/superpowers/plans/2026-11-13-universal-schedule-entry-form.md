# Slice 1.9a: ScheduleEntryForm (C27)

**Goal.** One form that edits everything the hub stores for a Schedule entry, at touch size.

**Refs** (Figma `ZQ8RMELCO6qEOFZUnQu36e`, read only):

- 08 C27 `75:12238`.
- Native: 06 iPhone Edit entry `37:21884` (Android `40:67517`).
- **Web goalpost:** 07d Schedule · Entry sheet `322:20318`. Week inspector rows are in `322:9978`.

**Hub model:** FiestaBoard `src/schedules/models.py` `ScheduleEntry` / `ScheduleCreate` / `validate_config`.

- `resolved_start_time` / `resolved_end_time` come from `ScheduleResponse`.
- H8 (#2462) `GET /schedules/active/page?at=` can feed the consequence line (`summary`).

## Decisions

1. **The value is the hub entry, with snake_case names.** `validateScheduleEntry` mirrors `validate_config`, and `normalizeScheduleEntry` mirrors the web form's payload. `board_id` stays with the host.
2. **Ends options:** At a time · Open-ended · Sunrise · Sunset. These are what the hub stores. 06's "After" (a duration) is not stored, so it is left out. Jev `jev_decide` chose `mirror_starts_plus_open`, p 0.58.
3. **Layout:**
   - The 07d sheet sets the base: a labelled target select, Days as SegmentedControl, a full-width Save and a "Delete entry…" ghost button.
   - The 06 sections fill what 07d does not draw: Starts, Ends, Repeat, Entry is on, and the consequence line.
   - The web form uses web label headings, not iOS uppercase section cards.
4. **Pickers are the system's** (08): `<input type="time">` and `<input type="date">`. Yearly dates use Month and Day selects, because the hub stores MM-DD.
5. **Custom days** are seven standalone `SegmentedControlItem` toggles (`aria-pressed`) in a named group.
6. The form renders no sheet header; the host owns the Sheet.

## Tasks (test first)

1. `schedule-entry-form.test.tsx`: validation parity, normalization, each control path. Write it red first.
2. Write the component, stories (every recurrence, sun, open-ended, errors with `play`, default size), inventory, export and changeset.
3. Run the local checks, then write the DD-W row, status and shots, and open the PR.

## Handoff follow-up (Codex, 2026-11-13)

The existing implementation and design decisions remain the plan. Review found three functional gaps, each reproduced before fixing:

- Replacing a controlled entry with a multi-day entry must reveal the stored last date. Range visibility now follows replaced end dates while keeping an intentionally blank end input editable.
- Busy Save must reject form submission from the keyboard as well as button clicks.
- ISO dates must reject year zero, as Python does, and validate years 1–99 without JavaScript's 1900 offset.

The new regression cases failed 3/30 before the fixes, then 30/30 passed. An additional assertion caught the empty-last-date input closing during the range fix; it failed once, then the complete focused file passed 30/30 after correction. The parent agent reviewed the follow-up diff. No new visual delta is needed because the story defaults and drawing are unchanged.

Jev failure classification separated the three functional assertions (p 0.98, 0.98, 0.99) from concurrent-worker timeouts (p 0.95). A serial focused run confirmed that distinction. Full final verification is recorded in the program status file.

### Sun fallback repair

A further review found that clearing a fixed time and then selecting a sun mode left a blocking validation error on an invisible field. The hub uses these stored HH:MM values as fallbacks when location is absent or sun resolution fails, so silently filling them would change scheduling semantics. Jev chose `repair_field_on_error` (p=1.0): after Save fails, reveal a labelled fallback-time input with the error and an explanatory hint; keep it editable until valid Save. Normal valid sun-mode stories remain unchanged. Two regression cases failed before implementation and cover clearing a start fallback and a zero-length end fallback. `SunFallbackErrors` play-tests both errors. Design delta: DD-W71.

### fixB review follow-up

Test first: preserve visible stored non-grid/out-of-range sun offsets at both ends, localize their labels, and exercise offset replacement. Keep preset choices and append the current custom value without clamping. After invalid Save, focus the first editable invalid control in DOM order after React commits errors, including fallback repair inputs and custom days. Jev chose `focus_first`, probability 0.99 (confidence 0.98), over adding a form summary. This follows Field's documented form contract without new visual chrome. Cover keyboard/repeated submission, multiple errors, group description, page error clearing, annual month clamping, and enabled hint association. Add StoredCustomOffsets and focus assertions in error stories; recheck both themes/viewports.
