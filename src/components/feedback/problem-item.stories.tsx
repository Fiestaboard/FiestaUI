import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";

import { ListRowGroup } from "../containment/list-row";
import { TraceStep } from "../editor/trace-step";
import { ProblemItem } from "./problem-item";
import { SentLog } from "./sent-log";

const meta = {
  title: "Feedback/ProblemItem",
  component: ProblemItem,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    severity: "error",
    message: "#REF · Row 12 · Footer",
    detail: "muni.next doesn’t exist. Did you mean muni:home.next?",
    onJump: fn(),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProblemItem>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    const button = within(canvasElement).getByRole("button");
    await userEvent.click(button);
    await userEvent.keyboard("{Enter} ");
    expect(args.onJump).toHaveBeenCalledTimes(3);
    button.blur();
  },
};

/** 04d phone body only; native sheets and tabs belong to their kits. */
export const Inspector: Story = {
  render: (args) => (
    <div className="flex w-full max-w-[380px] flex-col gap-1">
      <p className="font-mono text-xs font-medium text-muted-foreground">2 PROBLEMS · 2 WARNINGS</p>
      <ListRowGroup aria-label="Page problems" variant="plain" className="divide-y-0">
        <ProblemItem
          {...args}
          diagnostic={<TraceStep state="error" expression="DATEDIFF(NOW(), muni.next)" value="#REF" />}
        />
        <ProblemItem {...args} message="Too long · Row 7" detail="“OCEAN BEACH VIA JUDAH” needs 31 of 29 columns" />
        <ProblemItem
          {...args}
          severity="warning"
          message="Missing data · weather"
          detail="Last update 2 h ago; DEFAULT shows “—”"
        />
        <ProblemItem
          {...args}
          severity="warning"
          message="Dependency · Muni plugin"
          detail="Community plugin 1.4 → 1.5 available"
        />
      </ListRowGroup>
      <SentLog
        items={[
          { id: "1", at: "7:41 AM", outcome: "shown", message: "to Den TV · 1 substitution (é → E)" },
          { id: "2", at: "6:55 AM", outcome: "held", message: "re-rendered when Silence ends 7:00 AM" },
          { id: "3", at: "Yesterday", outcome: "paused", message: "Den TV paused 8:31–9:00 PM" },
        ]}
      />
    </div>
  ),
};

export const Console: Story = {
  args: { layout: "inline", labels: { jump: "Jump to source ›" }, message: "#REF · Row 12" },
  render: (args) => (
    <div className="flex flex-col gap-2">
      <ProblemItem {...args} />
      <ProblemItem {...args} message="Too long · Row 7" detail="“OCEAN BEACH VIA JUDAH” needs 31 of 29 columns" />
      <SentLog
        presentation="summary"
        items={[
          { id: "1", at: "7:41 AM", outcome: "shown", message: "to Den TV · 1 substitution (é → E)" },
          {
            id: "2",
            at: "6:55 AM",
            outcome: "held",
            message: "re-rendered when Silence ended at 7:00 AM (newest hold wins)",
          },
        ]}
      />
    </div>
  ),
};

const fix = fn();
export const BeforeSaving: Story = {
  args: {
    presentation: "card",
    message: "Line 1 · unknown function FORMATDAT",
    detail: "There is no FORMATDAT, so line 1 would show #NAME? on the board. Did you mean FORMATDATE?",
    diagnostic: (
      <p className="font-mono text-xs font-medium text-muted-foreground">Formula #NAME?: Unknown function: FORMATDAT</p>
    ),
    onJump: undefined,
    fixes: [
      { id: "fix", label: "Use FORMATDATE and save", variant: "default", onClick: fix },
      { id: "save", label: "Save anyway", onClick: fn() },
      { id: "edit", label: "Keep editing", variant: "ghost", onClick: fn() },
    ],
  },
  decorators: [
    (Story) => (
      <div className="max-w-[320px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Use FORMATDATE and save" }));
    expect(fix).toHaveBeenCalledOnce();
    await userEvent.tab();
    expect(canvas.getByRole("button", { name: "Save anyway" })).toHaveFocus();
    await userEvent.tab();
    expect(canvas.getByRole("button", { name: "Keep editing" })).toHaveFocus();
    canvas.getByRole("button", { name: "Keep editing" }).blur();
  },
};

export const Warning: Story = {
  args: { severity: "warning", message: "Missing data · weather", detail: "Last update 2 h ago; DEFAULT shows “—”" },
};
export const Disabled: Story = {
  args: { disabled: true, fixes: [{ id: "fix", label: "Use muni:home.next", onClick: fn() }] },
  play: async ({ canvasElement, args }) => {
    for (const button of within(canvasElement).getAllByRole("button")) {
      expect(button).toBeDisabled();
      button.click();
    }
    expect(args.onJump).not.toHaveBeenCalled();
    expect(args.fixes![0].onClick).not.toHaveBeenCalled();
  },
};
export const Touch: Story = {
  args: { size: "touch", fixes: [{ id: "fix", label: "Use muni:home.next", onClick: fn() }] },
  play: async ({ canvasElement }) => {
    for (const button of within(canvasElement).getAllByRole("button")) {
      expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      expect(button.getBoundingClientRect().width).toBeGreaterThanOrEqual(44);
    }
  },
};
export const Mobile: Story = { ...Inspector, globals: { viewport: { value: "mobile1", isRotated: false } } };
// Every story uses the shared light/dark VRT and axe matrix; do not pin a theme.
export const LongContent: Story = {
  args: {
    message: "A long localized error with an unknown function in the footer of this page",
    detail: "weather.provider.current_conditions.temperature".repeat(6),
    labels: { jump: "Jump to the original source of this problem" },
    fixes: [{ id: "fix", label: "Use the replacement variable from the available weather provider", onClick: fn() }],
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-[280px]">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    for (const element of canvasElement.querySelectorAll<HTMLElement>(
      '[data-component="problem-item"], [data-slot="list-row-text"], button',
    ))
      expect(element.scrollWidth).toBeLessThanOrEqual(element.clientWidth + 1);
  },
};
