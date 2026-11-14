---
"@fiestaboard/ui": minor
---

Schedule agenda rows, the day picker and notification rows (slice 1.8d, C24 and C26).

- **New `AgendaRow`** (a `ListRow`): one row of the phone and mobile-web Schedule, drawn as the 07d day list draws it. The title is the page or collection, the description is "9:00 AM – 1:00 PM · Page", and a chevron trails. `kind`:
  - `entry`: a plain row.
  - `now`: the filled row, the word "Now" and `aria-current="time"`.
  - `gap`: "Gap · <default page>".
  - `conflict`: the danger tint and the word "Overlap", with the description in destructive.
    The words are overridable `labels`; `status` overrides the word, and `trailing={null}` drops the chevron.
- **New `WeekStrip` and `DayChip`**: the day picker, built on `SegmentedControl` at the 44 px touch size, on one line that scrolls sideways. `DayChip hasGap` adds a warning dot and ", has a gap" to the day's name (`gapLabel`).
- **New `NotificationRow`** (a `ListRow`): an alert, why it fires, and a touch `Switch` named by the title and described by the reason. `permission="denied" | "unavailable"` turns the switch off and disables it, and appends "blocked by the browser" or "needs HTTPS" to the reason; `granted` and `ask-on-first` keep it live.
