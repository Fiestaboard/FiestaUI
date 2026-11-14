import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_SCHEDULE_ENTRY,
  formatSunOffset,
  normalizeScheduleEntry,
  ScheduleEntryForm,
  type ScheduleEntryValue,
  validateScheduleEntry,
} from "./schedule-entry-form";

/*
 * ScheduleEntryForm (slice 1.9a, C27). The value IS the hub's ScheduleEntry
 * (FiestaBoard src/schedules/models.py): the same snake_case field names and
 * the same rules as `ScheduleEntry.validate_config`, so a host can send
 * `normalizeScheduleEntry(value)` to POST/PUT /schedules without mapping.
 */

const TARGETS = [
  { value: "page-brunch", label: "Weekend brunch", kind: "page" as const },
  { value: "page-night", label: "Good night", kind: "page" as const },
  { value: "collection-morning", label: "Weekday mornings", kind: "collection" as const },
];

function entry(over: Partial<ScheduleEntryValue> = {}): ScheduleEntryValue {
  return { ...DEFAULT_SCHEDULE_ENTRY, page_id: "page-brunch", ...over };
}

function renderForm(props: Partial<React.ComponentProps<typeof ScheduleEntryForm>> = {}) {
  const onSubmit = vi.fn();
  const onValueChange = vi.fn();
  render(
    <ScheduleEntryForm
      targets={TARGETS}
      defaultValue={entry()}
      onSubmit={onSubmit}
      onValueChange={onValueChange}
      {...props}
    />,
  );
  return { onSubmit, onValueChange };
}

function lastValue(fn: ReturnType<typeof vi.fn>): ScheduleEntryValue {
  return fn.mock.calls.at(-1)?.[0] as ScheduleEntryValue;
}

describe("validateScheduleEntry (hub validate_config parity)", () => {
  it("accepts a complete weekly entry", () => {
    expect(validateScheduleEntry(entry())).toEqual({});
  });

  it("requires a page or collection", () => {
    expect(validateScheduleEntry(entry({ page_id: "" }))).toEqual({ page_id: "required" });
  });

  it("rejects a zero-length fixed range but allows a midnight rollover and open-ended", () => {
    expect(validateScheduleEntry(entry({ start_time: "09:00", end_time: "09:00" }))).toEqual({ end_time: "same" });
    expect(validateScheduleEntry(entry({ start_time: "23:00", end_time: "03:00" }))).toEqual({});
    expect(validateScheduleEntry(entry({ start_time: "09:00", end_time: null }))).toEqual({});
  });

  it("rejects malformed times", () => {
    expect(validateScheduleEntry(entry({ start_time: "24:00" }))).toEqual({ start_time: "format" });
    expect(validateScheduleEntry(entry({ end_time: "7pm" }))).toEqual({ end_time: "format" });
  });

  it("requires at least one custom day", () => {
    expect(validateScheduleEntry(entry({ day_pattern: "custom", custom_days: [] }))).toEqual({
      custom_days: "required",
    });
    expect(validateScheduleEntry(entry({ day_pattern: "custom", custom_days: null }))).toEqual({
      custom_days: "required",
    });
    expect(validateScheduleEntry(entry({ day_pattern: "custom", custom_days: ["friday"] }))).toEqual({});
  });

  it("requires real dates for yearly and one-off entries, and an end on or after the start", () => {
    expect(validateScheduleEntry(entry({ recurrence_type: "annual_date", annual_date: null }))).toEqual({
      annual_date: "required",
    });
    expect(validateScheduleEntry(entry({ recurrence_type: "annual_date", annual_date: "02-30" }))).toEqual({
      annual_date: "format",
    });
    expect(
      validateScheduleEntry(entry({ recurrence_type: "annual_date", annual_date: "02-29", annual_end_date: "13-01" })),
    ).toEqual({ annual_end_date: "format" });
    expect(validateScheduleEntry(entry({ recurrence_type: "one_off_date", one_off_date: null }))).toEqual({
      one_off_date: "required",
    });
    expect(validateScheduleEntry(entry({ recurrence_type: "one_off_date", one_off_date: "2026-02-30" }))).toEqual({
      one_off_date: "format",
    });
    expect(
      validateScheduleEntry(
        entry({ recurrence_type: "one_off_date", one_off_date: "2026-11-07", one_off_end_date: "2026-11-06" }),
      ),
    ).toEqual({ one_off_end_date: "before" });
    expect(
      validateScheduleEntry(
        entry({ recurrence_type: "one_off_date", one_off_date: "2026-11-07", one_off_end_date: "2026-11-0x" }),
      ),
    ).toEqual({ one_off_end_date: "format" });
  });
});

