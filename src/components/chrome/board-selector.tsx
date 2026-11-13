"use client";

import { Globe, Wifi, WifiOff } from "lucide-react";
import { memo, useId, useMemo } from "react";

import { cn } from "../../lib/utils";
import { StatusDot } from "../feedback/status-dot";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../forms/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "../overlays/tooltip";
import { BoardIcon } from "./board-icon";

export interface BoardOption {
  id: string;
  name?: string;
  /**
   * Per-board health, surfaced as a small destructive dot beside the name —
   * and in the trigger while this board is the selected one. Presentational
   * only: the wiring side decides what "error" means (a board whose client
   * failed to initialize, say) and supplies the words for it as
   * `BoardSelectorLabels.boardError`, which the option and the trigger are
   * then DESCRIBED by (`aria-describedby`). Omit for a healthy board.
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
   * What `status: "error"` means, in words — e.g. "Unavailable". Rendered
   * once as an sr-only description that every errored option, and the
   * trigger while an errored board is selected, points at with
   * `aria-describedby`; the dot itself stays decorative. That is what keeps
   * the state off colour alone (WCAG 1.4.1) without folding the word into
   * the option's NAME, so "Kitchen" is still announced as "Kitchen", then
   * described. Only consulted when at least one board sets `status`, but
   * provide it whenever you do: without it the dot is the only signal.
   */
  boardError?: string;
  /**
   * The words for each hub state (slice 1.4c), e.g. `{ online: "Online",
   * remote: "Remote", unreachable: "Can't reach" }`. The state's dot (or, on
   * the collapsed rail, its glyph) is drawn only beside these words: a state
   * with no words gets no indicator at all, so colour is never the only
   * signal (WCAG 1.4.1).
   */
  hubStatus?: Partial<Record<BoardSelectorHubStatus, string>>;
}

/**
 * How the app is reaching its hub (07a Display switcher `302:2146`):
 * - `online`: on the local network;
 * - `remote`: through a remote address;
 * - `unreachable`: not answering.
 */
export type BoardSelectorHubStatus = "online" | "remote" | "unreachable";

const HUB_DOT = { online: "success", remote: "info", unreachable: "danger" } as const;

// The collapsed rail has 48px: a 12px glyph under the trigger, whose SHAPE
// differs per state as well as its colour (07a S1).
const HUB_GLYPH = {
  online: { Icon: Wifi, className: "text-success" },
  remote: { Icon: Globe, className: "text-info" },
  unreachable: { Icon: WifiOff, className: "text-destructive" },
} as const;

