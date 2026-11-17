import type { Meta, StoryObj } from "@storybook/react";
import { Wifi } from "lucide-react";
import { useState } from "react";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { ChoiceChip, ChoiceChipGroup, type ChoiceChipProps } from "./choice-chip";

function InteractiveChip(args: ChoiceChipProps) {
  const [selected, setSelected] = useState(args.selected ?? false);
  return <ChoiceChip {...args} selected={selected} onSelectedChange={setSelected} />;
}

const meta = {
  title: "Forms/ChoiceChip",
  component: ChoiceChip,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { label: "Chip", size: "touch" },
  // Reset local interaction state when the selected control changes.
  render: (args) => <InteractiveChip key={String(args.selected)} {...args} />,
} satisfies Meta<typeof ChoiceChip>;
export default meta;
type Story = StoryObj<typeof meta>;

/** C30 Off: 32px pill in a 44px hit target. */
export const Default: Story = {};

/** C30 On: selected tint, 1.5px inset primary outline and a 14px check. */
export const Selected: Story = { args: { selected: true } };

/** Pointer-density variant keeps the 32px pill as its entire target. */
export const Compact: Story = { args: { size: "default" } };

/** The entire 44px button activates the choice, including above/below the pill. */
export const Touch: Story = {
  args: { label: "Online" },
  play: async ({ canvasElement }) => {
    const chip = within(canvasElement).getByRole("button", { name: "Online" });
    const pill = chip.querySelector('[data-slot="choice-chip-pill"]') as HTMLElement;
    await expect(chip.getBoundingClientRect().height).toBe(44);
    await expect(pill.getBoundingClientRect().height).toBe(32);
    await expect(chip.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    await userEvent.click(chip);
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(chip);
  },
};

/** One of N: the group owns state and keyboard navigation. */
export const Group: Story = {
  render: () => (
    <ChoiceChipGroup aria-label="Display status" size="touch" defaultValue="all">
      <ChoiceChip value="all" label="All displays" />
      <ChoiceChip value="online" label="Online" />
      <ChoiceChip value="offline" label="Offline" />
    </ChoiceChipGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.tab();
    await expect(canvas.getByRole("radio", { name: "All displays" })).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("radio", { name: "Online" })).toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{Home}");
  },
};

export const Disabled: Story = {
  render: () => (
    <ChoiceChipGroup aria-label="Unavailable filters" size="touch" defaultValue="online" disabled>
      <ChoiceChip value="all" label="All displays" />
      <ChoiceChip value="online" label="Online" />
    </ChoiceChipGroup>
  ),
};

export const WithIcon: Story = { args: { label: "Online", icon: <Wifi />, selected: true } };

/** A translated label may wrap: the 32px visual and 44px target are minimums. */
export const LongLabels: Story = {
  render: () => (
    <ChoiceChipGroup aria-label="Display filters" size="touch" defaultValue="all" className="w-full max-w-72">
      <ChoiceChip value="all" label="All of the displays in the upstairs living room" />
      <ChoiceChip value="online" label="OnlyCurrentlyConnectedDisplaysWithAnUnbrokenTranslatedLabel" />
    </ChoiceChipGroup>
  ),
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("radiogroup");
    await expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth);
    for (const chip of within(group).getAllByRole("radio")) {
      await expect(chip.scrollWidth).toBeLessThanOrEqual(chip.clientWidth);
    }
  },
};

/** Focus belongs to the actual hit target; it never replaces the pill's selection. */
export const SelectedFocused: Story = {
  args: { selected: true },
  play: async ({ canvasElement }) => {
    const chip = within(canvasElement).getByRole("button", { name: "Chip" });
    await userEvent.tab();
    await expect(chip).toHaveFocus();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    // The shared <main> enters from opacity0; wait for painted visibility,
    // without replacing the selected-check assertion with a class check.
    await waitFor(() => expect(chip.querySelector('[data-slot="choice-chip-check"]')).toBeVisible());
    await waitFor(() => expect(getComputedStyle(chip).boxShadow).not.toBe("none"));
    const pill = chip.querySelector('[data-slot="choice-chip-pill"]') as HTMLElement;
    await expect(getComputedStyle(pill).outlineWidth).toBe("1.5px");
  },
};
