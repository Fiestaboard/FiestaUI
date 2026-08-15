"use client";

/**
 * Directory card for a plugin: name, category, description, author, and a
 * split-flap teaser strip showing what the plugin actually puts on a board.
 *
 * Presentational — routing and localization stay with the consumer. The
 * primary link is supplied through `renderLink` because the two consumers use
 * different routers (Docusaurus `Link`, the app's `smart-link`); the card
 * stretches it over the whole surface so the `action` slot can hold a button
 * without nesting one interactive element inside another.
 */

import type { CSSProperties, ReactNode } from "react";

import { cn } from "../../lib/utils";
import { Heading } from "../typography/heading";
import { Text } from "../typography/text";
import { PluginCategoryBadge } from "./plugin-category-badge";
import { ScaledBoardTeaser } from "./scaled-board-teaser";

/** Applied to the element `renderLink` returns; stretches it over the card. */
const STRETCHED_LINK_CLASS =
  "after:absolute after:inset-0 after:rounded-xl after:content-[''] " +
  "outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50 " +
  "text-foreground no-underline hover:no-underline hover:text-foreground";

export interface PluginCardProps {
  name: string;
  description?: ReactNode;
  /**
   * Pre-formatted attribution, e.g. `"by FiestaBoard Team"` — the wording is a
   * localized string, so the consumer builds it.
   */
  authorLabel?: ReactNode;
  /** Manifest category id, e.g. `"weather"`. Omit to hide the badge. */
  category?: string;
  /** Localized category name. */
  categoryLabel?: string;
  /** Literal board line, at most 15 tiles. Omit to hide the teaser footer. */
  teaser?: string;
  boardType?: "black" | "white";
  /**
   * Renders the card's primary link. Receives the class that stretches it over
   * the card, and the card title as children.
   */
  renderLink: (props: { className: string; children: ReactNode }) => ReactNode;
  /** Trailing action, e.g. an Install button. Rendered above the stretched link. */
  action?: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function PluginCard({
  name,
  description,
  authorLabel,
  category,
  categoryLabel,
  teaser,
  boardType = "black",
  renderLink,
  action,
  className,
  style,
}: PluginCardProps) {
  return (
    <div
      data-slot="plugin-card"
      style={style}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground",
        "shadow-card transition-[transform,box-shadow] duration-base hover:-translate-y-1 hover:shadow-lg",
        "motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Heading level={3} className="min-w-0 text-base">
            {renderLink({ className: STRETCHED_LINK_CLASS, children: name })}
          </Heading>
          {category && <PluginCategoryBadge category={category} label={categoryLabel} className="ml-auto" />}
        </div>

        {description && (
          <Text tone="muted" size="sm" className="line-clamp-3 flex-1 leading-relaxed">
            {description}
          </Text>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {authorLabel ? (
            <Text as="span" tone="muted" size="xs" className="truncate">
              {authorLabel}
            </Text>
          ) : (
            <span />
          )}
          {action && <div className="relative z-10 shrink-0">{action}</div>}
        </div>
      </div>

      {teaser && (
        <div className="border-t bg-muted/30 px-3 py-4">
          <ScaledBoardTeaser teaser={teaser} boardType={boardType} />
        </div>
      )}
    </div>
  );
}
