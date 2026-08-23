import { render, screen, waitFor, waitForElementToBeRemoved, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { Combobox, type ComboboxOption, defaultComboboxFilter } from "./combobox";

/*
 * What is asserted here is the ACCESSIBILITY TREE and the published
 * `data-slot` contract — the two things a consumer and a screen reader can
 * actually observe. Tailwind does not run in jsdom, so a class assertion would
 * prove only that a string was concatenated; the popup's geometry, the 32px
 * rows and the focus ring are VRT's job.
 *
 * The fixture below is built so the three search axes are distinguishable. The
 * labels are NOT the values ("Living room", not "sensor.living_room_temp") and
 * the keywords appear in neither, so a query that finds a row by a string the
 * row does not render can only have matched the value or the keywords. `meta`
 * carries a string that appears nowhere else, which is what makes "meta is
 * deliberately not searched" a testable claim rather than a comment.
 */
const OPTIONS: ComboboxOption[] = [
  { value: "sensor.living_room_temp", label: "Living room", meta: "21.5°C", keywords: ["thermostat"] },
  { value: "sensor.kitchen_temp", label: "Kitchen", meta: "19.0°C" },
  { value: "sensor.bedroom_temp", label: "Bedroom", meta: "18.5°C" },
  { value: "light.hallway", label: "Hallway", meta: "off", disabled: true },
];

function Picker(props: Omit<React.ComponentProps<typeof Combobox>, "aria-label" | "options">) {
  return <Combobox aria-label="Entity" options={OPTIONS} {...props} />;
}

/** The `data-slot="combobox-option-label"` text of every rendered row, in order. */
function optionLabels(): string[] {
  return screen
    .queryAllByRole("option")
    .map((option) => option.querySelector('[data-slot="combobox-option-label"]')?.textContent ?? "");
}

function input(): HTMLElement {
  return screen.getByRole("combobox", { name: "Entity" });
}

/**
 * The overflow line, queried by slot rather than by `role="status"`.
 *
 * Base UI's `Empty` is a polite live region too, so the popup legitimately
 * holds two `role="status"` elements and querying by role is ambiguous. Both
 * regions must stay mounted for SC 4.1.3, which is exactly why there are two.
 */
function status(): HTMLElement {
  const el = document.querySelector<HTMLElement>('[data-slot="combobox-status"]');
  if (!el) throw new Error("no [data-slot=combobox-status] element rendered");
  return el;
}

describe("Combobox — ARIA wiring", () => {
  it("exposes a collapsed combobox before it is opened", () => {
    render(<Picker />);

    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveAttribute("aria-haspopup", "listbox");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("points aria-controls at the real listbox id once open", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());

    const listbox = screen.getByRole("listbox");
    // The link the app's variable-autocomplete copy is missing entirely: the
    // relationship has to be programmatic, not just visual (SC 1.3.1).
    expect(listbox.id).toBeTruthy();
    expect(input()).toHaveAttribute("aria-controls", listbox.id);
    expect(input()).toHaveAttribute("aria-expanded", "true");
  });

  it("renders the matches as role=option inside the listbox", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());

    // The app's timezone-picker copy renders bare <button aria-selected> here,
    // so a screen reader is told a listbox exists and finds nothing in it.
    const options = within(screen.getByRole("listbox")).getAllByRole("option");
    expect(options).toHaveLength(OPTIONS.length);
  });

  it("names the listbox from the labels contract", async () => {
    const user = userEvent.setup();
    render(<Picker labels={{ list: "Entitäten" }} />);

    await user.click(input());

    expect(screen.getByRole("listbox", { name: "Entitäten" })).toBeInTheDocument();
  });

  it("keeps exactly one combobox in the accessibility tree despite the trigger button", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    // Base UI only gives the trigger `role="combobox"` when the input lives
    // inside the popup, which it does not here. Two comboboxes would make
    // `getByRole("combobox")` ambiguous for every consumer's test too.
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
    // Base UI's contract, not this component's: a Trigger beside an Input gets
    // `tabindex="-1"` because the textbox is the control's single tab stop.
    // Asserted here because the component depends on it and a primitive
    // upgrade could take it away.
    expect(screen.getByRole("button", { name: "Show options" })).toHaveAttribute("tabindex", "-1");

    await user.click(screen.getByRole("button", { name: "Show options" }));

    // `findBy`, not `getBy`: opening from the trigger mounts the positioner a
    // tick later than opening from the input does.
    expect(await screen.findByRole("listbox")).toBeInTheDocument();
    // The trigger is not a tab stop, so focus must not be left parked on it —
    // the user has to be able to keep typing.
    expect(input()).toHaveFocus();
  });

  it("marks a disabled option aria-disabled instead of dropping it", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());

    const hallway = screen.getByRole("option", { name: /Hallway/ });
    expect(hallway).toHaveAttribute("aria-disabled", "true");
  });
});

