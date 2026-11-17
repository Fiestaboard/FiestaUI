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

/** Narrow translations must grow vertically, including with larger text. */
export const LocalisedWrapping: Story = {
  args: {
    value: "fit",
    labels: { fit: "Alle Seiten in der schreibgeschützten Vorschau anzeigen" },
  },
  render: (args) => (
    <div className="flex flex-wrap items-start gap-4">
      {(["default", "touch"] as const).flatMap((size) =>
        [false, true].map((largeText) => (
          <div
            key={`${size}-${largeText}`}
            data-large-text={largeText}
            className={`w-50 max-w-full ${largeText ? "[&_[role=radio]]:text-2xl [&_[role=radio]]:leading-8" : ""}`}
          >
            <p className="mb-2 text-sm">
              {size}
              {largeText ? " · larger text" : ""}
            </p>
            <Demo {...args} size={size} />
          </div>
        )),
      )}
    </div>
  ),
  play: async ({ canvasElement }) => {
    await canvasElement.ownerDocument.fonts.ready;
    for (const control of canvasElement.querySelectorAll<HTMLElement>('[data-slot="zoom-control"]')) {
      const minimum = control.dataset.size === "touch" ? 44 : 28;
      const fit = within(control).getByRole("radio", {
        name: "Alle Seiten in der schreibgeschützten Vorschau anzeigen",
      });
      const range = canvasElement.ownerDocument.createRange();
      range.selectNodeContents(fit);
      // Prove this fixture actually exercises a multiline label.
      expect(range.getClientRects().length).toBeGreaterThan(1);
      expect(fit.getBoundingClientRect().height).toBeGreaterThan(minimum);

      for (const radio of control.querySelectorAll<HTMLElement>('[role="radio"]')) {
        const rect = radio.getBoundingClientRect();
        const style = getComputedStyle(radio);
        range.selectNodeContents(radio);
        for (const line of range.getClientRects()) {
          expect(line.top).toBeGreaterThanOrEqual(rect.top + parseFloat(style.borderTopWidth) - 0.5);
          expect(line.bottom).toBeLessThanOrEqual(rect.bottom - parseFloat(style.borderBottomWidth) + 0.5);
          expect(line.left).toBeGreaterThanOrEqual(rect.left + parseFloat(style.borderLeftWidth) - 0.5);
          expect(line.right).toBeLessThanOrEqual(rect.right - parseFloat(style.borderRightWidth) + 0.5);
        }
        // Ordinary single-line options keep the exact original size.
        if (radio !== fit && control.parentElement?.dataset.largeText === "false") {
          expect(rect.height).toBe(minimum);
        }
      }

      const buttons = Array.from(control.querySelectorAll<HTMLButtonElement>("button"));
      for (let i = 0; i < buttons.length; i++) {
        const a = buttons[i].getBoundingClientRect();
        for (const other of buttons.slice(i + 1)) {
          const b = other.getBoundingClientRect();
          const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          expect(overlapWidth <= 0.5 || overlapHeight <= 0.5).toBe(true);
        }
      }
    }
  },
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
