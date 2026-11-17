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

/** Live 327:40138 / 327:43690 share Archivo typography at both cell sizes. */
async function expectCodeTypography(canvasElement: HTMLElement, width: number, height: number, gap: number) {
  await document.fonts.ready;
  const grid = canvasElement.querySelector('[data-slot="device-code-cells"]')!;
  expect(getComputedStyle(grid).columnGap).toBe(`${gap}px`);
  for (const glyph of grid.children) {
    const style = getComputedStyle(glyph);
    expect(style.fontFamily).toContain("Archivo");
    expect(style.fontSize).toBe("14px");
    expect(style.fontWeight).toBe("600");
    expect(style.lineHeight).toBe("20px");
  }
  for (const cell of grid.querySelectorAll('[data-slot="device-code-cell"]')) {
    expect(cell.getBoundingClientRect().width).toBeCloseTo(width, 1);
    expect(cell.getBoundingClientRect().height).toBe(height);
  }
  // Decorative glyph typography must not alter the native editing metric.
  const input = canvasElement.querySelector("input")!;
  expect(getComputedStyle(input).fontFamily).toContain("Spline Sans Mono");
  expect(getComputedStyle(input).fontSize).toBe("16px");
  expect(getComputedStyle(input).opacity).toBe("0");
}

/** All stories run in both token themes in the a11y/VRT matrix. */
export const Default: Story = {
  play: async ({ canvasElement }) => {
    await expectCodeTypography(canvasElement, 36, 48, 6);
  },
};
export const Empty: Story = { args: { value: "" } };
export const Complete: Story = { args: { value: "BCDF7KQM" } };
export const Invalid: Story = { args: { "aria-invalid": true } };
export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox");
    const field = canvasElement.querySelector('[data-slot="device-code-input"]')!;
    expect(input).toBeDisabled();
    // Only the decorative cells dim; native text/border must never show through.
    expect(getComputedStyle(input).opacity).toBe("0");
    expect(getComputedStyle(field).opacity).toBe("0.5");
    expect(input).toHaveValue("BCDF7KQ");
  },
};
export const ReadOnly: Story = { args: { value: "BCDF7KQM", readOnly: true } };
export const Mobile: Story = {
  parameters: { layout: "fullscreen" },
  globals: { viewport: { value: "mobile", isRotated: false } },
  decorators: [
    (Story) => (
      <main className="min-h-screen w-[390px] p-4">
        <div className="mx-auto w-full max-w-[308px]">
          <Story />
        </div>
      </main>
    ),
  ],
  play: async ({ canvasElement }) => {
    const frame = canvasElement.querySelector("main")!.getBoundingClientRect();
    const field = canvasElement.querySelector<HTMLElement>('[data-slot="device-code-input"]')!;
    expect(frame.width).toBe(390);
    expect(field.getBoundingClientRect().width).toBe(308);
    expect(field.getBoundingClientRect().left - frame.left).toBe(41);
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

/** The compact result-strip size also retains native editing when not read-only. */
export const Compact: Story = {
  ...RTLHost,
  args: { ...RTLHost.args, size: "compact" },
  play: async (context) => {
    const { canvasElement } = context;
    const field = canvasElement.querySelector('[data-slot="device-code-input"]')!;
    const grid = canvasElement.querySelector('[data-slot="device-code-cells"]')!;
    const input = within(canvasElement).getByRole("textbox");
    expect(field.getBoundingClientRect().width).toBe(271);
    expect(getComputedStyle(grid).columnGap).toBe("3px");
    for (const cell of grid.querySelectorAll('[data-slot="device-code-cell"]')) {
      expect(cell.getBoundingClientRect().height).toBe(44);
    }
    await expectCodeTypography(canvasElement, 30, 44, 3);
    // The hidden field's native character advance scales with this container,
    // rather than retaining the default 343px geometry. postVisit tests real hits.
    await document.fonts.ready;
    const style = getComputedStyle(input);
    const measurement = document.createElement("canvas").getContext("2d")!;
    measurement.font = style.font;
    const characterWidth = measurement.measureText("0").width;
    expect(input.getBoundingClientRect().width).toBe(271);
    expect(Number.parseFloat(style.letterSpacing) + characterWidth).toBeCloseTo(271 / 8, 1);
    expect(Number.parseFloat(style.paddingLeft)).toBeCloseTo((271 / 8 - characterWidth) / 2, 1);
    await RTLHost.play?.(context);
  },
};
