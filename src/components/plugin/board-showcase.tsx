"use client";

/**
 * Hero board preview for a plugin: one literal board at a time, a tab per
 * declared shape, and a black/white board-colour toggle.
 *
 * Presentational — the previews come from the plugin manifest (or the registry
 * seed) and every label is injected, so the FiestaBoard app can localize while
 * the docs site passes English.
 */

import { useState } from "react";

import {
  type BoardPreviewEntry,
  DEFAULT_SHAPE_LABELS,
  previewLabels,
  previewMessage,
  type PreviewShapeLabels,
} from "../../lib/board-previews";
import { cn } from "../../lib/utils";
import { StaticBoardDisplay } from "../board/static-board-display";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../containment/tabs";

export interface BoardShowcaseLabels extends PreviewShapeLabels {
  /** Accessible name for the shape tab list. */
  boardShape: string;
  /** Accessible name for the board-colour group. */
  boardColor: string;
  blackBoard: string;
  whiteBoard: string;
}

export const DEFAULT_SHOWCASE_LABELS: BoardShowcaseLabels = {
  ...DEFAULT_SHAPE_LABELS,
  boardShape: "Board shape",
  boardColor: "Board color",
  blackBoard: "Black Board",
  whiteBoard: "White Board",
};

export interface BoardShowcaseProps {
  /** Literal boards to show; the first is the default tab. */
  previews: BoardPreviewEntry[];
  /** Accessible description of the board, e.g. "Weather on a split-flap board". */
  previewLabel?: string;
  size?: "sm" | "md" | "lg";
  /** Controlled board colour. Leave unset to let the showcase own it. */
  boardType?: "black" | "white";
  defaultBoardType?: "black" | "white";
  onBoardTypeChange?: (boardType: "black" | "white") => void;
  labels?: Partial<BoardShowcaseLabels>;
  className?: string;
}

/**
 * Selected pills fill with `brand-emphasis`, not `brand`: in dark mode `brand`
 * is a light amber that fails AA against `brand-foreground` (white).
 */
const PILL_CLASS =
  "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors " +
  "data-[active]:border-brand-emphasis data-[active]:bg-brand-emphasis data-[active]:text-brand-foreground " +
  "data-[active]:font-semibold hover:border-brand hover:text-brand data-[active]:hover:text-brand-foreground";

export function BoardShowcase({
  previews,
  previewLabel,
  size = "md",
  boardType,
  defaultBoardType = "black",
  onBoardTypeChange,
  labels,
  className,
}: BoardShowcaseProps) {
  const l = { ...DEFAULT_SHOWCASE_LABELS, ...labels };
  const [uncontrolledBoardType, setUncontrolledBoardType] = useState<"black" | "white">(defaultBoardType);
  const activeBoardType = boardType ?? uncontrolledBoardType;

  function selectBoardType(next: "black" | "white") {
    if (boardType === undefined) setUncontrolledBoardType(next);
    onBoardTypeChange?.(next);
  }

  if (previews.length === 0) return null;

  const tabLabels = previewLabels(previews, l);

  return (
    <div data-slot="board-showcase" className={cn("flex flex-col items-center gap-4", className)}>
      <Tabs defaultValue={0} className="flex w-full flex-col items-center gap-4">
        {previews.length > 1 && (
          <TabsList aria-label={l.boardShape} className="h-auto gap-2 rounded-full bg-transparent p-0">
            {tabLabels.map((label, index) => (
              <TabsTrigger key={label} value={index} className={PILL_CLASS}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        )}

        {previews.map((preview, index) => (
          <TabsContent
            key={tabLabels[index]}
            value={index}
            className="mt-0 flex w-full justify-center overflow-x-auto rounded-xl bg-muted/40 px-4 py-6 shadow-card"
          >
            <StaticBoardDisplay
              message={previewMessage(preview)}
              size={size}
              boardType={activeBoardType}
              deviceType={preview.device_type ?? "flagship"}
              notesWide={preview.notes_wide ?? 1}
              notesTall={preview.notes_tall ?? 1}
              previewLabel={previewLabel}
            />
          </TabsContent>
        ))}
      </Tabs>

      <div role="group" aria-label={l.boardColor} className="flex">
        {(["black", "white"] as const).map((color) => {
          const active = activeBoardType === color;
          return (
            <button
              key={color}
              type="button"
              aria-pressed={active}
              onClick={() => selectBoardType(color)}
              className={cn(
                "border px-4 py-1.5 text-xs font-medium transition-colors",
                "first:rounded-l-full last:rounded-r-full [&:not(:last-child)]:border-r-0",
                "outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                active
                  ? "border-brand-emphasis bg-brand-emphasis font-semibold text-brand-foreground"
                  : "text-muted-foreground hover:border-brand hover:text-brand",
              )}
            >
              {color === "black" ? l.blackBoard : l.whiteBoard}
            </button>
          );
        })}
      </div>
    </div>
  );
}
