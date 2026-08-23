import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as React from "react";
import { describe, expect, it } from "vitest";

import { Combobox } from "./combobox";
import { Field } from "./field";
import { Input } from "./input";
import { SecretInput } from "./secret-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";
import { Textarea } from "./textarea";
import { TimePicker } from "./time-picker";
import { TimezonePicker } from "./timezone-picker";

/*
 * What is asserted here is the WIRING — the accessibility tree a screen reader
 * would read off this row, and nothing else. Tailwind never runs in jsdom, so
 * the two layouts, the destructive tone and the asterisk's position on the
 * baseline are VRT's job; a class assertion here would only prove that a
 * string was concatenated.
 *
 * Every test therefore asks one of four questions: does the control have a
 * NAME, does it have the right DESCRIPTION, does it report the right STATE,
 * and does the caller keep the last word.
 */

/** The control Field wired, found by the id it was given rather than by role. */
function control(id = "fld"): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`no element carrying id="${id}" was rendered`);
  return el;
}

describe("Field — naming", () => {
  it("names the control from the label with a generated id", () => {
    render(
      <Field label="Board name">
        <Input />
      </Field>,
    );

    // Five rows in FiestaBoard spell `<label>` with no `htmlFor` at all, which
    // is this assertion failing in production (SC 4.1.2).
    const input = screen.getByRole("textbox", { name: "Board name" });
    expect(input.id).toBeTruthy();
    expect(screen.getByText("Board name").closest("label")).toHaveAttribute("for", input.id);
  });

  it("gives each Field on a page its own generated id", () => {
    render(
      <>
        <Field label="First">
          <Input />
        </Field>
        <Field label="Second">
          <Input />
        </Field>
      </>,
    );

    const [first, second] = screen.getAllByRole("textbox");
    expect(first.id).not.toBe(second.id);
  });

  it("lets a caller-supplied id win over the generated one", () => {
    render(
      <Field id="polling-interval" label="Refresh interval">
        <Input />
      </Field>,
    );

    expect(screen.getByRole("textbox", { name: "Refresh interval" })).toHaveAttribute("id", "polling-interval");
    expect(screen.getByText("Refresh interval").closest("label")).toHaveAttribute("for", "polling-interval");
  });

  it("adopts an id the child already carries instead of overwriting it", () => {
    render(
      <Field label="Refresh interval">
        <Input id="legacy-interval" />
      </Field>,
    );

    // The migration case: a row that already had an id keeps it, so anything
    // pointing at that id from outside (a test, a deep link, a tour step)
    // survives being wrapped in a Field.
    expect(screen.getByRole("textbox", { name: "Refresh interval" })).toHaveAttribute("id", "legacy-interval");
  });

  it("still lets an explicit Field id outrank the child's own", () => {
    render(
      <Field id="from-field" label="Refresh interval">
        <Input id="from-child" />
      </Field>,
    );

    expect(screen.getByRole("textbox", { name: "Refresh interval" })).toHaveAttribute("id", "from-field");
  });
});

