import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { DataSourceSwitch } from "./data-source-switch";

describe("DataSourceSwitch", () => {
  it("names the preview choice and initially selects live without tab semantics", () => {
    render(<DataSourceSwitch aria-label="Preview data" />);
    const group = screen.getByRole("radiogroup", { name: "Preview data" });
    expect(within(group).getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole("radio", { name: "Live" })).toHaveAttribute("aria-checked", "true");
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("moves selection with arrows, wraps, and supports Home/End", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DataSourceSwitch aria-label="Preview data" onValueChange={onValueChange} />);
    await user.tab();
    expect(screen.getByRole("radio", { name: "Live" })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Sample" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Sample" })).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenLastCalledWith("sample");
    await user.keyboard("{End}{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Live" })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Missing" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Live" })).toHaveFocus();
  });

  it("skips disabled choices and does not clear the selected option", async () => {
    const user = userEvent.setup();
    render(
      <DataSourceSwitch
        aria-label="Preview data"
        options={[{ value: "live" }, { value: "sample", disabled: true }, { value: "missing" }]}
      />,
    );
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Missing" })).toHaveFocus();
    await user.click(screen.getByRole("radio", { name: "Missing" }));
    expect(screen.getByRole("radio", { name: "Missing" })).toHaveAttribute("aria-checked", "true");
    await user.click(screen.getByRole("radio", { name: "Sample" }));
    expect(screen.getByRole("radio", { name: "Missing" })).toHaveAttribute("aria-checked", "true");
  });

  it("keeps controlled selection until the host updates it", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const { rerender } = render(
      <DataSourceSwitch aria-label="Preview data" value="live" onValueChange={onValueChange} />,
    );
    await user.click(screen.getByRole("radio", { name: "Sample" }));
    expect(onValueChange).toHaveBeenCalledWith("sample");
    expect(screen.getByRole("radio", { name: "Live" })).toHaveAttribute("aria-checked", "true");
    rerender(<DataSourceSwitch aria-label="Preview data" value="missing" onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: "Missing" })).toHaveAttribute("aria-checked", "true");
  });

  it("lets desktop hosts supply only live and sample with localized labels", () => {
    render(
      <>
        <h2 id="data-heading">Données</h2>
        <DataSourceSwitch
          aria-labelledby="data-heading"
          defaultValue="sample"
          size="touch"
          options={[
            { value: "live", label: "En direct" },
            { value: "sample", label: "Exemple" },
          ]}
        />
      </>,
    );
    expect(screen.getByRole("radiogroup", { name: "Données" })).toHaveAttribute("data-size", "touch");
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.queryByRole("radio", { name: "Missing" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Exemple" })).toHaveAttribute("aria-checked", "true");
  });

  it("submits the selected value and omits disabled controls", async () => {
    const user = userEvent.setup();
    const { container, rerender } = render(
      <form>
        <DataSourceSwitch aria-label="Preview data" name="source" />
      </form>,
    );
    await user.click(screen.getByRole("radio", { name: "Missing" }));
    expect(new FormData(container.querySelector("form")!).getAll("source")).toEqual(["missing"]);
    rerender(
      <form>
        <DataSourceSwitch aria-label="Preview data" name="source" disabled />
      </form>,
    );
    expect(new FormData(container.querySelector("form")!).getAll("source")).toEqual([]);
    expect(screen.getAllByRole("radio").every((el) => el.hasAttribute("disabled"))).toBe(true);
  });

  it("forwards the root ref and description for host integration", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <>
        <p id="source-help">Preview changes are not sent to the board.</p>
        <DataSourceSwitch ref={ref} aria-label="Preview data" aria-describedby="source-help" />
      </>,
    );
    expect(ref.current).toBe(screen.getByRole("radiogroup"));
    expect(ref.current).toHaveAccessibleDescription("Preview changes are not sent to the board.");
  });
});
