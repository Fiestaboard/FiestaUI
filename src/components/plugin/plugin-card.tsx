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

import { Check } from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useId, useRef } from "react";

import type { Code62Glyph } from "../../lib/board-characters";
import { cn } from "../../lib/utils";
import { IconTile } from "../containment/icon-tile";
import { Button } from "../forms/button";
import { Heading } from "../typography/heading";
import { Text } from "../typography/text";
import { PluginCategoryBadge } from "./plugin-category-badge";
import { ScaledBoardTeaser } from "./scaled-board-teaser";

/** Applied to the element `renderLink` returns; stretches it over the card. */
const STRETCHED_LINK_BASE_CLASS =
  "after:absolute after:inset-0 after:content-[''] " +
  "outline-none focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50 " +
  "text-foreground no-underline hover:no-underline hover:text-foreground";
/** The directory card's corners. */
const STRETCHED_LINK_CLASS = `${STRETCHED_LINK_BASE_CLASS} after:rounded-xl`;
/** The compact row is square-cornered inside its list; the focus ring follows. */
const STRETCHED_LINK_CLASS_COMPACT = `${STRETCHED_LINK_BASE_CLASS} after:rounded-none`;

/**
 * Where a plugin stands for this hub, in the compact (list) card — 08 C25
 * (`65:30673`) and the 06 Marketplace result row `42:89748`.
 */
export type PluginInstallState = "available" | "installing" | "installed" | "needs-setup" | "update";

/** English defaults for the install action; pass `installLabels` to localize. */
export const DEFAULT_PLUGIN_INSTALL_LABELS: Record<PluginInstallState, string> = {
  available: "Install",
  installing: "Installing…",
  installed: "Installed",
  "needs-setup": "Set up",
  update: "Update",
};

export interface PluginCardProps {
  /**
   * `"card"` (default) is the directory grid card with the teaser strip.
   * `"compact"` is the Marketplace result row (06 `42:89748`): a board icon
   * tile, name + category, author, an install action and the display types
   * the plugin works with. It has no surface of its own — put a run of them
   * in a Card. The Installed screen (06 `42:89411`) is ListRow territory,
   * not this variant.
   */
  variant?: "card" | "compact";
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
   * Which glyph the viewer's board draws for code 62 — a teaser carrying a
   * temperature is `°` on an older Flagship and `♥` on one built from 2026
   * (FiestaBoard#1666). Defaults to `"degree"`.
   */
  code62Glyph?: Code62Glyph;
  /**
   * Parse the extended markup — colour spans `{red:HOT}`, block spans and
   * `{icon:sun}` icons — on the board. Unset, the board's own default applies
   * (off until split-flap boards flip to the extended grammar in a major, on
   * after it); pass `false` to keep the literal parse through that flip.
   */
  extendedMarkup?: boolean;
  /**
   * Renders the card's primary link. Receives the class that stretches it over
   * the card, and the card title as children.
   */
  renderLink: (props: { className: string; children: ReactNode }) => ReactNode;
  /** Trailing action, e.g. an Install button. Rendered above the stretched link. In `compact` it replaces the install action. */
  action?: ReactNode;
  /** `compact` only. The plugin's glyph, drawn in a 40px board-black IconTile. */
  icon?: ReactNode;
  /**
   * `compact` only. Draws the install action for this state: Install,
   * Installing… (busy, keeps focus), Installed (a status, not a button),
   * Set up, Update. Omit for no action.
   */
  installState?: PluginInstallState;
  /** `compact` only. Fired with the state whose button was pressed. */
  onInstallAction?: (state: PluginInstallState) => void;
  /** `compact` only. Overrides any of {@link DEFAULT_PLUGIN_INSTALL_LABELS}. */
  installLabels?: Partial<Record<PluginInstallState, string>>;
  /**
   * `compact` only. The display types the plugin works with — a run of
   * DisplayTypeChips (slice 1.5c) under the text.
   */
  displayTypes?: ReactNode;
  /** `compact` only. Accessible name of the display-types group. @default "Works with" */
  displayTypesLabel?: string;
  /**
   * `compact` only. The polite announcement when the install state flips to
   * Installing… or Installed. @default (plugin, label) => `${plugin}: ${label}`
   */
  formatInstallAnnouncement?: (plugin: string, label: string) => string;
  className?: string;
  style?: CSSProperties;
}

export function PluginCard(props: PluginCardProps) {
  if (props.variant === "compact") return <CompactPluginCard {...props} />;
  return <DirectoryPluginCard {...props} />;
}

function DirectoryPluginCard({
  name,
  description,
  authorLabel,
  category,
  categoryLabel,
  teaser,
  boardType = "black",
  code62Glyph,
  extendedMarkup,
  renderLink,
  action,
  className,
  style,
}: PluginCardProps) {
  return (
    <div
      data-slot="plugin-card"
      data-variant="card"
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
          <ScaledBoardTeaser
            teaser={teaser}
            boardType={boardType}
            code62Glyph={code62Glyph}
            extendedMarkup={extendedMarkup}
          />
        </div>
      )}
    </div>
  );
}

/**
 * The 44px install action, or the Installed status. Button `size="touch"`
 * (#385) replaces the `h-11` once it is on alpha.
 */
