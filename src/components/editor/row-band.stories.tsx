import type { Meta, StoryObj } from "@storybook/react";
import { GripVertical } from "lucide-react";
import * as React from "react";
import { expect, userEvent, within } from "storybook/test";

import { arrayMove, SortableList, SortableListHandle, useSortableItem } from "../containment/sortable-list";
import { RowBand, type RowBandProps } from "./row-band";

const meta = {
  title: "Editor/RowBand",
  component: RowBand,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { label: "Departures", rows: [3, 10], meta: "Rows 3–10 · FOREACH" },
} satisfies Meta<typeof RowBand>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Dark: Story = { args: { selected: true }, globals: { theme: "dark" } };

function InteractiveBand(props: RowBandProps) {
  const [selected, setSelected] = React.useState(props.selected ?? false);
  const [result, setResult] = React.useState("");
  return (
    <div className="flex flex-col gap-3">
      <RowBand
        {...props}
        selected={selected}
        onSelectedChange={setSelected}
        menu={[
          { id: "move", label: "Move", onSelect: () => setResult("Choose the destination row in the editor.") },
          { id: "duplicate", label: "Duplicate", onSelect: () => setResult("Departures duplicated.") },
          { id: "save", label: "Save as snippet…", onSelect: () => setResult("Name the Departures snippet.") },
        ]}
      />
      <p role="status" className="text-sm text-muted-foreground">
        {result}
      </p>
    </div>
  );
}

export const Interactive: Story = {
  render: (args) => <InteractiveBand {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Departures" }));
    await expect(canvas.getByRole("button", { name: "Departures" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(canvas.getByRole("button", { name: "Actions for Departures" }));
    await userEvent.click(await within(document.body).findByRole("menuitem", { name: "Duplicate" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("Departures duplicated.");
  },
};

export const Mobile: Story = {
  args: { selected: true },
  parameters: { viewport: { defaultViewport: "mobile1" } },
  render: (args) => (
    <div className="w-full max-w-[358px]">
      <InteractiveBand {...args} />
    </div>
  ),
};

export const MenuOpen: Story = {
  args: { selected: true },
  render: (args) => <InteractiveBand {...args} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Actions for Departures" }));
  },
};

export const Disabled: Story = { args: { selected: true, disabled: true } };
export const LongLabels: Story = {
  args: {
    label: "Departures for the downtown and waterfront stations",
    meta: "Rows 3–10 · Upcoming departures from the transit integration",
    selected: true,
  },
};
export const ResizedBand: Story = { args: { rows: [1, 2], label: "Header", meta: "Rows 1–2", className: "h-20" } };

function SortableBand({
  label,
  rows,
  selected,
  onSelect,
}: {
  label: string;
  rows: readonly [number, number];
  selected: boolean;
  onSelect: () => void;
}) {
  const item = useSortableItem();
  return (
    <RowBand
      label={label}
      rows={rows}
      selected={selected}
      onSelectedChange={onSelect}
      dragHandle={
        <SortableListHandle className="items-end justify-end p-1.5">
          <GripVertical className="size-4" />
        </SortableListHandle>
      }
      menu={[
        { id: "up", label: "Move up", disabled: !item.canMoveUp, onSelect: item.moveUp },
        { id: "down", label: "Move down", disabled: !item.canMoveDown, onSelect: item.moveDown },
      ]}
    />
  );
}

function SortableBands() {
  const [items, setItems] = React.useState([
    { id: "header", label: "Header", rows: [1, 2] as const },
    { id: "departures", label: "Departures", rows: [3, 10] as const },
  ]);
  const [selected, setSelected] = React.useState("departures");
  return (
    <div className="w-44">
      <SortableList
        items={items}
        getKey={(item) => item.id}
        getLabel={(item) => item.label}
        size="touch"
        onMove={(from, to) => setItems((items) => arrayMove(items, from, to))}
        renderItem={(item) => (
          <SortableBand {...item} selected={selected === item.id} onSelect={() => setSelected(item.id)} />
        )}
      />
    </div>
  );
}

/** Existing SortableList supplies pointer/touch and keyboard movement; the host owns ordering. */
export const DragComposition: Story = { render: () => <SortableBands /> };
