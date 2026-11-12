import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ChoiceCard, ChoiceCardGroup, ChoiceCardPreview } from "./choice-card";

/*
 * What is asserted: the accessibility tree (radio vs checkbox contracts),
 * keyboard behaviour, form submission and the published data-slot contract.
 * The pixels (ring, tint, crop, edge fade) are VRT's job.
 */

function DisplayTypes(props: {
  onValueChange?: (value: string) => void;
  defaultValue?: string;
  disabledNote?: boolean;
}) {
  return (
    <ChoiceCardGroup aria-label="Display type" defaultValue={props.defaultValue} onValueChange={props.onValueChange}>
      <ChoiceCard
        value="flagship"
        title="Vestaboard Flagship"
        description="Split-flap · 22 × 6 characters"
        meta="Local API · Cloud API"
        media={<ChoiceCardPreview data-testid="preview">board</ChoiceCardPreview>}
      />
      <ChoiceCard
        value="note"
        title="Vestaboard Note"
        description="Split-flap · 15 × 3 characters"
        disabled={props.disabledNote}
      />
      <ChoiceCard value="panel" title="FiestaPanel TV" description="Any TV or browser, sized to fit" />
    </ChoiceCardGroup>
  );
}

describe("ChoiceCardGroup (single)", () => {
  it("is a named radiogroup of radios named by their title alone", () => {
    render(<DisplayTypes />);
    expect(screen.getByRole("radiogroup", { name: "Display type" })).toHaveAttribute("data-slot", "choice-card-group");
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(3);
    const flagship = screen.getByRole("radio", { name: "Vestaboard Flagship" });
    expect(flagship).toHaveAccessibleDescription("Split-flap · 22 × 6 characters Local API · Cloud API");
    expect(flagship).toHaveAttribute("data-slot", "choice-card");
    expect(flagship).toHaveAttribute("aria-checked", "false");
  });

  it("selects on click and reports the value", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<DisplayTypes onValueChange={onValueChange} />);
    const flagship = screen.getByRole("radio", { name: "Vestaboard Flagship" });
    await user.click(flagship);
    expect(flagship).toHaveAttribute("aria-checked", "true");
    expect(flagship).toHaveAttribute("data-checked");
    expect(onValueChange).toHaveBeenCalledWith("flagship");
  });

  it("has one tab stop; arrows move and select, Home/End jump, disabled options are skipped", async () => {
    const user = userEvent.setup();
    render(<DisplayTypes defaultValue="flagship" disabledNote />);
    await user.tab();
    const flagship = screen.getByRole("radio", { name: "Vestaboard Flagship" });
    const panel = screen.getByRole("radio", { name: "FiestaPanel TV" });
    expect(flagship).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(panel).toHaveFocus();
    expect(panel).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{Home}");
    expect(flagship).toHaveFocus();
    expect(flagship).toHaveAttribute("aria-checked", "true");
    await user.keyboard("{End}");
    expect(panel).toHaveFocus();
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it("draws a round indicator that is decorative", () => {
    render(<DisplayTypes />);
    const indicator = screen
      .getByRole("radio", { name: "Vestaboard Flagship" })
      .querySelector('[data-slot="choice-card-indicator"]');
    expect(indicator).toHaveAttribute("data-shape", "radio");
    expect(indicator).toHaveAttribute("aria-hidden", "true");
  });

  it("hides the preview from the accessibility tree and keeps it inside the card", () => {
    render(<DisplayTypes />);
    const preview = screen.getByTestId("preview");
    expect(preview).toHaveAttribute("data-slot", "choice-card-preview");
    expect(preview.closest('[data-slot="choice-card-media"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("submits the selected value under name", async () => {
    const user = userEvent.setup();
    render(
      <form data-testid="form">
        <ChoiceCardGroup aria-label="Display type" name="display">
          <ChoiceCard value="flagship" title="Flagship" />
          <ChoiceCard value="note" title="Note" />
        </ChoiceCardGroup>
      </form>,
    );
    await user.click(screen.getByRole("radio", { name: "Note" }));
    const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
    expect(data.get("display")).toBe("note");
  });
});

describe("ChoiceCardGroup multiple", () => {
  function Multi(props: { onValueChange?: (value: string[]) => void }) {
    const [value, setValue] = useState<string[]>(["flagship"]);
    return (
      <form data-testid="form">
        <ChoiceCardGroup
          multiple
          aria-label="Displays"
          name="displays"
          value={value}
          onValueChange={(next) => {
            setValue(next);
            props.onValueChange?.(next);
          }}
        >
          <ChoiceCard value="flagship" title="Flagship" />
          <ChoiceCard value="note" title="Note" />
          <ChoiceCard value="panel" title="Panel" disabled />
        </ChoiceCardGroup>
      </form>
    );
  }

  it("is a named group of checkboxes, each its own tab stop", async () => {
    const user = userEvent.setup();
    render(<Multi />);
    expect(screen.getByRole("group", { name: "Displays" })).toHaveAttribute("data-multiple", "");
    const flagship = screen.getByRole("checkbox", { name: "Flagship" });
    const note = screen.getByRole("checkbox", { name: "Note" });
    expect(flagship).toHaveAttribute("aria-checked", "true");
    expect(note).toHaveAttribute("aria-checked", "false");
    await user.tab();
    expect(flagship).toHaveFocus();
    await user.tab();
    expect(note).toHaveFocus();
    expect(flagship.querySelector('[data-slot="choice-card-indicator"]')?.getAttribute("data-shape")).toBe("checkbox");
  });

  it("Space toggles independently and reports the whole selection", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Multi onValueChange={onValueChange} />);
    const note = screen.getByRole("checkbox", { name: "Note" });
    note.focus();
    await user.keyboard(" ");
    expect(note).toHaveAttribute("aria-checked", "true");
    expect(onValueChange).toHaveBeenLastCalledWith(["flagship", "note"]);
    await user.click(screen.getByRole("checkbox", { name: "Flagship" }));
    expect(onValueChange).toHaveBeenLastCalledWith(["note"]);
    const data = new FormData(screen.getByTestId("form") as HTMLFormElement);
    expect(data.getAll("displays")).toEqual(["note"]);
  });

  it("a disabled checkbox cannot be toggled", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Multi onValueChange={onValueChange} />);
    const panel = screen.getByRole("checkbox", { name: "Panel" });
    expect(panel).toBeDisabled();
    await user.click(panel);
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it("works uncontrolled with defaultValue", async () => {
    const user = userEvent.setup();
    render(
      <ChoiceCardGroup multiple aria-label="Displays" defaultValue={["a"]}>
        <ChoiceCard value="a" title="A" />
        <ChoiceCard value="b" title="B" />
      </ChoiceCardGroup>,
    );
    await user.click(screen.getByRole("checkbox", { name: "B" }));
    expect(screen.getByRole("checkbox", { name: "A" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", { name: "B" })).toHaveAttribute("aria-checked", "true");
  });
});

describe("ChoiceCard", () => {
  it("throws a clear error outside a ChoiceCardGroup", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<ChoiceCard value="x" title="X" />)).toThrow(/ChoiceCardGroup/);
    spy.mockRestore();
  });

  it("lets a caller-provided aria-label win over the title", () => {
    render(
      <ChoiceCardGroup aria-label="Display type">
        <ChoiceCard value="x" title="X" aria-label="Custom" />
      </ChoiceCardGroup>,
    );
    expect(screen.getByRole("radio", { name: "Custom" })).toBeInTheDocument();
  });

  it("renders a TBD-style overlay inside the preview and applies the crop offset", () => {
    render(
      <ChoiceCardPreview offsetX={-72} offsetY={-40} overlay={<span>TBD</span>} fade={false} data-testid="p">
        <span>board</span>
      </ChoiceCardPreview>,
    );
    const preview = screen.getByTestId("p");
    const content = preview.querySelector<HTMLElement>('[data-slot="choice-card-preview-content"]');
    expect(content?.style.left).toBe("-72px");
    expect(content?.style.top).toBe("-40px");
    expect(preview.querySelector('[data-slot="choice-card-preview-fade"]')).toBeNull();
    expect(screen.getByText("TBD")).toBeInTheDocument();
  });

  it("centres the preview content when no offset is given and draws the fade by default", () => {
    render(
      <ChoiceCardPreview data-testid="p">
        <span>board</span>
      </ChoiceCardPreview>,
    );
    const preview = screen.getByTestId("p");
    expect(preview.querySelector('[data-slot="choice-card-preview-content"]')).toHaveAttribute("data-align", "center");
    expect(preview.querySelector('[data-slot="choice-card-preview-fade"]')).not.toBeNull();
  });
});
