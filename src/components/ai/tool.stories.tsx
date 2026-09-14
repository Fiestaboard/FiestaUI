import type { Meta, StoryObj } from "@storybook/react";

import { Tool, ToolContent, ToolHeader, ToolInput, ToolOutput, type ToolState } from "./tool";

const meta = {
  title: "AI/Tool",
  component: Tool,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    state: {
      control: "select",
      options: [
        "input-streaming",
        "input-available",
        "output-available",
        "output-error",
        "approval-requested",
        "denied",
        "stopped",
      ],
      description: "The call's lifecycle. Stamped as `data-state`; errors and approval requests open by default.",
    },
    labels: { control: false, description: "State names (`states`), plus the `input` / `output` block headings." },
    defaultOpen: { control: "boolean", description: "Override the state-based default." },
    children: { control: false },
    className: { control: "text", description: "Additional CSS classes" },
  },
} satisfies Meta<typeof Tool>;

export default meta;
type Story = StoryObj<typeof meta>;

const Card = (args: React.ComponentProps<typeof Tool>) => (
  <div className="w-full sm:w-[380px]">
    <Tool {...args}>
      <ToolHeader title="Create page" detail="Morning" />
      <ToolContent>
        <ToolInput input={{ name: "Morning", template_lines: ["GOOD MORNING", "{{weather.temperature}}"] }} />
        <ToolOutput
          output={args.state === "output-available" ? "Page created." : undefined}
          errorText={args.state === "output-error" ? "A page called Morning already exists." : undefined}
        />
      </ToolContent>
    </Tool>
  </div>
);

/** A finished call, folded. Click the header to see the arguments and result. */
export const Done: Story = { args: { state: "output-available" }, render: Card };

/** Running: the state glyph is a spinner. */
export const Running: Story = { args: { state: "input-available" }, render: Card };

/** Failed calls open by default so the error is read without a click. */
export const Failed: Story = { args: { state: "output-error" }, render: Card };

/** A destructive call waiting on the user; the app renders Approve / Deny next to it. */
export const AwaitingApproval: Story = { args: { state: "approval-requested" }, render: Card };

/** Every state in one column, for the a11y sweep and VRT. */
export const AllStates = () => (
  <div className="flex w-full flex-col gap-2 sm:w-[380px]">
    {(
      [
        "input-streaming",
        "input-available",
        "output-available",
        "output-error",
        "approval-requested",
        "denied",
        "stopped",
      ] as ToolState[]
    ).map((state) => (
      <Tool key={state} state={state} defaultOpen={false}>
        <ToolHeader title="Create page" detail={state} />
      </Tool>
    ))}
  </div>
);
