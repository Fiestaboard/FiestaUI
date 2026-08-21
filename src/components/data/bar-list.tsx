import type * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Ranked horizontal bar list — label / track / fill / value rows. A thin
 * cousin of a meter, not a chart library: no axes, no legend, no scales,
 * just rows sorted by whoever calls it. Promoted from the docs site's
 * "Popularity ranking" (issue #229), which hand-mixed a brand fill on an
 * emphasis track once per page.
 *
 * This starts the `data` family: quantitative READOUTS (BarList, StatStrip).
 * They are not `feedback` (no system status), not `containment` (no
 * surface/box), not `typography` (the number is the point, not the prose) —
 * they exist to show measured values, which no existing family owns.
 *
 * FILL COLOR — measured, not inherited (SC 1.4.11 wants 3:1 for meaningful
 * graphics). The docs site used its brand orange; in this palette that forks
 * into two tokens and only one of them survives measurement:
 *
 *                          vs light bg  vs light muted  vs dark bg  vs dark muted
 *   --brand (hue-orange)      5.09:1        4.65:1        9.63:1       8.11:1
 *   --primary (#f5a623 tile)  1.83:1        1.67:1        9.77:1       8.23:1
 *
 * --primary is the literal tile and theme.css already rules it "legal as a
 * field, illegal as a link" at 1.83:1 on a light page — a fill whose painted
 * edge IS the datum is closer to a link than to a button face, so the tile
 * fails here. --brand is the same hue at the ink plateau and clears 3:1
 * against both the track and every surface in both themes, so a bar stays
 * meaningful even before the reader finds the number. Strictly the value
 * text makes the graphic redundant (see below) and 1.4.11 would exempt it,
 * but passing outright beats litigating the exemption.
 *
 * The TRACK is --muted (1.09:1 light / 1.19:1 dark vs the page) — that low
 * ratio is deliberate and mirrors the --border rationale in theme.css: the
 * track is decoration marking where 100% would land, the fill and the text
 * carry the information, so 1.4.11 does not apply to it.
 *
 * SEMANTICS — a plain list, no role="meter". Each row already renders its
 * value as literal text beside the bar, so assistive tech hears
 * "label, 943" with zero extra wiring; a meter role would announce the same
 * number a second time and demand aria-valuemin/max/now plumbing to say
 * nothing new. The track and fill are aria-hidden because they are that
 * redundant graphic. role="list" is set explicitly: `list-none` (needed
 * because rows are grid cells, not bullets) makes Safari/VoiceOver drop the
 * implicit list role.
 */

export interface BarListItem {
  key: string;
  /** Row label. Any ReactNode — pass an anchor/Link element directly, or use `renderLabel`. */
  label: React.ReactNode;
  value: number;
  /**
   * Renders the label cell — inject your router's Link here, same contract
   * as PluginCard's `renderLink`/Sidebar's `renderLink` (the house pattern
   * for router-agnostic links). `className` carries the truncation and type
   * styles and MUST land on the returned element, so the ellipsis clips the
   * link itself rather than a wrapper. There is deliberately no `href`
   * shortcut: a bare string href renders a plain <a> that full-page-reloads
   * inside SPA consumers, which is exactly the trap `renderLink` exists to
   * avoid — same reasoning as PluginCard.
   */
  renderLabel?: (props: { className: string; children: React.ReactNode }) => React.ReactNode;
}

export interface BarListProps extends React.ComponentProps<"ul"> {
  items: BarListItem[];
  /**
   * The value that fills the track completely. Defaults to the largest item
   * value — the natural scale for a ranking, where the leader spans full
   * width. Pass explicitly when rows share an external scale (a total, a
   * quota) so bars stay comparable across lists.
   */
  max?: number;
  /**
   * Formats the visible value. Defaults to `toLocaleString()` — what the
   * docs ranking shipped — so thousands read as "5,612" not "5612".
   */
  formatValue?: (value: number) => string;
}

const LABEL_CLASS = "min-w-0 truncate text-sm";

/**
 * Fill width as a percentage of the track, clamped to [0, 100]: a value
 * above `max` (stale max, live data racing ahead) renders a full bar rather
 * than painting outside the track — the value text still tells the truth.
 * Negative values and max <= 0 degrade to an empty track for the same
 * reason: the geometry never lies beyond its box.
 */
function fillPercent(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
}

function BarList({ items, max, formatValue = (n) => n.toLocaleString(), className, ...props }: BarListProps) {
  // Spreading [0] keeps Math.max total on an empty list (avoids -Infinity)
  // and pins the default scale non-negative.
  const scale = max ?? Math.max(0, ...items.map((item) => item.value));
  return (
    // One grid + subgrid rows, not a per-row grid: the label and value
    // columns auto-size to the longest content ACROSS the whole list, where
    // the docs original hard-coded 150px/46px and re-tuned both in a media
    // query. fit-content(40%) caps the label column so a pathological label
    // truncates instead of starving the track; max-content on the value
    // column trusts formatValue output to be short. Browsers without subgrid
    // (none evergreen) drop the invalid `grid-template-columns: subgrid`
    // declaration and each row falls back to a stacked single column —
    // degraded but fully readable.
    // role="list" is NOT redundant despite the lint rule: Safari/VoiceOver
    // strips the implicit list role from any ul styled `list-style: none`
    // (which `list-none` below is), and the explicit role restores it.
    // Documented WebKit behaviour (bug 170179), not a hypothetical.
    // eslint-disable-next-line jsx-a11y/no-redundant-roles
    <ul
      role="list"
      data-slot="bar-list"
      className={cn(
        "grid w-full list-none grid-cols-[fit-content(40%)_minmax(0,1fr)_max-content] items-center gap-x-3 gap-y-2 p-0",
        className,
      )}
      {...props}
    >
      {items.map((item) => {
        const pct = fillPercent(item.value, scale);
        return (
          <li key={item.key} data-slot="bar-list-item" className="col-span-3 grid grid-cols-subgrid items-center">
            {item.renderLabel ? (
              item.renderLabel({ className: LABEL_CLASS, children: item.label })
            ) : (
              <span className={LABEL_CLASS}>{item.label}</span>
            )}
            <div data-slot="bar-list-track" aria-hidden="true" className="h-4.5 overflow-hidden rounded-sm bg-muted">
              <div
                data-slot="bar-list-fill"
                className="h-full rounded-sm bg-brand"
                // 2px floor (from the docs original) keeps a tiny-but-real
                // value visible as a sliver; a true zero renders no fill at
                // all — "none" and "almost none" must not look identical.
                style={pct > 0 ? { width: `${pct}%`, minWidth: "2px" } : { width: 0 }}
              />
            </div>
            <span data-slot="bar-list-value" className="text-right text-sm tabular-nums text-muted-foreground">
              {formatValue(item.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export { BarList };
