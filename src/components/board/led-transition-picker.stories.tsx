import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { DEVICE_MODEL_IDS, type DeviceModelId } from "../../lib/devices";
import type { LedTransitionId } from "../../lib/led-transition-registry";
import { LedMatrixDisplay } from "./led-matrix-display";
import { LedTransitionPicker } from "./led-transition-picker";

const meta = {
  title: "App/Board/LedTransitionPicker",
  component: LedTransitionPicker,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  argTypes: {
    model: { control: "select", options: DEVICE_MODEL_IDS },
    preview: { control: "boolean" },
    hideUnavailable: { control: "boolean" },
    columns: { control: "select", options: ["1", "2", "3"] },
  },
} satisfies Meta<typeof LedTransitionPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A HUB75 can run every entry; the device default is Flip. */
export const Hub75: Story = {
  args: { model: "hub75_64x32", columns: "2" },
};

/** The Pixoo 64 runs everything compressed into its 32-frame budget. */
export const Pixoo64: Story = {
  args: { model: "divoom_pixoo64", columns: "2" },
};

/** The AWTRIX's push rate is unmeasured: only None is available, and each card says why. */
export const AwtrixUnmeasured: Story = {
  args: { model: "ulanzi_tc001_awtrix", columns: "2" },
};

/** Without a model every entry is offered as is, and None is the default. */
export const NoDevice: Story = {
  args: { columns: "3", preview: false },
};

/** The choice applied to a board: pick a transition, press "Next message". */
export const WiredToABoard: Story = {
  args: { model: "hub75_64x32", columns: "3", preview: false },
  render: function Render(args) {
    const [choice, setChoice] = useState<LedTransitionId>("flip");
    const [model, setModel] = useState<DeviceModelId>(args.model as DeviceModelId);
    const [index, setIndex] = useState(0);
    const pages = ["72° SUNNY\nUV 6 {65}\nAQI 42 {66}", "68° CLOUDY\nUV 2 {66}\nAQI 55 {65}"];
    return (
      <div className="flex flex-col gap-4">
        <label className="flex items-center gap-2 text-sm">
          Device
          <select
            className="rounded-md border px-2 py-1"
            value={model}
            onChange={(e) => setModel(e.target.value as DeviceModelId)}
          >
            {DEVICE_MODEL_IDS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <LedTransitionPicker {...args} model={model} value={choice} onValueChange={setChoice} />
        <LedMatrixDisplay message={pages[index]} model={model} transition={choice} size="sm" />
        <button
          type="button"
          data-testid="next-message"
          className="self-center rounded-md border px-3 py-1 text-sm"
          onClick={() => setIndex((i) => (i + 1) % pages.length)}
        >
          Next message
        </button>
      </div>
    );
  },
};