describe("Combobox — keyboard model", () => {
  it("moves the highlight with ArrowDown/ArrowUp through aria-activedescendant", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());
    expect(input()).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    const [first, second] = screen.getAllByRole("option");
    expect(input()).toHaveAttribute("aria-activedescendant", first.id);
    expect(first).toHaveAttribute("data-highlighted");

    await user.keyboard("{ArrowDown}");
    expect(input()).toHaveAttribute("aria-activedescendant", second.id);

    await user.keyboard("{ArrowUp}");
    expect(input()).toHaveAttribute("aria-activedescendant", first.id);

    // DOM focus never leaves the input. That is the combobox pattern, and it
    // is why the highlight has to travel as aria-activedescendant rather than
    // as real focus the way TimePicker's roving listbox does.
    expect(input()).toHaveFocus();
  });

  it("reaches the last option with ArrowUp from the input", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());
    await user.keyboard("{ArrowUp}");

    // The APG's "the input is always included in the focus loop": this is the
    // jump-to-end that Home/End deliberately do NOT provide here.
    const options = screen.getAllByRole("option");
    expect(input()).toHaveAttribute("aria-activedescendant", options[options.length - 1].id);
  });

  it("lets the highlight reach a disabled option but refuses to commit it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);

    await user.click(input());
    // Hallway is last and disabled. The APG wants disabled options reachable
    // so they are discoverable — what must not happen is committing one.
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("option", { name: /Hallway/ })).toHaveAttribute("data-highlighted");

    await user.keyboard("{Enter}");
    expect(onValueChange).not.toHaveBeenCalled();
    expect(input()).toHaveValue("");
  });

  it("leaves Home and End to the text caret rather than the list", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    const field = input() as HTMLInputElement;
    await user.click(field);
    await user.keyboard("kitchen{ArrowDown}");
    const highlighted = field.getAttribute("aria-activedescendant");
    expect(highlighted).toBeTruthy();

    await user.keyboard("{Home}");
    // The APG: with focus in an editable combobox's textbox, Home and End are
    // "supported for standard text editing". Stealing them would leave a user
    // who mistyped no way back to the start of their own text.
    expect(field.selectionStart).toBe(0);
    expect(field).toHaveAttribute("aria-activedescendant", highlighted);

    await user.keyboard("{End}");
    expect(field.selectionStart).toBe("kitchen".length);
    expect(field).toHaveAttribute("aria-activedescendant", highlighted);
  });

  it("commits the highlighted option on Enter and reports its value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);

    await user.click(input());
    await user.keyboard("bedroom{ArrowDown}{Enter}");

    // One argument, not Base UI's `(value, eventDetails)` pair, and the value
    // rather than the label — the label is presentation.
    expect(onValueChange).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("sensor.bedroom_temp");
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveValue("Bedroom");
  });

  it("closes on Escape without committing the highlighted option", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);

    await user.click(input());
    await user.keyboard("{ArrowDown}{Escape}");

    // Base UI unmounts the popup once its exit animation settles, so the list
    // outlives the keypress by a tick. This still fails if it never goes away.
    await waitForElementToBeRemoved(() => screen.queryByRole("listbox"));

    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("clears the field on a second Escape, once the popup is already closed", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker defaultValue="sensor.kitchen_temp" onValueChange={onValueChange} />);

    const field = input();
    expect(field).toHaveValue("Kitchen");

    await user.click(field);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument());
    // The first Escape only dismisses; the value survives it.
    expect(field).toHaveValue("Kitchen");

    // The APG's optional second half: "if the popup is hidden before Escape is
    // pressed, clears the combobox".
    await user.keyboard("{Escape}");
    expect(field).toHaveValue("");
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("selects an option on click", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker onValueChange={onValueChange} />);

    await user.click(input());
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: /Living room/ }));

    expect(onValueChange).toHaveBeenCalledWith("sensor.living_room_temp");
  });

  it("does not open when disabled", async () => {
    const user = userEvent.setup();
    render(<Picker disabled />);

    expect(input()).toBeDisabled();
    await user.click(input());

    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});