describe("normalizeScheduleEntry", () => {
  it("clears the fields the chosen recurrence and time types do not use", () => {
    const out = normalizeScheduleEntry(
      entry({
        start_type: "fixed",
        start_sun_offset: 30,
        end_type: "fixed",
        end_sun_offset: -15,
        recurrence_type: "weekly",
        day_pattern: "weekends",
        custom_days: ["monday"],
        annual_date: "11-07",
        one_off_date: "2026-11-07",
      }),
    );
    expect(out.start_sun_offset).toBe(0);
    expect(out.end_sun_offset).toBe(0);
    expect(out.custom_days).toBeNull();
    expect(out.annual_date).toBeNull();
    expect(out.one_off_date).toBeNull();
  });

  it("keeps the yearly and one-off fields only for their recurrence, and custom days only for custom", () => {
    const annual = normalizeScheduleEntry(
      entry({ recurrence_type: "annual_date", annual_date: "11-07", custom_days: ["monday"], one_off_date: "x" }),
    );
    expect(annual).toMatchObject({
      annual_date: "11-07",
      custom_days: null,
      one_off_date: null,
      one_off_end_date: null,
    });
    const once = normalizeScheduleEntry(
      entry({ recurrence_type: "one_off_date", one_off_date: "2026-11-07", annual_date: "11-07" }),
    );
    expect(once).toMatchObject({ one_off_date: "2026-11-07", annual_date: null, annual_end_date: null });
    const custom = normalizeScheduleEntry(entry({ day_pattern: "custom", custom_days: ["friday", "monday"] }));
    expect(custom.custom_days).toEqual(["monday", "friday"]);
    const sun = normalizeScheduleEntry(entry({ start_type: "sunset", start_sun_offset: -30, end_type: "sunrise" }));
    expect(sun.start_sun_offset).toBe(-30);
  });
});

describe("formatSunOffset", () => {
  it("says the offset in words", () => {
    expect(formatSunOffset(0, "sunrise")).toBe("At sunrise");
    expect(formatSunOffset(30, "sunset")).toBe("30 min after sunset");
    expect(formatSunOffset(-75, "sunrise")).toBe("1 h 15 min before sunrise");
    expect(formatSunOffset(120, "sunset")).toBe("2 h after sunset");
  });
});

