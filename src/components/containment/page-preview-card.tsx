"use client";

import { useRender } from "@base-ui/react/use-render";
import { Check, ChevronRight } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/* ------------------------------------------------------------------ *
 * PagePreviewCard — a page, shown as the board it draws.
 *
 * Figma: 08 C17 (`61:25808`); live component 03 "Page card" (`36:8196`),
 * used in the Change Page library sheet (`36:30293`) and the Pages grid.
 * "Choosing a page … should show the real board, not a name."
 *
 * NAME. Figma and the plan call it "Page card", but `PageCard` is already
 * this package's route-level content card (chrome/page-card.tsx), so this
 * ships as `PagePreviewCard` (DD-W row, Jev decision 2026-11-11).
 *
 * THE BOARD IS NEVER SCALED (owner rule 9). The caller passes a real
 * StaticBoardDisplay (Tile sm) / LedMatrixDisplay; this card centres it and
 * crops whatever does not fit the column, it never shrinks it.
 *
 * ONE TARGET. The whole card is the button (or, with `render`, the link) —
 * the same slot convention as ActionCard. The title alone is the name; the
 * subtitle is the description; the board is hidden from assistive tech
 * because its text is already the page and the title names it.
 * ------------------------------------------------------------------ */

export type PagePreviewCardProps = Omit<React.ComponentProps<"button">, "title"> & {
  /** The page's name — and the card's accessible name. */
  title: React.ReactNode;
  /** Secondary line, e.g. "Last shown yesterday, 6:30 PM". Announced as the description. */
  description?: React.ReactNode;
  /** The page's board at actual size — a StaticBoardDisplay `size="sm"`, an LED preview. */
  board?: React.ReactNode;
  /**
   * The page is the current choice (what is showing, what is picked). Swaps
   * the chevron for the filled check and draws the selected ring and tint —
   * the same selected language as ChoiceCard. Sets `aria-current="true"`.
   */
  selected?: boolean;
  /**
   * Trailing glyph. Defaults to a chevron (or the check when `selected`);
   * `null` removes it.
   */
  trailing?: React.ReactNode | null;
  /**
   * Render the caller's element instead of a `<button>` — pass `<a href>` or a
   * router Link for a card that navigates. The card supplies the content.
   */
  render?: React.ReactElement;
};

function PagePreviewCard({
  title,
  description,
  board,
  selected = false,
  trailing,
  render,
  className,
  disabled = false,
  onClick,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: PagePreviewCardProps) {
  const id = React.useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const trailingKind = trailing === null ? null : trailing !== undefined ? "custom" : selected ? "check" : "chevron";

  // An anchor has no `disabled`, so the link form guards activation itself.
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  const content = (
    <>
      {board != null && (
        <span
          data-slot="page-preview-card-board"
          aria-hidden="true"
          // Centred and clipped to the card's column: a narrow phone crops the
          // board's edges instead of shrinking its tiles.
          className="flex w-full justify-center overflow-hidden rounded-lg"
        >
          {board}
        </span>
      )}
      <span data-slot="page-preview-card-meta" className="flex w-full min-w-0 items-center gap-3 px-1">
        <span className="flex min-w-0 flex-1 flex-col">
          <span id={titleId} data-slot="page-preview-card-title" className="text-base font-medium text-foreground">
            {title}
          </span>
          {description != null && (
            <span
              id={descriptionId}
              data-slot="page-preview-card-description"
              className="text-sm text-muted-foreground"
            >
              {description}
            </span>
          )}
        </span>
        {trailingKind != null && (
          <span
            data-slot="page-preview-card-trailing"
            data-kind={trailingKind}
            aria-hidden="true"
            className={cn(
              "flex shrink-0 items-center justify-center",
              trailingKind === "chevron" && "text-muted-foreground [&>svg]:size-4",
              trailingKind === "check" && "size-6 rounded-full bg-primary text-primary-foreground [&>svg]:size-3.5",
              trailingKind === "custom" && "text-muted-foreground",
            )}
          >
            {trailingKind === "chevron" ? (
              <ChevronRight />
            ) : trailingKind === "check" ? (
              <Check strokeWidth={3} />
            ) : (
              trailing
            )}
          </span>
        )}
      </span>
    </>
  );

  return useRender({
    defaultTagName: "button",
    ref: ref as React.Ref<HTMLButtonElement>,
    render,
    props: {
      "data-slot": "page-preview-card",
      ...(selected ? { "data-selected": "", "aria-current": "true" as const } : {}),
      ...(disabled ? { "data-disabled": "" } : {}),
      className: cn(
        // 03 36:7418: board, then the meta row; py 8, gap 8. No surface of its
        // own — the board is the card — so hover and selection paint a
        // rounded ground behind both, with the 8px above and below.
        "group/page-preview-card flex w-full cursor-pointer flex-col items-stretch gap-2 rounded-xl py-2 text-left",
        "text-foreground no-underline hover:no-underline",
        "transition-[background-color,box-shadow] duration-control",
        "focus-ring",
        "not-data-[selected]:hover:bg-accent/50",
        "data-[selected]:bg-tint-selected data-[selected]:ring-2 data-[selected]:ring-primary",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      ),
      children: content,
      ...(render ? {} : { disabled }),
      ...props,
      "aria-label": ariaLabel,
      "aria-labelledby": ariaLabelledBy ?? (ariaLabel == null ? titleId : undefined),
      "aria-describedby": ariaDescribedBy ?? (description != null ? descriptionId : undefined),
      ...(disabled && render ? { "aria-disabled": true } : {}),
      onClick: handleClick,
    },
  });
}

export { PagePreviewCard };
