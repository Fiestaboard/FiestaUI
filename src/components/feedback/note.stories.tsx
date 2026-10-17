import type { Meta, StoryObj } from "@storybook/react";
import { Info, Monitor, SearchX, TriangleAlert } from "lucide-react";

import { Note } from "./note";
import { Spinner } from "./spinner";

const meta = {
  title: "Feedback/Note",
  component: Note,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["sm", "md"],
      description: "`sm` is the 12px settings note; `md` is the 14px wizard note.",
    },
    title: {
      control: "text",
      description: "Optional bolded first line above the body",
    },
    icon: {
      control: false,
      description: "Leading glyph — a lucide element or a Spinner. Rendered aria-hidden.",
    },
    children: {
      control: "text",
      description: "Body copy",
    },
    className: {
      control: "text",
      description: "Additional CSS classes for the note container",
    },
  },
} satisfies Meta<typeof Note>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "w-full sm:w-[400px]",
    icon: <Info />,
    children: "Transitions are only applied when sending through the local API.",
  },
};

export const WithTitle: Story = {
  args: {
    className: "w-full sm:w-[400px]",
    icon: <TriangleAlert />,
    title: "Board not configured",
    children: "Add a board in Settings before using the debug tools.",
  },
};

export const WithSpinner: Story = {
  args: {
    className: "w-full sm:w-[400px]",
    size: "md",
    icon: <Spinner />,
    children: "Scanning the network for boards…",
  },
};

export const NoIcon: Story = {
  args: {
    className: "w-full sm:w-[400px]",
    children: "Plugin transitions override the default when a plugin defines its own.",
  },
};

export const AllSizes: Story = {
  args: { children: null },
  render: () => (
    <div className="flex w-full flex-col gap-3 sm:w-[400px]">
      <Note size="sm" icon={<Monitor />}>
        Flap speed only changes how this screen animates; the physical board is unaffected.
      </Note>
      <Note size="md" icon={<SearchX />}>
        No boards found. Make sure your board is powered on and on the same network.
      </Note>
    </div>
  ),
};
