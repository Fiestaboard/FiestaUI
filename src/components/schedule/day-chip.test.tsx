import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DayChip, WeekStrip } from "./day-chip";

/*
 * WeekStrip + DayChip (slice 1.8d, C24). The web goalpost (07d `322:19169`)
 * draws the strip as touch-size SegmentedControl pills ("Thu 5"), so these
 * are that radiogroup with one addition from 06 (`31:115`): the gap dot,
 * which is paired with words for screen readers.
 */

function strip() {
  return (
    <WeekStrip aria-label="Day" defaultValue="sun">
      <DayChip value="thu">Thu 5</DayChip>
      <DayChip value="fri" hasGap>
        Fri 6
      </DayChip>
      <DayChip value="sun">Sun 8</DayChip>
    </WeekStrip>
  );
}

describe("WeekStrip / DayChip", () => {
  it("is a named radiogroup of touch-size radios on one scrolling line", () => {
    render(strip());
    const group = screen.getByRole("radiogroup", { name: "Day" });
    expect(group.dataset.weekStrip).toBe("");
    expect(group.className).toContain("flex-nowrap");
    expect(group.className).toContain("overflow-x-auto");
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    for (const radio of radios) expect(radio.dataset.size).toBe("touch");
    expect(screen.getByRole("radio", { name: "Sun 8" }).getAttribute("aria-checked")).toBe("true");
  });

  it("names a gap day in words and draws the dot", () => {
    render(strip());
    const fri = screen.getByRole("radio", { name: "Fri 6, has a gap" });
    expect(fri.dataset.gap).toBe("");
    const dot = fri.querySelector('[data-slot="day-chip-gap"]');
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
    expect(dot?.className).toContain("bg-warning");
    expect(screen.getByRole("radio", { name: "Thu 5" }).querySelector('[data-slot="day-chip-gap"]')).toBeNull();
  });

  it("takes a custom gap label", () => {
    render(
      <WeekStrip aria-label="Día">
        <DayChip value="a" hasGap gapLabel="hay un hueco">
          Lun 3
        </DayChip>
      </WeekStrip>,
    );
    expect(screen.getByRole("radio", { name: "Lun 3, hay un hueco" })).toBeTruthy();
  });

  it("selects with a click and reports the value", () => {
    const onValueChange = vi.fn();
    render(
      <WeekStrip aria-label="Day" value="thu" onValueChange={onValueChange}>
        <DayChip value="thu">Thu 5</DayChip>
        <DayChip value="fri">Fri 6</DayChip>
      </WeekStrip>,
    );
    fireEvent.click(screen.getByRole("radio", { name: "Fri 6" }));
    expect(onValueChange).toHaveBeenCalledWith("fri");
  });

  it("lets the strip pick another size and keeps the caller's className", () => {
    render(
      <WeekStrip aria-label="Day" size="md" className="extra">
        <DayChip value="a">Mon 3</DayChip>
      </WeekStrip>,
    );
    expect(screen.getByRole("radio").dataset.size).toBe("md");
    expect(screen.getByRole("radiogroup").className).toContain("extra");
  });
});
