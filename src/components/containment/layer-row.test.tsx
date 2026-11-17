import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Square } from "lucide-react";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { type LayerItem, LayerRow, LayersPanel } from "./layer-row";

const initial: LayerItem[] = [
  { id: "temperature", name: "Temperature", meta: "Text · 5×7 · x 2, y 22", bound: true, boundValue: "= 64°" },
  { id: "background", name: "Background", type: <Square />, locked: true },
];

function PanelDemo({ disabled = false }: { disabled?: boolean }) {
  const [layers, setLayers] = useState(initial);
  const [selectedId, setSelectedId] = useState("temperature");
  return (
    <LayersPanel
      layers={layers}
      onReorder={setLayers}
      selectedId={selectedId}
      onSelect={setSelectedId}
      disabled={disabled}
    />
  );
}

function order() {
  return screen
    .getAllByRole("listitem")
    .map((item) => within(item).getByRole("button", { name: /^(Temperature|Background)$/ }).textContent);
}

describe("LayerRow", () => {
  it("exposes readonly name, metadata, bound value and protected lock status without inert buttons", () => {
    render(<LayerRow {...initial[0]} locked selected />);
    expect(screen.getByText("Temperature")).toBeVisible();
    expect(screen.getByText("Text · 5×7 · x 2, y 22")).toBeVisible();
    expect(screen.getByText("= 64°")).toBeVisible();
    expect(screen.getByLabelText("Locked")).toBeInTheDocument();
    expect(screen.getByLabelText("Visible")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(document.querySelector("[data-layer-row]")).toHaveAttribute("aria-current", "true");
  });

  it("keeps select, visibility and formula buttons independent", async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    const visible = vi.fn();
    const formula = vi.fn();
    render(<LayerRow {...initial[0]} onSelect={select} onVisibleChange={visible} onOpenFormula={formula} />);
    const selectButton = screen.getByRole("button", { name: "Temperature" });
    expect(selectButton).toHaveAccessibleDescription("Text · 5×7 · x 2, y 22");
    expect(selectButton).toHaveAttribute("aria-pressed", "false");
    await user.click(screen.getByRole("button", { name: "Hide Temperature" }));
    expect(visible).toHaveBeenCalledExactlyOnceWith(false);
    await user.click(screen.getByRole("button", { name: "Inspect formula for Temperature" }));
    expect(formula).toHaveBeenCalledOnce();
    expect(select).not.toHaveBeenCalled();
    await user.click(selectButton);
    expect(select).toHaveBeenCalledOnce();
    expect(document.querySelector("button button")).toBeNull();
  });

  it("keeps visibility controlled and toggles hidden layers back to visible", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const { rerender } = render(<LayerRow name="Logo" visible={false} onVisibleChange={change} />);
    const toggle = screen.getByRole("button", { name: "Hide Logo" });
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await user.click(toggle);
    expect(change).toHaveBeenCalledExactlyOnceWith(true);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    rerender(<LayerRow name="Logo" visible onVisibleChange={change} />);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });

  it("supports selection by keyboard and exposes controlled selection", async () => {
    const user = userEvent.setup();
    const select = vi.fn();
    render(<LayerRow name="Logo" selected onSelect={select} />);
    const button = screen.getByRole("button", { name: "Logo" });
    button.focus();
    await user.keyboard("{Enter}");
    expect(select).toHaveBeenCalledOnce();
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("disables all controls without hiding their state", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<LayerRow {...initial[0]} disabled onSelect={action} onVisibleChange={action} onOpenFormula={action} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
      await user.click(button);
    }
    expect(action).not.toHaveBeenCalled();
  });

  it("keeps full long names and metadata available to assistive technology", () => {
    const name = "Very long temperature layer name for the reception display";
    const meta = "Text · 5×7 · x 200, y 220 · computed from the weather integration";
    render(<LayerRow name={name} meta={meta} onSelect={() => {}} size="touch" />);
    expect(screen.getByRole("button", { name })).toHaveAccessibleDescription(meta);
    expect(document.querySelector("[data-layer-row]")).toHaveAttribute("data-size", "touch");
  });

  it("forwards root ref and props and omits absent optional content", () => {
    const ref = createRef<HTMLDivElement>();
    render(<LayerRow name="Background" type={<Square data-testid="type" />} ref={ref} data-testid="row" />);
    expect(ref.current).toBe(screen.getByTestId("row"));
    expect(screen.getByTestId("type")).toBeInTheDocument();
    expect(screen.queryByLabelText("Locked")).not.toBeInTheDocument();
    expect(document.querySelector("[data-slot=layer-row-bound]")).toBeNull();
  });

  it("shows hidden status without a visibility callback and supplies a bound fallback", () => {
    render(<LayerRow name="Text" visible={false} bound />);
    expect(screen.getByLabelText("Hidden")).toBeInTheDocument();
    expect(screen.getByText("Bound")).toBeVisible();
  });

  it("does not expose formula actions on an unbound layer", () => {
    render(<LayerRow name="Rectangle" onOpenFormula={() => {}} />);
    expect(screen.queryByRole("button", { name: /Inspect/ })).not.toBeInTheDocument();
  });
});

