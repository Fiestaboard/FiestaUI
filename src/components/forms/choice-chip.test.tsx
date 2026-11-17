import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ChoiceChip, ChoiceChipGroup } from "./choice-chip";

function Choices({ disabled = false }: { disabled?: boolean }) {
  return (
    <ChoiceChipGroup aria-label="Display" defaultValue="a" disabled={disabled}>
      <ChoiceChip value="a" label="All" />
      <ChoiceChip value="b" label="Offline" disabled />
      <ChoiceChip value="c" label="Online" />
    </ChoiceChipGroup>
  );
}

describe("ChoiceChipGroup", () => {
  it("names its radios from their labels and selects without clearing on repeated clicks", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <ChoiceChipGroup aria-label="Display" onValueChange={onValueChange}>
        <ChoiceChip value="all" label="All" />
        <ChoiceChip value="online" label="Online" />
      </ChoiceChipGroup>,
    );
    expect(screen.getByRole("radiogroup", { name: "Display" })).toHaveAttribute("data-slot", "choice-chip-group");
    const chip = screen.getByRole("radio", { name: "Online" });
    expect(chip).not.toHaveAttribute("aria-pressed");
    await user.click(chip);
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith("online");
  });

  it("has one tab stop, wraps arrows, and skips disabled choices for arrows and Home/End", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Choices />
        <button>After</button>
      </>,
    );
    const all = screen.getByRole("radio", { name: "All" });
    const online = screen.getByRole("radio", { name: "Online" });
    await user.tab();
    expect(all).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(online).toHaveFocus();
    expect(online).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{ArrowRight}");
    expect(all).toHaveFocus();
    await user.keyboard("{End}");
    expect(online).toHaveFocus();
    await user.keyboard("{Home}");
    expect(all).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "After" })).toHaveFocus();
  });

  it("skips disabled first/last options when Home and End select", async () => {
    const user = userEvent.setup();
    render(
      <ChoiceChipGroup aria-label="Options" defaultValue="b">
        <ChoiceChip value="a" label="A" disabled />
        <ChoiceChip value="b" label="B" />
        <ChoiceChip value="c" label="C" />
        <ChoiceChip value="d" label="D" disabled />
      </ChoiceChipGroup>,
    );
    await user.tab();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "C" })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "B" })).toHaveFocus();
  });

  it("submits the controlled selection through a named form field", async () => {
    const user = userEvent.setup();
    function Controlled() {
      const [value, setValue] = useState("all");
      return (
        <form data-testid="form">
          <ChoiceChipGroup aria-label="Display" value={value} onValueChange={setValue} name="display">
            <ChoiceChip value="all" label="All" />
            <ChoiceChip value="online" label="Online" />
          </ChoiceChipGroup>
        </form>
      );
    }
    render(<Controlled />);
    await user.click(screen.getByRole("radio", { name: "Online" }));
    expect(new FormData(screen.getByTestId("form") as HTMLFormElement).get("display")).toBe("online");
  });

  it("disables all items through the group", async () => {
    const user = userEvent.setup();
    render(<Choices disabled />);
    for (const chip of screen.getAllByRole("radio")) expect(chip).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: "Online" }));
    expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
  });

  it("requires a value for a grouped chip", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <ChoiceChipGroup aria-label="Display">
          <ChoiceChip label="Missing" />
        </ChoiceChipGroup>,
      ),
    ).toThrow(/value/);
    spy.mockRestore();
  });

  it("inherits touch size and permits an explicit item override", () => {
    render(
      <ChoiceChipGroup aria-label="Display" size="touch">
        <ChoiceChip value="a" label="All" />
        <ChoiceChip value="b" label="Compact" size="default" />
      </ChoiceChipGroup>,
    );
    expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("data-size", "touch");
    expect(screen.getByRole("radio", { name: "Compact" })).toHaveAttribute("data-size", "default");
  });
});

describe("ChoiceChip standalone", () => {
  it("is a controlled toggle, activating with Space and Enter without submitting a form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((event) => event.preventDefault());
    function Filter() {
      const [selected, setSelected] = useState(false);
      return (
        <form onSubmit={onSubmit}>
          <ChoiceChip label="Online" selected={selected} onSelectedChange={setSelected} />
        </form>
      );
    }
    render(<Filter />);
    const chip = screen.getByRole("button", { name: "Online" });
    expect(chip).toHaveAttribute("aria-pressed", "false");
    await user.tab();
    await user.keyboard(" ");
    expect(chip).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Enter}");
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("reports proposed changes but waits for controlled state to update", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    render(<ChoiceChip label="Online" selected onSelectedChange={onSelectedChange} />);
    const chip = screen.getByRole("button", { name: "Online" });
    await user.click(chip);
    expect(onSelectedChange).toHaveBeenCalledExactlyOnceWith(false);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(chip).toHaveAttribute("data-checked");
  });

  it("respects disabled and cancelled activation", async () => {
    const user = userEvent.setup();
    const onSelectedChange = vi.fn();
    const { rerender } = render(<ChoiceChip label="Online" disabled onSelectedChange={onSelectedChange} />);
    await user.click(screen.getByRole("button", { name: "Online" }));
    rerender(
      <ChoiceChip label="Online" onClick={(event) => event.preventDefault()} onSelectedChange={onSelectedChange} />,
    );
    await user.click(screen.getByRole("button", { name: "Online" }));
    expect(onSelectedChange).not.toHaveBeenCalled();
  });

  it("forwards ref and root attributes, hiding the check and optional icon from assistive technology", () => {
    const ref = createRef<HTMLButtonElement>();
    render(
      <ChoiceChip
        ref={ref}
        label="Online"
        icon={<svg role="img" aria-label="Decorative network" />}
        aria-label="Custom name"
        id="filter"
        className="custom"
        selected
      />,
    );
    const chip = screen.getByRole("button", { name: "Custom name" });
    expect(ref.current).toBe(chip);
    expect(chip).toHaveAttribute("id", "filter");
    expect(chip).toHaveClass("custom");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(chip.querySelector('[data-slot="choice-chip-check"]')).toHaveAttribute("aria-hidden", "true");
    expect(chip.querySelector('[data-slot="choice-chip-pill"]')).toBeInTheDocument();
  });
});
