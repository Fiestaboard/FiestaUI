import type { Meta, StoryObj } from "@storybook/react";

import { DISPLAY_TYPES, DisplayTypeChip } from "./display-type-chip";

/*
 * 02 FB / Display type `39:49629` (08 C11 `59:145389`): which kind of display
 * something is, for mixed households. Informational, 24 px; filters use Chip.
 */

const meta = {
  title: "App/Board/DisplayTypeChip",
  component: DisplayTypeChip,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { type: "flagship" },
  argTypes: { type: { control: "select", options: DISPLAY_TYPES } },
} satisfies Meta<typeof DisplayTypeChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Every type, in 02's order: the row a display-type picker lists. */
export const AllTypes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      {DISPLAY_TYPES.map((type) => (
        <DisplayTypeChip key={type} type={type} />
      ))}
    </div>
  ),
};

/**
 * `detail` says more than the type (a FiestaPanel's own grid, a Hallway LED
 * wall's pixels) or, as `null`, nothing; `label` translates the name.
 */
export const Overrides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <DisplayTypeChip type="panel" detail="29×12" />
      <DisplayTypeChip type="pixoo" label="LED wall" detail="128×64" />
      <DisplayTypeChip type="flagship" detail={null} />
      <DisplayTypeChip type="note" label="Notiz" />
    </div>
  ),
};

/** A mixed household's Displays list: the chip sits under each display's name. */
export const MixedHousehold: Story = {
  render: () => (
    <ul className="flex w-full max-w-sm flex-col divide-y rounded-lg border bg-card">
      {(
        [
          ["Kitchen", "flagship"],
          ["Desk", "pixoo"],
          ["Entry clock", "tc001"],
          ["Den TV", "panel"],
        ] as const
      ).map(([name, type]) => (
        <li key={name} className="flex flex-col items-start gap-1 px-4 py-3">
          <span className="text-sm font-medium">{name}</span>
          <DisplayTypeChip type={type} detail={type === "panel" ? "29×12" : undefined} />
        </li>
      ))}
    </ul>
  ),
};

/** In a narrow column the chips wrap, never truncate or shrink. */
export const Wrapping: Story = {
  render: () => (
    <div className="flex w-[240px] flex-wrap gap-1.5 rounded-lg border p-3">
      {DISPLAY_TYPES.map((type) => (
        <DisplayTypeChip key={type} type={type} />
      ))}
    </div>
  ),
};
