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
    rerender(<FormulaAtom source="EMPTY()" value="" />);
    expect(container.querySelector('[data-slot="formula-atom-value"]')?.textContent).toBe("");
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
});
