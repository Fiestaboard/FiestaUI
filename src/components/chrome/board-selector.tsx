"use client";

import { cn } from "../../lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { BoardIcon } from "./board-icon";

export interface BoardOption {
  id: string;
  name?: string;
}

export interface BoardSelectorLabels {
  /** aria-label for the trigger, e.g. "Select board". */
  boardSelector: string;
  /** Placeholder when nothing selected, e.g. "Select a board". */
  selectBoard: string;
  /** Fallback display name for unnamed boards. */
  unnamedBoard: string;
}

interface BoardSelectorProps {
  boards: BoardOption[];
  value: string;
  onChange: (id: string) => void;
  labels: BoardSelectorLabels;
  collapsed?: boolean;
  variant?: "sidebar" | "mobileHeader";
}

/**
 * Board picker — the app-wide context switcher, presentational half.
 * FiestaBoard wires it to its current-board context and renders it only
 * for multi-board installs. Sits at the TOP of the sidebar menu because it
 * scopes everything below it — the same slot workspace switchers occupy in
 * multi-tenant apps. Collapsed, it shrinks to an icon-only trigger with a
 * tooltip showing the current board name.
 */
export function BoardSelector({
  boards,
  value,
  onChange,
  labels,
  collapsed = false,
  variant = "sidebar",
}: BoardSelectorProps) {
  const current = boards.find((b) => b.id === value);
  const currentName = current?.name || labels.unnamedBoard;

  const trigger = (
    <SelectTrigger
      aria-label={labels.boardSelector}
      className={cn(
        "gap-2 border-sidebar-border/70 bg-sidebar-accent/40 font-medium text-sidebar-foreground shadow-none transition-[width,padding] duration-100 hover:bg-sidebar-accent/70",
        variant === "mobileHeader" && "h-9 w-auto min-w-0 max-w-[170px] px-2.5",
        variant === "sidebar" &&
          (collapsed
            ? // Collapsed: full-width like the nav pills so the icon lands on
              // the rail's center line (a fixed w-9 square sat 6px off it).
              // gap-0: the zero-width label span stays in the flex row for
              // the expand transition but must not claim gaps. The chevron
              // hides via span:last-child — SelectPrimitive.Icon wraps
              // ChevronDown in a span, so an svg selector never matched it;
              // it only *looked* hidden because gaps flex-squished it to 0.
              "h-9 w-full justify-center gap-0 px-0 [&>span:last-child]:hidden"
            : "h-10 w-full"),
      )}
    >
      <BoardIcon className="h-5 w-5 flex-shrink-0 text-sidebar-foreground/70" />
      <span
        className={cn(
          "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left transition-opacity duration-100",
          variant === "sidebar" && collapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100 delay-150",
        )}
      >
        <SelectValue placeholder={labels.selectBoard} />
      </span>
    </SelectTrigger>
  );

  return (
    <Select value={value} onValueChange={onChange}>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {currentName}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <SelectContent>
        {boards.map((board) => (
          <SelectItem key={board.id} value={board.id}>
            {board.name || labels.unnamedBoard}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