describe("Field — description chain", () => {
  it("puts the description in aria-describedby", () => {
    render(
      <Field id="fld" label="Refresh interval" description="How often the board pulls new content.">
        <Input />
      </Field>,
    );

    // There is exactly ONE aria-describedby in the whole of FiestaBoard's
    // web/src today; everywhere else this relationship is conveyed by
    // proximity alone (SC 1.3.1).
    expect(control()).toHaveAttribute("aria-describedby", "fld-description");
    expect(control()).toHaveAccessibleDescription("How often the board pulls new content.");
  });

  it("sets no aria-describedby when there is nothing to describe", () => {
    render(
      <Field id="fld" label="Board name">
        <Input />
      </Field>,
    );

    expect(control()).not.toHaveAttribute("aria-describedby");
  });

  it("REPLACES the description with the error rather than appending to it", () => {
    render(
      <Field
        id="fld"
        label="Refresh interval"
        description="How often the board pulls new content."
        error="Must be at least 10 seconds."
      >
        <Input />
      </Field>,
    );

    // Concatenating both would make the user listen through prose they have
    // already heard before reaching the sentence that says what is wrong.
    expect(control()).toHaveAttribute("aria-describedby", "fld-error");
    expect(control()).toHaveAccessibleDescription("Must be at least 10 seconds.");
    // …and the helper still RENDERS. It is usually the thing that explains how
    // to fix the error; it is only out of the announcement chain.
    expect(screen.getByText("How often the board pulls new content.")).toBeInTheDocument();
  });

  it("keeps a describedby the child already had, and adds its own", () => {
    render(
      <Field id="fld" label="API key" description="Found under Integrations.">
        <Input aria-describedby="key-format" />
      </Field>,
    );

    // A control that already describes itself must not lose that by being put
    // in a Field.
    expect(control()).toHaveAttribute("aria-describedby", "fld-description key-format");
  });

  it("renders the description above the control when asked", () => {
    render(
      <Field
        id="fld"
        label="Refresh interval"
        description="How often the board pulls new content."
        descriptionPlacement="above"
      >
        <Input />
      </Field>,
    );

    // Both orders exist downstream — update-intervals puts the helper above
    // the control, silence-schedule below — so this is DOM order, which is
    // also reading order.
    const description = screen.getByText("How often the board pulls new content.");
    expect(description.compareDocumentPosition(control())).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it("defaults the description to below the control", () => {
    render(
      <Field id="fld" label="Refresh interval" description="How often the board pulls new content.">
        <Input />
      </Field>,
    );

    const description = screen.getByText("How often the board pulls new content.");
    expect(description.compareDocumentPosition(control())).toBe(Node.DOCUMENT_POSITION_PRECEDING);
  });
});

describe("Field — invalidity", () => {
  it("sets aria-invalid when an error is present", () => {
    render(
      <Field id="fld" label="Refresh interval" error="Must be at least 10 seconds.">
        <Input />
      </Field>,
    );

    expect(control()).toHaveAttribute("aria-invalid", "true");
  });

  it("leaves aria-invalid off entirely when there is no error", () => {
    render(
      <Field id="fld" label="Refresh interval" description="Seconds between refreshes.">
        <Input />
      </Field>,
    );

    // Not `aria-invalid="false"`: a permanent invalidity attribute on every
    // field in a form is noise the user has to listen past.
    expect(control()).not.toHaveAttribute("aria-invalid");
  });

  it("treats an empty-string error as no error", () => {
    render(
      <Field id="fld" label="Refresh interval" description="Seconds between refreshes." error="">
        <Input />
      </Field>,
    );

    // `error={errors.interval}` is the call shape, and a cleared error arrives
    // as "" as often as it arrives as undefined. Neither may render an empty
    // destructive line or knock the description out of the chain.
    expect(control()).not.toHaveAttribute("aria-invalid");
    expect(control()).toHaveAttribute("aria-describedby", "fld-description");
  });

  it("does not override an aria-invalid the child declares itself", () => {
    render(
      <Field id="fld" label="Timezone" error="Not a real zone.">
        <Input aria-invalid={false} />
      </Field>,
    );

    // TimezonePicker's argument, generalised: when to escalate to "invalid" is
    // sometimes the control's own call, and the caller keeps the last word.
    expect(control()).toHaveAttribute("aria-invalid", "false");
  });
});

describe("Field — required", () => {
  it("renders the marker inside the label, not as loose text beside it", () => {
    render(
      <Field id="fld" label="Board name" required>
        <Input />
      </Field>,
    );

    const label = screen.getByText("Board name").closest("label");
    const marker = screen.getByText("*");
    // The downstream bug: `<Text tone="destructive">*</Text>` as a SIBLING of
    // the label, announced (when at all) as a bare "star" attached to nothing.
    expect(label).toContainElement(marker);
  });

  it("carries the required state in the accessible name and on the control", () => {
    render(
      <Field id="fld" label="Board name" required>
        <Input />
      </Field>,
    );

    // The glyph is hidden from assistive tech — "*" announces as "star", which
    // is not a word for "required" — and the meaning travels as text in the
    // name instead, plus the native attribute for constraint validation.
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByRole("textbox", { name: "Board name (required)" })).toBe(control());
    expect(control()).toBeRequired();
  });

  it("takes the required wording from the caller, because it is user-facing copy", () => {
    render(
      <Field id="fld" label="Anzeigename" required requiredLabel="(Pflichtfeld)">
        <Input />
      </Field>,
    );

    // This package resolves no i18n, so every string it renders itself is a
    // prop with an English default — the same rule Combobox's `labels` follows.
    expect(screen.getByRole("textbox", { name: "Anzeigename (Pflichtfeld)" })).toBe(control());
  });

  it("adds neither marker nor attribute when the field is optional", () => {
    render(
      <Field id="fld" label="Board name">
        <Input />
      </Field>,
    );

    expect(screen.queryByText("*")).not.toBeInTheDocument();
    expect(control()).not.toBeRequired();
  });

  it("does not override a required the child declares itself", () => {
    render(
      <Field id="fld" label="Board name">
        <Input required />
      </Field>,
    );

    expect(control()).toBeRequired();
  });
});

/*
 * The claim #283 rests on: cloning the child is enough, and NO control has to
 * change to be wired by a Field. Each row below is a real kit control, and the
 * assertion is made against the DOM node that actually received the id.
 */
interface ControlCase {
  name: string;
  control: React.ReactElement;
  /**
   * For composed controls whose root renders no DOM of its own. The Field goes
   * INSIDE the root and wraps only the part that takes focus.
   */
  wrap?: (field: React.ReactNode) => React.ReactElement;
  /**
   * Whether the injected `required` reaches the node that carries the id.
   * `false` is not a bug in this component: a composed control keeps its
   * required state on a hidden form input, or has no use for the attribute at
   * all, which is exactly why the required state's primary channel is the
   * accessible NAME and not this attribute.
   */
  forwardsRequired: boolean;
}

const CONTROLS: ControlCase[] = [
  { name: "Input", control: <Input />, forwardsRequired: true },
  { name: "Textarea", control: <Textarea />, forwardsRequired: true },
  { name: "SecretInput", control: <SecretInput />, forwardsRequired: true },
  { name: "a raw <input>", control: <input />, forwardsRequired: true },
  { name: "Combobox", control: <Combobox options={[]} />, forwardsRequired: false },
  { name: "TimezonePicker", control: <TimezonePicker />, forwardsRequired: false },
  {
    name: "SelectTrigger",
    control: (
      <SelectTrigger>
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
    ),
    wrap: (field) => (
      <Select>
        {field}
        <SelectContent>
          <SelectItem value="dark">Dark</SelectItem>
        </SelectContent>
      </Select>
    ),
    // Base UI's Trigger spreads what it is given, so the attribute lands on
    // its <button>, where it is inert — the state is announced from the name.
    forwardsRequired: true,
  },
  // Takes three of the four and has no `required` prop at all — it destructures
  // rather than spreading, so the injected one is dropped. Documented in the
  // component header; asserted here so a future `required` prop on TimePicker
  // shows up as a failing expectation rather than as a silent behaviour change.
  { name: "TimePicker", control: <TimePicker />, forwardsRequired: false },
];

describe.each(CONTROLS)("Field wires $name unchanged", ({ control: element, wrap, forwardsRequired }) => {
  function renderCase() {
    const field = (
      <Field id="fld" label="Setting" description="What it does." error="That will not do." required>
        {element}
      </Field>
    );
    render(wrap ? wrap(field) : field);
  }

  it("injects the id, the description chain and the invalid state", () => {
    renderCase();

    expect(control()).toHaveAttribute("aria-describedby", "fld-error");
    expect(control()).toHaveAttribute("aria-invalid", "true");
  });

  it("names the control from the Field's label", () => {
    renderCase();

    // TimePicker and TimezonePicker compose their value into the name, so this
    // is a containment check rather than an equality one.
    expect(control()).toHaveAccessibleName(/Setting \(required\)/);
  });

  it(`${forwardsRequired ? "forwards" : "drops"} the injected required attribute`, () => {
    renderCase();

    // The ATTRIBUTE, not `toBeRequired()`: that matcher is role-aware and a
    // <button> is never "required" no matter what is written on it.
    if (forwardsRequired) expect(control()).toHaveAttribute("required");
    else expect(control()).not.toHaveAttribute("required");
  });
});

describe("Field — as the user meets it", () => {
  it("focuses the control when the label is clicked", async () => {
    const user = userEvent.setup();
    render(
      <Field label="Board name" description="Shown in the device list.">
        <Input />
      </Field>,
    );

    await user.click(screen.getByText("Board name"));

    // The whole point of a real <label htmlFor>: a 90px-wide word becomes part
    // of the control's hit area (SC 2.5.8's spirit, and plain usability).
    expect(screen.getByRole("textbox", { name: "Board name" })).toHaveFocus();
  });

  it("announces name, then state, then the reason it is invalid", async () => {
    const user = userEvent.setup();
    render(
      <Field
        label="Refresh interval"
        description="Seconds between refreshes."
        error="Must be at least 10 seconds."
        required
      >
        <Input type="number" defaultValue={5} />
      </Field>,
    );

    const input = screen.getByRole("spinbutton", { name: "Refresh interval (required)" });
    await user.click(input);

    expect(input).toHaveFocus();
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Must be at least 10 seconds.");
  });
});
