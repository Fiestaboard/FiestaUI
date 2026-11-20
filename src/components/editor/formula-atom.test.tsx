import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";

import { FormulaAtom } from "./formula-atom";

describe("FormulaAtom", () => {
  it("renders inline source and caller-formatted value without adding a control or live announcement", () => {
    const { container } = render(
      <p>
        Temperature <FormulaAtom source="weather.temperature" value="= 0°" /> today
      </p>,
    );
    const atom = container.querySelector('[data-slot="formula-atom"]');
    expect(atom?.tagName).toBe("SPAN");
    expect(atom).toHaveAttribute("data-kind", "formula");
    expect(atom).toHaveAttribute("data-state", "ok");
    expect(screen.getByText("weather.temperature")).toBeInTheDocument();
    expect(screen.getByText("= 0°")).toBeInTheDocument();
    expect(atom).not.toHaveAttribute("tabindex");
    expect(atom).not.toHaveAttribute("aria-live");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    ["formula", "ok", "lucide-sigma", "= 72"],
    ["formula", "error", "lucide-circle-alert", "#REF"],
    ["formula", "fallback", "lucide-sigma", "= 72"],
    ["variable", "ok", "lucide-braces", "= 72"],
    ["variable", "error", "lucide-circle-alert", "#REF"],
    ["variable", "fallback", "lucide-braces", "= 72"],
  ] as const)("communicates %s/%s with its value and the matching decorative icon", (kind, state, icon, value) => {
    const { container } = render(<FormulaAtom kind={kind} state={state} source="temperature" value={value} />);
    const atom = container.querySelector('[data-slot="formula-atom"]');
    expect(atom).toHaveAttribute("data-kind", kind);
    expect(atom).toHaveAttribute("data-state", state);
    expect(screen.getByText(value)).toBeInTheDocument();
    expect(atom?.querySelector("svg")).toHaveClass(icon);
    expect(atom?.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByText("Fallback value:") !== null).toBe(state === "fallback");
  });

  it.each(["#REF", "#VALUE", "#DIV/0", "#NAME?", "#NUM", "#SYNTAX:8", "???"])(
    "preserves the actual %s error tag rather than showing a successful result",
    (value) => {
      render(<FormulaAtom state="error" source="1 / 0" value={value} />);
      expect(screen.getByText(value)).toBeInTheDocument();
      expect(screen.queryByText("= 72")).not.toBeInTheDocument();
    },
  );

  it("retains complete source and value text for clipped content", () => {
    const source = "COALESCE(weather.forecast.tomorrow.temperature, weather.current.temperature, 72)";
    const value = "= A long fallback forecast with all of the original source detail";
    render(<FormulaAtom source={source} value={value} />);
    expect(screen.getByText(source)).toHaveAttribute("title", source);
    expect(screen.getByText(value)).toHaveAttribute("title", value);
  });

  it("keeps caller formatting, including empty results, without evaluating it", () => {
    const { rerender, container } = render(<FormulaAtom source="1 + 1" value="2.00" />);
    expect(screen.getByText("2.00")).toBeInTheDocument();
    rerender(<FormulaAtom source="EMPTY()" value='= ""' />);
    expect(screen.getByText('= ""')).toBeInTheDocument();
    expect(screen.queryByText("2.00")).not.toBeInTheDocument();
  });

  it("localizes the fallback cue without changing source and result", () => {
    render(
      <FormulaAtom
        state="fallback"
        source="DEFAULT(temp, 72)"
        value="= 72"
        labels={{ fallback: "Valeur de repli :" }}
      />,
    );
    expect(screen.getByText("Valeur de repli :")).toBeInTheDocument();
    expect(screen.queryByText("Fallback value:")).not.toBeInTheDocument();
    expect(screen.getByText("= 72")).toBeInTheDocument();
  });

  it("forwards the ref, description and custom class to the atom", () => {
    const ref = createRef<HTMLSpanElement>();
    render(<FormulaAtom ref={ref} source="temp" value="= 72" aria-describedby="help" className="custom-atom" />);
    expect(ref.current).toHaveAttribute("data-slot", "formula-atom");
    expect(ref.current).toHaveAttribute("aria-describedby", "help");
    expect(ref.current).toHaveClass("custom-atom");
  });
  // BB-FP-10: the template editor surface is uppercase. An atom shows its
  // source as written, so it resets the inherited text-transform itself.
  it("resets text-transform so an uppercase host cannot restyle the source", () => {
    const { container } = render(
      <p className="uppercase">
        <FormulaAtom source='UPPER(date_time.day_of_week) & "Morning"' value="= MONDAY" />
      </p>,
    );
    const atom = container.querySelector('[data-slot="formula-atom"]');
    expect(atom).toHaveClass("normal-case");
    expect(atom).not.toHaveClass("uppercase");
  });

  // BB-FP-12: one atom shape and one 22px height. A 1px border on the error
  // state made error lines 2px taller than their neighbours.
  it.each(["formula", "variable"] as const)("draws the %s error state without a layout border", (kind) => {
    const { container } = render(<FormulaAtom kind={kind} state="error" source="1 / 0" value="#DIV/0" />);
    const atom = container.querySelector('[data-slot="formula-atom"]')!;
    expect(atom).toHaveClass("border-0");
    expect(atom.classList.contains("border")).toBe(false);
  });

  describe("valueColor (BB-FP-12)", () => {
    it.each([
      ["66", "green"],
      ["green", "green"],
      ["GREEN", "green"],
      ["purple", "violet"],
      ["63", "red"],
      ["71", "black"],
    ])("shows %s as the %s board tile, keeping the caller's value as the text", (valueColor, name) => {
      const { container } = render(<FormulaAtom source='COLOR("GREEN")' value="= green" valueColor={valueColor} />);
      const tile = container.querySelector('[data-slot="formula-atom-color"]');
      expect(tile).not.toBeNull();
      expect(tile).toHaveAttribute("data-color", name);
      expect(tile).toHaveAttribute("aria-hidden", "true");
      expect(tile).toHaveClass(`bg-board-${name}`);
      const value = container.querySelector('[data-slot="formula-atom-value"]')!;
      expect(value).toHaveAttribute("title", "= green");
      expect(value).toHaveTextContent("green");
      expect(value.textContent).not.toContain("{66}");
    });

    it("falls back to the plain value for anything that is not a board colour", () => {
      const { container } = render(<FormulaAtom source="x" value="= toString" valueColor="toString" />);
      expect(container.querySelector('[data-slot="formula-atom-color"]')).toBeNull();
      expect(screen.getByText("= toString")).toBeInTheDocument();
    });

    it("never draws a tile over an error tag", () => {
      const { container } = render(<FormulaAtom state="error" source="COLOR(x)" value="#VALUE" valueColor="66" />);
      expect(container.querySelector('[data-slot="formula-atom-color"]')).toBeNull();
      expect(screen.getByText("#VALUE")).toBeInTheDocument();
    });
  });

  // The app's variable chip outside the page editor has no value to show.
  it.each([
    ["undefined", undefined],
    ["an empty string", ""],
  ])("draws no value segment when the value is %s", (_label, value) => {
    const { container } = render(
      <FormulaAtom kind="variable" state="fallback" source="weather.temperature" value={value} />,
    );
    expect(container.querySelector('[data-slot="formula-atom-value"]')).toBeNull();
    // Nor the fallback cue, which only describes a value.
    expect(screen.queryByText("Fallback value:")).not.toBeInTheDocument();
    expect(screen.getByText("weather.temperature")).toBeInTheDocument();
    expect(container.querySelector('[data-slot="formula-atom"]')).toHaveClass("min-h-[22px]");
  });

  it("draws no colour tile without a value", () => {
    const { container } = render(<FormulaAtom source='COLOR("GREEN")' valueColor="66" />);
    expect(container.querySelector('[data-slot="formula-atom-color"]')).toBeNull();
  });
});
