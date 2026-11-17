import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ZoomControl, type ZoomControlProps, type ZoomValue } from "./zoom-control";

function Controlled(props: Partial<ZoomControlProps> = {}) {
  const [value, setValue] = useState<ZoomValue>(props.value ?? "sm");
  const [open, setOpen] = useState(false);
  return (
    <ZoomControl {...props} value={value} onValueChange={setValue} minimapOpen={open} onMinimapOpenChange={setOpen} />
  );
}

describe("ZoomControl", () => {
  it("keeps selection controlled and exposes Fit as a read-only overview", async () => {
    const onValueChange = vi.fn();
    const { rerender } = render(<ZoomControl value="sm" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole("radio", { name: "Fit · overview" }));
    expect(onValueChange).toHaveBeenCalledWith("fit");
    expect(screen.getByRole("radio", { name: "Tile sm" })).toBeChecked();
    rerender(<ZoomControl value="fit" onValueChange={onValueChange} />);
    expect(screen.getByRole("radio", { name: "Fit · overview" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Fit · overview" })).toHaveAccessibleDescription(
      "Read-only overview. Select a tile size to edit.",
    );
  });

  it("steps within tile sizes without entering Fit and stops at both ends", async () => {
    render(<Controlled />);
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("radio", { name: "Tile md" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("radio", { name: "Tile lg" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByRole("radio", { name: "Tile md" })).toBeChecked();
    await userEvent.click(screen.getByRole("button", { name: "Zoom out" }));
    expect(screen.getByRole("radio", { name: "Tile sm" })).toBeChecked();
  });

  it("returns from Fit to the configured floor and disables smaller tiles", async () => {
    render(<Controlled value="fit" min="md" />);
    expect(screen.getByRole("radio", { name: "Tile sm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(screen.getByRole("radio", { name: "Tile md" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  });

  it("normalizes a below-floor controlled value without emitting a mount update", () => {
    const change = vi.fn();
    render(<ZoomControl value="sm" min="lg" onValueChange={change} />);
    expect(screen.getByRole("radio", { name: "Tile lg" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Zoom in" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Zoom out" })).toBeDisabled();
    expect(change).not.toHaveBeenCalled();
  });

  it("uses shared radio navigation and skips below-floor options", async () => {
    render(<Controlled min="md" value="md" />);
    screen.getByRole("radio", { name: "Tile md" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Tile lg" })).toHaveFocus();
    expect(screen.getByRole("radio", { name: "Tile lg" })).toBeChecked();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: "Fit · overview" })).toBeChecked();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("radio", { name: "Tile lg" })).toBeChecked();
    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: "Tile md" })).toBeChecked();
  });

  it("scopes shortcuts to the control and constrains their floor", () => {
    render(<Controlled min="md" value="fit" />);
    const group = screen.getByRole("group", { name: "Zoom controls" });
    fireEvent.keyDown(document.body, { key: "=", metaKey: true });
    expect(screen.getByRole("radio", { name: "Fit · overview" })).toBeChecked();
    fireEvent.keyDown(group, { key: "=", metaKey: true });
    expect(screen.getByRole("radio", { name: "Tile md" })).toBeChecked();
    fireEvent.keyDown(group, { key: "-", ctrlKey: true });
    expect(screen.getByRole("radio", { name: "Tile md" })).toBeChecked();
    fireEvent.keyDown(group, { key: "+", ctrlKey: true });
    expect(screen.getByRole("radio", { name: "Tile lg" })).toBeChecked();
    fireEvent.keyDown(group, { key: "=", metaKey: true });
    expect(screen.getByRole("radio", { name: "Tile lg" })).toBeChecked();
    fireEvent.keyDown(group, { key: "0", metaKey: true });
    expect(screen.getByRole("radio", { name: "Tile md" })).toBeChecked();
    fireEvent.keyDown(group, { key: "!", shiftKey: true });
    expect(screen.getByRole("radio", { name: "Fit · overview" })).toBeChecked();
    fireEvent.keyDown(group, { key: "-", metaKey: true });
    expect(screen.getByRole("radio", { name: "Fit · overview" })).toBeChecked();
  });

  it("ignores unrelated, Alt-modified and consumer-cancelled shortcuts", () => {
    const change = vi.fn();
    const { rerender } = render(<ZoomControl value="md" onValueChange={change} />);
    const group = screen.getByRole("group");
    fireEvent.keyDown(group, { key: "=" });
    fireEvent.keyDown(group, { key: "x", metaKey: true });
    fireEvent.keyDown(group, { key: "=", metaKey: true, altKey: true });
    fireEvent.keyDown(group, { key: "1", shiftKey: true, ctrlKey: true });
    rerender(<ZoomControl value="md" onValueChange={change} onKeyDown={(event) => event.preventDefault()} />);
    fireEvent.keyDown(group, { key: "=", metaKey: true });
    expect(change).not.toHaveBeenCalled();
  });

  it("disables every action and emits nothing while disabled", async () => {
    const change = vi.fn();
    render(<ZoomControl value="md" onValueChange={change} onMinimapOpenChange={change} disabled />);
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
    for (const radio of screen.getAllByRole("radio")) expect(radio).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    fireEvent.keyDown(screen.getByRole("group"), { key: "=", metaKey: true });
    expect(change).not.toHaveBeenCalled();
  });

  it("toggles the controlled minimap and never submits an enclosing form", async () => {
    const submit = vi.fn((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <Controlled />
      </form>,
    );
    const map = screen.getByRole("button", { name: "Toggle minimap" });
    expect(map).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(map);
    expect(map).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(map);
    expect(map).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    await userEvent.click(screen.getByRole("radio", { name: "Fit · overview" }));
    expect(submit).not.toHaveBeenCalled();
  });

  it("supports labels and leaves a missing minimap action disabled", () => {
    render(
      <ZoomControl
        value="fit"
        onValueChange={() => {}}
        size="touch"
        labels={{
          controls: "Zoom",
          sizes: "Größe",
          fit: "Übersicht",
          overviewDescription: "Nur lesen",
          zoomIn: "Vergrößern",
          minimap: "Karte",
        }}
      />,
    );
    expect(screen.getByRole("group", { name: "Zoom" })).toBeInTheDocument();
    expect(screen.getByRole("radiogroup", { name: "Größe" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Übersicht" })).toHaveAccessibleDescription("Nur lesen");
    expect(screen.getByRole("button", { name: "Vergrößern" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Karte" })).toBeDisabled();
  });
});