describe("Combobox — filtering", () => {
  it("filters by a string label, case-insensitively", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());
    await user.keyboard("KITCHEN");

    expect(optionLabels()).toEqual(["Kitchen"]);
  });

  it("filters by value — text the row never renders", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());
    await user.keyboard("sensor.bed");

    // "sensor.bed" appears in no label, so a hit can only have come from the
    // value. This is the half the entity picker needs: users type the id.
    expect(optionLabels()).toEqual(["Bedroom"]);
  });

  it("filters by keywords", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());
    await user.keyboard("thermostat");

    expect(optionLabels()).toEqual(["Living room"]);
  });

  it("does not filter by meta", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());
    await user.keyboard("21.5");

    // meta is a preview column. Matching it makes a query hit rows whose
    // visible name has nothing to do with what was typed; anything searchable
    // goes in `keywords`.
    expect(optionLabels()).toEqual([]);
  });

  it("requires every whitespace-separated token to match", async () => {
    const user = userEvent.setup();
    render(<Picker />);

    await user.click(input());
    await user.keyboard("living thermostat");
    expect(optionLabels()).toEqual(["Living room"]);

    await user.clear(input());
    await user.keyboard("living kitchen");
    // AND, not OR: two tokens narrow. An OR would return both rows here.
    expect(optionLabels()).toEqual([]);
  });

  it("reports the empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<Picker labels={{ empty: "Keine Treffer" }} />);

    await user.click(input());
    await user.keyboard("zzz");

    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
  });

  it("renders a rich emptyMessage in place of the default copy", async () => {
    const user = userEvent.setup();
    render(<Picker emptyMessage={<button type="button">Create entity</button>} labels={{ empty: "No matches" }} />);

    await user.click(input());
    await user.keyboard("zzz");

    expect(screen.getByRole("button", { name: "Create entity" })).toBeInTheDocument();
    expect(screen.queryByText("No matches")).not.toBeInTheDocument();
  });

  it("uses a custom filter, including its ordering", async () => {
    const user = userEvent.setup();
    // Narrow with the exported default, then re-rank. The point of handing the
    // whole array to `filter` instead of a per-item predicate is that a
    // predicate cannot reorder.
    const filter = (options: readonly ComboboxOption[], query: string) =>
      defaultComboboxFilter(options, query)
        .slice()
        .sort((a, b) => String(a.label).localeCompare(String(b.label)));

    render(<Picker filter={filter} />);

    await user.click(input());
    await user.keyboard("temp");

    expect(optionLabels()).toEqual(["Bedroom", "Kitchen", "Living room"]);
  });

  it("still marks the selected row when a custom filter clones the options", async () => {
    // Cloning is the obvious thing a filter does when it wants to decorate a
    // label — highlighting the matched substring, say. The selected row has to
    // survive it, which it only does if identity is compared by `value`.
    const filter = (options: readonly ComboboxOption[], query: string) =>
      defaultComboboxFilter(options, query).map((option) => ({ ...option }));

    // The query is held at something that is NOT the selected option's own
    // label, so the reopen-shows-everything bypass does not short-circuit past
    // the filter and the rendered rows really are the clones.
    render(
      <Picker
        value="sensor.kitchen_temp"
        onValueChange={() => {}}
        query="sensor"
        onQueryChange={() => {}}
        filter={filter}
        defaultOpen
      />,
    );

    expect(await screen.findByRole("option", { name: /Kitchen/ })).toHaveAttribute("data-selected");
  });

  it("clears the value when the user empties the field", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Picker defaultValue="sensor.kitchen_temp" onValueChange={onValueChange} />);

    await user.clear(input());

    // Emptying the text is how a user un-picks. Leaving the old value behind
    // would let a form submit a selection the field no longer shows.
    expect(onValueChange).toHaveBeenLastCalledWith("");
  });

  it("offers every option again when the box already reads the selected label", async () => {
    const user = userEvent.setup();
    render(<Picker defaultValue="sensor.kitchen_temp" />);

    await user.click(input());

    // Reopening a filled combobox must not show a list of one. The query IS
    // "Kitchen" at this point, so a naive filter would match only that row.
    expect(optionLabels()).toEqual(["Living room", "Kitchen", "Bedroom", "Hallway"]);
  });
});

