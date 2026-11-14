import type { Meta, StoryObj } from "@storybook/react";
import { RefreshCw } from "lucide-react";
import * as React from "react";

import type { JsonSchemaField } from "../../lib/schema-form/controls";
import { Heading } from "../typography/heading";
import { Button } from "./button";
import { MASKED_SECRET, SchemaFormRows, type SchemaFormRowsProps, UnavailableSettingRow } from "./schema-form-rows";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

/**
 * 08 P9 `65:34102` (plugin schema → form rows) and P11 `65:35498` (capability-aware controls).
 * The web goalpost is 07d `324:44888`: Integration · Muni Transit · Setup required.
 */
const meta = {
  title: "Forms/SchemaFormRows",
  component: SchemaFormRows,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta<typeof SchemaFormRows>;

export default meta;
type Story = StoryObj<typeof meta>;

const MUNI: JsonSchemaField = {
  type: "object",
  required: ["api_key", "stop_id"],
  properties: {
    api_key: {
      type: "string",
      title: "511.org API key",
      description: "Stored on your hub only. Get one free at 511.org/open-data.",
      "ui:widget": "password",
    },
    stop_id: { type: "string", title: "Stop", "ui:placeholder": "Search stops" },
    lines: {
      type: "array",
      title: "Lines",
      items: { type: "string", enum: ["N", "J", "ALL"], enumNames: ["N Judah", "J Church", "All lines"] },
    },
  },
};

function Live(props: Omit<SchemaFormRowsProps, "onChange">) {
  const [value, setValue] = React.useState(props.value);
  return <SchemaFormRows {...props} value={value} onChange={setValue} />;
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex w-full max-w-[717px] flex-col gap-5 rounded-xl border bg-card p-6">{children}</section>
  );
}

/** 07d `324:44888`: the Settings card while Muni Transit needs setup — a typed key, a stop the hub can't find yet, N Judah picked. */
export const MuniTransitSetup: Story = {
  args: {
    schema: MUNI,
    value: { api_key: "a1b2c3d4e5f6g7h8i", stop_id: "Judah St & 9th Ave · 15192", lines: ["N"] },
    errors: { stop_id: "Not found yet — test the key first, then search stops." },
    onChange: () => {},
  },
  render: (args) => (
    <SettingsCard>
      <Heading level={2} size="lg">
        Settings
      </Heading>
      <Live {...args} />
      <div className="flex flex-wrap gap-3">
        <Button>Save</Button>
        <Button variant="outline">
          <RefreshCw aria-hidden="true" />
          Test connection
        </Button>
      </div>
    </SettingsCard>
  ),
};

/** A key the hub already holds comes back as `"***"`: empty, "Saved — type to replace", reveal off. */
export const SavedSecret: Story = {
  args: {
    ...MuniTransitSetup.args,
    value: { api_key: MASKED_SECRET, stop_id: "Church & Duboce · In", lines: ["N", "J"] },
    errors: {},
  },
  render: MuniTransitSetup.render,
};

/** Every control the mapping produces, from shipped schemas (weather, calendar-sub, countdown, stocks, generative-ai-art). */
export const EveryControl: Story = {
  args: {
    schema: {
      type: "object",
      required: ["location"],
      properties: {
        location: { type: "string", title: "Location", description: "A city or ZIP code." },
        units: { type: "string", title: "Units", enum: ["imperial", "metric"], enumNames: ["°F", "°C"] },
        minutes_before: {
          type: "integer",
          title: "Remind me",
          enum: [5, 10, 15],
          enumNames: ["5 minutes before", "10 minutes before", "15 minutes before"],
        },
        refresh_minutes: { type: "integer", title: "Refresh every (minutes)", minimum: 1, maximum: 60, default: 5 },
        show_feels_like: { type: "boolean", title: "Show “feels like”", description: "Adds a second temperature." },
        timezone: { type: "string", title: "Time zone", "ui:widget": "timezone" },
        calendar_url: { type: "string", title: "Calendar address", "ui:widget": "url" },
        symbols: { type: "array", title: "Symbols", items: { type: "string" } },
        prompt: { type: "string", title: "Prompt", format: "textarea", "ui:placeholder": "A taco truck at sunset" },
        api_key: { type: "string", title: "API key", secret: true },
      },
    },
    value: {
      location: "San Francisco",
      units: "imperial",
      show_feels_like: true,
      timezone: "America/Los_Angeles",
      symbols: ["AAPL", "TSLA"],
    },
    onChange: () => {},
  },
  render: (args) => (
    <SettingsCard>
      <Live {...args} />
    </SettingsCard>
  ),
};

