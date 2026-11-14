---
"@fiestaboard/ui": minor
---

Schedule week grid and its inspector pane (slice 1.9b, Figma 08 P8; web goalpost 07d Schedule · Week · Conflict).

- New `WeekCalendar`: a one-to-seven-day time grid with a 56 px gutter (a label every second hour), mono caps day labels and an hour line every `hourHeight` (34 px). Entries are minutes after midnight; each is a button named by its title and described by its meta, time range and state. Kinds `entry`, `gap` (dashed) and `silence` (muted); states `conflict` (opaque danger tint, red title), `off` (faded surface, muted title) and selected (`selectedId`, `aria-current`, a 2 px primary border, or destructive when in conflict). One tab stop with roving focus: ↑ ↓ within a day, ← → to the block nearest in time on the next day that has one, Home / End. An optional `now` line. With `onCreate`, a mouse or pen drag on an empty part of a day proposes a range in `snapMinutes` (15) steps and reports `{ day, start, end }`; a click proposes one hour; touch never drags; Escape cancels. Localizable through `labels`, `formatTime` and `formatHour`.
- New `WeekCalendarInspector`: the pane beside the grid, a region named by its title, with a description line, a polite destructive conflict `Alert` with an actions row, a `preview` slot for the board, the fields (children) and an actions row.
