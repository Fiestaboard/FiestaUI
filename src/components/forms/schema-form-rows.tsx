"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import {
  isSecretField,
  type JsonSchemaField,
  resolveSchemaControl,
  type SchemaControl,
  schemaEnumOptions,
  type SchemaOption,
  type SchemaSection,
} from "../../lib/schema-form/controls";
import { hiddenByBoard, isSchemaFieldVisible, type SchemaBoardFacts } from "../../lib/schema-form/visible-when";
import { cn } from "../../lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../containment/collapsible";
import { Text } from "../typography/text";
import { Field } from "./field";
import { Input } from "./input";
import { Label } from "./label";
import { SecretInput } from "./secret-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Switch } from "./switch";
import { Textarea } from "./textarea";
import { TimezonePicker } from "./timezone-picker";
import { Toggle, ToggleGroup } from "./toggle";
import { ToggleCard, ToggleCardGroup } from "./toggle-card";

/* ------------------------------------------------------------------ *
 * SchemaFormRows — a plugin's settings schema as form rows (slice 1.9c).
 *
 * Figma 08 P9 `65:34102` ("<SchemaForm schema /> field → control mapping
 * (semantic): secret → SecretInput · enum → Select · multi-enum →
 * checklist / chips · number → … · boolean → Switch") and P11 `65:35498`
 * (capability-aware controls: "render only supported controls + an
 * explainer row for the missing ones"). The web goalpost is 07d
 * `324:44888` (Integration · Muni Transit · Setup required): stacked rows,
 * a label over the control, the helper line under it, the error in red in
 * its place, chips for Lines.
 *
 * WHAT IT MAPS. The mapping lives in `lib/schema-form/controls.ts` and only
 * covers what ships (hub `91018934a`, 86 plugins, 4 outputs). Widgets that
 * need hub data — remote-options, page-picker, device-picker, tile-grid,
 * json-path-mapper — are the host's: pass a renderer in `widgets` and the
 * row hands it the field, value and wiring. Without one, a string falls
 * back to a text input and anything else to a row that says it can't be
 * edited here.
 *
 * VISIBILITY. `ui:visible_when` is the hub's grammar, evaluated exactly as
 * the hub does (`lib/schema-form/visible-when.ts`, same vectors). A field
 * hidden because of the BOARD (`@device_type`, `@device_model`) is, by
 * default, still listed as an explainer row (P11: "explain missing ones");
 * one hidden by a sibling value (Cloud mode hides the local key) just goes.
 *
 * SECRETS. The hub never returns a stored secret: it sends `"***"`. That
 * shows as an empty field reading "Saved — type to replace", with reveal
 * off. Typing replaces it; clearing the field puts `"***"` back, so the
 * saved key is kept.
 * ------------------------------------------------------------------ */

export const MASKED_SECRET = "***";

export interface SchemaWidgetProps {
  /** Dotted path, e.g. `location.stop_id`. */
  path: string;
  field: JsonSchemaField;
  /** The control's id; the row's label points at it. */
  id: string;
  label: string;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Ids of the helper and error lines, for `aria-describedby`. */
  describedBy?: string;
  invalid: boolean;
  required: boolean;
  disabled: boolean;
}

export type SchemaWidget = (props: SchemaWidgetProps) => React.ReactNode;

export interface SchemaFormRowsLabels {
  /** Screen-reader suffix on a required label. */
  required: string;
  /** Placeholder of a secret the hub holds (`"***"`). */
  secretSaved: string;
  /** SecretInput's reveal button. */
  show: string;
  hide: string;
  /** A select's placeholder. */
  choose: (title: string) => string;
  /** Under a one-per-line list. */
  onePerLine: string;
  /** Why a board-hidden field has no control (P11). */
  unavailable: (title: string, facts: SchemaBoardFacts | null) => string;
  /** A field this renderer has no control for and the host gave no widget. */
  unsupported: string;
}

export const DEFAULT_SCHEMA_FORM_ROWS_LABELS: SchemaFormRowsLabels = {
  required: "(required)",
  secretSaved: "Saved — type to replace",
  show: "Show",
  hide: "Hide",
  choose: (title) => `Choose ${title.toLowerCase()}`,
  onePerLine: "One per line.",
  unavailable: () => "Not available on this display.",
  unsupported: "This setting can't be edited here.",
};

