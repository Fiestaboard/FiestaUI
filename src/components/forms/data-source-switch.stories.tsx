import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { type DataSource, DataSourceSwitch } from "./data-source-switch";

const meta = {
  title: "Forms/DataSourceSwitch",
  component: DataSourceSwitch,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
  args: { "aria-label": "Preview data" },
} satisfies Meta<typeof DataSourceSwitch>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Live: Story = { args: { defaultValue: "live" } };
export const Sample: Story = { args: { defaultValue: "sample" } };
export const Missing: Story = { args: { defaultValue: "missing" } };
export const Desktop: Story = { args: { options: [{ value: "live" }, { value: "sample" }] } };
export const Disabled: Story = { args: { disabled: true, defaultValue: "sample" } };
export const DisabledChoice: Story = {
  args: { options: [{ value: "live" }, { value: "sample", disabled: true }, { value: "missing" }] },
};
export const Mobile: Story = {
  args: { size: "touch" },
  globals: { viewport: { value: "mobile", isRotated: false } },
  play: async ({ canvasElement }) => {
    for (const radio of within(canvasElement).getAllByRole("radio")) {
      const rect = radio.getBoundingClientRect();
      expect(rect.height).toBeGreaterThanOrEqual(44);
      expect(rect.width).toBeGreaterThanOrEqual(44);
    }
  },
};
export const Light: Story = { globals: { theme: "light" } };
export const Dark: Story = { globals: { theme: "dark" } };
export const LongLabels: Story = {
  args: {
    size: "touch",
    options: [
      { value: "live", label: "Aktuelle Daten vom verbundenen Hub" },
      { value: "sample", label: "Gespeicherte Beispieldaten" },
      { value: "missing", label: "Fehlende Verbindung simulieren" },
    ],
  },
  decorators: [
    (Story) => (
      <div className="w-72 max-w-full">
        <Story />
      </div>
    ),
  ],
};
export const Controlled: Story = {
  render: function ControlledStory(args) {
    const [value, setValue] = useState<DataSource>("live");
    return (
      <div className="flex flex-col gap-3">
        <DataSourceSwitch {...args} value={value} onValueChange={setValue} />
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {value === "live"
            ? "Previewing live data"
            : value === "sample"
              ? "Previewing sample data"
              : "Previewing missing data"}
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("radio", { name: "Live" }));
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", { name: "Sample" })).toHaveAttribute("aria-checked", "true");
    await expect(canvas.getByText("Previewing sample data")).toBeVisible();
  },
};
