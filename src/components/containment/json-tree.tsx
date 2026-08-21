"use client";

import { Check, ChevronDown, ChevronRight, Copy } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Colour is a REDUNDANT channel here, never the only one: strings render
 * inside quotes, numbers as bare digits, booleans as the words `true`/`false`
 * and nullish as an italic `null`. That's why `number` and `boolean` share the
 * amber token instead of being forced onto two near-identical hues — the token
 * set has no sixth distinct, semantically honest hue, and inventing one would
 * buy nothing a colour-blind reader could use anyway.
 */
const VALUE_TONE = {
  string: "text-success",
  // --hue-yellow: the ink-plateau form of the same hue. --warning is a fill
  // colour and fails AA as text — see typography/text.tsx.
  number: "text-hue-yellow",
  boolean: "text-hue-yellow",
  nullish: "text-muted-foreground italic",
  other: "text-foreground",
} as const;

/** Object keys keep the source's blue; array indices keep its purple. */
const KEY_TONE = "text-info";
const INDEX_TONE = "text-tag-variable-foreground";

const TOGGLE_CLASS =
  "-ml-1 flex w-full items-center gap-1 rounded-sm px-1 py-0.5 text-left text-xs text-muted-foreground transition-colors duration-control hover:bg-muted/60 focus-ring";

// opacity-0 alone would hide the select affordance from sighted keyboard
// users, who can reach the button by Tab but would never see it move — hence
// the focus-visible escape hatch alongside the hover reveal.
const SELECT_BUTTON_CLASS =
  "shrink-0 rounded-sm p-0.5 opacity-0 transition-opacity duration-control hover:bg-muted group-hover:opacity-100 focus-visible:opacity-100 focus-ring";

const SELECTED_RESET_MS = 1500;

function isBranch(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === "object" && value !== null;
}

function toneFor(value: unknown): string {
  if (value === null || value === undefined) return VALUE_TONE.nullish;
  switch (typeof value) {
    case "string":
      return VALUE_TONE.string;
    case "number":
    case "bigint":
      return VALUE_TONE.number;
    case "boolean":
      return VALUE_TONE.boolean;
    default:
      return VALUE_TONE.other;
  }
}

/** Renders a scalar the way JSON would: quoted strings, bare everything else. */
function formatScalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return `"${value}"`;
  return String(value);
}

export interface JsonTreeLabels {
  /**
   * Accessible name (and tooltip) for a leaf's select button.
   * Default: `` (path) => `Use path: ${path}` ``
   */
  selectPath?: (path: string) => string;
  /**
   * Accessible name for a branch's expand/collapse toggle — the visible
   * `{3}` / `[2]` summary is decorative and hidden from assistive tech.
   * Default: `` (path, count) => `${path} (${count} items)` ``
   */
  toggleNode?: (path: string, count: number) => string;
  /** Stands in for the path of the root node, which has none. Default: `"root"` */
  root?: string;
  /** Announced politely after a leaf is selected. Default: `"Path copied"` */
  selected?: string;
  /** Shown in place of children for an empty object or array. Default: `"empty"` */
  empty?: string;
}

export interface JsonTreeProps {
  /** Any JSON-shaped value. Objects and arrays branch; everything else is a leaf. */
  data: unknown;
  /**
   * Dot/bracket path of `data` itself, prefixed onto every child path.
   * Defaults to `""`, which makes children read `a.b[0]` rather than `.a.b[0]`.
   */
  path?: string;
  /**
   * Called with the dot/bracket path of the leaf the user picked and its
   * value. Omit for a read-only tree: the per-leaf select buttons disappear.
   */
  onSelect?: (path: string, value: unknown) => void;
  /** Expand this node on first render. Default: `false`. */
  defaultExpanded?: boolean;
  /**
   * Expand the first N levels on first render — `2` opens this node and its
   * direct branch children. Default: `0`.
   */
  defaultExpandedDepth?: number;
  labels?: JsonTreeLabels;
  className?: string;
}

/**
 * A collapsible JSON tree whose every leaf offers its own dot/bracket path.
 *
 * It knows nothing about plugins, settings, or where the data came from — it
 * renders a value and reports the path the user picked — so any surface that
 * needs "show me this response and let me point at part of it" can use it.
 *
 * Branches are nested WAI-ARIA **disclosures**, not a `role="tree"`: a correct
 * tree owes callers a roving tabindex and full arrow-key navigation across a
 * recursive component boundary, and a half-built one is worse than none — it
 * would strip Tab access from the nested select buttons while advertising an
 * interaction contract the widget doesn't honour. Disclosures are keyboard
 * complete out of the box (Tab to reach, Enter/Space to toggle); Arrow
 * Left/Right are wired up on top as the affordance tree users reach for.
 */
