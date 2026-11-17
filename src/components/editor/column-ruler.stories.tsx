import type { Meta, StoryObj } from "@storybook/react";

import { ColumnRuler } from "./column-ruler";

const meta = {
  title: "App/Editor/ColumnRuler",
  component: ColumnRuler,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  args: {
    columns: 96,
    marks: [
      { id: "zone", type: "zone", column: 48 },
      { id: "cut", type: "cut", column: 96 },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-full overflow-x-auto p-1">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColumnRuler>;
export default meta;
type Story = StoryObj<typeof meta>;
/** Figma109:8779. */
export const Default: Story = {};
/** Figma109:8894. */
export const DenTV: Story = { args: { columns: 29, marks: [{ id: "cut", type: "cut", column: 29 }] } };
/** Figma109:8931. */
export const NoteArray: Story = {
  args: {
    columns: 30,
    marks: [
      { id: "seam", type: "seam", column: 15 },
      { id: "cut", type: "cut", column: 30 },
    ],
  },
};
export const Dark: Story = { globals: { theme: "dark" } };
export const Mobile: Story = {
  globals: { viewport: { value: "mobile1", isRotated: false } },
  args: { visibleRange: { start: 41, end: 56 } },
};
export const RendererGeometry: Story = {
  args: {
    columns: 30,
    marks: [
      { id: "seam", type: "seam", column: 15, gap: 6 },
      { id: "cut", type: "cut", column: 30 },
    ],
  },
};
