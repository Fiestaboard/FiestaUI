import type { Meta, StoryObj } from "@storybook/react";
import { useLayoutEffect } from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { InspectorRow } from "./inspector-row";

/** C34 / 04d 171:163203. Every story participates in the light/dark CI matrix. */
const meta = {
  title: "Editor/InspectorRow",
  component: InspectorRow,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    title: "Weekdays 7:30–8:30 AM",
    detail: "Den TV · Schedule entry",
    value: "On",
    chevron: true,
    onPress: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-88">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof InspectorRow>;
export default meta;
type Story = StoryObj<typeof meta>;

async function checkContainment(canvasElement: HTMLElement) {
  await document.fonts.ready;
  const button = within(canvasElement).getByRole("button");
  expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
  for (const element of [button, ...button.querySelectorAll<HTMLElement>("[data-slot]")]) {
    expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
    expect(element.scrollHeight).toBeLessThanOrEqual(element.clientHeight + 1);
  }
  for (const slot of button.querySelectorAll<HTMLElement>(
    "[data-slot=list-row-title], [data-slot=list-row-description], [data-slot=list-row-meta]",
  )) {
    expect(slot.getBoundingClientRect().bottom).toBeLessThanOrEqual(button.getBoundingClientRect().bottom);
  }
}

/** DD-W102: the two-line row grows to55px to preserve py8; Figma's root is fixed48px. */
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await checkContainment(canvasElement);
    const button = within(canvasElement).getByRole("button", {
      name: "Weekdays 7:30–8:30 AM Den TV · Schedule entry On",
    });
    const style = getComputedStyle(button);
    expect(button.getBoundingClientRect().height).toBe(55);
    expect(style.paddingLeft).toBe("0px");
    expect(style.paddingRight).toBe("0px");
    expect(style.paddingTop).toBe("8px");
    expect(style.paddingBottom).toBe("8px");
    expect(style.borderBottomWidth).toBe("1px");
    const chevron = button.querySelector("svg")!;
    expect(chevron.getBoundingClientRect().width).toBe(16);
    expect(chevron.getBoundingClientRect().height).toBe(16);
    // C34 draws the chevron in foreground, while detail and value stay muted.
    expect(getComputedStyle(chevron).color).toBe(
      getComputedStyle(button.querySelector('[data-slot="list-row-title"]')!).color,
    );
    await userEvent.click(button);
    expect(args.onPress).toHaveBeenCalledTimes(1);
    await userEvent.keyboard("{Enter}");
    expect(args.onPress).toHaveBeenCalledTimes(2);
    await userEvent.keyboard(" ");
    expect(args.onPress).toHaveBeenCalledTimes(3);
    button.blur();
  },
};

export const TitleOnly: Story = {
  args: { title: "History", detail: undefined, value: undefined, chevron: false },
  play: async ({ canvasElement }) => {
    await checkContainment(canvasElement);
    expect(within(canvasElement).getByRole("button").getBoundingClientRect().height).toBe(48);
  },
};

export const NoChevron: Story = { args: { chevron: false } };

export const Disabled: Story = {
  args: { disabled: true },
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole("button");
    expect(button).toBeDisabled();
    button.click();
    await userEvent.tab();
    expect(button).not.toHaveFocus();
    expect(args.onPress).not.toHaveBeenCalled();
  },
};

/** Kept focused for VRT; forced-colors assertions live in inspector-row-regression.ts. */
export const Focused: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button");
    await userEvent.tab();
    expect(button).toHaveFocus();
    expect(button.matches(":focus-visible")).toBe(true);
    const style = getComputedStyle(button);
    expect(style.boxShadow !== "none" || style.outlineStyle !== "none").toBe(true);
  },
};

export const Pressed: Story = {
  render: (args) => <InspectorRow {...args} data-press="" />,
};

export const LongText: Story = {
  args: {
    title: "Weekdays before school and work in the upstairs shared studio",
    detail: "fiestaboard-upstairs-shared-studio-and-family-room.local:4420/schedule/weekday-morning",
    value: "WaitingForTheNextScheduledDisplayConnection",
  },
  play: async ({ canvasElement }) => checkContainment(canvasElement),
};

/** A deliberately constrained320px inspector, independent of the screenshot viewport. */
export const Mobile: Story = {
  ...LongText,
  decorators: [
    (Story) => (
      <div className="w-80 max-w-full">
        <Story />
      </div>
    ),
  ],
};

export const LargeText: Story = {
  ...Mobile,
  decorators: [
    function LargeTextDecorator(Story) {
      useLayoutEffect(() => {
        const root = document.documentElement;
        const before = root.style.fontSize;
        root.style.fontSize = "200%";
        return () => {
          root.style.fontSize = before;
        };
      }, []);
      return (
        <div className="w-[320px] max-w-full">
          <Story />
        </div>
      );
    },
  ],
};
