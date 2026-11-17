import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { GoToCell, type GoToCellPosition, type GoToCellProps } from "./go-to-cell";

const meta = {
  title: "Editor/GoToCell",
  component: GoToCell,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { columns: 96, rows: 24, value: { row: 14, column: 49 }, onGo: () => {} },
} satisfies Meta<typeof GoToCell>;
export default meta;
type Story = StoryObj<typeof meta>;

/** Figma C38 108:7324: 220 × 36 px coordinate field. */
export const Default: Story = {};
/** Uses the toolbar/CI theme matrix so each accessibility leg keeps its requested theme. */
export const Dark: Story = {};
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  args: { size: "touch" },
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("textbox");
    await canvasElement.ownerDocument.fonts.ready;
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(control).toHaveValue("Row 14 · Col 49");
    expect(control.scrollWidth).toBeLessThanOrEqual(control.clientWidth);
    expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};
export const Touch: Story = {
  args: { size: "touch" },
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("textbox");
    await canvasElement.ownerDocument.fonts.ready;
    expect(control.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
    expect(control).toHaveValue("Row 14 · Col 49");
    expect(control.scrollWidth).toBeLessThanOrEqual(control.clientWidth);
  },
};
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { readOnly: true } };
export const WithoutShortcut: Story = { args: { shortcut: false } };
export const Invalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.clear(canvas.getByRole("textbox"));
    await userEvent.type(canvas.getByRole("textbox"), "25 97{Enter}");
    await expect(canvas.getByRole("alert")).toHaveTextContent("Use rows 1–24 and columns 1–96.");
  },
};
export const CoordinateAndSearch: Story = { render: (args) => <NavigationExample {...args} /> };
function NavigationExample(args: GoToCellProps) {
  const [position, setPosition] = useState<GoToCellPosition>(args.value ?? { row: 1, column: 1 });
  const [message, setMessage] = useState("Enter coordinates or a band name.");
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <GoToCell
        {...args}
        value={position}
        onGo={(next) => {
          setPosition(next);
          setMessage(`Caret at row ${next.row}, column ${next.column}.`);
        }}
        onSearch={(query) => setMessage(`Host search: ${query}`)}
      />
      <p role="status" className="text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  );
}
export const Keyboard: Story = {
  render: (args) => <NavigationExample {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.keyboard("{Control>}j{/Control}");
    await expect(canvas.getByRole("textbox")).toHaveFocus();
    await userEvent.keyboard("r7c42{Enter}");
    await expect(canvas.getByRole("status")).toHaveTextContent("Caret at row 7, column 42.");
    await userEvent.clear(canvas.getByRole("textbox"));
    await userEvent.type(canvas.getByRole("textbox"), "Departures{Enter}");
    await expect(canvas.getByRole("status")).toHaveTextContent("Host search: Departures");
    await userEvent.keyboard("{Escape}");
    await expect(canvas.getByRole("textbox")).toHaveValue("Row 7 · Col 42");
  },
};
export const NarrowLocalized: Story = {
  args: {
    labels: {
      input: "Gehe zu einer Zelle",
      hint: "Zeile und Spalte eingeben; Eingabetaste zum Springen.",
      format: (row, column) => `Zeile ${row} · Spalte ${column}`,
      invalid: "Bitte eine gültige Zeile und Spalte eingeben.",
      range: (rows, columns) => `Zeilen 1–${rows}, Spalten 1–${columns}.`,
    },
  },
  render: (args) => (
    <div style={{ width: 160, maxWidth: "100%" }}>
      <GoToCell {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("textbox");
    const root = control.closest('[data-slot="go-to-cell"]')!;
    expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(160);
    expect(control.getBoundingClientRect().width).toBeGreaterThan(0);
    expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};