function PluginInstallAction({
  state,
  labels,
  describedBy,
  onAction,
}: {
  state: PluginInstallState;
  labels: Record<PluginInstallState, string>;
  describedBy: string;
  onAction?: (state: PluginInstallState) => void;
}) {
  if (state === "installed") {
    return (
      <span
        data-slot="plugin-card-install"
        data-state={state}
        className="inline-flex h-11 items-center gap-1.5 px-2 text-sm font-medium text-muted-foreground"
      >
        <Check aria-hidden="true" className="size-4" />
        {labels.installed}
      </span>
    );
  }
  const installing = state === "installing";
  return (
    <Button
      data-slot="plugin-card-install"
      data-state={state}
      variant="outline"
      className="h-11 px-4"
      loading={installing}
      // Set in EVERY actionable state, not only while installing: Button
      // renders the busy copy (hidden when idle) whenever a loadingLabel is
      // set, so it is always as wide as the wider of "Install" and
      // "Installing…" and the row does not reflow when the state flips.
      loadingLabel={labels.installing}
      aria-describedby={describedBy}
      onClick={() => onAction?.(state)}
    >
      {installing ? labels.available : labels[state]}
    </Button>
  );
}

/**
 * 06 `42:89748` "Result · …": the MARKETPLACE result row. The 06 Installed
 * screen (`42:89411`: "Set up ›" / "Reconnect ›" brand text actions, a status
 * line plus a chevron, muted tiles) is a ListRow (#389) list built in web
 * slice 2.14, not this card (DD-W12).
 */
function CompactPluginCard({
  name,
  description,
  authorLabel,
  category,
  categoryLabel,
  renderLink,
  action,
  icon,
  installState,
  onInstallAction,
  installLabels,
  displayTypes,
  displayTypesLabel = "Works with",
  formatInstallAnnouncement = (plugin, label) => `${plugin}: ${label}`,
  className,
  style,
}: PluginCardProps) {
  const nameId = useId();
  const labels = { ...DEFAULT_PLUGIN_INSTALL_LABELS, ...installLabels };
  const slotRef = useRef<HTMLDivElement>(null);
  // Whether keyboard/pointer focus was last inside the action slot. A blur
  // with no relatedTarget (the focused button being REMOVED) leaves it set.
  const focusInSlot = useRef(false);
  const previousState = useRef(installState);

  // Installing… → Installed swaps the focused Button for a status, which drops
  // focus to <body>. Hand it to the next stable target: a button still in the
  // slot, else the plugin's name link.
  useEffect(() => {
    const previous = previousState.current;
    previousState.current = installState;
    if (previous === installState || !focusInSlot.current) return;
    const active = document.activeElement;
    if (active !== null && active !== document.body) return;
    const target =
      slotRef.current?.querySelector<HTMLElement>("button:not([disabled])") ??
      document.getElementById(nameId)?.querySelector<HTMLElement>("a[href], button");
    target?.focus();
  }, [installState, nameId]);

  const announcement =
    installState === "installing" || installState === "installed"
      ? formatInstallAnnouncement(name, labels[installState])
      : "";
  const trailing =
    action ??
    (installState ? (
      <PluginInstallAction state={installState} labels={labels} describedBy={nameId} onAction={onInstallAction} />
    ) : null);

  return (
    <div
      data-slot="plugin-card"
      data-variant="compact"
      data-install-state={installState}
      style={style}
      className={cn(
        "group relative flex flex-col text-card-foreground",
        "transition-colors duration-control hover:bg-accent/50",
        className,
      )}
    >
      <div className={cn("flex items-center gap-3 px-4 pt-3", displayTypes != null ? "pb-1.5" : "pb-3")}>
        {icon != null && (
          <IconTile size="md" tone="board">
            {icon}
          </IconTile>
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Heading id={nameId} level={3} className="min-w-0 text-base">
              {renderLink({ className: STRETCHED_LINK_CLASS_COMPACT, children: name })}
            </Heading>
            {category && <PluginCategoryBadge category={category} label={categoryLabel} />}
          </div>
          {authorLabel && (
            <Text as="span" tone="muted" size="sm" className="truncate">
              {authorLabel}
            </Text>
          )}
          {description && (
            <Text tone="muted" size="sm" className="line-clamp-2">
              {description}
            </Text>
          )}
        </div>
        {trailing != null && (
          <div
            ref={slotRef}
            className="relative z-10 shrink-0"
            onFocus={() => {
              focusInSlot.current = true;
            }}
            onBlur={(event) => {
              if (event.relatedTarget !== null)
                focusInSlot.current = slotRef.current?.contains(event.relatedTarget) ?? false;
            }}
          >
            {trailing}
          </div>
        )}
        {installState != null && action == null && (
          // Polite, and empty at mount so nothing is read on first render;
          // only the flips to Installing… and Installed are announced.
          <span role="status" data-slot="plugin-card-install-status" className="sr-only">
            {announcement}
          </span>
        )}
      </div>
      {displayTypes != null && (
        <div
          role="group"
          aria-label={displayTypesLabel}
          data-slot="plugin-card-display-types"
          // Inset to the text column: px-4 gutter + IconTile md (size-10) +
          // gap-3 = 4 + 10 + 3 = 17 spacing units (68px, 06).
          className={cn("flex flex-wrap gap-1.5 pr-4 pb-3.5", icon != null ? "pl-17" : "pl-4")}
        >
          {displayTypes}
        </div>
      )}
    </div>
  );
}