export type SchemaFormRowsProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  /** The settings schema: an object with `properties`, optional `required` and `ui:sections`. */
  schema: JsonSchemaField;
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  /** The board the settings are for: read by `@device_type` / `@device_model`. */
  facts?: SchemaBoardFacts | null;
  /** Messages by dotted path; each replaces that row's helper line. */
  errors?: Record<string, React.ReactNode>;
  /** Host renderers by `ui:widget` name. */
  widgets?: Record<string, SchemaWidget>;
  /** Fields hidden by the board: `explain` (default) lists them; `hide` drops them. */
  unavailable?: "explain" | "hide";
  /** Top-level keys not to render, e.g. `enabled` when the page header owns it. */
  omit?: readonly string[];
  disabled?: boolean;
  labels?: Partial<SchemaFormRowsLabels>;
};

interface Ctx {
  facts: SchemaBoardFacts | null;
  errors: Record<string, React.ReactNode>;
  widgets: Record<string, SchemaWidget>;
  unavailable: "explain" | "hide";
  disabled: boolean;
  labels: SchemaFormRowsLabels;
  idBase: string;
}

/** Text-like controls stop at 07d's 420px; rows themselves are full width. */
const CONTROL_WIDTH = "sm:max-w-105";

function titleOf(key: string, field: JsonSchemaField) {
  return field.title ?? key;
}

function domId(base: string, path: string) {
  return `${base}-${path.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/* ---------------------------------------------------------------- *
 * Controls that sit inside a Field: Field clones its child with the id,
 * aria-describedby, aria-invalid and required, so each one forwards them.
 * ---------------------------------------------------------------- */

interface Wiring {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  required?: boolean;
}

function EnumSelect({
  options,
  value,
  onChange,
  label,
  placeholder,
  disabled,
  ...wiring
}: Wiring & {
  options: SchemaOption[];
  value: unknown;
  onChange: (next: SchemaOption["value"]) => void;
  label: string;
  placeholder: string;
  disabled: boolean;
}) {
  const selected = options.find((o) => o.value === value);
  return (
    <Select
      value={selected ? String(selected.value) : ""}
      onValueChange={(next) => {
        const option = options.find((o) => String(o.value) === next);
        if (option) onChange(option.value);
      }}
      disabled={disabled}
    >
      <SelectTrigger
        id={wiring.id}
        aria-label={label}
        aria-describedby={wiring["aria-describedby"]}
        aria-invalid={wiring["aria-invalid"]}
        aria-required={wiring.required || undefined}
        className={cn("w-full", CONTROL_WIDTH)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={String(o.value)} value={String(o.value)}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** One string per line. Keeps the raw text while typing, so a trailing newline survives. */
function LinesInput({
  value,
  onChange,
  disabled,
  ...wiring
}: Wiring & { value: unknown; onChange: (next: string[]) => void; disabled: boolean }) {
  const items = Array.isArray(value) ? value.map(String) : [];
  const [text, setText] = React.useState(items.join("\n"));
  const parse = (raw: string) =>
    raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  // Follow an outside change (a reset) without clobbering what is being typed.
  if (parse(text).join("\n") !== items.join("\n")) setText(items.join("\n"));
  return (
    <Textarea
      {...wiring}
      rows={3}
      disabled={disabled}
      className={CONTROL_WIDTH}
      value={text}
      onChange={(event) => {
        setText(event.target.value);
        onChange(parse(event.target.value));
      }}
    />
  );
}

/* ---------------------------------------------------------------- *
 * Rows
 * ---------------------------------------------------------------- */

/**
 * A setting this display or this page can't offer, said in place of its
 * control (P11: 06 Kitchen board "Brightness · Not adjustable — split-flap
 * has no backlight"). Also usable on its own in a display's settings.
 */
export function UnavailableSettingRow({
  title,
  reason,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & { title: React.ReactNode; reason: React.ReactNode }) {
  const id = React.useId();
  return (
    <div
      role="group"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-reason`}
      data-slot="unavailable-setting-row"
      className={cn("flex flex-col gap-1.5", className)}
      {...props}
    >
      <span id={`${id}-title`} className="text-sm leading-none font-medium text-muted-foreground">
        {title}
      </span>
      <Text id={`${id}-reason`} size="xs" tone="muted">
        {reason}
      </Text>
    </div>
  );
}

