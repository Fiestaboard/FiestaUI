/**
 * The semantic half of SchemaFormRows (Figma 08 P9 `65:34102`): which control
 * a plugin settings field gets, decided from its JSON Schema and `ui:*` hints
 * alone. "The field → control mapping is semantic; each platform renders its
 * own controls" — so this is plain data, with no React in it.
 *
 * The vocabulary is what ships (hub `91018934a`, 86 registry plugins and the
 * four output plugins): `ui:widget` password / remote-options / timezone /
 * url / page-picker / datetime / json-path-mapper / textarea / mode-cards /
 * device-picker / tile-grid, `secret: true`, `enum` (an array or `{ values }`)
 * with `enumNames`, `ui:placeholder`, `ui:options`, `ui:visible_when` and
 * `ui:sections`.
 */

export interface SchemaSection {
  id: string;
  title?: string;
  fields: string[];
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface JsonSchemaField {
  type?: "string" | "number" | "integer" | "boolean" | "array" | "object";
  title?: string;
  description?: string;
  default?: unknown;
  enum?: unknown[] | { values?: unknown[] };
  enumNames?: string[];
  minimum?: number;
  maximum?: number;
  format?: string;
  items?: JsonSchemaField;
  properties?: Record<string, JsonSchemaField>;
  required?: string[];
  /** Write-only; same as `ui:widget: "password"`. */
  secret?: boolean;
  "ui:widget"?: string;
  "ui:placeholder"?: string;
  "ui:options"?: Record<string, unknown>;
  "ui:visible_when"?: unknown;
  "ui:sections"?: SchemaSection[];
  [keyword: string]: unknown;
}

/**
 * - `custom`: the host renders it (`widgets[ui:widget]`), for hub-data widgets
 *   such as remote-options, page-picker and device-picker.
 * - `secret` SecretInput · `select` Select · `cards` ToggleCardGroup (mode-cards)
 * - `timezone` TimezonePicker · `textarea` Textarea · `switch` Switch
 * - `number` numeric Input · `checklist` chips (ToggleGroup, multi-enum)
 * - `list` one string per line · `url` / `datetime` / `text` Input
 * - `group` a nested object's rows · `unsupported` a row that says so
 */
export type SchemaControl =
  | "custom"
  | "secret"
  | "select"
  | "cards"
  | "timezone"
  | "textarea"
  | "switch"
  | "number"
  | "checklist"
  | "list"
  | "url"
  | "datetime"
  | "text"
  | "group"
  | "unsupported";

export interface SchemaOption {
  /** The schema value, typed as the schema declares it. */
  value: string | number | boolean;
  /** `enumNames[i]`, else the value as text. */
  label: string;
}

/** `enum` as an array of options; accepts the array or `{ values }` form, as the hub does. */
export function schemaEnumOptions(field: JsonSchemaField | undefined): SchemaOption[] | null {
  if (!field) return null;
  const raw = Array.isArray(field.enum) ? field.enum : field.enum?.values;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const names = Array.isArray(field.enumNames) ? field.enumNames : [];
  return raw
    .filter((v): v is string | number | boolean => ["string", "number", "boolean"].includes(typeof v))
    .map((value, i) => ({ value, label: names[i] ?? String(value) }));
}

/** `ui:widget: "password"` and `secret: true` mean the same thing (hub `_is_secret`). */
export function isSecretField(field: JsonSchemaField): boolean {
  return field.secret === true || field["ui:widget"] === "password";
}

export function resolveSchemaControl(field: JsonSchemaField, hostWidgets: readonly string[] = []): SchemaControl {
  const widget = field["ui:widget"];
  if (widget && hostWidgets.includes(widget)) return "custom";
  if (isSecretField(field)) return "secret";
  const type = field.type;
  if (type === "array") {
    const items = field.items;
    if (schemaEnumOptions(items)) return "checklist";
    if (items?.type === "string" || (items && items.type === undefined)) return "list";
    return "unsupported";
  }
  if (type === "object") return field.properties ? "group" : "unsupported";
  if (schemaEnumOptions(field)) return widget === "mode-cards" ? "cards" : "select";
  if (type === "boolean") return "switch";
  if (type === "number" || type === "integer") return "number";
  if (widget === "timezone") return "timezone";
  if (widget === "textarea" || field.format === "textarea") return "textarea";
  if (widget === "url" || field.format === "uri") return "url";
  if (widget === "datetime") return "datetime";
  return "text";
}
