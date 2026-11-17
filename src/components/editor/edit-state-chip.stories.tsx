import type { Meta, StoryObj } from "@storybook/react";

import { EditStateChip } from "./edit-state-chip";

const meta = {
  title: "Editor/EditStateChip",
  component: EditStateChip,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: { state: "draft" },
} satisfies Meta<typeof EditStateChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Draft: Story = {};
export const Unsaved: Story = { args: { state: "unsaved" } };
export const Testing: Story = { args: { state: "testing" } };
export const Saved: Story = { args: { state: "saved", label: "Saved 2 min ago" } };
export const LongLabel: Story = {
  args: { label: "Änderungen wurden noch nicht auf dem Display veröffentlicht" },
  decorators: [
    (Story) => (
      <div className="max-w-[240px]">
        <Story />
      </div>
    ),
  ],
};
