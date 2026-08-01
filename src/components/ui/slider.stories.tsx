import type { Meta, StoryObj } from "@storybook/react";

import { Label } from "./label";
import { Slider } from "./slider";

const meta = {
  title: "UI/Slider",
  component: Slider,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    min: { control: "number" },
    max: { control: "number" },
    step: { control: "number" },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: [50],
    "aria-label": "Volume",
    className: "w-64",
  },
};

export const Range: Story = {
  args: {
    defaultValue: [25, 75],
    "aria-label": "Price range",
    className: "w-64",
  },
};

export const Stepped: Story = {
  args: {
    defaultValue: [40],
    min: 0,
    max: 100,
    step: 10,
    "aria-label": "Brightness",
    className: "w-64",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: [30],
    disabled: true,
    "aria-label": "Volume",
    className: "w-64",
  },
};

export const WithLabel = () => (
  <div className="w-64 space-y-3">
    <Label htmlFor="brightness-slider">Brightness</Label>
    <Slider id="brightness-slider" defaultValue={[60]} aria-label="Brightness" />
  </div>
);
