import type { Meta, StoryObj } from "@storybook/react";
import { Pencil, RefreshCw, Wifi } from "lucide-react";

import { Badge } from "./badge";
import { Button } from "./button";
import { Flex } from "./flex";

const box = "rounded-md bg-muted px-4 py-2 text-sm text-foreground";

const meta = {
  title: "UI/Flex",
  component: Flex,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    direction: {
      control: "select",
      options: ["row", "col"],
      description: "Main axis: row (default) or column",
    },
    align: {
      control: "select",
      options: ["start", "center", "end", "baseline", "stretch"],
      description: "Cross-axis alignment (items-*)",
    },
    justify: {
      control: "select",
      options: ["start", "center", "end", "between"],
      description: "Main-axis distribution (justify-*)",
    },
    gap: {
      control: "select",
      options: ["0", "0.5", "1", "1.5", "2", "2.5", "3", "4", "5", "6", "8", "12"],
      description: "Gap between children (Tailwind spacing scale)",
    },
    wrap: {
      control: "boolean",
      description: "Allow children to wrap onto multiple lines",
    },
    inline: {
      control: "boolean",
      description: "Render as inline-flex instead of flex",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
    children: {
      control: false,
      description: "Flex children",
    },
  },
} satisfies Meta<typeof Flex>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  args: {
    direction: "row",
    align: "center",
    gap: "2",
    children: (
      <>
        <div className={box}>One</div>
        <div className={box}>Two</div>
        <div className={box}>Three</div>
      </>
    ),
  },
};

/** Recreates the app's most common header pattern: `flex items-center justify-between`. */
export const ToolbarRow = () => (
  <Flex align="center" justify="between" className="w-[420px] rounded-md border px-4 py-3">
    <span className="text-sm font-medium">Kitchen board</span>
    <Flex align="center" gap="2">
      <Button variant="outline" size="sm">
        <Pencil aria-hidden="true" />
        Edit
      </Button>
      <Button variant="outline" size="sm">
        <RefreshCw aria-hidden="true" />
        Refresh
      </Button>
    </Flex>
  </Flex>
);

/** Recreates `flex items-center gap-2` — icon + label + status rows. */
export const InlineIconRow = () => (
  <Flex align="center" gap="2">
    <Wifi aria-hidden="true" className="size-4 text-muted-foreground" />
    <span className="text-sm font-medium">Guest network</span>
    <Badge variant="success">connected</Badge>
  </Flex>
);

/** Recreates wrapping tag rows: `flex flex-wrap gap-2`. */
export const WrappingRow = () => (
  <Flex wrap gap="2" className="w-[320px]">
    <Badge variant="variable">{"{weather.temp}"}</Badge>
    <Badge variant="variable">{"{weather.condition}"}</Badge>
    <Badge variant="variable">{"{muni.next_arrival}"}</Badge>
    <Badge variant="variable">{"{stocks.price}"}</Badge>
    <Badge variant="formula">{"{=round(temp)}"}</Badge>
    <Badge variant="variable">{"{date_time.short}"}</Badge>
  </Flex>
);

/**
 * Full centering (`items-center justify-center`) — the reason no separate
 * VAlign/HAlign components are needed: `align` centers on the cross axis,
 * `justify` on the main axis.
 */
export const Centered = () => (
  <Flex align="center" justify="center" className="h-40 w-[420px] rounded-md border border-dashed">
    <div className={box}>Centered both ways</div>
  </Flex>
);

export const ColumnDirection = () => (
  <Flex direction="col" gap="3" className="w-[240px]">
    <div className={box}>First</div>
    <div className={box}>Second</div>
    <div className={box}>Third</div>
  </Flex>
);
