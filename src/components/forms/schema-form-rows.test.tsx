import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import type { JsonSchemaField } from "../../lib/schema-form/controls";
import { MASKED_SECRET, SchemaFormRows, type SchemaFormRowsProps, UnavailableSettingRow } from "./schema-form-rows";

/** Muni Transit as 07d `324:44888` draws it, plus the other shipped shapes. */
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
    refresh: { type: "integer", title: "Refresh every (min)", minimum: 1, maximum: 60, default: 1 },
    minutes_only: { type: "boolean", title: "Minutes only", description: "“4 MIN” instead of “9:45”" },
    units: { type: "string", title: "Units", enum: ["imperial", "metric"], enumNames: ["°F", "°C"] },
  },
};

function Harness({
  initial = {},
  onValue,
  ...props
}: Omit<SchemaFormRowsProps, "value" | "onChange"> & {
  initial?: Record<string, unknown>;
  onValue?: (v: Record<string, unknown>) => void;
}) {
  const [value, setValue] = React.useState(initial);
  return (
    <SchemaFormRows
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onValue?.(next);
      }}
    />
  );
}

function setup(props: Partial<React.ComponentProps<typeof Harness>> = {}) {
  const onValue = vi.fn();
  const user = userEvent.setup();
  const utils = render(<Harness schema={MUNI} onValue={onValue} {...props} />);
  return { ...utils, onValue, user, last: () => onValue.mock.lastCall?.[0] as Record<string, unknown> };
}

