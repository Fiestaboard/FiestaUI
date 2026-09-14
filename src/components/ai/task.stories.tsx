import type { Meta, StoryObj } from "@storybook/react";

import { Task, TaskContent, TaskItem, TaskTrigger } from "./task";

const meta = {
  title: "AI/Task",
  component: Task,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    labels: { control: false, description: "Status names announced before each step (`statuses`)." },
    defaultOpen: { control: "boolean", description: "Open by default; the timeline is the point." },
    children: { control: false },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof Task>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The observed step timeline of one turn: every status is a glyph plus a hidden label. */
export const Default: Story = {
  render: (args) => (
    <div className="w-full sm:w-[360px]">
      <Task {...args}>
        <TaskTrigger title="2 of 4 steps" />
        <TaskContent>
          <TaskItem status="done">Listed your pages</TaskItem>
          <TaskItem status="done">Created page “Morning”</TaskItem>
          <TaskItem status="running">Adding a weekday schedule</TaskItem>
          <TaskItem status="pending">Setting it as the active page</TaskItem>
        </TaskContent>
      </Task>
    </div>
  ),
};

/** A step that failed. */
export const WithError = () => (
  <div className="w-full sm:w-[360px]">
    <Task>
      <TaskTrigger title="1 of 2 steps" />
      <TaskContent>
        <TaskItem status="done">Listed your pages</TaskItem>
        <TaskItem status="error">Creating page “Morning” — a page with that name exists</TaskItem>
      </TaskContent>
    </Task>
  </div>
);
