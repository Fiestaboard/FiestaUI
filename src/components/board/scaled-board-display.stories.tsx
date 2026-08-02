import type { Meta, StoryObj } from "@storybook/react";

import { ScaledBoardDisplay } from "./scaled-board-display";

const meta = {
  title: "Board/ScaledBoardDisplay",
  component: ScaledBoardDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    message: {
      control: "text",
      description: "Board message; lines split on \\n, colors via {red}…{/red} or {63} markers",
    },
    isLoading: {
      control: "boolean",
      description: "Loading state — all tiles cycle through the character set continuously",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant of the underlying BoardDisplay",
    },
    boardType: {
      control: "select",
      options: ["black", "white"],
      description: "Type of board (black or white)",
    },
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
      description: "Board hardware family; note arrays get the Fit / Actual size toggle",
    },
    notesWide: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes wide (note_array only)",
    },
    notesTall: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes tall (note_array only)",
    },
    animationsEnabled: {
      control: "boolean",
      description: "Run the split-flap animation; when false tiles snap to their targets",
    },
    previewSizeLabel: {
      control: "text",
      description: "Accessible label for the Fit / Actual size toggle group",
    },
    fitModeLabel: {
      control: "text",
      description: "Fit-mode toggle button label",
    },
    actualModeLabel: {
      control: "text",
      description: "Actual-size toggle button label",
    },
  },
} satisfies Meta<typeof ScaledBoardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMessage = "HELLO WORLD\nWELCOME TO\nFIESTABOARD\n{red}SCALED{/red} {blue}TO FIT{/blue}";

export const Default: Story = {
  args: {
    message: sampleMessage,
    size: "md",
  },
};

/**
 * The canonical reason this wrapper exists: the same board rendered into
 * progressively narrower slots. Each container has `overflow-hidden`, so
 * ScaledBoardDisplay measures it and applies `transform: scale()` — the
 * board never overflows and never scales past 100%.
 */
export const Scaled = () => (
  <div className="flex flex-col items-center gap-8">
    {[640, 440, 280].map((width) => (
      <div key={width} className="flex flex-col items-center gap-2">
        <p className="text-xs text-muted-foreground">{width}px container</p>
        <div className="overflow-hidden rounded-lg border border-dashed border-border p-2" style={{ width }}>
          <ScaledBoardDisplay message={sampleMessage} size="md" />
        </div>
      </div>
    ))}
  </div>
);

/** Note arrays show the Fit / Actual size toggle above the preview. */
export const NoteArrayWithToggle: Story = {
  args: {
    message:
      "A VERY WIDE NOTE ARRAY MESSAGE SPANNING THREE NOTES SIDE BY SIDE\n{green}FIT MODE SCALES IT DOWN{/green} — ACTUAL MODE SCROLLS AT FULL SIZE\nTOGGLE ABOVE TO COMPARE THE TWO PREVIEW MODES RIGHT HERE OK",
    size: "md",
    deviceType: "note_array",
    notesWide: 3,
    notesTall: 1,
  },
  render: (args) => (
    <div className="w-[560px] max-w-full overflow-hidden">
      <ScaledBoardDisplay {...args} />
    </div>
  ),
};

export const WhiteBoard: Story = {
  args: {
    message: sampleMessage,
    size: "md",
    boardType: "white",
  },
  render: (args) => (
    <div className="w-[420px] overflow-hidden">
      <ScaledBoardDisplay {...args} />
    </div>
  ),
};

/** The full args surface with controls. */
export const Playground: Story = {
  args: {
    message: sampleMessage,
    isLoading: false,
    size: "md",
    boardType: "black",
    deviceType: "flagship",
    notesWide: 1,
    notesTall: 1,
    animationsEnabled: true,
    previewSizeLabel: "Preview size",
    fitModeLabel: "Fit",
    actualModeLabel: "Actual size",
  },
  render: (args) => (
    <div className="w-[480px] max-w-full overflow-hidden">
      <ScaledBoardDisplay {...args} />
    </div>
  ),
};
