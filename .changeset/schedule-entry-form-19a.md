---
"@fiestaboard/ui": minor
---

New `ScheduleEntryForm` adds or edits one Schedule entry (slice 1.9a, C27). It uses touch size (44 px controls) by default, and `size="default"` gives the desktop sizes.

- **The value is the hub's `ScheduleEntry`.** Field names are the same snake_case: `page_id`, `start_type` / `start_time` / `start_sun_offset`, `end_type` / `end_time` (null means open-ended) / `end_sun_offset`, `recurrence_type`, `day_pattern` / `custom_days`, `annual_date` / `annual_end_date`, `one_off_date` / `one_off_end_date` and `enabled`. A host can send the value to the hub without mapping it.
- **`validateScheduleEntry`** applies the hub's `validate_config` rules:
  - a page is required;
  - a fixed range can't be zero-length, but a midnight rollover is fine;
  - a custom pattern needs at least one day;
  - dates must be real, and an end date can't come before its start.
- **`normalizeScheduleEntry`** clears the fields that the chosen recurrence and time types don't use, and puts custom days in Monday-first order.
- **Controls:**
  - Page or Collection, grouped by kind. It can be read-only when opened from Shows on.
  - Starts: At a time, Sunrise or Sunset. Sun times take a ±15-minute offset and show the hub's resolved time.
  - Ends: At a time, Open-ended, Sunrise or Sunset.
  - Repeat: Weekly (All, Weekdays, Weekends, or Custom day toggles), Every year on (month and day, with an optional last day) or Once on (a date, with an optional last day).
  - Entry is on.
  - A host consequence line, Save (busy state) and Delete entry….
- Times and dates use the system pickers (native `time` and `date` inputs). Every word can be overridden through `labels`.
