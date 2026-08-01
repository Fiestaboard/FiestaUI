import type { Meta, StoryObj } from "@storybook/react";

import { FiestaIcon } from "./fiesta-icon";

const meta = {
  title: "Chrome/FiestaIcon",
  component: FiestaIcon,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          'The pixel-art taco brand mark, embedded as a data URI so the design system carries the brand with zero asset plumbing. Decorative (`alt=""`) — pair it with FiestaLogo or your own accessible label.',
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      description: "Rendered width and height in px — the source art is 32×32.",
      control: { type: "range", min: 16, max: 128, step: 4 },
    },
    className: { control: false },
  },
} satisfies Meta<typeof FiestaIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { size: 32 },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-end gap-8">
      {[16, 24, 32, 64].map((size) => (
        <div key={size} className="flex flex-col items-center gap-2">
          <FiestaIcon size={size} />
          <span className="text-xs text-muted-foreground">{size}px</span>
        </div>
      ))}
    </div>
  ),
};
