import type { Meta, StoryObj } from "@storybook/react";
import { Square } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

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
export const Dark: Story = { globals: { theme: "dark" }, args: { selected: true } };
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
