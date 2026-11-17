import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { ZoomControl, type ZoomControlProps, type ZoomValue } from "./zoom-control";

function Demo(args: ZoomControlProps) {
  const [value, setValue] = useState(args.value);
  const [open, setOpen] = useState(args.minimapOpen ?? false);
  return (
    <ZoomControl {...args} value={value} onValueChange={setValue} minimapOpen={open} onMinimapOpenChange={setOpen} />
  );
}

const meta = {
  title: "Editor/ZoomControl",
  component: ZoomControl,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { value: "sm", onValueChange: () => {} },
  render: (args) => <Demo {...args} />,
} satisfies Meta<typeof ZoomControl>;

export default meta;
type Story = StoryObj<typeof meta>;

/** C39 / 108:7620; token themes are exercised in both Storybook axe legs. */
export const Default: Story = {};
export const Fit: Story = { args: { value: "fit" } };
export const Medium: Story = { args: { value: "md" } };
export const Large: Story = { args: { value: "lg" } };
export const RaisedMinimum: Story = { args: { value: "md", min: "md" } };
export const Disabled: Story = { args: { disabled: true } };
export const MinimapOpen: Story = { args: { minimapOpen: true } };

export const AllModes: Story = {
  render: (args) => (
    <div className="flex flex-col items-start gap-4">
      {(["fit", "sm", "md", "lg"] as ZoomValue[]).map((value) => (
        <Demo key={value} {...args} value={value} />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const control = canvasElement.querySelector<HTMLElement>('[data-slot="zoom-control"]')!;
    // At mobile widths the whole group wraps instead of making the page scroll.
    expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
    const buttons = control.querySelectorAll<HTMLButtonElement>("button");
    for (const button of buttons) expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(28);
  },
};

export const Mobile: Story = {
  args: { size: "touch", value: "md" },
  globals: { viewport: { value: "mobile" } },
  render: (args) => (
    <div className="max-w-sm">
      <Demo {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    for (const button of canvasElement.querySelectorAll<HTMLButtonElement>("button")) {
      const rect = button.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.width).toBeGreaterThanOrEqual(44);
    }
    expect(canvasElement.ownerDocument.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth);
  },
};

export const Localised: Story = {
  args: {
    size: "touch",
    labels: {
      controls: "Zoomsteuerung",
      sizes: "Kachelgröße",
      fit: "Anpassen · Übersicht",
      sm: "Kacheln klein",
      md: "Kacheln mittel",
      lg: "Kacheln groß",
      zoomIn: "Vergrößern",
      zoomOut: "Verkleinern",
      minimap: "Minikarte umschalten",
      overviewDescription: "Schreibgeschützte Übersicht. Wählen Sie zum Bearbeiten eine Kachelgröße.",
    },
  },
  render: (args) => (
    <div className="max-w-sm">
      <Demo {...args} />
    </div>
  ),
};

export const Keyboard: Story = {
  args: { min: "md", value: "md" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    canvas.getByRole("radio", { name: "Tile md" }).focus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", { name: "Tile lg" })).toBeChecked();
    await userEvent.keyboard("{Home}");
    await expect(canvas.getByRole("radio", { name: "Fit · overview" })).toBeChecked();
    await userEvent.click(canvas.getByRole("button", { name: "Zoom in" }));
    await expect(canvas.getByRole("radio", { name: "Tile md" })).toBeChecked();
    await expect(canvas.getByRole("button", { name: "Zoom out" })).toBeDisabled();
  },
};