function GroupRow({
  labelId,
  label,
  required,
  requiredLabel,
  description,
  error,
  children,
}: {
  labelId: string;
  label: string;
  required: boolean;
  requiredLabel: string;
  description?: string;
  error?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div data-slot="schema-form-row" className="flex flex-col gap-1.5">
      <span id={labelId} className="text-sm leading-none font-medium">
        {label}
        {required ? (
          <>
            <span aria-hidden="true" className="ml-0.5 text-destructive">
              *
            </span>{" "}
            <span className="sr-only">{requiredLabel}</span>
          </>
        ) : null}
      </span>
      {children}
      {description ? (
        <Text id={`${labelId}-description`} size="xs" tone="muted">
          {description}
        </Text>
      ) : null}
      {error ? (
        <Text id={`${labelId}-error`} size="xs" tone="destructive">
          {error}
        </Text>
      ) : null}
    </div>
  );
}

function Row({
  ctx,
  name,
  path,
  field,
  value,
  onChange,
  required,
}: {
  ctx: Ctx;
  name: string;
  path: string;
  field: JsonSchemaField;
  value: unknown;
  onChange: (next: unknown) => void;
  required: boolean;
}) {
  const { labels, disabled } = ctx;
  const control: SchemaControl = resolveSchemaControl(field, Object.keys(ctx.widgets));
  const id = domId(ctx.idBase, path);
  const label = titleOf(name, field);
  const description = field.description;
  const error = ctx.errors[path];
  // Pickers show the default as the current choice. Typed fields leave an
  // absent value empty and show the default as the placeholder instead:
  // clearing one means "use the default", and refilling it under the
  // cursor would fight the person typing.
  const shown = value === undefined ? field.default : value;
  const placeholder =
    field["ui:placeholder"] ??
    (field.default != null && typeof field.default !== "object" ? String(field.default) : undefined);

  const field_ = (child: React.ReactElement) => (
    <Field
      label={label}
      description={control === "list" ? [description, labels.onePerLine].filter(Boolean).join(" ") : description}
      error={error}
      required={required}
      requiredLabel={labels.required}
      id={id}
      className="[&>[data-slot=field-content]]:min-w-0"
    >
      {child}
    </Field>
  );

  switch (control) {
    case "custom": {
      const Widget = ctx.widgets[field["ui:widget"] as string];
      const describedBy = error ? `${id}-error` : description ? `${id}-description` : undefined;
      return (
        <div data-slot="schema-form-row" data-control="custom" className="flex flex-col gap-1.5">
          <Label htmlFor={id}>{label}</Label>
          <Widget
            path={path}
            field={field}
            id={id}
            label={label}
            value={shown}
            onChange={onChange}
            describedBy={describedBy}
            invalid={Boolean(error)}
            required={required}
            disabled={disabled}
          />
          {description ? (
            <Text id={`${id}-description`} size="xs" tone="muted">
              {description}
            </Text>
          ) : null}
          {error ? (
            <Text id={`${id}-error`} size="xs" tone="destructive">
              {error}
            </Text>
          ) : null}
        </div>
      );
    }
    case "secret": {
      const saved = value === MASKED_SECRET;
      return field_(
        <SecretInput
          containerClassName={CONTROL_WIDTH}
          value={saved ? "" : typeof value === "string" ? value : ""}
          placeholder={saved ? labels.secretSaved : placeholder}
          revealDisabled={saved}
          showLabel={labels.show}
          hideLabel={labels.hide}
          autoComplete="off"
          disabled={disabled}
          // A saved secret stays saved while the field is empty: "required" is the hub's job then.
          required={required && !saved}
          onChange={(event) => onChange(event.target.value === "" && saved ? MASKED_SECRET : event.target.value)}
        />,
      );
    }
    case "select": {
      const options = schemaEnumOptions(field) as SchemaOption[];
      return field_(
        <EnumSelect
          options={options}
          value={shown}
          onChange={onChange}
          label={label}
          placeholder={placeholder ?? labels.choose(label)}
          disabled={disabled}
        />,
      );
    }
    case "cards": {
      const options = schemaEnumOptions(field) as SchemaOption[];
      const cards = (field["ui:options"]?.cards ?? []) as Array<{
        value?: unknown;
        title?: string;
        description?: string;
      }>;
      const labelId = `${id}-label`;
      return (
        <GroupRow
          labelId={labelId}
          label={label}
          required={required}
          requiredLabel={labels.required}
          description={description}
          error={error}
        >
          <ToggleCardGroup
            aria-labelledby={labelId}
            aria-describedby={error ? `${labelId}-error` : description ? `${labelId}-description` : undefined}
            columns="2"
            disabled={disabled}
            value={shown == null ? null : String(shown)}
            onValueChange={(next) => onChange(options.find((o) => String(o.value) === next)?.value)}
          >
            {options.map((o) => {
              const card = cards.find((c) => c.value === o.value);
              return (
                <ToggleCard
                  key={String(o.value)}
                  value={String(o.value)}
                  title={card?.title ?? o.label}
                  description={card?.description}
                />
              );
            })}
          </ToggleCardGroup>
        </GroupRow>
      );
    }
    case "checklist": {
      const options = schemaEnumOptions(field.items) as SchemaOption[];
      const picked = Array.isArray(shown) ? shown : [];
      const labelId = `${id}-label`;
      return (
        <GroupRow
          labelId={labelId}
          label={label}
          required={required}
          requiredLabel={labels.required}
          description={description}
          error={error}
        >
          <ToggleGroup
            multiple
            aria-labelledby={labelId}
            aria-describedby={error ? `${labelId}-error` : description ? `${labelId}-description` : undefined}
            disabled={disabled}
            className="flex-wrap"
            value={options.filter((o) => picked.includes(o.value)).map((o) => String(o.value))}
            onValueChange={(next) =>
              onChange(options.filter((o) => next.includes(String(o.value))).map((o) => o.value))
            }
          >
            {options.map((o) => (
              <Toggle key={String(o.value)} value={String(o.value)} variant="outline">
                {o.label}
              </Toggle>
            ))}
          </ToggleGroup>
        </GroupRow>
      );
    }
    case "switch": {
      const labelId = `${id}-label`;
      const describedBy = error ? `${id}-error` : description ? `${id}-description` : undefined;
      return (
        <div
          data-slot="schema-form-row"
          data-control="switch"
          className={cn("flex items-start justify-between gap-4", CONTROL_WIDTH)}
        >
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label id={labelId} htmlFor={id}>
              {label}
            </Label>
            {description ? (
              <Text id={`${id}-description`} size="xs" tone="muted">
                {description}
              </Text>
            ) : null}
            {error ? (
              <Text id={`${id}-error`} size="xs" tone="destructive">
                {error}
              </Text>
            ) : null}
          </div>
          <Switch
            id={id}
            aria-labelledby={labelId}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            disabled={disabled}
            checked={shown === true}
            onCheckedChange={(checked) => onChange(checked)}
          />
        </div>
      );
    }
    case "number":
      return field_(
        <Input
          type="number"
          inputMode={field.type === "integer" ? "numeric" : "decimal"}
          className={CONTROL_WIDTH}
          min={field.minimum}
          max={field.maximum}
          step={field.type === "integer" ? 1 : "any"}
          placeholder={placeholder}
          disabled={disabled}
          value={typeof value === "number" ? String(value) : ""}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "") return onChange(undefined);
            const parsed = field.type === "integer" ? Number.parseInt(raw, 10) : Number.parseFloat(raw);
            if (!Number.isNaN(parsed)) onChange(parsed);
          }}
        />,
      );
    case "timezone":
      return field_(
        <TimezonePicker
          className={CONTROL_WIDTH}
          value={typeof shown === "string" ? shown : undefined}
          onValueChange={(zone) => onChange(zone)}
          disabled={disabled}
        />,
      );
    case "textarea":
      return field_(
        <Textarea
          className={CONTROL_WIDTH}
          rows={3}
          placeholder={placeholder}
          disabled={disabled}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
        />,
      );
    case "list":
      return field_(<LinesInput value={shown} onChange={onChange} disabled={disabled} />);
    case "group": {
      const record = (shown && typeof shown === "object" ? shown : {}) as Record<string, unknown>;
      return (
        <fieldset data-slot="schema-form-group" className="flex min-w-0 flex-col gap-4 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">{label}</legend>
          {description ? (
            <Text size="xs" tone="muted">
              {description}
            </Text>
          ) : null}
          <Rows
            ctx={ctx}
            schema={field}
            keys={Object.keys(field.properties ?? {})}
            value={record}
            onChange={(next) => onChange(next)}
            pathPrefix={`${path}.`}
          />
        </fieldset>
      );
    }
    case "unsupported":
      return <UnavailableSettingRow title={label} reason={labels.unsupported} />;
    default: {
      const type = control === "url" ? "url" : control === "datetime" ? "datetime-local" : "text";
      return field_(
        <Input
          type={type}
          className={CONTROL_WIDTH}
          placeholder={placeholder}
          disabled={disabled}
          value={typeof value === "string" ? value : value == null ? "" : String(value)}
          onChange={(event) => onChange(event.target.value)}
        />,
      );
    }
  }
}

