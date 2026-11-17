import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { DeviceCodeInput } from "./device-code-input";

const meta = {
  title: "App/Onboarding/DeviceCodeInput",
  component: DeviceCodeInput,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { value: "BCDF7KQ", "aria-label": "Code shown on your TV", onValueChange: () => {} },
  render: function Field(args) {
    const [value, setValue] = useState(args.value);
    return (
      <div className="w-full max-w-[343px]">
        <DeviceCodeInput {...args} value={value} onValueChange={setValue} />
      </div>
    );
  },
} satisfies Meta<typeof DeviceCodeInput>;
export default meta;
type Story = StoryObj<typeof meta>;

/** All stories run in both token themes in the a11y/VRT matrix. */
export const Default: Story = {};
export const Empty: Story = { args: { value: "" } };
export const Complete: Story = { args: { value: "BCDF7KQM" } };
export const Invalid: Story = { args: { "aria-invalid": true } };
export const Disabled: Story = { args: { disabled: true } };
export const ReadOnly: Story = { args: { value: "BCDF7KQM", readOnly: true } };
export const Mobile: Story = {
  globals: { viewport: { value: "mobile", isRotated: false } },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[308px]">
        <Story />
      </div>
    ),
  ],
};
export const KeyboardAndPaste: Story = {
  args: { value: "" },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox");
    input.focus();
    await userEvent.paste("bcdf-7kqm");
    expect(input).toHaveValue("BCDF7KQM");
    await userEvent.keyboard("{Control>}a{/Control}wxyz{Backspace}2");
    expect(input).toHaveValue("WXY2");
    input.blur();
  },
};