describe("SchemaFormRows", () => {
  it("renders one labelled row per property, in schema order", () => {
    const { container } = setup();
    const rows = container.querySelectorAll('[data-slot="schema-form-rows"] > *');
    expect(rows).toHaveLength(6);
    expect(screen.getByLabelText(/511\.org API key/)).toHaveAttribute("type", "password");
    expect(screen.getByRole("textbox", { name: /Stop/ })).toHaveAttribute("placeholder", "Search stops");
    expect(screen.getByRole("group", { name: "Lines" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Refresh every (min)" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "Minutes only" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Units" })).toBeInTheDocument();
  });

  it("marks required fields in the name and on the control, and wires the helper line", () => {
    setup();
    const stop = screen.getByRole("textbox", { name: "Stop (required)" });
    expect(stop).toBeRequired();
    const key = screen.getByLabelText(/511\.org API key/);
    expect(key).toHaveAccessibleDescription("Stored on your hub only. Get one free at 511.org/open-data.");
  });

  it("puts an error in place of the helper line and marks the control invalid", () => {
    setup({ errors: { stop_id: "Not found yet — test the key first, then search stops." } });
    const stop = screen.getByRole("textbox", { name: /Stop/ });
    expect(stop).toHaveAttribute("aria-invalid", "true");
    expect(stop).toHaveAccessibleDescription("Not found yet — test the key first, then search stops.");
  });

  it("writes text, keeping the other values", async () => {
    const { user, last } = setup({ initial: { units: "metric" } });
    await user.type(screen.getByRole("textbox", { name: /Stop/ }), "15192");
    expect(last()).toEqual({ units: "metric", stop_id: "15192" });
  });

  describe("secrets", () => {
    it("shows a saved secret as empty, says so, and keeps it when cleared", async () => {
      const { user, last } = setup({ initial: { api_key: MASKED_SECRET } });
      const key = screen.getByLabelText(/511\.org API key/) as HTMLInputElement;
      expect(key.value).toBe("");
      expect(key).toHaveAttribute("placeholder", "Saved — type to replace");
      expect(key).not.toBeRequired();
      expect(screen.getByRole("button", { name: "Show" })).toBeDisabled();
      await user.type(key, "k");
      expect(last()).toMatchObject({ api_key: "k" });
      await user.clear(key);
      expect(last()).toMatchObject({ api_key: "" });
    });

    it("clearing the field while still masked keeps the saved secret", async () => {
      const onChange = vi.fn();
      render(<SchemaFormRows schema={MUNI} value={{ api_key: MASKED_SECRET }} onChange={onChange} />);
      const key = screen.getByLabelText(/511\.org API key/);
      // Simulate a change event that empties an already-empty masked field (autofill reset).
      const { fireEvent } = await import("@testing-library/react");
      fireEvent.change(key, { target: { value: "x" } });
      expect(onChange).toHaveBeenLastCalledWith({ api_key: "x" });
      onChange.mockClear();
      (key as HTMLInputElement).value = "x";
      fireEvent.change(key, { target: { value: "" } });
      expect(onChange).toHaveBeenLastCalledWith({ api_key: MASKED_SECRET });
    });

    it("treats secret: true like the password widget, and an unset secret as a plain empty field", () => {
      render(
        <SchemaFormRows
          schema={{ type: "object", properties: { token: { type: "string", title: "Token", secret: true } } }}
          value={{}}
          onChange={() => {}}
        />,
      );
      const token = screen.getByLabelText("Token") as HTMLInputElement;
      expect(token).toHaveAttribute("type", "password");
      expect(token.value).toBe("");
      expect(screen.getByRole("button", { name: "Show" })).toBeEnabled();
    });
  });

  it("numbers: the default is the placeholder; integers parse; clearing means absent", async () => {
    const { user, last } = setup({ initial: { refresh: 2 } });
    const refresh = screen.getByRole("spinbutton", { name: "Refresh every (min)" });
    expect(refresh).toHaveValue(2);
    expect(refresh).toHaveAttribute("placeholder", "1");
    expect(refresh).toHaveAttribute("min", "1");
    expect(refresh).toHaveAttribute("max", "60");
    expect(refresh).toHaveAttribute("step", "1");
    await user.clear(refresh);
    expect(last()).toEqual({});
    await user.type(refresh, "5");
    expect(last()).toEqual({ refresh: 5 });
  });

  it("numbers: decimals for type number", async () => {
    const onChange = vi.fn();
    const { fireEvent } = await import("@testing-library/react");
    render(
      <SchemaFormRows
        schema={{ type: "object", properties: { lat: { type: "number", title: "Latitude" } } }}
        value={{}}
        onChange={onChange}
      />,
    );
    const lat = screen.getByRole("spinbutton", { name: "Latitude" });
    expect(lat).toHaveAttribute("step", "any");
    expect(lat).toHaveValue(null);
    fireEvent.change(lat, { target: { value: "37.76" } });
    expect(onChange).toHaveBeenLastCalledWith({ lat: 37.76 });
    onChange.mockClear();
    fireEvent.change(lat, { target: { value: "-" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("booleans are a switch beside their label", async () => {
    const { user, last } = setup();
    const sw = screen.getByRole("switch", { name: "Minutes only" });
    expect(sw).toHaveAccessibleDescription("“4 MIN” instead of “9:45”");
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(last()).toEqual({ minutes_only: true });
  });

  it("multi-enum is a group of chips that writes typed values", async () => {
    const { user, last } = setup({ initial: { lines: ["N"] } });
    const group = screen.getByRole("group", { name: "Lines" });
    expect(within(group).getByRole("button", { name: "N Judah" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(group).getByRole("button", { name: "J Church" }));
    expect(last()).toEqual({ lines: ["N", "J"] });
  });

  it("an enum is a select showing the chosen name", () => {
    setup({ initial: { units: "metric" } });
    expect(screen.getByRole("combobox", { name: "Units" })).toHaveTextContent("°C");
  });

  it("a select writes the option's typed value back", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SchemaFormRows
        schema={{
          type: "object",
          properties: {
            minutes_before: { type: "integer", title: "Remind me", enum: [5, 10], enumNames: ["5 min", "10 min"] },
          },
        }}
        value={{}}
        onChange={onChange}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "Remind me" });
    expect(trigger).toHaveTextContent("Choose remind me");
    await user.click(trigger);
    await user.click(await screen.findByRole("option", { name: "10 min" }));
    expect(onChange).toHaveBeenLastCalledWith({ minutes_before: 10 });
  });

  it("mode-cards is a radiogroup of cards titled from ui:options.cards", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <SchemaFormRows
        schema={{
          type: "object",
          properties: {
            api_mode: {
              type: "string",
              title: "Connection",
              enum: ["local", "cloud"],
              "ui:widget": "mode-cards",
              "ui:options": { cards: [{ value: "local", title: "Local API", description: "Fastest; same network" }] },
            },
          },
        }}
        value={{ api_mode: "local" }}
        onChange={onChange}
      />,
    );
    const group = screen.getByRole("radiogroup", { name: "Connection" });
    expect(within(group).getByRole("radio", { name: /Local API/ })).toHaveAttribute("aria-checked", "true");
    await user.click(within(group).getByRole("radio", { name: /cloud/ }));
    expect(onChange).toHaveBeenLastCalledWith({ api_mode: "cloud" });
  });

  it("textarea, url, datetime, timezone and plain text get their own controls", async () => {
    const onChange = vi.fn();
    const { fireEvent } = await import("@testing-library/react");
    render(
      <SchemaFormRows
        schema={{
          type: "object",
          properties: {
            prompt: { type: "string", title: "Prompt", format: "textarea" },
            feed: { type: "string", title: "Feed", "ui:widget": "url" },
            target: { type: "string", title: "Target", "ui:widget": "datetime" },
            tz: { type: "string", title: "Time zone", "ui:widget": "timezone" },
            seed: { type: "string", title: "Seed" },
          },
        }}
        value={{ seed: 42 as never }}
        onChange={onChange}
      />,
    );
    const prompt = screen.getByRole("textbox", { name: "Prompt" });
    expect(prompt.tagName).toBe("TEXTAREA");
    fireEvent.change(prompt, { target: { value: "tacos" } });
    expect(onChange).toHaveBeenLastCalledWith({ seed: 42, prompt: "tacos" });
    expect(screen.getByRole("textbox", { name: "Feed" })).toHaveAttribute("type", "url");
    expect(screen.getByLabelText("Target")).toHaveAttribute("type", "datetime-local");
    expect(screen.getByRole("combobox", { name: "Time zone" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Seed" })).toHaveValue("42");
  });

  it("a string list is one item per line", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    function ListHarness() {
      const [value, setValue] = React.useState<Record<string, unknown>>({ symbols: ["AAPL"] });
      return (
        <SchemaFormRows
          schema={{
            type: "object",
            properties: { symbols: { type: "array", title: "Symbols", items: { type: "string" } } },
          }}
          value={value}
          onChange={(next) => {
            setValue(next);
            onChange(next);
          }}
        />
      );
    }
    render(<ListHarness />);
    const box = screen.getByRole("textbox", { name: "Symbols" });
    expect(box).toHaveAccessibleDescription("One per line.");
    await user.type(box, "{Enter}tsla");
    expect(onChange).toHaveBeenLastCalledWith({ symbols: ["AAPL", "tsla"] });
    expect(box).toHaveValue("AAPL\ntsla");
  });

  it("a list follows an outside reset", () => {
    const schema: JsonSchemaField = {
      type: "object",
      properties: { symbols: { type: "array", title: "Symbols", description: "Tickers.", items: { type: "string" } } },
    };
    const { rerender } = render(<SchemaFormRows schema={schema} value={{ symbols: ["A"] }} onChange={() => {}} />);
    rerender(<SchemaFormRows schema={schema} value={{ symbols: "nope" as never }} onChange={() => {}} />);
    const box = screen.getByRole("textbox", { name: "Symbols" });
    expect(box).toHaveValue("");
    expect(box).toHaveAccessibleDescription("Tickers. One per line.");
  });

  it("a nested object is a fieldset of its own rows", async () => {
    const onChange = vi.fn();
    const { fireEvent } = await import("@testing-library/react");
    render(
      <SchemaFormRows
        schema={{
          type: "object",
          properties: {
            location: {
              type: "object",
              title: "Location",
              description: "Where to read the weather for.",
              required: ["city"],
              properties: { city: { type: "string", title: "City" } },
            },
          },
        }}
        value={{ location: { city: "SF" } }}
        onChange={onChange}
        errors={{ "location.city": "Unknown city." }}
      />,
    );
    const group = screen.getByRole("group", { name: "Location" });
    const city = within(group).getByRole("textbox", { name: /City/ });
    expect(city).toBeRequired();
    expect(city).toHaveAccessibleDescription("Unknown city.");
    fireEvent.change(city, { target: { value: "Oakland" } });
    expect(onChange).toHaveBeenLastCalledWith({ location: { city: "Oakland" } });
  });

  it("an empty nested object starts from nothing", async () => {
    const onChange = vi.fn();
    const { fireEvent } = await import("@testing-library/react");
    render(
      <SchemaFormRows
        schema={{ type: "object", properties: { loc: { type: "object", properties: { a: { type: "string" } } } } }}
        value={{}}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox", { name: "a" }), { target: { value: "x" } });
    expect(onChange).toHaveBeenLastCalledWith({ loc: { a: "x" } });
  });

  it("says when it cannot edit a field and the host gave no widget", () => {
    render(
      <SchemaFormRows
        schema={{
          type: "object",
          properties: {
            reminders: { type: "array", title: "Reminders", items: { type: "object", properties: {} } },
            ghost: undefined as never,
          },
        }}
        value={{}}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("group", { name: "Reminders" })).toHaveAccessibleDescription(
      "This setting can't be edited here.",
    );
  });

  describe("host widgets", () => {
    it("hands the field, value and wiring to the host renderer", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      const PagePicker = vi.fn(
        (props: {
          id: string;
          value: unknown;
          onChange: (v: unknown) => void;
          describedBy?: string;
          invalid: boolean;
          required: boolean;
        }) => (
          <button
            type="button"
            id={props.id}
            aria-describedby={props.describedBy}
            onClick={() => props.onChange("page-2")}
          >
            {String(props.value ?? "Pick a page")}
          </button>
        ),
      );
      render(
        <SchemaFormRows
          schema={{
            type: "object",
            required: ["trigger_page_id"],
            properties: {
              trigger_page_id: {
                type: "string",
                title: "Page",
                description: "Shown on a trigger.",
                "ui:widget": "page-picker",
              },
            },
          }}
          value={{}}
          onChange={onChange}
          widgets={{ "page-picker": PagePicker }}
        />,
      );
      const button = screen.getByRole("button", { name: "Page" });
      expect(button).toHaveAccessibleDescription("Shown on a trigger.");
      expect(PagePicker.mock.lastCall?.[0]).toMatchObject({ path: "trigger_page_id", required: true, invalid: false });
      await user.click(button);
      expect(onChange).toHaveBeenLastCalledWith({ trigger_page_id: "page-2" });
    });

    it("points the host control at the error when there is one", () => {
      render(
        <SchemaFormRows
          schema={{ type: "object", properties: { p: { type: "string", title: "P", "ui:widget": "remote-options" } } }}
          value={{}}
          onChange={() => {}}
          errors={{ p: "Pick one." }}
          widgets={{
            "remote-options": (props) => (
              <input id={props.id} aria-describedby={props.describedBy} aria-invalid={props.invalid} />
            ),
          }}
        />,
      );
      expect(screen.getByRole("textbox", { name: "P" })).toHaveAccessibleDescription("Pick one.");
    });

    it("falls back to a text input for an unrendered string widget", () => {
      render(
        <SchemaFormRows
          schema={{
            type: "object",
            properties: { p: { type: "string", title: "Stop", "ui:widget": "remote-options" } },
          }}
          value={{ p: "15192" }}
          onChange={() => {}}
        />,
      );
      expect(screen.getByRole("textbox", { name: "Stop" })).toHaveValue("15192");
    });
  });

  describe("visibility and capabilities (P11)", () => {
    const VESTA: JsonSchemaField = {
      type: "object",
      properties: {
        api_mode: { type: "string", title: "Connection", enum: ["local", "cloud"], default: "cloud" },
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
      },
    };

    it("drops a field a sibling hides, silently", () => {
      render(<SchemaFormRows schema={VESTA} value={{}} onChange={() => {}} facts={{ device_type: "flagship" }} />);
      expect(screen.queryByText("Local API key")).toBeNull();
      expect(screen.queryByText("Note array token")).toBeNull();
    });

    it("explains a field the board hides, and shows the one it allows", () => {
      render(
        <SchemaFormRows
          schema={VESTA}
          value={{ api_mode: "local" }}
          onChange={() => {}}
          facts={{ device_type: "flagship" }}
        />,
      );
      expect(screen.getByLabelText("Local API key")).toBeInTheDocument();
      const row = screen.getByRole("group", { name: "Note array token" });
      expect(row).toHaveAttribute("data-slot", "unavailable-setting-row");
      expect(row).toHaveAccessibleDescription("Not available on this display.");
    });

    it("takes a reason per field and display, or hides the rows instead", () => {
      const { rerender } = render(
        <SchemaFormRows
          schema={VESTA}
          value={{ api_mode: "local" }}
          onChange={() => {}}
          facts={{ device_type: "note_array" }}
          labels={{ unavailable: (title, facts) => `${title}: not on a ${String(facts?.device_type)}.` }}
        />,
      );
      expect(screen.getByRole("group", { name: "Local API key" })).toHaveAccessibleDescription(
        "Local API key: not on a note_array.",
      );
      rerender(
        <SchemaFormRows
          schema={VESTA}
          value={{ api_mode: "local" }}
          onChange={() => {}}
          facts={{ device_type: "note_array" }}
          unavailable="hide"
        />,
      );
      expect(screen.queryByText("Local API key")).toBeNull();
    });
  });

  describe("sections", () => {
    const WOW: JsonSchemaField = {
      type: "object",
      "ui:sections": [
        { id: "character", fields: ["realm", "character"] },
        { id: "advanced", title: "Advanced", fields: ["port"], collapsible: true, collapsed: true },
        { id: "empty", fields: ["nope"] },
        { id: "broken" } as never,
      ],
      properties: {
        region: { type: "string", title: "Region" },
        realm: { type: "string", title: "Realm" },
        character: { type: "string", title: "Character" },
        port: { type: "integer", title: "Port" },
      },
    };

    it("renders unsectioned fields first, then each section with its legend", () => {
      const { container } = render(<SchemaFormRows schema={WOW} value={{}} onChange={() => {}} />);
      const character = screen.getByRole("group", { name: "Character" });
      expect(within(character).getByRole("textbox", { name: "Realm" })).toBeInTheDocument();
      const first = container.querySelector('[data-slot="schema-form-rows"]')?.firstElementChild;
      expect(first).toHaveTextContent("Region");
      expect(container.querySelector('[data-section="empty"]')).toBeNull();
    });

    it("a collapsible section starts as the schema says and opens on click", async () => {
      const user = userEvent.setup();
      render(<SchemaFormRows schema={WOW} value={{}} onChange={() => {}} />);
      const trigger = screen.getByRole("button", { name: "Advanced" });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
      await user.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("spinbutton", { name: "Port" })).toBeInTheDocument();
    });
  });

  it("omit leaves keys out; disabled reaches every control", () => {
    render(<SchemaFormRows schema={MUNI} value={{}} onChange={() => {}} omit={["units"]} disabled />);
    expect(screen.queryByRole("combobox", { name: "Units" })).toBeNull();
    expect(screen.getByRole("textbox", { name: /Stop/ })).toBeDisabled();
    expect(screen.getByRole("switch", { name: "Minutes only" })).toBeDisabled();
  });

  it("renders nothing for a schema with no properties", () => {
    const { container } = render(<SchemaFormRows schema={{ type: "object" }} value={{}} onChange={() => {}} />);
    expect(container.querySelector('[data-slot="schema-form-rows"]')?.childElementCount).toBe(0);
  });
});

describe("UnavailableSettingRow", () => {
  it("is a named group described by its reason, with no control", () => {
    render(<UnavailableSettingRow title="Brightness" reason="Not adjustable — split-flap has no backlight" />);
    const row = screen.getByRole("group", { name: "Brightness" });
    expect(row).toHaveAccessibleDescription("Not adjustable — split-flap has no backlight");
    expect(within(row).queryByRole("button")).toBeNull();
  });
});