describe("Combobox — overflow", () => {
  const MANY: ComboboxOption[] = Array.from({ length: 12 }, (_, i) => ({
    value: `option-${i}`,
    label: `Option ${i}`,
  }));

  it("caps the rendered list at maxVisible", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Many" options={MANY} maxVisible={3} />);

    await user.click(screen.getByRole("combobox", { name: "Many" }));

    expect(screen.getAllByRole("option")).toHaveLength(3);
  });

  it("announces the overflow through labels.showingFirst", async () => {
    const user = userEvent.setup();
    render(
      <Combobox
        aria-label="Many"
        options={MANY}
        maxVisible={3}
        labels={{ showingFirst: (shown, total) => `${shown}/${total}` }}
      />,
    );

    await user.click(screen.getByRole("combobox", { name: "Many" }));

    // A polite live region (SC 4.1.3), and the only place the user is told the
    // list is not the whole truth.
    expect(status()).toHaveTextContent("3/12");
  });

  it("says nothing when the matches fit", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Many" options={MANY} maxVisible={20} />);

    await user.click(screen.getByRole("combobox", { name: "Many" }));

    expect(screen.getAllByRole("option")).toHaveLength(12);
    expect(status()).toBeEmptyDOMElement();
  });

  it("still caps when the selected label refills the query", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Many" options={MANY} defaultValue="option-0" maxVisible={3} />);

    await user.click(screen.getByRole("combobox", { name: "Many" }));

    // The reopen-shows-everything path is a SECOND filtering route — Base UI
    // takes it over the externally supplied match list — so the cap has to be
    // enforced on both or a filled combobox quietly renders the whole table.
    expect(screen.getAllByRole("option")).toHaveLength(3);
    expect(status()).toHaveTextContent("Showing first 3 of 12");
  });

  it("renders every match at maxVisible={-1}", async () => {
    const user = userEvent.setup();
    render(<Combobox aria-label="Many" options={MANY} maxVisible={-1} />);

    await user.click(screen.getByRole("combobox", { name: "Many" }));

    expect(screen.getAllByRole("option")).toHaveLength(12);
  });
});

describe("Combobox — value and query", () => {
  it("seeds an uncontrolled combobox from defaultValue", () => {
    render(<Picker defaultValue="sensor.bedroom_temp" />);

    expect(input()).toHaveValue("Bedroom");
  });

  it("renders a controlled value and follows it when it changes", () => {
    const { rerender } = render(<Picker value="sensor.kitchen_temp" onValueChange={() => {}} />);
    expect(input()).toHaveValue("Kitchen");

    rerender(<Picker value="sensor.bedroom_temp" onValueChange={() => {}} />);
    expect(input()).toHaveValue("Bedroom");
  });

  it("reports query changes and renders a controlled query", async () => {
    const user = userEvent.setup();
    const onQueryChange = vi.fn();

    // The caret-token case: the host owns the text, the component owns the
    // list. A controlled query must not be overwritten by the component.
    const { rerender } = render(<Picker query="kit" onQueryChange={onQueryChange} />);
    expect(input()).toHaveValue("kit");

    await user.click(input());
    await user.keyboard("c");
    expect(onQueryChange).toHaveBeenLastCalledWith("kitc");
    // Still "kit": the host has not pushed the new query back down.
    expect(input()).toHaveValue("kit");

    rerender(<Picker query="kitc" onQueryChange={onQueryChange} />);
    expect(input()).toHaveValue("kitc");
  });

  it("falls back to the value as input text for a non-string label", async () => {
    const user = userEvent.setup();
    const options: ComboboxOption[] = [{ value: "bold", label: <strong>Bold</strong> }];
    render(<Combobox aria-label="Style" options={options} />);

    await user.click(screen.getByRole("combobox", { name: "Style" }));
    await user.click(screen.getByRole("option", { name: "Bold" }));

    // A ReactNode cannot be flattened to a string without rendering it, so the
    // identifier stands in — never "[object Object]".
    expect(screen.getByRole("combobox", { name: "Style" })).toHaveValue("bold");
  });
});

