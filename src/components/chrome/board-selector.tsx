"use client";

import { memo, useMemo } from "react";

import { cn } from "../../lib/utils";
import { StatusDot } from "../feedback/status-dot";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../forms/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../overlays/tooltip";
import { BoardIcon } from "./board-icon";

export interface BoardOption {
  id: string;
  name?: string;
  /**
   * Per-board health, surfaced as a small status dot beside the name (and in
   * the trigger when this board is the selected one). Presentational only —
   * the wiring side decides what "error" means (e.g. a board whose client
   * failed to initialize) and passes the accessible text via
   * `BoardSelectorLabels.boardError`. Omit for a healthy board.
   */
  status?: "error";
}

export interface BoardSelectorLabels {
  /** aria-label for the trigger, e.g. "Select board". */
  boardSelector: string;
  /** Placeholder when nothing selected, e.g. "Select a board". */
  selectBoard: string;
  /** Fallback display name for unnamed boards. */
  unnamedBoard: string;
  /**
   * Accessible text for the `status: "error"` dot, e.g. "Unavailable". Read to
   * assistive tech so the state is not carried by colour alone (WCAG 1.4.1).
   * Only consulted when at least one board sets `status`; provide it whenever
   * you do.
   */
  boardError?: string;
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
export const BoardSelector = memo(function BoardSelector({
  boards,
  value,
  onChange,
  labels,
  collapsed = false,
  variant = "sidebar",
}: BoardSelectorProps) {
  // Boards change rarely while the shell re-renders often; memoize the option
  // list so those re-renders reuse the same element refs (React can then skip
  // re-rendering the items) instead of rebuilding one SelectItem per board.
  const items = useMemo(
    () =>
      boards.map((board) => {
        const name = board.name || labels.unnamedBoard;
        return (
          <SelectItem key={board.id} value={board.id}>
            {board.status === "error" ? (
              // The dot is DECORATIVE beside its label — the state's meaning is
              // the caller's `boardError` string, given to StatusDot so the
              // colour is never the only signal. `role="img"` (not the default
              // live region) because a board list is static, not a status feed.
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <StatusDot status="danger" size="sm" role="img" label={labels.boardError} />
              </span>
            ) : (
              // Plain string keeps the common, healthy path identical to before.
              name
            )}
          </SelectItem>
        );
      }),
    [boards, labels.unnamedBoard, labels.boardError],
  );

  const trigger = (
    <SelectTrigger
      aria-label={labels.boardSelector}
      className={cn(
        "gap-2 border-sidebar-border/70 bg-sidebar-accent/40 font-medium text-sidebar-foreground shadow-none transition-[width,padding] duration-fast hover:bg-sidebar-accent/70",
        // Below 480px no board name fits beside the full wordmark, so the
        // trigger compacts to icon + caret and the header keeps one row.
        variant === "mobileHeader" && "h-9 w-auto min-w-0 max-w-[170px] px-2.5 max-[479px]:gap-1 max-[479px]:px-2",
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
          "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left transition-opacity duration-fast",
          variant === "sidebar" && collapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100 delay-150",
          // hidden! — the base SelectTrigger's [&>span]:line-clamp-1 also
          // sets display with higher specificity, so plain hidden loses.
          variant === "mobileHeader" && "max-[479px]:hidden!",
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
            {boards.find((b) => b.id === value)?.name || labels.unnamedBoard}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      <SelectContent>{items}</SelectContent>
    </Select>
  );
});
