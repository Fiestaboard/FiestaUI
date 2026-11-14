import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";

import { buildDurationOptions, DurationChipGroup, OutcomeLine } from "./duration-chip-group";

// CANON copy (07a Change Page 310:27278; H2 preselects the next Schedule change).
const OPTIONS = buildDurationOptions({ nextChange: "Until 9:00 PM" });

const OUTCOMES: Record<string, string> = {
  "15m": "Holds until 6:31 PM (15 min), then Schedule resumes with Dinner note.",
  "1h": "Holds until 7:16 PM (1 hr), then Schedule resumes with Dinner note.",
  "next-change": "Holds until 9:00 PM (2h 44m), then Schedule resumes with Good night.",
  "until-cancel": "Holds until you cancel or Change Page again.",
};

const meta = {
  title: "Forms/DurationChipGroup",
  component: DurationChipGroup,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    layout: {
      control: "inline-radio",
      options: ["auto", "row", "grid"],
      description: "row = desktop dialog · grid = 2×2 phone sheet · auto = grid below sm, row from sm",
    },
    outcome: { control: "text", description: "The outcome sentence for the current choice (polite live region)" },
  },
  args: {
    "aria-label": "How long should Taco Tuesday stay up?",
    options: OPTIONS,
  },
} satisfies Meta<typeof DurationChipGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

function Labelled({ layout }: { layout?: "auto" | "row" | "grid" }) {
  const [value, setValue] = React.useState("next-change");
  const id = React.useId();
  return (
    <div className="flex w-full max-w-[496px] flex-col gap-3">
      <p id={id} className="text-sm leading-5 font-semibold">
        How long should Taco Tuesday stay up?
      </p>
      <DurationChipGroup
        aria-labelledby={id}
        options={OPTIONS}
        layout={layout}
        value={value}
        onValueChange={setValue}
        outcome={OUTCOMES[value]}
      />
    </div>
  );
}

/** The Change Page duration step: question, chips, and the outcome sentence that follows the choice. */
export const Default: Story = {
  render: () => <Labelled />,
};

/** `layout="row"` — Figma Layout=Row, the desktop dialog. */
export const Row: Story = {
  render: () => <Labelled layout="row" />,
};

/** `layout="grid"` — Figma Layout=Grid: 2×2, chips fill, the 350 px phone sheet. */
export const Grid: Story = {
  render: () => (
    <div className="w-[350px] max-w-full">
      <Labelled layout="grid" />
    </div>
  ),
};

/**
 * A narrow side sheet on a wide viewport: `auto` would read the desktop
 * viewport and wrap the row 3 + 1, so the host pins `layout="grid"`.
 */
export const InNarrowSheet: Story = {
  render: function Render() {
    const [value, setValue] = React.useState("next-change");
    const id = React.useId();
    return (
      <div className="flex w-[360px] max-w-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-card">
        <p id={id} className="text-sm leading-5 font-semibold">
          How long should Taco Tuesday stay up?
        </p>
        <DurationChipGroup
          aria-labelledby={id}
          options={OPTIONS}
          layout="grid"
          value={value}
          onValueChange={setValue}
          outcome={OUTCOMES[value]}
        />
      </div>
    );
  },
};

/** Each chip selected in turn (Figma `Selected=` variants), row and grid. */
export const AllSelections: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {OPTIONS.map((option) => (
        <DurationChipGroup
          key={`row-${option.value}`}
          aria-label={`Duration, ${String(option.label)} selected`}
          options={OPTIONS}
          layout="row"
          value={option.value}
        />
      ))}
      <div className="grid w-[350px] max-w-full gap-4">
        {OPTIONS.map((option) => (
          <DurationChipGroup
            key={`grid-${option.value}`}
            aria-label={`Duration grid, ${String(option.label)} selected`}
            options={OPTIONS}
            layout="grid"
            value={option.value}
          />
        ))}
      </div>
    </div>
  ),
};

/** Nothing next in the Schedule: the "Until <next change>" chip is left out. */
export const NoNextChange: Story = {
  render: () => (
    <DurationChipGroup
      aria-label="How long should Dinner note stay up?"
      options={buildDurationOptions()}
      defaultValue="until-cancel"
      outcome="Holds until you cancel or Change Page again."
    />
  ),
};

/** Disabled group (e.g. while Show now is sending). */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: "1h", layout: "row" },
};

/** OutcomeLine on its own at both scales: `sm` (dialog) and `md` (Home card). */
export const Outcome: Story = {
  render: () => (
    <div className="flex max-w-xl flex-col gap-3">
      <OutcomeLine size="sm">Holds until 9:00 PM (2h 44m), then Schedule resumes with Good night.</OutcomeLine>
      <OutcomeLine>Holds until 9:00 PM, then Schedule resumes. Next: Good night.</OutcomeLine>
    </div>
  ),
};
