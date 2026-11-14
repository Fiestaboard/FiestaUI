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
