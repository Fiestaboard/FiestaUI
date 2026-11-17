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
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile", isRotated: false } },
  decorators: [
    (Story) => (
      <main className="min-h-screen w-full max-w-[390px] p-4">
        <div className="mx-auto w-full max-w-[308px]">
          <Story />
        </div>
      </main>
    ),
  ],
  play: async ({ canvasElement }) => {
    const field = canvasElement.querySelector<HTMLElement>('[data-slot="device-code-input"]')!;
    expect(field.getBoundingClientRect().width).toBeCloseTo(308, 0);
    expect(field.scrollWidth).toBeLessThanOrEqual(field.clientWidth + 1);
  },
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

/** LTR cell geometry and normalized paste inside an RTL page. */
export const RTLHost: Story = {
  args: { value: "BC", dir: "rtl" },
  decorators: [
    (Story) => (
      <div dir="rtl">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox") as HTMLInputElement;
    const cells = Array.from(canvasElement.querySelectorAll<HTMLElement>('[data-slot="device-code-cell"]'));
    expect(getComputedStyle(input).direction).toBe("ltr");
    for (let index = 1; index < cells.length; index++) {
      expect(cells[index].getBoundingClientRect().left).toBeGreaterThan(cells[index - 1].getBoundingClientRect().right);
    }
    // user-event does not implement Shift+Arrow selection. The postVisit
    // device-code regression checks pointer/caret/range editing with native
    // Playwright mouse and keyboard events, without injected selection offsets.
    input.focus();
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.paste("bcdf-7kqm");
    expect(input).toHaveValue("BCDF7KQM");
    expect(cells.map((cell) => cell.textContent).join("")).toBe("BCDF7KQM");
    input.blur();
  },
};