function Rows({
  ctx,
  schema,
  keys,
  value,
  onChange,
  pathPrefix,
}: {
  ctx: Ctx;
  schema: JsonSchemaField;
  keys: string[];
  value: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
  pathPrefix: string;
}) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  return (
    <>
      {keys.map((key) => {
        const field = properties[key];
        if (!field) return null;
        const cond = field["ui:visible_when"];
        if (!isSchemaFieldVisible(cond, value, properties, ctx.facts)) {
          if (ctx.unavailable === "explain" && hiddenByBoard(cond, value, properties, ctx.facts)) {
            const title = titleOf(key, field);
            return <UnavailableSettingRow key={key} title={title} reason={ctx.labels.unavailable(title, ctx.facts)} />;
          }
          return null;
        }
        return (
          <Row
            key={key}
            ctx={ctx}
            name={key}
            path={`${pathPrefix}${key}`}
            field={field}
            value={value[key]}
            required={required.has(key)}
            onChange={(next) => {
              const copy = { ...value };
              if (next === undefined) delete copy[key];
              else copy[key] = next;
              onChange(copy);
            }}
          />
        );
      })}
    </>
  );
}

function Section({ section, children }: { section: SchemaSection; children: React.ReactNode }) {
  const title = section.title ?? section.id.charAt(0).toUpperCase() + section.id.slice(1);
  const legendClass = "font-mono text-xs font-medium text-muted-foreground uppercase";
  if (section.collapsible) {
    return (
      <Collapsible defaultOpen={!section.collapsed} data-section={section.id} className="flex flex-col gap-4">
        <CollapsibleTrigger
          className={cn(
            legendClass,
            "focus-ring group flex w-fit items-center gap-1 rounded-sm hover:text-foreground [&_svg]:size-4",
          )}
        >
          {title}
          <ChevronDown aria-hidden="true" className="transition-transform group-data-[panel-open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-4">{children}</CollapsibleContent>
      </Collapsible>
    );
  }
  return (
    <fieldset data-section={section.id} className="flex min-w-0 flex-col gap-4">
      <legend className={cn(legendClass, "mb-4")}>{title}</legend>
      {children}
    </fieldset>
  );
}