interface BoardSelectorProps {
  boards: BoardOption[];
  value: string;
  onChange: (id: string) => void;
  labels: BoardSelectorLabels;
  collapsed?: boolean;
  variant?: "sidebar" | "mobileHeader";
  /**
   * The hub this app is talking to, e.g. "fiestapi.local" (slice 1.4c). Shown
   * on a hub line under the trigger, or as the pill's second line in the
   * mobile header. Omit, with `status`, to render exactly as before.
   */
  host?: string;
  /**
   * Whether the hub is reachable, and how. Rendered as words from
   * `labels.hubStatus` plus a StatusDot (a glyph on the collapsed rail).
   */
  status?: BoardSelectorHubStatus;
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
  host,
  status,
}: BoardSelectorProps) {
  // ONE description element for every errored board, rendered outside the
  // option list and referenced by id. It cannot live inside the option: the
  // Select mirrors each item's children into the trigger, so an id in there
  // would be in the document twice, and any text in there — even sr-only —
  // becomes part of the option's accessible NAME ("Kitchen Unavailable").
  // A description referenced from outside is announced after the name, once.
  const statusDescriptionId = useId();
  const describedBy =
    labels.boardError && boards.some((board) => board.status === "error") ? statusDescriptionId : undefined;
  const selectedBoard = boards.find((board) => board.id === value);

  // Hub identity. The state only counts when the app gave it words: no words,
  // no dot — so the colour can never be the whole message.
  const hubId = useId();
  const statusText = status ? labels.hubStatus?.[status] : undefined;
  const hubStatus = statusText ? status : undefined;
  const mobile = variant === "mobileHeader";
  const railCollapsed = variant === "sidebar" && collapsed;
  // 07a: the sidebar reads "host · State"; the mobile pill leads with the
  // state, because its host is the part that truncates.
  const hubParts = mobile ? [statusText, host] : [host, statusText];
  const hubText = hubParts.filter(Boolean).join(" · ");
  const hasHub = hubText !== "";
  const triggerDescribedBy =
    [selectedBoard?.status === "error" ? describedBy : undefined, hasHub ? hubId : undefined]
      .filter(Boolean)
      .join(" ") || undefined;
  const mobileHub = mobile && hasHub;

  // Boards change rarely while the shell re-renders often; memoize the option
  // list so those re-renders reuse the same element refs (React can then skip
  // re-rendering the items) instead of rebuilding one SelectItem per board.
  const items = useMemo(
    () =>
      boards.map((board) => {
        const name = board.name || labels.unnamedBoard;
        const errored = board.status === "error";
        return (
          <SelectItem key={board.id} value={board.id} aria-describedby={errored ? describedBy : undefined}>
            {errored ? (
              // The dot is DECORATIVE (StatusDot's default, aria-hidden): the
              // meaning is carried by the description above, so the colour is
              // never the only signal and the name stays the board name.
              <span className="flex min-w-0 items-center gap-2">
                <span className="min-w-0 flex-1 truncate">{name}</span>
                <StatusDot status="danger" size="sm" />
              </span>
            ) : (
              // Plain string keeps the common, healthy path identical to before.
              name
            )}
          </SelectItem>
        );
      }),
    [boards, labels.unnamedBoard, describedBy],
  );

  const trigger = (
    <SelectTrigger
      aria-label={labels.boardSelector}
      aria-describedby={triggerDescribedBy}
      className={cn(
        "gap-2 border-sidebar-border/70 bg-sidebar-accent/40 font-medium text-sidebar-foreground shadow-none transition-[width,padding] duration-fast hover:bg-sidebar-accent/70",
        // Below 480px no board name fits beside the full wordmark, so the
        // trigger compacts to icon + caret and the header keeps one row.
        mobile && !mobileHub && "h-9 w-auto min-w-0 max-w-[170px] px-2.5 max-[479px]:gap-1 max-[479px]:px-2",
        // With a hub line the mobile trigger is the 07a two-line pill: the
        // display on top, the hub state under it. It keeps its words at every
        // width (the hub line IS the point), so there is no icon-only form.
        mobileHub && "h-11 w-auto min-w-0 max-w-[187px] rounded-full pl-[13px] pr-3",
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
            : // Expanded: a nav pill's geometry, so the board icon sits on
              // the icon column and the board name on the label column.
              // A pill pads 14px to its icon; the trigger draws a 1px border
              // inside that box, so 13px of padding lands the icon on the
              // same x. gap-3 matches the pill's icon-to-label gap (the
              // default gap-2 put the name 5px left of the labels below).
              // h-9 (36px) is the pill height too, and the collapsed
              // trigger's — so the hairline under the header no longer
              // moves 4px when the rail collapses.
              "h-9 w-full gap-3 pl-[13px]"),
      )}
    >
      {mobileHub ? (
        // flex! — the base SelectTrigger's [&>span]:line-clamp-1 sets
        // display: -webkit-box with higher specificity, which would fold the
        // two lines into one.
        <span className="flex! min-w-0 flex-1 flex-col text-left">
          <span className="truncate text-sm font-semibold">
            <SelectValue placeholder={labels.selectBoard} />
          </span>
          <span
            data-slot="board-selector-hub"
            aria-hidden="true"
            className="flex min-w-0 items-center gap-[5px] text-xs font-normal text-muted-foreground"
          >
            {hubStatus && <StatusDot status={HUB_DOT[hubStatus]} size="sm" />}
            <span className="min-w-0 truncate">{hubText}</span>
          </span>
        </span>
      ) : (
        <>
          <BoardIcon className="h-5 w-5 flex-shrink-0 text-sidebar-foreground/70" />
          <span
            className={cn(
              "min-w-0 flex-1 overflow-hidden whitespace-nowrap text-left transition-opacity duration-fast",
              railCollapsed ? "max-w-0 opacity-0" : "max-w-48 opacity-100 delay-150",
              // hidden! — the base SelectTrigger's [&>span]:line-clamp-1 also
              // sets display with higher specificity, so plain hidden loses.
              mobile && "max-[479px]:hidden!",
            )}
          >
            <SelectValue placeholder={labels.selectBoard} />
          </span>
        </>
      )}
    </SelectTrigger>
  );

  // The hub line in words, once, for assistive tech: the trigger is named by
  // its aria-label, so nothing visible inside or beside it is announced
  // unless the trigger is DESCRIBED by it. The visible lines are aria-hidden
  // so a browse-mode reader does not meet the same words twice.
  const hubDescription = hasHub ? (
    <span id={hubId} className="sr-only">
      {hubText}
    </span>
  ) : null;

  // Below the trigger: the sidebar's hub line (dot, then "host · State"), or
  // the collapsed rail's single glyph.
  let hubBelow: React.ReactNode = null;
  if (railCollapsed && hubStatus) {
    const { Icon, className } = HUB_GLYPH[hubStatus];
    hubBelow = (
      <span data-slot="board-selector-hub" aria-hidden="true" className="flex h-3.5 items-center justify-center">
        <Icon data-slot="board-selector-hub-glyph" data-status={hubStatus} className={cn("size-3", className)} />
      </span>
    );
  } else if (!railCollapsed && !mobile && hasHub) {
    hubBelow = (
      <span
        data-slot="board-selector-hub"
        aria-hidden="true"
        className="flex h-5 min-w-0 items-center gap-1.5 ps-3 text-xs text-muted-foreground"
      >
        {hubStatus && <StatusDot status={HUB_DOT[hubStatus]} />}
        <span className="min-w-0 truncate">{hubText}</span>
      </span>
    );
  }

  const select = (
    <Select value={value} onValueChange={onChange}>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{trigger}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {selectedBoard?.name || labels.unnamedBoard}
            {hasHub && <span className="block text-xs font-normal opacity-80">{hubText}</span>}
          </TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      {describedBy ? (
        <span id={describedBy} className="sr-only">
          {labels.boardError}
        </span>
      ) : null}
      {hubDescription}
      <SelectContent>{items}</SelectContent>
    </Select>
  );

  // No hub below the trigger: the DOM is exactly what it was before 1.4c.
  if (!hubBelow) return select;
  return (
    <div data-slot="board-selector-stack" className="flex min-w-0 flex-col gap-1">
      {select}
      {hubBelow}
    </div>
  );
});
