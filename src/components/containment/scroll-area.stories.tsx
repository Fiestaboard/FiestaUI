import type { Meta, StoryObj } from "@storybook/react";
import { FileText, Folder, ImageIcon, Music, Video } from "lucide-react";

import { ScrollArea, ScrollBar } from "./scroll-area";

const meta = {
  title: "Containment/ScrollArea",
  component: ScrollArea,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    className: {
      control: "text",
      description: "Classes for the scroll container; set an explicit height/width to enable scrolling",
    },
    children: {
      control: false,
      description: "Scrollable content rendered inside the viewport",
    },
  },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: "h-72 w-48 rounded-md border",
    children: (
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Tags</h4>
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="text-sm py-1">
            Tag {i + 1}
          </div>
        ))}
      </div>
    ),
  },
};

export const Horizontal: Story = {
  args: {
    // Intentionally a fixed viewport, at every screen width: the demo is a
    // 384px window onto a ~3000px `w-max` row. Making it fluid would let the
    // row's intrinsic width size the page instead of being scrolled.
    className: "w-96 whitespace-nowrap rounded-md border",
  },
  render: (args) => (
    <ScrollArea {...args}>
      <div className="flex w-max space-x-4 p-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="shrink-0 rounded-md border p-4 w-[150px] text-center">
            Item {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

export const LongContent: Story = {
  args: {
    className: "h-[200px] w-full sm:w-[350px] rounded-md border p-4",
  },
  render: (args) => (
    <ScrollArea {...args}>
      <div className="space-y-4">
        <h4 className="text-sm font-medium">Long Form Content</h4>
        {Array.from({ length: 10 }).map((_, i) => (
          <p key={i} className="text-sm text-muted-foreground">
            Paragraph {i + 1}: Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt
            ut labore et dolore magna aliqua.
          </p>
        ))}
      </div>
    </ScrollArea>
  ),
};

export const BothAxes: Story = {
  args: {
    // Fixed at every width for the same reason as Horizontal — the point is a
    // window smaller than the 600px content, so both scrollbars appear.
    className: "h-[220px] w-[350px] rounded-md border",
  },
  render: (args) => (
    <ScrollArea {...args}>
      <div className="w-[600px] p-4">
        <h4 className="mb-4 text-sm font-medium leading-none">Wide and tall content</h4>
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="whitespace-nowrap py-1 text-sm text-muted-foreground">
            Row {i + 1}: this row is intentionally wider than the viewport so both scrollbars appear.
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

const files = [
  { icon: Folder, name: "Board layouts", detail: "12 items" },
  { icon: FileText, name: "morning-briefing.txt", detail: "2 KB" },
  { icon: FileText, name: "release-notes.md", detail: "9 KB" },
  { icon: ImageIcon, name: "board-display.png", detail: "1.2 MB" },
  { icon: ImageIcon, name: "configuration.png", detail: "840 KB" },
  { icon: Music, name: "chime.mp3", detail: "320 KB" },
  { icon: Video, name: "demo-loop.mp4", detail: "14 MB" },
  { icon: Folder, name: "Archived pages", detail: "48 items" },
  { icon: FileText, name: "weather-template.txt", detail: "1 KB" },
  { icon: FileText, name: "transit-template.txt", detail: "1 KB" },
  { icon: ImageIcon, name: "integrations.png", detail: "760 KB" },
  { icon: Folder, name: "Plugin drafts", detail: "6 items" },
];

export const FileBrowser: Story = {
  args: {
    className: "h-72 w-full sm:w-80 rounded-md border",
  },
  render: (args) => (
    <ScrollArea {...args}>
      <div className="p-2">
        <h4 className="px-2 py-1.5 text-sm font-semibold">Project files</h4>
        <ul className="space-y-1" aria-label="Project files">
          {files.map(({ icon: Icon, name, detail }) => (
            <li key={name} className="flex items-center gap-3 rounded-sm px-2 py-1.5 hover:bg-accent">
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="flex-1 truncate text-sm">{name}</span>
              <span className="text-xs text-muted-foreground">{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </ScrollArea>
  ),
};
