import type { Meta, StoryObj } from "@storybook/react";
import { Square } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { Button } from "../forms/button";
import { type LayerItem, LayerRow, type LayerRowProps, LayersPanel } from "./layer-row";

const meta = {
  title: "Containment/LayerRow",
  component: LayerRow,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <div className="w-[300px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: { name: "Temperature", meta: "Text · 5×7 · x 2, y 22", bound: true, boundValue: "= 64°" },
} satisfies Meta<typeof LayerRow>;
export default meta;
type Story = StoryObj<typeof meta>;

/** C41 111:29455. Standalone readonly rows omit the inert drag affordance. */
export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Locked: Story = { args: { name: "Protected text", locked: true, bound: false } };
export const Hidden: Story = { args: { visible: false } };
/** The toolbar and CI theme matrix own the palette, including this selected-state example. */
export const Dark: Story = { args: { selected: true } };
export const Touch: Story = { args: { size: "touch" } };
export const LongContent: Story = {
  args: {
    name: "Weather conditions for the reception display",
    meta: "Text · 5×7 · x 200, y 220 · computed from weather data",
    boundValue: "= 12345678901234567890°",
  },
};

function InteractiveRow(args: LayerRowProps) {
  const [selected, setSelected] = useState(args.selected ?? false);
  const [visible, setVisible] = useState(args.visible ?? true);
  const [inspected, setInspected] = useState(false);
  return (
    <>
      <LayerRow
        {...args}
        selected={selected}
        visible={visible}
        onSelect={() => setSelected(true)}
        onVisibleChange={setVisible}
        onOpenFormula={() => setInspected(true)}
      />
      {inspected ? (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          Inspecting Temperature formula
        </p>
      ) : null}
    </>
  );
}

