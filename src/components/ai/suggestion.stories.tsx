import type { Meta, StoryObj } from "@storybook/react";

import { Suggestion, Suggestions } from "./suggestion";

const meta = {
  title: "AI/Suggestion",
  component: Suggestion,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    suggestion: {
      control: "text",
      description: "The text handed to `onClick`; also the label unless children are given.",
    },
    onClick: { control: false, description: "Receives the suggestion text." },
    children: { control: false, description: "An alternative label." },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof Suggestion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { suggestion: "Make a weather page" } };

/** Empty-state starters, in a row that scrolls sideways instead of wrapping under the composer. */
export const Row = () => (
  <div className="w-full sm:w-[360px]">
    <Suggestions>
      <Suggestion suggestion="Make a weather page" />
      <Suggestion suggestion="Show the next Muni departure" />
      <Suggestion suggestion="Schedule my mornings" />
      <Suggestion suggestion="What can you do?" />
    </Suggestions>
  </div>
);
