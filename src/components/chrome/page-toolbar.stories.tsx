import type { Meta, StoryObj } from "@storybook/react";

import { Badge } from "../feedback/badge";
import { Button } from "../forms/button";
import { Input } from "../forms/input";
import { PageToolbar } from "./page-toolbar";

const meta = {
  title: "App/Chrome/PageToolbar",
  component: PageToolbar,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    left: {
      description: "Left slot — filters, counts, status badges. Omit to right-align the actions.",
      control: false,
    },
    right: { description: "Right slot — page-level actions. Omit to left-align the info cluster.", control: false },
    children: {
      description: "Escape hatch — replaces the slot layout with your own row, keeping the chrome and its padding.",
      control: false,
    },
    className: { control: false },
  },
} satisfies Meta<typeof PageToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    left: (
      <>
        <Badge>4 pages</Badge>
        <Badge variant="secondary">2 scheduled</Badge>
      </>
    ),
    right: (
      <>
        <Button variant="outline">Import</Button>
        <Button variant="brand">New page</Button>
      </>
    ),
  },
};

/**
 * Phone-width review case. The toolbar wraps its right-hand action group onto a
 * second line instead of pushing it past the viewport edge — `flex-wrap` plus a
 * container-level `gap-3` is the escape valve `justify-between` otherwise lacks.
 */
export const PhoneWidth: Story = {
  args: Default.args,
  decorators: [
    (Story) => (
      <div className="w-full sm:w-[390px] rounded-lg border border-dashed p-3">
        <Story />
      </div>
    ),
  ],
};

export const LeftOnly: Story = {
  args: {
    left: <Badge variant="secondary">Read-only view</Badge>,
  },
};

/**
 * SUPPORTED, BUT USUALLY THE WRONG CALL. Now that the toolbar is a surface, a
 * lone right-aligned action renders as a wide empty bar with a button in the
 * corner — this story is here so that is visible rather than discovered on a
 * route. Collections shipped exactly this and moved the button to
 * `PageHeader`'s action slot instead, where it reads as the page's primary
 * verb. Use the toolbar when there is genuinely a row of controls.
 */
export const RightOnly: Story = {
  args: {
    right: <Button variant="brand">New page</Button>,
  },
};

/**
 * The `children` escape hatch, which is what Integrations uses. Its search
 * field has to take whatever track the tab strip leaves, and a left/right flex
 * split cannot express "fill the rest" — so the route supplies its own grid
 * and the toolbar contributes only the chrome. The controls still land on the
 * content column, because the padding lives on the outer element either way.
 */
export const CustomRow: Story = {
  args: {
    children: (
      <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex items-center gap-1">
          <Badge>Installed</Badge>
          <Badge variant="secondary">Marketplace</Badge>
        </div>
        <Input placeholder="Search installed plugins…" />
      </div>
    ),
  },
};
