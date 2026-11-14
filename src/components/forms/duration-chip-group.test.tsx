import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { buildDurationOptions, DurationChipGroup, OutcomeLine } from "./duration-chip-group";

const OPTIONS = buildDurationOptions({ nextChange: "Until 9:00 PM" });

describe("buildDurationOptions", () => {
  it("returns CANON's four chips in order when a next change exists", () => {
    expect(OPTIONS.map((option) => [option.value, option.label])).toEqual([
      ["15m", "15 min"],
      ["1h", "1 hr"],
      ["next-change", "Until 9:00 PM"],
      ["until-cancel", "Until I cancel"],
    ]);
  });

  it("drops the next-change chip when the Schedule has nothing next", () => {
    expect(buildDurationOptions().map((option) => option.value)).toEqual(["15m", "1h", "until-cancel"]);
    expect(buildDurationOptions({ nextChange: null }).map((option) => option.value)).toEqual([
      "15m",
      "1h",
      "until-cancel",
    ]);
  });

  it("takes localized labels for the fixed chips", () => {
    const options = buildDurationOptions({
      nextChange: "Hasta 21:00",
      labels: { fifteenMinutes: "15 min", oneHour: "1 h", untilCancel: "Hasta que cancele" },
    });
    expect(options.map((option) => option.label)).toEqual(["15 min", "1 h", "Hasta 21:00", "Hasta que cancele"]);
  });

  it("carries the duration in milliseconds for the timed chips only", () => {
    expect(OPTIONS.map((option) => option.durationMs)).toEqual([15 * 60_000, 60 * 60_000, undefined, undefined]);
  });
});

