import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { type InspectorTab,InspectorTabs, InspectorTabsContent } from "./inspector-tabs";

const tabs: InspectorTab[] = [
  { value: "data", label: "Data" },
  { value: "logic", label: "Logic" },
  { value: "page", label: "Page" },
  { value: "shows-on", label: "Shows on" },
  { value: "problems", label: "Problems" },
  { value: "history", label: "History" },
];
const panels = tabs.map(({ value, label }) => (
  <InspectorTabsContent key={value} value={value}>
    {label} content
  </InspectorTabsContent>
));

describe("InspectorTabs", () => {
  it("renders the host list and associates the selected panel with its tab", () => {
    render(
      <InspectorTabs tabs={tabs.filter((t) => t.value !== "problems")} aria-label="Inspector" defaultValue="page">
        {panels}
      </InspectorTabs>,
    );
    expect(within(screen.getByRole("tablist", { name: "Inspector" })).getAllByRole("tab")).toHaveLength(5);
    expect(screen.queryByRole("tab", { name: "Problems" })).not.toBeInTheDocument();
    const tab = screen.getByRole("tab", { name: "Page" });
    const panel = screen.getByRole("tabpanel", { name: "Page" });
    expect(tab).toHaveAttribute("aria-selected", "true");
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveTextContent("Page content");
  });

  it("defaults to the first enabled tab and supports pointer selection", async () => {
    const user = userEvent.setup();
    render(
      <InspectorTabs tabs={tabs.map((t, i) => ({ ...t, disabled: i === 0 }))} aria-label="Inspector">
        {panels}
      </InspectorTabs>,
    );
    expect(screen.getByRole("tab", { name: "Logic" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "History" }));
    expect(screen.getByRole("tabpanel", { name: "History" })).toBeInTheDocument();
  });

  it("uses manual activation and exposes disabled tabs without activating them", async () => {
    const user = userEvent.setup();
    render(
      <InspectorTabs
        tabs={tabs.map((t) => ({ ...t, disabled: t.value === "logic" || t.value === "history" }))}
        aria-label="Inspector"
        defaultValue="data"
      >
        {panels}
      </InspectorTabs>,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Logic" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("tabpanel", { name: "Data" })).toBeInTheDocument();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Page" })).toHaveFocus();
    expect(screen.getByRole("tabpanel", { name: "Data" })).toBeInTheDocument();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("tabpanel", { name: "Page" })).toBeInTheDocument();
    await user.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "History" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Problems" })).toHaveFocus();
    await user.keyboard(" ");
    expect(screen.getByRole("tabpanel", { name: "Problems" })).toBeInTheDocument();
    await user.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Data" })).toHaveFocus();
  });

  it("supports controlled selection without changing until the host accepts it", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <InspectorTabs tabs={tabs} aria-label="Inspector" value="data" onValueChange={onValueChange}>
        {panels}
      </InspectorTabs>,
    );
    await userEvent.click(screen.getByRole("tab", { name: "Page" }));
    expect(onValueChange).toHaveBeenCalledWith("page", expect.any(Object));
    expect(screen.getByRole("tabpanel", { name: "Data" })).toBeInTheDocument();
    rerender(
      <InspectorTabs tabs={tabs} aria-label="Inspector" value="page">
        {panels}
      </InspectorTabs>,
    );
    expect(screen.getByRole("tabpanel", { name: "Page" })).toBeInTheDocument();
  });

  it("allows controlled hosts to update and uses localized labels", async () => {
    function Host() {
      const [value, setValue] = useState<string | null>("data");
      return (
        <>
          <h2 id="label">Inspecteur</h2>
          <InspectorTabs tabs={tabs} aria-labelledby="label" value={value} onValueChange={setValue}>
            {panels}
          </InspectorTabs>
        </>
      );
    }
    render(<Host />);
    expect(screen.getByRole("tablist", { name: "Inspecteur" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Page" }));
    expect(screen.getByRole("tabpanel", { name: "Page" })).toBeInTheDocument();
  });

  it("shows supplied counts including zero and omits invalid counts", () => {
    render(
      <InspectorTabs
        tabs={tabs}
        aria-label="Inspector"
        counts={{ problems: 2, data: 0, page: -1, logic: NaN, history: Infinity }}
      />,
    );
    expect(screen.getByRole("tab", { name: "Problems 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Data 0" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Page" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "History" })).toBeInTheDocument();
  });

  it("disables the whole list and handles empty data", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(
      <InspectorTabs tabs={tabs} aria-label="Inspector" disabled onValueChange={onValueChange} />,
    );
    for (const tab of screen.getAllByRole("tab")) expect(tab).toHaveAttribute("aria-disabled", "true");
    await userEvent.click(screen.getByRole("tab", { name: "Data" }));
    expect(onValueChange).not.toHaveBeenCalledWith("data", expect.anything());
    rerender(<InspectorTabs tabs={[]} aria-label="Inspector" />);
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("falls back when the uncontrolled selected tab disappears", () => {
    const { rerender } = render(
      <InspectorTabs tabs={tabs} aria-label="Inspector" defaultValue="problems">
        {panels}
      </InspectorTabs>,
    );
    rerender(
      <InspectorTabs tabs={tabs.filter((t) => t.value !== "problems")} aria-label="Inspector" defaultValue="problems">
        {panels}
      </InspectorTabs>,
    );
    expect(screen.getByRole("tab", { name: "Data" })).toHaveAttribute("aria-selected", "true");
  });

  it("tracks overflow edges and reveals selected and focused tabs without scrolling ancestors", () => {
    const { container, rerender } = render(
      <InspectorTabs tabs={tabs} aria-label="Inspector" value="data" size="touch">
        {panels}
      </InspectorTabs>,
    );
    const viewport = container.querySelector<HTMLElement>("[data-slot=inspector-tabs-viewport]")!;
    const list = screen.getByRole("tablist");
    let left = 0;
    const rect = (x: number, width: number) => ({
      x,
      left: x,
      right: x + width,
      top: 0,
      bottom: 50,
      width,
      height: 50,
      y: 0,
      toJSON() {},
    });
    vi.spyOn(viewport, "getBoundingClientRect").mockImplementation(() => rect(0, 300));
    vi.spyOn(list, "getBoundingClientRect").mockImplementation(() => rect(-left, 600));
    Object.defineProperty(viewport, "clientWidth", { value: 300 });
    Object.defineProperty(viewport, "scrollWidth", { value: 600 });
    for (const [i, tab] of screen.getAllByRole("tab").entries())
      vi.spyOn(tab, "getBoundingClientRect").mockImplementation(() => rect(i * 100 - left, 100));
    Object.defineProperty(viewport, "scrollLeft", {
      get: () => left,
      set: (v) => {
        left = Math.max(0, Math.min(300, v));
      },
      configurable: true,
    });
    fireEvent.scroll(viewport);
    expect(container.querySelector("[data-slot=inspector-tabs-fade-right]")).toBeInTheDocument();
    expect(container.querySelector("[data-slot=inspector-tabs-fade-left]")).not.toBeInTheDocument();
    rerender(
      <InspectorTabs tabs={tabs} aria-label="Inspector" value="history" size="touch">
        {panels}
      </InspectorTabs>,
    );
    expect(left).toBe(300);
    expect(container.querySelector("[data-slot=inspector-tabs-fade-left]")).toBeInTheDocument();
    expect(container.querySelector("[data-slot=inspector-tabs-fade-right]")).not.toBeInTheDocument();
    act(() => screen.getByRole("tab", { name: "Data" }).focus());
    expect(left).toBe(0);
    act(() => screen.getByRole("tab", { name: "Page" }).focus());
    expect(left).toBeGreaterThan(0);
  });
});
