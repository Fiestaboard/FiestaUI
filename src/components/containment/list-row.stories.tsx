import type { Meta, StoryObj } from "@storybook/react";
import { Calendar, ChevronRight, Clock, Copy, MoreHorizontal, Pencil, Server, Trash2 } from "lucide-react";
import { useEffect } from "react";

import { Button } from "../forms/button";
import { Switch } from "../forms/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../overlays/dropdown-menu";
import { IconTile } from "./icon-tile";
import { ListRow, ListRowGroup } from "./list-row";

/*
 * ListRow (slice 1.8a, C16). Figma: 08 `61:25752` (the candidate), 06 `31:5`
 * and `368:24902` (iOS / List row, Layout=Inline and Stacked), 07c §5 (the
 * Collection list), 03 `35:1038` (Timeline row).
 */
const meta = {
  title: "Containment/ListRow",
  component: ListRow,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text", description: "The row's name. Required." },
    description: { control: "text", description: "Second line, muted." },
    meta: { control: "text", description: "Short value read with the title." },
    layout: {
      control: "inline-radio",
      options: ["auto", "inline", "stacked"],
      description: "Where the meta goes. `auto` wraps it under the text when the text column falls below 10rem.",
    },
    variant: { control: "inline-radio", options: ["plain", "card"] },
    size: { control: "inline-radio", options: ["default", "touch"] },
    leading: { control: false },
    trailing: { control: false },
    render: { control: false },
  },
} satisfies Meta<typeof ListRow>;

export default meta;
type Story = StoryObj<typeof meta>;

const tile = (icon: React.ReactNode) => <IconTile size="sm">{icon}</IconTile>;

export const Default: Story = {
  args: {
    title: "Schedule Mode",
    description: "Pages change on their own",
    meta: "On",
    leading: tile(<Calendar />),
    trailing: <ChevronRight />,
  },
  render: (args) => (
    <ListRowGroup aria-label="Schedule" className="w-full sm:w-[400px]">
      <ListRow {...args} />
    </ListRowGroup>
  ),
};

/** The 06 settings rows, as an inset group with dividers. */
export const InsetGroup: Story = {
  args: { title: "" },
  render: () => (
    <ListRowGroup aria-label="Hub" className="w-full sm:w-[400px]">
      <ListRow
        leading={tile(<Server />)}
        title="FiestaPi"
        description="fiestapi.local:4420"
        trailing={<ChevronRight />}
      />
      <ListRow
        leading={tile(<Calendar />)}
        title="Schedule Mode"
        description="Pages change on their own"
        meta="On"
        trailing={<ChevronRight />}
      />
      <ListRow
        leading={tile(<Clock />)}
        title="Quiet hours"
        description="Silence Schedule from 10:00 PM"
        trailing={<Switch aria-label="Quiet hours" defaultChecked />}
      />
      <ListRow title="Firmware" meta="8.17.0" />
    </ListRowGroup>
  ),
};

/** `inline`, `stacked` and `auto` side by side, all in a 280px column. */
export const Layouts: Story = {
  args: { title: "" },
  render: () => (
    <div className="flex w-full flex-col gap-4 sm:w-[640px] sm:flex-row">
      {(["inline", "stacked", "auto"] as const).map((layout) => (
        <div key={layout} className="flex w-full flex-col gap-1 sm:w-[200px]">
          <span className="text-xs font-medium text-muted-foreground">{layout}</span>
          <ListRowGroup aria-label={`${layout} layout`}>
            <ListRow
              layout={layout}
              title="Schedule Mode"
              description="Pages change on their own"
              meta="Every 15 min"
              trailing={<ChevronRight />}
            />
          </ListRowGroup>
        </div>
      ))}
    </div>
  ),
};

/**
 * Large text: the root font size is 200%, standing in for the reader's
 * browser setting. Everything in the row is rem-based, including the `auto`
 * text column's 10rem flex-basis, so the meta wraps under the description
 * (Figma Layout=Stacked, 06 `368:24902`) while the same row at 100% keeps it
 * inline.
 */
export const LargeText: Story = {
  args: { title: "" },
  decorators: [
    (Story) => {
      useEffect(() => {
        const root = document.documentElement;
        const before = root.style.fontSize;
        root.style.fontSize = "200%";
        return () => {
          root.style.fontSize = before;
        };
      }, []);
      return <Story />;
    },
  ],
  // Storybook's centered padding is rem-based too, so this story pads in px.
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="p-[16px]">
      <ListRowGroup aria-label="Large text" className="w-full max-w-[400px]">
        <ListRow
          leading={tile(<Calendar />)}
          title="Schedule Mode"
          description="Pages change on their own"
          meta="On"
          trailing={<ChevronRight />}
        />
      </ListRowGroup>
    </div>
  ),
};

/** Card rows with an 8px gap, like the 07 Collection list. */
export const Separated: Story = {
  args: { title: "" },
  render: () => (
    <ListRowGroup variant="separated" aria-label="Pages" className="w-full sm:w-[480px]">
      {["Market open", "Morning commute", "Weather + surf"].map((name) => (
        <ListRow
          key={name}
          title={name}
          description="Kitchen board · Flagship"
          meta="10 min"
          trailing={
            <Button variant="ghost" size="icon" aria-label={`More actions for ${name}`}>
              <MoreHorizontal />
            </Button>
          }
        />
      ))}
    </ListRowGroup>
  ),
};

/** `size="touch"`: a 56px floor and 16px titles. */
export const Touch: Story = {
  args: { title: "" },
  render: () => (
    <ListRowGroup size="touch" aria-label="Displays" className="w-full sm:w-[400px]">
      <ListRow leading={tile(<Server />)} title="Kitchen board" description="Online" trailing={<ChevronRight />} />
      <ListRow
        leading={tile(<Server />)}
        title="Hallway"
        description="Last connected 2 h ago"
        trailing={<ChevronRight />}
      />
    </ListRowGroup>
  ),
};

/** A row that navigates: `render={<a href />}`. Hover and focus fill the whole row. */
export const AsLink: Story = {
  args: { title: "" },
  render: () => (
    <ListRowGroup aria-label="Displays" className="w-full sm:w-[400px]">
      <li>
        <ListRow
          // eslint-disable-next-line jsx-a11y/anchor-has-content -- ListRow supplies the content
          render={<a href="#kitchen" />}
          leading={tile(<Server />)}
          title="Kitchen board"
          description="fiestapi.local · Online"
          trailing={<ChevronRight />}
        />
      </li>
    </ListRowGroup>
  ),
};

/**
 * WEB-18: the row is a context-menu area (right-click, long press,
 * Shift+F10 or the Menu key), and the trailing button opens the same items
 * for everyone else.
 */
export const WithContextMenu: Story = {
  args: { title: "" },
  render: () => {
    const items = (
      <>
        <DropdownMenuItem>
          <Pencil />
          Rename
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy />
          Duplicate
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2 />
          Delete…
        </DropdownMenuItem>
      </>
    );
    return (
      <ListRowGroup variant="separated" aria-label="Pages" className="w-full sm:w-[480px]">
        {["Market open", "Morning commute"].map((name) => (
          <DropdownMenu key={name} trigger="context">
            <DropdownMenuTrigger asChild>
              <ListRow
                title={name}
                description="Kitchen board · Flagship"
                trailing={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" aria-label={`More actions for ${name}`}>
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">{items}</DropdownMenuContent>
                  </DropdownMenu>
                }
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent>{items}</DropdownMenuContent>
          </DropdownMenu>
        ))}
      </ListRowGroup>
    );
  },
};
