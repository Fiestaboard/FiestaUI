# Universal slice 1.9b: WeekCalendar and WeekCalendarInspector (P8)

**Row:** MASTER-PLAN 1.9b, "WeekCalendar (P8): new block plus inspector".
**Figma** (`ZQ8RMELCO6qEOFZUnQu36e`):

- 08 P8 `65:31684`, "Tablet week calendar with inspector". Recipe: `WeekCalendar (read + tap) + inspector pane`,
  `drag-to-create: pointer only`. Web impact: "The web calendar keeps drag for mouse users."
- **Web goalpost** 07d `322:9978`, "Web · Desktop 1440 · Schedule · Week · Conflict": the week grid (`322:14087`) and
  the inspector (`322:14371`). FiestaUI is the web kit, so this frame decides geometry and skins.
- 06 iPad `39:49637` (and Android tablet `41:72551`): the native layout of the same content. Used for states 07d does not
  draw (selected without a conflict, the now line).

## Scope (Jev `jev_decide` 2026-11-13: `create_only`, p 0.94)

In:

- `WeekCalendar`: a 1–7 day time grid. Hour lines, a 56 px gutter with a label every two hours, mono caps day labels,
  absolutely placed entry blocks (`entry`, `gap`, `silence` skins; `conflict`, `off`, selected states), an optional now
  line.
- Read + tap: every block is a button; `selectedId` / `onSelect`. One tab stop with roving focus: ↑ ↓ within a day,
  ← → to the nearest block in time on the next day that has one, Home / End within a day.
- Drag-to-create, **pointer only** (mouse and pen, never touch): press on an empty part of a day, drag, release.
  15-minute snap (`snapMinutes`); a click without a drag proposes one hour. Escape cancels. `onCreate({ day, start,
end })`. Off unless `onCreate` is passed.
- `WeekCalendarInspector`: the pane beside it. Title, description line, a conflict panel (destructive `Alert` with an
  actions row), a `preview` slot (a `StaticBoardDisplay` in 07d), the fields (children), and an actions row.

Out (follow-up row 1.9d, before the web schedule slice adopts the grid): pointer move and resize of existing blocks.
The web schedule keeps react-big-calendar until then.

## API sketch

```tsx
<WeekCalendar
  aria-label="Week of November 9–15"
  days={[{ id: "mon", label: "MON 9", name: "Monday, November 9" }, …]}
  entries={[{ id, day: 0, start: 540, end: 720, title: "Market open", meta: "Page", kind: "entry" }, …]}
  selectedId="birthday"
  onSelect={(entry) => …}
  onCreate={({ day, start, end }) => …}
  now={{ day: 4, minute: 581 }}
/>
```

Times are minutes after midnight. The host splits an entry that crosses midnight. Later entries in `entries` paint over
earlier ones, as 07d draws Happy birthday Sam over Weekend brunch.

## Tests first

- Rendering: day groups named, blocks named "title" with time and state in the description, geometry from minutes.
- States: `data-kind`, `data-conflict`, `data-off`, `aria-current` on the selected block.
- Keyboard: one tab stop; arrows, Home/End; Enter selects.
- Drag-to-create: mouse drag snaps to 15; click proposes 60; touch does nothing; Escape cancels; presses on a block do
  not create.
- Inspector: heading, description, conflict panel with actions, preview, fields, actions.

## Stories

Week (07d), Conflict selected, Selected, Now line, Off and silence, Drag to create (play), Narrow (mobile), Empty, and
the inspector alone and beside the grid. Each story is shot light/dark × desktop/mobile by VRT.

## Review follow-up (fix397)

Merge current alpha; replace inspector story stand-ins with ListRowGroup/ListRow. Reproduce and fix final-release coordinate and unrelated-pointer cancellation; cover lost capture. Run focused and full checks and retain the VRT review hold.
