---
"@fiestaboard/ui": minor
---

Plugin settings from their schema, and settings a display can't offer (slice 1.9c, Figma 08 P9 and P11; web goalpost 07d Integration · Setup required).

- New `SchemaFormRows`: renders a plugin's or output's JSON Schema settings as stacked rows (label, control, helper line, error in its place). The mapping covers what ships: `ui:widget: "password"` and `secret: true` → `SecretInput` (the hub's `"***"` shows as "Saved — type to replace" and clearing keeps it); `enum` (array or `{ values }`, with `enumNames`) → `Select`; `mode-cards` → a `ToggleCardGroup`; a multi-enum array → chips (`ToggleGroup`); `boolean` → `Switch`; `integer` / `number` → a numeric input with `minimum` / `maximum`; `timezone` → `TimezonePicker`; `textarea` (widget or format) → `Textarea`; `url` / `format: "uri"` and `datetime` → typed inputs; a string array → one per line; a nested object → its own fieldset; `ui:sections` (collapsible) and `ui:placeholder`. Hub-data widgets (remote-options, page-picker, device-picker, tile-grid, json-path-mapper) are rendered by the host through `widgets`; the row still owns label, helper and error.
- `ui:visible_when` is evaluated exactly as the hub does (same shared vectors). A field the board's facts hide (`facts`, read by `@device_type` / `@device_model`) is listed as an explainer row with a reason (`labels.unavailable`) instead of vanishing, unless `unavailable="hide"`; a field hidden by a sibling value just goes.
- New `UnavailableSettingRow`: a setting this display can't offer, said in place of its control, with the reason. Also for display settings outside a schema (Brightness on a split-flap).
- New helpers: `resolveSchemaControl`, `schemaEnumOptions`, `isSecretField`, `isSchemaFieldVisible`, `hiddenByBoard`, `MASKED_SECRET`, `DEFAULT_SCHEMA_FORM_ROWS_LABELS`.
