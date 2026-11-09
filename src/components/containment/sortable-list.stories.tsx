import type { Meta, StoryObj } from "@storybook/react";
import { ArrowDown, ArrowUp, MoreHorizontal } from "lucide-react";
import { useState } from "react";

import { Button } from "../forms/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../overlays/dropdown-menu";
import { ListRow } from "./list-row";
import {
  arrayMove,
  SortableList,
  SortableListHandle,
  SortableListMoveButtons,
  type SortableListProps,
  useSortableItem,
} from "./sortable-list";

/*
 * SortableList (slice 1.8b, P7, WEB-06). Figma: 08 `61:53985` (the
 * candidate), 07 `57:66920` (Safari touch reorder), 07c §5 `312:74863`
 * (desktop keyboard reorder).
 *
 * The Lifted and Dragging stories reach their state in `play`, the same
 * keys and pointer events a reader uses, so the shots show the real
 * component rather than a mock-up of it.
 */

interface Page {
  id: string;
  name: string;
  duration: string;
}

const PAGES: Page[] = [
  { id: "commute", name: "Morning commute", duration: "15 min" },
  { id: "market", name: "Market open", duration: "10 min" },
  { id: "weather", name: "Weather + surf", duration: "10 min" },
  { id: "maya", name: "Good morning, Maya", duration: "5 min" },
];

function Position() {
  const item = useSortableItem();
  return (
    <span className="w-3 text-center text-xs font-medium text-muted-foreground tabular-nums">{item.index + 1}</span>
  );
}

/** The 07 mobile row menu: Move up / Move down live in "More actions". */
function RowMenu({ name }: { name: string }) {
  const item = useSortableItem();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`More actions for ${name}`}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={!item.canMoveUp} onClick={item.moveUp}>
          <ArrowUp />
          {item.labels.moveUp}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!item.canMoveDown} onClick={item.moveDown}>
          <ArrowDown />
          {item.labels.moveDown}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type DemoProps = Partial<Omit<SortableListProps<Page>, "items" | "renderItem">> & { variant?: "desktop" | "touch" };

function Demo({ variant = "desktop", ...props }: DemoProps) {
  const [pages, setPages] = useState(PAGES);
  return (
    <div className={variant === "desktop" ? "w-full sm:w-[640px]" : "w-full sm:w-[358px]"}>
      <SortableList
        aria-label="Pages in Weekday mornings"
        items={pages}
        getKey={(page) => page.id}
        getLabel={(page) => page.name}
        onMove={(from, to) => setPages((prev) => arrayMove(prev, from, to))}
        size={variant === "touch" ? "touch" : "default"}
        renderItem={(page) =>
          variant === "desktop" ? (
            <ListRow
              variant="card"
              className="pl-1"
              leading={
                <span className="flex items-center gap-2">
                  <SortableListHandle />
                  <Position />
                </span>
              }
              title={page.name}
              description="Kitchen board · Flagship"
              meta={page.duration}
              trailing={<SortableListMoveButtons />}
            />
          ) : (
            <ListRow
              variant="card"
              size="touch"
              className="px-1"
              leading={<SortableListHandle />}
              title={page.name}
              description={`Flagship · ${page.duration}`}
              trailing={<RowMenu name={page.name} />}
            />
          )
        }
        {...props}
      />
    </div>
  );
}

const meta = {
  title: "Containment/SortableList",
  component: Demo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "inline-radio",
      options: ["desktop", "touch"],
      description: "Story only: the 07c desktop row or the 07 touch row.",
    },
    disabled: { control: "boolean" },
    hideStatus: { control: "boolean", description: "Keep the status line for screen readers only." },
  },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 07c desktop: handle, position, Page Duration; Move up / Move down on the focused row. */
export const Default: Story = {
  args: { variant: "desktop" },
};

/** 07 touch: 44px handles, Move up / Move down in the row's "More actions" menu. */
export const Touch: Story = {
  args: { variant: "touch" },
};

/** Space lifted "Market open": amber outline, accent fill, the move buttons and the status line. */
export const Lifted: Story = {
  args: { variant: "desktop" },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelectorAll<HTMLElement>('[data-slot="sortable-list-item"]')[1];
    row.focus();
    row.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
  },
};

/** Mid-drag: the row follows the pointer and the line marks where it will land. */
export const Dragging: Story = {
  args: { variant: "touch" },
  play: async ({ canvasElement }) => {
    const handle = canvasElement.querySelectorAll<HTMLElement>('[data-slot="sortable-list-handle"]')[0];
    const rect = handle.getBoundingClientRect();
    const y = rect.top + rect.height / 2;
    const init = { bubbles: true, cancelable: true, pointerId: 1, button: 0, isPrimary: true, clientX: rect.left };
    handle.dispatchEvent(new PointerEvent("pointerdown", { ...init, clientY: y }));
    // One row plus the gap down, so the card rests in the slot it opened (07 `57:66920`).
    handle.dispatchEvent(new PointerEvent("pointermove", { ...init, clientY: y + 76 }));
  },
};

export const Disabled: Story = {
  args: { variant: "desktop", disabled: true },
};