describe("Combobox — panel placement", () => {
  it("portals the panel out of an overflow-hidden ancestor by default", async () => {
    const user = userEvent.setup();
    render(
      <div data-testid="clipper" className="overflow-hidden">
        <Picker />
      </div>,
    );

    await user.click(input());

    expect(screen.getByTestId("clipper")).not.toContainElement(screen.getByRole("listbox"));
  });

  it("keeps the panel in place when portal is false", async () => {
    const user = userEvent.setup();
    render(
      <div data-testid="clipper">
        <Picker portal={false} />
      </div>,
    );

    await user.click(input());

    expect(screen.getByTestId("clipper")).toContainElement(screen.getByRole("listbox"));
  });
});

describe("Combobox — published contracts", () => {
  it("stamps the family's data-slot hooks", async () => {
    const user = userEvent.setup();
    render(<Picker defaultValue="sensor.kitchen_temp" />);

    expect(input()).toHaveAttribute("data-slot", "combobox-input");
    expect(screen.getByRole("button", { name: "Show options" })).toHaveAttribute("data-slot", "combobox-trigger");

    await user.click(input());
    expect(screen.getByRole("listbox")).toHaveAttribute("data-slot", "combobox-list");
    for (const option of screen.getAllByRole("option")) {
      expect(option).toHaveAttribute("data-slot", "combobox-option");
      expect(option.querySelector('[data-slot="combobox-option-label"]')).not.toBeNull();
      expect(option.querySelector('[data-slot="combobox-option-indicator"]')).not.toBeNull();
    }
    expect(
      screen.getByRole("option", { name: /Living room/ }).querySelector('[data-slot="combobox-option-meta"]'),
    ).toHaveTextContent("21.5°C");
  });

  it("marks the selected option and nothing else", async () => {
    const user = userEvent.setup();
    render(<Picker defaultValue="sensor.kitchen_temp" />);

    await user.click(input());

    const selected = screen.getAllByRole("option").filter((option) => option.hasAttribute("data-selected"));
    expect(selected.map((option) => option.textContent)).toEqual([expect.stringContaining("Kitchen")]);
  });

  it("passes a consumer aria-invalid straight through without ever deriving one", async () => {
    const user = userEvent.setup();
    render(<Picker aria-invalid />);

    expect(input()).toHaveAttribute("aria-invalid", "true");

    await user.click(input());
    await user.keyboard("not an entity");
    // Never re-derived: a combobox that flips to "invalid" mid-word announces
    // an error the user is still in the middle of fixing.
    expect(input()).toHaveAttribute("aria-invalid", "true");
  });

  it("takes its accessible name from an external Label via id", () => {
    render(
      <>
        {}
        <label htmlFor="entity-field">Entity</label>
        <Combobox id="entity-field" options={OPTIONS} />
      </>,
    );

    expect(screen.getByRole("combobox", { name: "Entity" })).toBeInTheDocument();
  });
});

describe("defaultComboboxFilter", () => {
  it("returns every option for a blank query", () => {
    expect(defaultComboboxFilter(OPTIONS, "   ")).toHaveLength(OPTIONS.length);
  });

  it("preserves the caller's order rather than ranking", () => {
    // Identifiers, not prose: a fuzzy score would put Ho_Chi_Minh above Berlin
    // for "hi". Ordering is the caller's job, through `filter`.
    expect(defaultComboboxFilter(OPTIONS, "temp").map((option) => option.value)).toEqual([
      "sensor.living_room_temp",
      "sensor.kitchen_temp",
      "sensor.bedroom_temp",
    ]);
  });

  it("never hands back the caller's array to be mutated", () => {
    expect(defaultComboboxFilter(OPTIONS, "")).not.toBe(OPTIONS);
  });
});
