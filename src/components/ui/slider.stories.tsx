import type { Meta, StoryObj } from "@storybook/react";
import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";

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
    defaultValue: {
      control: "object",
      description: "Initial thumb value(s) as an array (uncontrolled); two entries render a range",
    },
    value: {
      control: false,
      description: "Controlled thumb value(s); pair with onValueChange",
    },
    onValueChange: {
      control: false,
      description: "Callback fired with the new value array while dragging",
    },
    min: {
      control: "number",
      description: "Minimum value of the slider",
    },
    max: {
      control: "number",
      description: "Maximum value of the slider",
    },
    step: {
      control: "number",
      description: "Granularity the value snaps to",
    },
    largeStep: {
      control: "number",
      description: "Step applied when holding Shift with arrow keys",
    },
    minStepsBetweenValues: {
      control: "number",
      description: "Minimum steps enforced between thumbs in a range slider",
    },
    orientation: {
      control: "select",
      options: ["horizontal", "vertical"],
      description: "Layout direction of the track",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    "aria-label": {
      control: "text",
      description: "Accessible name forwarded to each thumb's hidden input",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the root element",
    },
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    defaultValue: [50],
    min: 0,
    max: 100,
    step: 1,
    disabled: false,
    orientation: "horizontal",
    "aria-label": "Volume",
    className: "w-64",
  },
};

export const Range: Story = {
  args: {
    defaultValue: [25, 75],
    minStepsBetweenValues: 1,
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

export const Vertical: Story = {
  args: {
    defaultValue: [60],
    orientation: "vertical",
    "aria-label": "Temperature",
  },
};

export const WithLabel: Story = {
  render: () => (
    <div className="w-64 space-y-3">
      <Label htmlFor="brightness-slider">Brightness</Label>
      <Slider id="brightness-slider" defaultValue={[60]} aria-label="Brightness" />
    </div>
  ),
};

export const VolumeControl: Story = {
  render: function Render() {
    const [volume, setVolume] = useState([65]);
    return (
      <div className="w-72 space-y-3">
        <div className="flex items-center justify-between">
          <Label htmlFor="volume-slider">Volume</Label>
          <span className="text-sm tabular-nums text-muted-foreground">{volume[0]}%</span>
        </div>
        <div className="flex items-center gap-3">
          <VolumeX className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Slider
            id="volume-slider"
            value={volume}
            onValueChange={setVolume}
            min={0}
            max={100}
            step={1}
            aria-label="Volume"
          />
          <Volume2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </div>
    );
  },
};
