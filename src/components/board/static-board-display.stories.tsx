import type { Meta, StoryObj } from "@storybook/react";

import { StaticBoardDisplay } from "./static-board-display";

const meta = {
  title: "Board/StaticBoardDisplay",
  component: StaticBoardDisplay,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    message: {
      control: "text",
      description: "Board message; lines split on \\n, colors via {red}…{/red} or {63} markers",
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      description: "Size variant (defaults to sm — this is the thumbnail/list renderer)",
    },
    boardType: {
      control: "select",
      options: ["black", "white"],
      description: "Type of board (black or white)",
    },
    deviceType: {
      control: "select",
      options: ["flagship", "note", "note_array"],
      description: "Board hardware family",
    },
    notesWide: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes wide (note_array only)",
    },
    notesTall: {
      control: { type: "number", min: 1, max: 8 },
      description: "Notes tall (note_array only)",
    },
    previewLabel: {
      control: "text",
      description: "Accessible label when a message is shown",
    },
    emptyLabel: {
      control: "text",
      description: "Accessible label when the board is empty",
    },
    className: {
      control: "text",
      description: "Additional CSS classes on the board bezel",
    },
  },
} satisfies Meta<typeof StaticBoardDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleMessage =
  "HELLO WORLD\nWELCOME TO\nFIESTABOARD\n{red}NO{/red} {blue}ANIMATION{/blue}\n{63}{64}{65}{66}{67}{68}";

export const Default: Story = {
  args: {
    message: sampleMessage,
    size: "sm",
  },
};

export const MediumSize: Story = {
  args: {
    message: sampleMessage,
    size: "md",
  },
};

export const WhiteBoard: Story = {
  args: {
    message: sampleMessage,
    size: "md",
    boardType: "white",
  },
};

export const NoteDevice: Story = {
  args: {
    message: "STATIC NOTE\n{green}CHEAP TILES{/green}\nFOR LISTS °",
    size: "sm",
    deviceType: "note",
  },
};

export const Empty: Story = {
  args: {
    message: null,
    size: "sm",
  },
};

/** Thumbnail grid — the use case this variant exists for: many boards at once. */
export const ThumbnailGrid = () => (
  <div className="grid grid-cols-2 gap-4">
    {[
      "PAGE ONE\n{red}ALERTS{/red}",
      "PAGE TWO\n{blue}WEATHER{/blue}",
      "PAGE THREE\n{green}TRANSIT{/green}",
      "PAGE FOUR\n{yellow}QUOTES{/yellow}",
    ].map((msg) => (
      <StaticBoardDisplay key={msg} message={msg} size="sm" />
    ))}
  </div>
);
