import type { Meta, StoryObj } from "@storybook/react";

import { EditorWarning, EditorWarningAction } from "./editor-warning";

/**
 * EditorWarning (slice 1.6b, P6 / H4). `line-overflow` is 07c `307:41691`
 * (desktop) and `307:43729` (phone): the hub measured a line at the board's
 * real width. `line-limit` is the FiestaUI library box (28:28304) under the
 * template in 04 `39:5815`.
 */
const meta = {
  title: "Editor/EditorWarning",
  component: EditorWarning,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: {
    kind: "line-overflow",
    line: 4,
    columns: 24,
    maxColumns: 22,
  },
} satisfies Meta<typeof EditorWarning>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 07c `307:41691`: the desktop card, 468 px wide in the template column. */
export const LineOverflow: Story = {
  render: () => (
    <div className="max-w-[468px]">
      <EditorWarning
        kind="line-overflow"
        line={4}
        columns={24}
        maxColumns={22}
        checked="Checked by Maya’s FiestaPi at the board’s real width · 6:05 PM"
        actions={
          <>
            <EditorWarningAction>Show next train only</EditorWarningAction>
            <EditorWarningAction>Wrap to line 5</EditorWarningAction>
          </>
        }
      >
        N JUDAH {"{{muni.n_judah.next}}"} → “N JUDAH 4, 12 AND 25 MIN”. The Kitchen board shows the first 22 columns;
        “IN” is cut.
      </EditorWarning>
    </div>
  ),
};

/** 07c `307:43729`: the phone card, 44 px fixes, above the template under the dock. */
export const LineOverflowTouch: Story = {
  render: () => (
    <div className="max-w-[374px]">
      <EditorWarning
        kind="line-overflow"
        size="touch"
        line={4}
        columns={24}
        maxColumns={22}
        actions={
          <>
            <EditorWarningAction>Next train only</EditorWarningAction>
            <EditorWarningAction>Wrap to line 5</EditorWarningAction>
          </>
        }
      >
        “N JUDAH 4, 12 AND 25 MIN” — checked by Maya’s FiestaPi
      </EditorWarning>
    </div>
  ),
};

/** 04 `39:5815` / library `28:28304`: the page is longer than the board. */
export const LineLimit: Story = {
  render: () => (
    <div className="max-w-[370px]">
      <EditorWarning kind="line-limit" lines={7} maxLines={6} />
    </div>
  ),
};
