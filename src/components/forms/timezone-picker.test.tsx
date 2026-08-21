import { render, screen, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { listTimezones, type TimezoneOption, TimezonePicker } from "./timezone-picker";

/*
 * The zone table is injected, never derived, in these tests.
 *
 * `listTimezones()` reads `Intl.supportedValuesOf("timeZone")` and each zone's
 * current UTC offset, both of which depend on the runtime's ICU build AND on
 * what today's date is — a picker filtered by "+02:00" would pass in July and
 * fail in January. Every test below passes an explicit `timezones` fixture, so
 * what is under test is the filtering/keyboard/validity contract rather than
 * Node's zone table. The one test that touches `listTimezones` asserts only
 * that it is defensive, not what it contains.
 *
 * The labels deliberately differ from the ids ("Berlin", not "Europe/Berlin").
 * That is what makes the three filter axes distinguishable: a query that finds
 * a zone by a string which is NOT in its rendered text can only have matched
 * the id or the offset.
 */
const ZONES: TimezoneOption[] = [
  { id: "Europe/Berlin", label: "Berlin", offset: "+02:00" },
  { id: "Europe/London", label: "London", offset: "+01:00" },
  { id: "Europe/Madrid", label: "Madrid", offset: "+02:00" },
  { id: "America/New_York", label: "New York", offset: "-04:00" },
  { id: "Asia/Tokyo", label: "Tokyo", offset: "+09:00" },
];

function Picker(props: Omit<React.ComponentProps<typeof TimezonePicker>, "aria-label" | "timezones">) {
  return <TimezonePicker aria-label="Time zone" timezones={ZONES} {...props} />;
}

/** Accessible names of the options currently rendered, in list order. */
function optionLabels(): string[] {
  return screen.queryAllByRole("option").map((option) => option.textContent ?? "");
}

describe("TimezonePicker", () => {
  it("exposes a collapsed combobox before it is opened", () => {
    render(<Picker />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveAttribute("aria-haspopup", "listbox");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("opens a listbox on click and points aria-controls at it", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    await user.click(input);

    const listbox = screen.getByRole("listbox");
    expect(input).toHaveAttribute("aria-expanded", "true");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(listbox.id).toBeTruthy();
  });

  it("portals the list out of an overflow-hidden ancestor", async () => {
    const user = userEvent.setup();
    render(
      <div data-testid="clipper" className="overflow-hidden">
        <Picker />
      </div>,
    );

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));

    // The whole reason the panel is portalled: a picker inside a scroll box or
    // a card with `overflow: hidden` must not have its list clipped away.
    expect(screen.getByTestId("clipper")).not.toContainElement(screen.getByRole("listbox"));
  });

  it("filters by IANA id, matching text the option never renders", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("Europe/");

    expect(optionLabels()).toEqual(["Berlin+02:00", "London+01:00", "Madrid+02:00"]);
  });

  it("filters by display label, case-insensitively", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("berlin");

    expect(optionLabels()).toEqual(["Berlin+02:00"]);
  });

  it("filters by UTC offset", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("+02:00");

    expect(optionLabels()).toEqual(["Berlin+02:00", "Madrid+02:00"]);
  });

  it("requires every whitespace-separated token to match", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    // "New York" reaches "America/New_York" through the de-underscored id, and
    // the two tokens are AND-ed so "europe +02:00" narrows rather than widens.
    await user.keyboard("new york");
    expect(optionLabels()).toEqual(["New York-04:00"]);

    await user.clear(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("europe +02:00");
    expect(optionLabels()).toEqual(["Berlin+02:00", "Madrid+02:00"]);
  });

  it("reports an empty state when the query matches no zone", async () => {
    const user = userEvent.setup();
    render(<Picker labels={{ empty: "Keine Zeitzone gefunden" }} />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("atlantis");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Keine Zeitzone gefunden")).toBeInTheDocument();
  });

  it("moves the highlight with ArrowDown and ArrowUp through aria-activedescendant", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    await user.click(input);
    expect(input).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    const [first, second] = screen.getAllByRole("option");
    expect(input).toHaveAttribute("aria-activedescendant", first.id);
    expect(first).toHaveAttribute("data-highlighted");

    await user.keyboard("{ArrowDown}");
    expect(input).toHaveAttribute("aria-activedescendant", second.id);

    await user.keyboard("{ArrowUp}");
    expect(input).toHaveAttribute("aria-activedescendant", first.id);

    // Focus never leaves the input — that is the combobox contract, and it is
    // why the highlight has to travel as aria-activedescendant rather than as
    // real DOM focus the way TimePicker's roving listbox does.
    expect(input).toHaveFocus();
  });

  it("selects the highlighted zone on Enter and reports the IANA id", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    await user.click(input);
    await user.keyboard("madrid{ArrowDown}{Enter}");

    // One argument, not Base UI's `(value, eventDetails)` pair, and the IANA
    // id rather than the display label — the label is presentation.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("Europe/Madrid");
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(input).toHaveValue("Madrid");
  });

  it("selects a zone on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: /Tokyo/ }));

    expect(onValueChange).toHaveBeenCalledWith("Asia/Tokyo");
  });

  it("closes on Escape without committing the highlighted zone", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    await user.click(input);
    await user.keyboard("{ArrowDown}{Escape}");

    // Base UI unmounts the popup once its exit animations settle, so the list
    // outlives the keypress by a tick. `waitForElementToBeRemoved` still fails
    // if it never goes away -- it only tolerates the delay.
    await waitForElementToBeRemoved(() => screen.queryByRole("listbox"));

    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("dismisses on an outside click", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Picker />
        <button type="button" data-testid="outside">
          Elsewhere
        </button>
      </>,
    );

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    // Queried by test id, not by role: Base UI aria-hides the rest of the
    // document while the popup is open, so the button is not in the
    // accessibility tree to be found by role for as long as the list is up.
    // That is the primitive's behaviour, not something this wrapper chooses.
    await user.click(screen.getByTestId("outside"));

    await waitForElementToBeRemoved(() => screen.queryByRole("listbox"));

    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveAttribute("aria-expanded", "false");
  });

  it("seeds an uncontrolled picker from defaultValue", () => {
    render(<Picker defaultValue="Asia/Tokyo" />);

    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue("Tokyo");
  });

  it("renders the label of a controlled value and follows it when it changes", () => {
    const { rerender } = render(<Picker value="Europe/London" onValueChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue("London");

    rerender(<Picker value="Asia/Tokyo" onValueChange={() => {}} />);
    expect(screen.getByRole("combobox", { name: "Time zone" })).toHaveValue("Tokyo");
  });

  it("reports validity on mount and whenever the text stops naming a zone", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    render(<Picker defaultValue="Europe/Berlin" onValidityChange={onValidityChange} />);

    // Fires on mount so a form can gate its submit button before any input.
    expect(onValidityChange).toHaveBeenCalledTimes(1);
    expect(onValidityChange).toHaveBeenLastCalledWith(true);

    await user.clear(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("Berlim");
    expect(onValidityChange).toHaveBeenLastCalledWith(false);

    await user.clear(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("Berlin");
    expect(onValidityChange).toHaveBeenLastCalledWith(true);

    // Only edges are reported: typing a second unknown zone must not re-fire.
    const calls = onValidityChange.mock.calls.length;
    await user.keyboard("x");
    await user.keyboard("y");
    expect(onValidityChange).toHaveBeenCalledTimes(calls + 1);
  });

  it("accepts a raw IANA id as valid text, not just the display label", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    render(<Picker onValidityChange={onValidityChange} />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));
    await user.keyboard("Europe/Madrid");

    expect(onValidityChange).toHaveBeenLastCalledWith(true);
  });

  it("treats an empty input as valid rather than as a typo", async () => {
    const user = userEvent.setup();
    const onValidityChange = vi.fn();
    render(<Picker defaultValue="Europe/Berlin" onValidityChange={onValidityChange} />);

    await user.clear(screen.getByRole("combobox", { name: "Time zone" }));

    // Emptiness is required-ness, which the form already models via `value`.
    // Reporting it as invalid would make every untouched optional field shout.
    expect(onValidityChange).toHaveBeenLastCalledWith(true);
    expect(screen.getByRole("combobox", { name: "Time zone" })).not.toHaveAttribute("data-unknown-zone");
  });

  it("marks unknown text with data-unknown-zone but never with aria-invalid", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    await user.click(input);
    await user.keyboard("Berli");

    expect(input).toHaveAttribute("data-unknown-zone", "");
    // Deliberately NOT aria-invalid: it would announce "invalid" on every
    // keystroke of a zone the user is halfway through typing. When to surface
    // the error is the form's call, made from `onValidityChange`.
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("passes a consumer aria-invalid straight through", async () => {
    const user = userEvent.setup();
    render(<Picker aria-invalid />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    expect(input).toHaveAttribute("aria-invalid", "true");

    await user.click(input);
    await user.keyboard("Berlin");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(<Picker disabled />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    expect(input).toBeDisabled();

    await user.click(input);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("stamps the family's data-slot hooks", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    const input = screen.getByRole("combobox", { name: "Time zone" });
    expect(input).toHaveAttribute("data-slot", "timezone-picker-input");

    await user.click(input);
    expect(screen.getByRole("listbox")).toHaveAttribute("data-slot", "timezone-picker-list");
    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("data-slot", "timezone-picker-item");
    }
  });

  it("names the listbox from the labels contract", async () => {
    const user = userEvent.setup();
    render(<Picker labels={{ list: "Zeitzonen" }} />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));

    expect(screen.getByRole("listbox", { name: "Zeitzonen" })).toBeInTheDocument();
  });

  it("caps the rendered list at `limit` so 400 zones are not 400 DOM nodes", async () => {
    const user = userEvent.setup();
    render(<Picker limit={2} />);

    await user.click(screen.getByRole("combobox", { name: "Time zone" }));

    expect(screen.getAllByRole("option")).toHaveLength(2);
  });
});

describe("listTimezones", () => {
  it("derives a zone table with normalized offsets, or degrades to the local zone", () => {
    // Node ships full ICU, so this is the happy path; the assertion is written
    // so a thin build that returns only the resolved local zone still passes.
    const zones = listTimezones(new Date("2026-07-01T12:00:00Z"));

    expect(zones.length).toBeGreaterThan(0);
    for (const zone of zones) {
      expect(zone.id).toMatch(/\S/);
      expect(zone.label).toMatch(/\S/);
      // Normalized to a bare signed offset — no "GMT" prefix, no locale words,
      // because the filter matches on this string.
      expect(zone.offset).toMatch(/^[+-]\d{2}:\d{2}$/);
    }
  });

  it("returns the same array for the same reference hour", () => {
    const at = new Date("2026-07-01T12:00:00Z");

    // 418 zones × one Intl.DateTimeFormat each is ~35 ms; re-deriving it on
    // every render of every picker on a page is the cost this cache removes.
    expect(listTimezones(at)).toBe(listTimezones(at));
  });
});