const VESTABOARD: JsonSchemaField = {
  type: "object",
  "ui:sections": [{ id: "advanced", title: "Advanced", fields: ["port"], collapsible: true, collapsed: true }],
  properties: {
    api_mode: {
      type: "string",
      title: "Connection",
      enum: ["local", "cloud"],
      default: "local",
      "ui:widget": "mode-cards",
      "ui:options": {
        cards: [
          { value: "local", title: "Local API", description: "Fastest. The board and hub share a network." },
          { value: "cloud", title: "Cloud API", description: "Works anywhere; updates can lag." },
        ],
      },
    },
    local_api_key: {
      type: "string",
      title: "Local API key",
      secret: true,
      "ui:visible_when": { api_mode: "local", "@device_type": ["flagship", "note"] },
    },
    note_array_token: {
      type: "string",
      title: "Note array token",
      secret: true,
      "ui:visible_when": { api_mode: "local", "@device_type": "note_array" },
    },
    port: { type: "integer", title: "Port", minimum: 1, maximum: 65535, default: 7000 },
  },
};

/**
 * P11: the Kitchen board is a Flagship, so the note-array token is not a control — it is said, in
 * place, with the reason. The advanced section starts collapsed, as the schema asks (opening it is
 * covered by the unit tests, so this shot keeps the schema's own state).
 */
export const CapabilityAware: Story = {
  args: { schema: VESTABOARD, value: { api_mode: "local" }, facts: { device_type: "flagship" }, onChange: () => {} },
  render: (args) => (
    <SettingsCard>
      <Heading level={2} size="lg">
        Kitchen board
      </Heading>
      <Live {...args} labels={{ unavailable: () => "Only a Note array uses a token. This board is a Flagship." }} />
    </SettingsCard>
  ),
};

/** P11 outside a schema: 06 Kitchen board's "Brightness · Not adjustable — split-flap has no backlight". */
export const UnavailableRow: Story = {
  args: { schema: { type: "object" }, value: {}, onChange: () => {} },
  render: () => (
    <SettingsCard>
      <UnavailableSettingRow title="Brightness" reason="Not adjustable — split-flap has no backlight." />
    </SettingsCard>
  ),
};

/** A hub-data widget (`page-picker`) rendered by the host; the row still owns label, helper and error. */
export const HostWidget: Story = {
  args: {
    schema: {
      type: "object",
      properties: {
        trigger_page_id: {
          type: "string",
          title: "Page to show",
          description: "Shown when a new order comes in.",
          "ui:widget": "page-picker",
        },
      },
    },
    value: { trigger_page_id: "dinner" },
    widgets: {
      "page-picker": ({ id, value, onChange, describedBy, label }) => (
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger id={id} aria-label={label} aria-describedby={describedBy} className="w-full sm:max-w-105">
            <SelectValue placeholder="Choose a page" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="dinner">Dinner note</SelectItem>
            <SelectItem value="market">Market open</SelectItem>
          </SelectContent>
        </Select>
      ),
    },
    onChange: () => {},
  },
  render: (args) => (
    <SettingsCard>
      <Live {...args} />
    </SettingsCard>
  ),
};

/** While a save is in flight every control is disabled. */
export const Disabled: Story = {
  args: { ...MuniTransitSetup.args, errors: {}, disabled: true },
  render: (args) => (
    <SettingsCard>
      <Live {...args} />
    </SettingsCard>
  ),
};