export const JsonTree = React.memo(function JsonTreeNode({
  data,
  path = "",
  onSelect,
  defaultExpanded = false,
  defaultExpandedDepth = 0,
  labels,
  className,
}: JsonTreeProps) {
  const {
    selectPath = (p: string) => `Use path: ${p}`,
    toggleNode = (p: string, count: number) => `${p} (${count} ${count === 1 ? "item" : "items"})`,
    root = "root",
    selected = "Path copied",
    empty = "empty",
  } = labels ?? {};

  const openByDepth = defaultExpandedDepth > 0;
  const [expanded, setExpanded] = React.useState(defaultExpanded || openByDepth);
  // Children mount lazily on first expand — a large payload should not pay to
  // render subtrees nobody has opened — but once mounted the panel STAYS
  // mounted so `aria-controls` always resolves to a real element.
  const [mounted, setMounted] = React.useState(defaultExpanded || openByDepth);
  const [selectedPath, setSelectedPath] = React.useState<string | null>(null);
  const panelId = React.useId();
  const resetTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    };
  }, []);

  function handleSelect(childPath: string, value: unknown) {
    onSelect?.(childPath, value);
    setSelectedPath(childPath);
    if (resetTimer.current !== null) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setSelectedPath(null), SELECTED_RESET_MS);
  }

  function toggle() {
    setExpanded((open) => !open);
    setMounted(true);
  }

  // Enter/Space are handled natively by the button; Left/Right mirror what
  // people trained on file trees expect, without moving focus.
  function handleToggleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowRight" && !expanded) {
      event.preventDefault();
      toggle();
    } else if (event.key === "ArrowLeft" && expanded) {
      event.preventDefault();
      setExpanded(false);
    }
  }

  if (!isBranch(data)) {
    return (
      <span data-slot="json-tree-value" className={cn("font-mono text-xs", toneFor(data), className)}>
        {formatScalar(data)}
      </span>
    );
  }

  const isArray = Array.isArray(data);
  const entries: Array<[string, unknown]> = isArray
    ? data.map((item, index) => [String(index), item])
    : Object.entries(data);
  const summary = isArray ? `[${entries.length}]` : `{${entries.length}}`;
  const childDepth = Math.max(0, defaultExpandedDepth - 1);

  return (
    <div data-slot="json-tree" className={cn("ml-1", className)}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={mounted ? panelId : undefined}
        onClick={toggle}
        onKeyDown={handleToggleKeyDown}
        className={TOGGLE_CLASS}
      >
        {expanded ? <ChevronDown className="size-3 shrink-0" /> : <ChevronRight className="size-3 shrink-0" />}
        <span aria-hidden="true" className="font-mono">
          {summary}
        </span>
        <span className="sr-only">{toggleNode(path || root, entries.length)}</span>
      </button>

      {/* Mounted with the panel, not with the selection, so the region exists
          in the a11y tree BEFORE its text changes — a live region inserted at
          the same moment as its content is silently dropped by most SRs. */}
      {mounted && (
        <span role="status" className="sr-only">
          {selectedPath === null ? "" : selected}
        </span>
      )}

      {mounted && (
        <ul
          id={panelId}
          hidden={!expanded}
          className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2 [&[hidden]]:hidden"
        >
          {entries.length === 0 && <li className="text-xs italic text-muted-foreground">{empty}</li>}
          {entries.map(([key, value]) => {
            const childPath = isArray ? `${path}[${key}]` : path ? `${path}.${key}` : key;
            const label = isArray ? `[${key}]:` : `${key}:`;
            return (
              <li key={key} className="flex items-start gap-1">
                <span className={cn("shrink-0 pt-0.5 font-mono text-xs font-medium", isArray ? INDEX_TONE : KEY_TONE)}>
                  {label}
                </span>
                {isBranch(value) ? (
                  <JsonTree
                    data={value}
                    path={childPath}
                    onSelect={onSelect}
                    defaultExpandedDepth={childDepth}
                    labels={labels}
                  />
                ) : (
                  <span className="group flex min-w-0 items-center gap-1">
                    <span className={cn("truncate font-mono text-xs", toneFor(value))}>{formatScalar(value)}</span>
                    {onSelect && (
                      <button
                        type="button"
                        onClick={() => handleSelect(childPath, value)}
                        aria-label={selectPath(childPath)}
                        title={selectPath(childPath)}
                        className={SELECT_BUTTON_CLASS}
                      >
                        {selectedPath === childPath ? (
                          <Check className="size-3 text-success" />
                        ) : (
                          <Copy className="size-3 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
});