export const Interactive: Story = {
  render: (args) => <InteractiveRow {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const select = canvas.getByRole("button", { name: "Temperature" });
    await userEvent.click(canvas.getByRole("button", { name: "Hide Temperature" }));
    await expect(select).toHaveAttribute("aria-pressed", "false");
    await expect(canvas.getByRole("button", { name: "Hide Temperature" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Inspect formula for Temperature" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("Inspecting Temperature formula");
    select.focus();
    await userEvent.keyboard("{Enter}");
    await expect(select).toHaveAttribute("aria-pressed", "true");
    await expect(canvasElement.querySelector("button button")).toBeNull();
    for (const button of canvas.getAllByRole("button")) {
      await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
      await expect(button.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
    }
  },
};

export const Disabled: Story = { args: { disabled: true }, render: (args) => <InteractiveRow {...args} /> };

function PanelDemo({ size = "default" }: { size?: "default" | "touch" }) {
  const [layers, setLayers] = useState<LayerItem[]>([
    { id: "temperature", name: "Temperature", meta: "Text · 5×7 · x 2, y 22", bound: true, boundValue: "= 64°" },
    { id: "background", name: "Background", meta: "Rectangle · 64×64", type: <Square /> },
    { id: "text", name: "Protected text", meta: "Text cells", locked: true },
  ]);
  const [selectedId, setSelectedId] = useState("temperature");
  const [inspected, setInspected] = useState("");
  return (
    <>
      <LayersPanel
        layers={layers}
        onReorder={setLayers}
        selectedId={selectedId}
        onSelect={setSelectedId}
        size={size}
        onVisibleChange={(id, visible) =>
          setLayers((items) => items.map((item) => (item.id === id ? { ...item, visible } : item)))
        }
        onOpenFormula={setInspected}
      />
      {inspected ? <p className="mt-2 text-xs">Formula inspector: {inspected}</p> : null}
    </>
  );
}

export const Panel: Story = {
  render: () => <PanelDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const first = canvas.getAllByRole("listitem")[0];
    first.focus();
    await userEvent.keyboard(" {ArrowDown}{Escape}");
    await expect(canvas.getAllByRole("listitem")[0]).toHaveTextContent("Temperature");
    await expect(canvas.getByRole("status")).toHaveTextContent("returned to position 1 of 3");
    await userEvent.click(within(first).getByRole("button", { name: "Move down" }));
    await expect(canvas.getAllByRole("listitem")[0]).toHaveTextContent("Background");
    await userEvent.click(canvas.getByRole("button", { name: "Background" }));
    await expect(canvas.getByRole("button", { name: "Background" })).toHaveAttribute("aria-pressed", "true");
  },
};

export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: () => <PanelDemo size="touch" />,
};

function LifecycleDemo() {
  const [layers, setLayers] = useState<LayerItem[]>([
    { id: "alpha", name: "Alpha" },
    { id: "beta", name: "Beta" },
    { id: "gamma", name: "Gamma" },
  ]);
  const [disabled, setDisabled] = useState(false);
  const [moves, setMoves] = useState(0);
  return (
    <>
      <LayersPanel
        layers={layers}
        disabled={disabled}
        onReorder={(next) => {
          setLayers(next);
          setMoves((count) => count + 1);
        }}
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => setLayers((items) => items.filter((item) => item.id !== "alpha"))}>
          Remove Alpha
        </Button>
        <Button size="sm" onClick={() => setDisabled((value) => !value)}>
          {disabled ? "Enable layers" : "Disable layers"}
        </Button>
      </div>
      <p className="mt-2 text-xs">Reorders: {moves}</p>
    </>
  );
}

/** The host can remove layers or disable the canvas while a captured pointer is down. */
export const HostChangesDuringDrag: Story = {
  render: () => <LifecycleDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const expectNoReorders = async () => {
      try {
        await waitFor(() => expect(canvas.getByText("Reorders: 0")).toBeVisible());
      } catch (error) {
        // Preserve the failing assertion and capture the missing ancestor evidence in CI.
        const ancestors = [];
        for (let node: HTMLElement | null = canvas.queryByText("Reorders: 0"); node; node = node.parentElement) {
          const style = getComputedStyle(node);
          ancestors.push({
            tag: node.tagName,
            id: node.id,
            className: node.className,
            hidden: node.hidden,
            connected: node.isConnected,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
          });
        }
        console.error("LayerRow lifecycle visibility failure", JSON.stringify(ancestors));
        throw error;
      }
    };
    const begin = (from: number, to: number, pointerId: number) => {
      const rows = canvas.getAllByRole("listitem");
      const row = rows[from];
      const grip = row.querySelector<HTMLElement>("[data-slot=sortable-list-handle]")!;
      const source = row.getBoundingClientRect();
      const target = rows[to].getBoundingClientRect();
      const init = { bubbles: true, cancelable: true, pointerId, button: 0, clientX: source.left + 12 };
      grip.dispatchEvent(new PointerEvent("pointerdown", { ...init, clientY: source.top + source.height / 2 }));
      grip.dispatchEvent(
        new PointerEvent("pointermove", { ...init, clientY: target.top + target.height / 2 + (to > from ? 2 : -2) }),
      );
      return grip;
    };
    const gamma = begin(2, 0, 21);
    await waitFor(() => expect(canvasElement.querySelector("[data-dragging]")).not.toBeNull());
    await userEvent.click(canvas.getByRole("button", { name: "Remove Alpha" }));
    gamma.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 21 }));
    await expect(canvasElement.querySelector("[data-dragging]")).toBeNull();
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2);
    await expectNoReorders();

    const beta = begin(0, 1, 22);
    await waitFor(() => expect(canvasElement.querySelector("[data-dragging]")).not.toBeNull());
    await userEvent.click(canvas.getByRole("button", { name: "Disable layers" }));
    await expect(canvasElement.querySelector("[data-dragging]")).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Enable layers" }));
    beta.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 22 }));
    await expectNoReorders();
    await expect(canvas.getAllByRole("listitem")[0]).toHaveTextContent("Beta");
  },
};
