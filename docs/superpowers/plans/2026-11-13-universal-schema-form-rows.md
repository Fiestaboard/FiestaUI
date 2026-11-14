# Universal slice 1.9c: SchemaFormRows and capability-aware controls (P9, P11)

**Row:** MASTER-PLAN 1.9c. **Figma** (`ZQ8RMELCO6qEOFZUnQu36e`): 08 P9 `65:34102` (field → control mapping), 08 P11
`65:35498` (render only supported controls, plus an explainer row for the missing ones). Web goalpost: 07d `324:44888`
(Integration · Muni Transit · Setup required). Native references: 06 `43:7255` (iPhone schema sheet), `49:11330`
(Kitchen board: "Brightness · Not adjustable — split-flap has no backlight").

## What ships (surveyed 2026-11-13)

Hub `origin/main` `91018934a`, the 86 registry manifests and the 4 output manifests:

- `ui:widget`: password 40, remote-options 17, timezone 11, url 2, page-picker 2, datetime 1, json-path-mapper 1,
  textarea 1; outputs add mode-cards, device-picker and tile-grid. `secret: true` 2 (+ outputs).
- `ui:placeholder`, `ui:options`, `ui:visible_when` (with `@device_type` / `@device_model` board facts) and `ui:sections`.
- Types: string 157, integer with min/max 123, boolean 116, string enum 35 (+ `enumNames` 29), object 18, number 23,
  arrays 20 (multi-enum, string lists, arrays of objects), integer enum 4, `format: textarea` 4, `format: uri` 1.
- No capability keyword exists in any schema. The only board-aware mechanism is `ui:visible_when` reading board facts.

## Design

- `lib/schema-form/controls.ts`: `resolveSchemaControl(field, hostWidgets)` returns the control kind. It is data-only,
  so the mapping is semantic, as P9 asks.
- `lib/schema-form/visible-when.ts`: a port of the hub's evaluator. `visible-when.cases.json` is a verbatim copy of
  the hub's shared vectors. `hiddenByBoard` uses Kleene logic with the board facts unknown, so a field hidden only by
  the board is told apart from one hidden by a sibling value.
- `SchemaFormRows`: Field-based stacked rows (07d), controls capped at 420 px from `sm`, Switch rows inline, chips for
  multi-enum, ToggleCardGroup for mode-cards, nested fieldsets for objects, `ui:sections` (collapsible), host
  `widgets` for hub-data widgets, and explainer rows (`UnavailableSettingRow`) for board-hidden fields.
- Secrets: the hub's `"***"` renders empty with "Saved — type to replace", with reveal off; clearing keeps it.

## Tests first

`visible-when.test.ts` runs every hub vector plus the board cases. `controls.test.ts` covers each mapping.
`schema-form-rows.test.tsx` covers each control's name, description, error, value round trip, secrets, sections,
nested objects, host widgets, explainer rows, omit and disabled.

## Review follow-up (fix397 / #399)

Merge current alpha. Retain initial saved-secret state for a keyed edit session, omit masked schema secrets from onChange, and export schemaFormSubmission for all saves including unchanged values. Reserve literal masks; recursively sanitize objects and arrays, omitting an array with omitted primitive elements to avoid nulls/index shifts. Test controlled submit, nested abandonment, unrelated edits, reset and pasted mask. Jev chose safe_updates, probability 0.93 (confidence 0.91), over sentinel-bearing editing callbacks (0.05). Use per-row IDs and consistent boolean/custom required labels. Keep custom widgets responsible for declared schema secrets and wiring.