describe("LayersPanel", () => {
  it("selects a layer independently of reorder and keeps stable names", async () => {
    const user = userEvent.setup();
    render(<PanelDemo />);
    await user.click(screen.getByRole("button", { name: "Background" }));
    expect(screen.getByRole("button", { name: "Background" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Temperature" })).toHaveAttribute("aria-pressed", "false");
    expect(order()).toEqual(["TemperatureText · 5×7 · x 2, y 22", "Background"]);
  });

  it("moves by buttons without mutating the supplied items or losing data", async () => {
    const user = userEvent.setup();
    const reorder = vi.fn();
    render(<LayersPanel layers={initial} onReorder={reorder} aria-label="Canvas layers" />);
    expect(screen.getByRole("list", { name: "Canvas layers" })).toBeInTheDocument();
    const [front, back] = screen.getAllByRole("listitem");
    expect(within(front).getByRole("button", { name: "Move up" })).toBeDisabled();
    expect(within(back).getByRole("button", { name: "Move down" })).toBeDisabled();
    await user.click(within(front).getByRole("button", { name: "Move down" }));
    expect(reorder).toHaveBeenCalledExactlyOnceWith([initial[1], initial[0]]);
    expect(initial[0].id).toBe("temperature");
  });

  it("reuses keyboard lift, move and Escape cancellation", () => {
    render(<PanelDemo />);
    const front = screen.getAllByRole("listitem")[0];
    front.focus();
    fireEvent.keyDown(front, { key: " " });
    fireEvent.keyDown(front, { key: "ArrowDown" });
    expect(order()).toEqual(["Background", "TemperatureText · 5×7 · x 2, y 22"]);
    fireEvent.keyDown(front, { key: "Escape" });
    expect(order()).toEqual(["TemperatureText · 5×7 · x 2, y 22", "Background"]);
    expect(screen.getByRole("status")).toHaveTextContent("returned to position 1 of 2");
  });

  it("passes the layer ID with visibility and formula actions", async () => {
    const user = userEvent.setup();
    const visibility = vi.fn();
    const formula = vi.fn();
    render(
      <LayersPanel
        layers={initial}
        onReorder={() => {}}
        onVisibleChange={visibility}
        onOpenFormula={formula}
        size="touch"
      />,
    );
    await user.click(screen.getByRole("button", { name: "Hide Temperature" }));
    expect(visibility).toHaveBeenCalledExactlyOnceWith("temperature", false);
    await user.click(screen.getByRole("button", { name: "Inspect formula for Temperature" }));
    expect(formula).toHaveBeenCalledExactlyOnceWith("temperature");
  });

  it("disables reorder and every row action for a disabled panel", () => {
    const action = vi.fn();
    render(
      <LayersPanel
        layers={initial}
        onReorder={action}
        onSelect={action}
        onVisibleChange={action}
        onOpenFormula={action}
        disabled
      />,
    );
    for (const button of screen.getAllByRole("button")) expect(button).toBeDisabled();
    const front = screen.getAllByRole("listitem")[0];
    fireEvent.keyDown(front, { key: " " });
    fireEvent.keyDown(front, { key: "ArrowDown" });
    expect(action).not.toHaveBeenCalled();
  });

  it("supports an empty layer list", () => {
    render(<LayersPanel layers={[]} onReorder={() => {}} />);
    expect(screen.getByRole("list", { name: "Layers" })).toBeInTheDocument();
    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
  });
});
