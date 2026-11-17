---
"@fiestaboard/ui": minor
---

Add pointer move and end-resize to WeekCalendar with `onEntryChange`: a mouse or pen drag moves a scheduled block (to another time or day, keeping its length) or stretches its end, in `snapMinutes` steps inside the visible hours, and reports the new `{ day, start, end }` once on release. Gaps and the silence schedule stay fixed, touch never drags, and a press under 4px is still a click.
