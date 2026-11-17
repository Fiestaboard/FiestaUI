import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { ToolRail, type ToolRailProps, type ToolRailTool } from "./tool-rail";

const meta = {
  title: "Editor/ToolRail",
  component: ToolRail,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    selected: "brush",
    onSelectedChange: () => {},
    onUndo: () => {},
    onRedo: () => {},
  },
  render: (args) => <ControlledRail {...args} />,
} satisfies Meta<typeof ToolRail>;

export default meta;
type Story = StoryObj<typeof meta>;

function ControlledRail(args: ToolRailProps) {
  const [selected, setSelected] = useState<ToolRailTool>(args.selected);
  return <ToolRail {...args} selected={selected} onSelectedChange={setSelected} />;
}

/** Figma 111:29504, with the complete 54 × 443 px rail. */
export const Brush: Story = {};
/** Figma 111:29550. */
export const Pan: Story = { args: { selected: "pan" } };
/** Figma 111:29587. */
export const Rectangle: Story = { args: { selected: "rectangle" } };

export const Horizontal: Story = { args: { orientation: "horizontal" } };

/** Scrolls horizontally while every tool retains its 44 px target. */
export const Mobile: Story = {
  args: { orientation: "horizontal" },
  globals: { viewport: { value: "mobile", isRotated: false } },
  render: (args) => (
    <div className="w-full max-w-80">
      <ControlledRail {...args} />
    </div>
  ),
};

export const ToolsOnly: Story = {
  args: { tools: ["brush", "eraser", "fill", "eyedropper", "rectangle", "pan"], onUndo: undefined, onRedo: undefined },
};

export const DisabledTools: Story = {
  args: { disabledTools: ["fill", "text"], canUndo: false, canRedo: false },
};

export const Disabled: Story = { args: { disabled: true } };

export const Localized: Story = {
  args: {
    orientation: "horizontal",
    tools: ["pan", "brush", "eyedropper"],
    labels: {
      rail: "Zeichenwerkzeuge",
      tools: "Werkzeugauswahl",
      pan: "Verschieben",
      brush: "Pinsel",
      eyedropper: "Pipette",
      undo: "Rückgängig",
      redo: "Wiederholen",
    },
  },
};

/** History belongs to the host; these actions update host state independently. */
export const HistoryActions: Story = {
  render: () => <HistoryExample />,
};

function HistoryExample() {
  const [selected, setSelected] = useState<ToolRailTool>("brush");
  const [revision, setRevision] = useState(1);
  return (
    <div className="flex flex-col items-start gap-3">
      <ToolRail
        orientation="horizontal"
        tools={["pan", "brush", "eraser", "rectangle"]}
        selected={selected}
        onSelectedChange={setSelected}
        onUndo={() => setRevision(0)}
        onRedo={() => setRevision(1)}
        canUndo={revision === 1}
        canRedo={revision === 0}
      />
      <p role="status" className="text-sm text-muted-foreground">
        {revision === 1 ? "One stroke on the canvas" : "Canvas is empty"}
      </p>
    </div>
  );
}