describe("DurationChipGroup", () => {
  it("is a named radiogroup with one radio per option", () => {
    render(<DurationChipGroup aria-label="How long should Taco Tuesday stay up?" options={OPTIONS} />);

    const group = screen.getByRole("radiogroup", { name: "How long should Taco Tuesday stay up?" });
    expect(group).toHaveAttribute("data-slot", "segmented-control");
    expect(screen.getAllByRole("radio").map((radio) => radio.textContent)).toEqual([
      "15 min",
      "1 hr",
      "Until 9:00 PM",
      "Until I cancel",
    ]);
  });

  it("shows the check glyph on the selected chip only", () => {
    render(<DurationChipGroup aria-label="Duration" options={OPTIONS} defaultValue="next-change" />);

    const selected = screen.getByRole("radio", { name: "Until 9:00 PM" });
    expect(selected).toHaveAttribute("aria-checked", "true");
    expect(selected.querySelector('[data-slot="duration-chip-check"]')).not.toBeNull();
    for (const radio of screen.getAllByRole("radio")) {
      if (radio === selected) continue;
      expect(radio.querySelector('[data-slot="duration-chip-check"]')).toBeNull();
    }
  });

  it("wears the Duration chip skin: a 44 px pill, inverted when selected", () => {
    render(<DurationChipGroup aria-label="Duration" options={OPTIONS} defaultValue="1h" />);
    for (const radio of screen.getAllByRole("radio")) {
      // jsdom runs no Tailwind, so the recipe is pinned by its classes; VRT owns the pixels.
      expect(radio).toHaveClass("h-(--control-h-touch)", "rounded-full", "bg-card", "border-input");
      expect(radio).toHaveClass("data-[checked]:bg-foreground", "data-[checked]:text-background");
      // The stock SegmentedControl look is merged away, not stacked under it.
      expect(radio).not.toHaveClass("h-8", "rounded-md", "data-[checked]:bg-primary/10");
    }
  });

  it("selects on click (uncontrolled) and reports the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DurationChipGroup aria-label="Duration" options={OPTIONS} onValueChange={onValueChange} />);

    await user.click(screen.getByRole("radio", { name: "1 hr" }));

    expect(onValueChange).toHaveBeenCalledWith("1h");
    expect(screen.getByRole("radio", { name: "1 hr" })).toHaveAttribute("aria-checked", "true");
    expect(
      screen.getByRole("radio", { name: "1 hr" }).querySelector('[data-slot="duration-chip-check"]'),
    ).not.toBeNull();
  });

  it("follows the controlled value", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = React.useState("15m");
      return (
        <>
          <DurationChipGroup aria-label="Duration" options={OPTIONS} value={value} onValueChange={setValue} />
          <output data-testid="value">{value}</output>
        </>
      );
    }
    render(<Controlled />);

    await user.click(screen.getByRole("radio", { name: "Until I cancel" }));
    expect(screen.getByTestId("value")).toHaveTextContent("until-cancel");
    expect(screen.getByRole("radio", { name: "Until I cancel" })).toHaveAttribute("aria-checked", "true");
  });

  it("ignores clicks while controlled and the parent does not update", async () => {
    const user = userEvent.setup();
    render(<DurationChipGroup aria-label="Duration" options={OPTIONS} value="15m" />);

    await user.click(screen.getByRole("radio", { name: "1 hr" }));
    expect(screen.getByRole("radio", { name: "15 min" })).toHaveAttribute("aria-checked", "true");
  });

  it("moves with the arrow keys like every radiogroup", async () => {
    const user = userEvent.setup();
    render(<DurationChipGroup aria-label="Duration" options={OPTIONS} defaultValue="15m" />);

    await user.click(screen.getByRole("radio", { name: "15 min" }));
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "1 hr" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "1 hr" })).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Until I cancel" })).toHaveAttribute("aria-checked", "true");
  });

  it("disables a single option", () => {
    const options = OPTIONS.map((option) => (option.value === "1h" ? { ...option, disabled: true } : option));
    render(<DurationChipGroup aria-label="Duration" options={options} />);
    expect(screen.getByRole("radio", { name: "1 hr" })).toBeDisabled();
  });

  it.each([
    ["row", "row"],
    ["grid", "grid"],
    ["auto", "auto"],
    [undefined, "auto"],
  ] as const)("stamps layout %s as %s", (layout, expected) => {
    const { container } = render(<DurationChipGroup aria-label="Duration" options={OPTIONS} layout={layout} />);
    expect(container.querySelector('[data-slot="duration-chip-group"]')).toHaveAttribute("data-layout", expected);
  });

  it.each([
    ["row", ["flex", "flex-wrap"], ["grid", "max-sm:grid"]],
    ["grid", ["grid", "grid-cols-2", "w-full"], ["max-sm:grid"]],
    ["auto", ["flex", "flex-wrap", "max-sm:grid", "max-sm:grid-cols-2"], ["grid"]],
  ] as const)("lays %s out with the matching classes", (layout, present, absent) => {
    render(<DurationChipGroup aria-label="Duration" options={OPTIONS} layout={layout} />);
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveClass(...present);
    for (const cls of absent) expect(group).not.toHaveClass(cls);
  });

  it("renders the outcome line as a polite live region that describes the group", () => {
    render(
      <DurationChipGroup
        aria-label="Duration"
        options={OPTIONS}
        defaultValue="next-change"
        outcome="Holds until 9:00 PM (2h 44m), then Schedule resumes with Good night."
      />,
    );

    const outcome = screen.getByText("Holds until 9:00 PM (2h 44m), then Schedule resumes with Good night.");
    expect(outcome).toHaveAttribute("data-slot", "outcome-line");
    expect(outcome).toHaveAttribute("aria-live", "polite");
    expect(outcome).toHaveAttribute("data-size", "sm");
    const group = screen.getByRole("radiogroup");
    expect(group).toHaveAttribute("aria-describedby", outcome.id);
    expect(group).toHaveAccessibleDescription("Holds until 9:00 PM (2h 44m), then Schedule resumes with Good night.");
  });

  it("keeps a caller's aria-describedby alongside the outcome", () => {
    render(
      <>
        <p id="hint">Pick one</p>
        <DurationChipGroup aria-label="Duration" aria-describedby="hint" options={OPTIONS} outcome="Holds until…" />
      </>,
    );
    expect(screen.getByRole("radiogroup").getAttribute("aria-describedby")?.split(" ")[0]).toBe("hint");
    expect(screen.getByRole("radiogroup")).toHaveAccessibleDescription("Pick one Holds until…");
  });

  it("renders no outcome line without an outcome", () => {
    const { container } = render(<DurationChipGroup aria-label="Duration" options={OPTIONS} />);
    expect(container.querySelector('[data-slot="outcome-line"]')).toBeNull();
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("aria-describedby");
  });

  it("names its form field and forwards root props", () => {
    const { container } = render(
      <DurationChipGroup aria-label="Duration" options={OPTIONS} name="duration" defaultValue="1h" className="mt-2" />,
    );
    const root = container.querySelector('[data-slot="duration-chip-group"]');
    expect(root).toHaveClass("mt-2");
    expect(container.querySelector('input[name="duration"]')).not.toBeNull();
  });
});

describe("OutcomeLine", () => {
  it("is a static muted paragraph by default (md, Home scale)", () => {
    render(<OutcomeLine>Holds until 9:00 PM, then Schedule resumes.</OutcomeLine>);
    const line = screen.getByText("Holds until 9:00 PM, then Schedule resumes.");
    expect(line.tagName).toBe("P");
    expect(line).toHaveAttribute("data-size", "md");
    expect(line).not.toHaveAttribute("aria-live");
  });
});