describe("ScheduleEntryForm", () => {
  it("lays out the hub's fields as labelled touch controls", () => {
    renderForm();
    expect(screen.getByRole("combobox", { name: /Page or Collection/ }).dataset.size).toBe("touch");
    for (const name of ["Starts", "Ends", "Repeat", "Days"]) {
      const group = screen.getByRole("radiogroup", { name });
      for (const radio of within(group).getAllByRole("radio")) expect(radio.dataset.size).toBe("touch");
    }
    expect(screen.getByLabelText("Start time")).toHaveProperty("type", "time");
    expect(screen.getByLabelText("End time")).toHaveProperty("value", "13:00");
    expect(screen.getByRole("switch", { name: "Entry is on" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: "Save" }).dataset.size).toBe("touch");
    expect(screen.queryByRole("button", { name: "Delete entry…" })).toBeNull();
  });

  it("uses the default sizes when size is default", () => {
    renderForm({ size: "default", onDelete: vi.fn() });
    expect(screen.getByRole("button", { name: "Save" }).dataset.size).toBe("default");
    expect(screen.getByLabelText("Start time").dataset.size).toBe("default");
    expect(within(screen.getByRole("radiogroup", { name: "Starts" })).getAllByRole("radio")[0].dataset.size).toBe("md");
  });

  it("submits the normalized hub entry", () => {
    const { onSubmit } = renderForm({ defaultValue: entry({ start_sun_offset: 45 }) });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ page_id: "page-brunch", start_sun_offset: 0, custom_days: null });
  });

  it("changes the times through the native inputs", () => {
    const { onValueChange } = renderForm();
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "17:00" } });
    expect(lastValue(onValueChange).start_time).toBe("17:00");
    fireEvent.change(screen.getByLabelText("End time"), { target: { value: "18:30" } });
    expect(lastValue(onValueChange).end_time).toBe("18:30");
  });

  it("starts at sunset with an offset, and shows the hub's resolved time", () => {
    const { onValueChange } = renderForm({
      resolvedStartTime: "4:52 PM",
      labels: { resolvedTime: (t) => `Today ${t}` },
    });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Starts" })).getByRole("radio", { name: "Sunset" }));
    expect(lastValue(onValueChange).start_type).toBe("sunset");
    expect(screen.queryByLabelText("Start time")).toBeNull();
    expect(screen.getByRole("combobox", { name: "Offset from sunset" })).toBeTruthy();
    expect(screen.getByText("Today 4:52 PM")).toBeTruthy();
  });

  it("ends open-ended, then at a time again with a fresh end", () => {
    const { onValueChange } = renderForm();
    const ends = screen.getByRole("radiogroup", { name: "Ends" });
    fireEvent.click(within(ends).getByRole("radio", { name: "Open-ended" }));
    expect(lastValue(onValueChange)).toMatchObject({ end_time: null, end_type: "fixed" });
    expect(screen.queryByLabelText("End time")).toBeNull();
    expect(screen.getByText("Runs until midnight.")).toBeTruthy();
    fireEvent.click(within(ends).getByRole("radio", { name: "At a time" }));
    expect(lastValue(onValueChange)).toMatchObject({ end_time: "10:00", end_type: "fixed" });
  });

  it("ends at sunrise, keeping an end time for the hub", () => {
    const { onValueChange } = renderForm({ defaultValue: entry({ end_time: null }) });
    const ends = screen.getByRole("radiogroup", { name: "Ends" });
    fireEvent.click(within(ends).getByRole("radio", { name: "Sunrise" }));
    expect(lastValue(onValueChange)).toMatchObject({ end_type: "sunrise", end_time: "10:00" });
    expect(screen.getByRole("combobox", { name: "Offset from sunrise" })).toBeTruthy();
  });

  it("wraps an end time past midnight to 00:xx", () => {
    const { onValueChange } = renderForm({ defaultValue: entry({ start_time: "23:30", end_time: null }) });
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Ends" })).getByRole("radio", { name: "At a time" }));
    expect(lastValue(onValueChange).end_time).toBe("00:30");
  });

  it("picks custom days in Monday-first order and shows the error when none", () => {
    const { onValueChange, onSubmit } = renderForm();
    fireEvent.click(within(screen.getByRole("radiogroup", { name: "Days" })).getByRole("radio", { name: "Custom" }));
    const picker = screen.getByRole("group", { name: "Custom days" });
    fireEvent.click(within(picker).getByRole("button", { name: "Sat" }));
    fireEvent.click(within(picker).getByRole("button", { name: "Thu" }));
    expect(lastValue(onValueChange).custom_days).toEqual(["thursday", "saturday"]);
    expect(within(picker).getByRole("button", { name: "Thu" }).getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(within(picker).getByRole("button", { name: "Thu" }));
    fireEvent.click(within(picker).getByRole("button", { name: "Sat" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Pick at least one day.")).toBeTruthy();
  });

  it("repeats every year on a month and day, with an optional last day", () => {
    const { onValueChange, onSubmit } = renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Every year on" }));
    expect(screen.queryByRole("radiogroup", { name: "Days" })).toBeNull();
    expect(screen.getByRole("combobox", { name: "Month" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Pick a date.")).toBeTruthy();
    fireEvent.click(screen.getByRole("switch", { name: "Lasts more than one day" }));
    expect(screen.getByRole("combobox", { name: "Last month" })).toBeTruthy();
    expect(lastValue(onValueChange).recurrence_type).toBe("annual_date");
  });

  it("shows a stored yearly range and drops the end when the switch goes off", () => {
    const { onValueChange } = renderForm({
      defaultValue: entry({ recurrence_type: "annual_date", annual_date: "12-24", annual_end_date: "12-26" }),
    });
    expect(screen.getByRole("combobox", { name: "Month" }).textContent).toContain("December");
    expect(screen.getByRole("combobox", { name: "Day" }).textContent).toContain("24");
    fireEvent.click(screen.getByRole("switch", { name: "Lasts more than one day" }));
    expect(lastValue(onValueChange).annual_end_date).toBeNull();
  });

  it("happens once on a date, with an optional last day", () => {
    const { onValueChange, onSubmit } = renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Once on" }));
    const date = screen.getByLabelText("Date");
    expect(date).toHaveProperty("type", "date");
    fireEvent.change(date, { target: { value: "2026-11-07" } });
    expect(lastValue(onValueChange).one_off_date).toBe("2026-11-07");
    fireEvent.click(screen.getByRole("switch", { name: "Lasts more than one day" }));
    expect(lastValue(onValueChange).one_off_end_date).toBe("2026-11-07");
    fireEvent.change(screen.getByLabelText("Last day"), { target: { value: "2026-11-06" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("The last day is before the first.")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Last day"), { target: { value: "" } });
    expect(lastValue(onValueChange).one_off_end_date).toBeNull();
  });

  it("turns the entry off without deleting it", () => {
    const { onValueChange } = renderForm();
    fireEvent.click(screen.getByRole("switch", { name: "Entry is on" }));
    expect(lastValue(onValueChange).enabled).toBe(false);
  });

  it("says which page is required, and clears the error once one is picked", () => {
    const { onSubmit } = renderForm({ defaultValue: { ...DEFAULT_SCHEDULE_ENTRY } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSubmit).not.toHaveBeenCalled();
    const trigger = screen.getByRole("combobox", { name: /Page or Collection/ });
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Pick a page or collection.")).toBeTruthy();
  });

  it("flags a zero-length range on the end time", () => {
    renderForm({ defaultValue: entry({ start_time: "09:00", end_time: "09:00" }) });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(screen.getByLabelText("End time").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Ends when it starts. Pick another end time.")).toBeTruthy();
  });

  it("is read-only on the target when it comes from Shows on, and shows the summary and delete", () => {
    const onDelete = vi.fn();
    renderForm({
      targetReadOnly: true,
      display: "Kitchen board",
      summary: "Shows Thu, Fri and Sat, 5:00–6:30 PM on Kitchen board.",
      onDelete,
    });
    expect(screen.getByRole("combobox", { name: /Page or Collection/ })).toHaveProperty("disabled", true);
    expect(screen.getByText("On Kitchen board")).toBeTruthy();
    expect(screen.getByText("Shows Thu, Fri and Sat, 5:00–6:30 PM on Kitchen board.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Delete entry…" }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("is controlled through value", () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <ScheduleEntryForm targets={TARGETS} value={entry()} onValueChange={onValueChange} onSubmit={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Start time"), { target: { value: "10:00" } });
    expect(screen.getByLabelText("Start time")).toHaveProperty("value", "09:00");
    rerender(
      <ScheduleEntryForm
        targets={TARGETS}
        value={entry({ start_time: "10:00" })}
        onValueChange={onValueChange}
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Start time")).toHaveProperty("value", "10:00");
  });

  it("shows Save busy while saving and does not submit twice", () => {
    const { onSubmit } = renderForm({ busy: true });
    const save = screen.getByRole("button", { name: "Saving…" });
    expect(save.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(save);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