function SchemaFormRows({
  schema,
  value,
  onChange,
  facts = null,
  errors = {},
  widgets = {},
  unavailable = "explain",
  omit = [],
  disabled = false,
  labels,
  className,
  ...props
}: SchemaFormRowsProps) {
  const ctx: Ctx = {
    facts,
    errors,
    widgets,
    unavailable,
    disabled,
    labels: { ...DEFAULT_SCHEMA_FORM_ROWS_LABELS, ...labels },
    idBase: React.useId(),
  };
  const keys = Object.keys(schema.properties ?? {}).filter((key) => !omit.includes(key));
  const sections = (schema["ui:sections"] ?? []).filter((s) => Array.isArray(s.fields));
  const inSection = new Set(sections.flatMap((s) => s.fields));
  const rows = (subset: string[]) => (
    <Rows ctx={ctx} schema={schema} keys={subset} value={value} onChange={onChange} pathPrefix="" />
  );

  return (
    <div data-slot="schema-form-rows" className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      {rows(keys.filter((key) => !inSection.has(key)))}
      {sections.map((section) => {
        const subset = section.fields.filter((key) => keys.includes(key));
        if (subset.length === 0) return null;
        return (
          <Section key={section.id} section={section}>
            {rows(subset)}
          </Section>
        );
      })}
    </div>
  );
}

export { SchemaFormRows };
export type { JsonSchemaField, SchemaBoardFacts, SchemaControl, SchemaOption, SchemaSection };
export { hiddenByBoard, isSchemaFieldVisible, isSecretField, resolveSchemaControl, schemaEnumOptions };
