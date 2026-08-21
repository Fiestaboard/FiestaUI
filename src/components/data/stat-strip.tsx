/**
 * `data/` — the data-display family (#229).
 *
 * First member of a new family. The existing families each own a job —
 * `containment` boxes things, `feedback` reports system state, `typography`
 * sets prose — and none of them owns "render a derived number so a human can
 * compare it". StatStrip (and the sibling BarList landing in a parallel PR)
 * are exactly that: presentation of computed metrics, not chrome, not form
 * input, not prose. Folding them into `feedback` would misfile them —
 * feedback is the system talking about itself (alerts, spinners, status),
 * not the product displaying the user's data. Hence `data/`.
 */
import * as React from "react";

import { cn } from "../../lib/utils";

type StatStripTone = "default" | "brand";

export interface StatStripItemData {
  /** The big number. ReactNode so a consumer can wrap it in <abbr>, add a unit sup, etc. */
  value: React.ReactNode;
  /** The muted descriptor beside the value, e.g. "unique cloners (last 14 days)". */
  label: React.ReactNode;
  /**
   * List key when `label` is not a plain string. Falls back to the array
   * index, which is fine for the intended use (a short static header strip),
   * wrong for anything reorderable — pass a key there.
   */
  key?: string;
}

interface StatStripProps extends React.ComponentProps<"dl"> {
  /**
   * Data form: map an array straight onto the strip. Ignored when `children`
   * is provided — the two forms answer the same question and mixing them
   * would render duplicate stats.
   */
  items?: StatStripItemData[];
  /**
   * Colour of every value in the strip. Strip-level rather than per-item
   * deliberately: a summary strip is one statement, and mixing value colours
   * inside it turns emphasis into noise. `brand` exists for the one real
   * consumer (the docs stats header); the status tones (`destructive` etc.)
   * are withheld until a real call site wants a red headline number —
   * see heading.tsx for the same scoping argument.
   */
  tone?: StatStripTone;
}

/**
 * An inline row of big-number stats — "52 plugins · 5,612 unique cloners" —
 * promoted from the docs site's stats header (#229).
 *
 * Semantics: a `<dl>` of name/value groups, because that is what the content
 * IS — each stat is a term ("plugins") described by a value ("52"). The spec
 * allows `<div>` group wrappers inside `<dl>`, so the flex styling survives
 * without semantic lies. The content model requires `<dt>` before `<dd>`,
 * but the design shows the value first; `order-first` on the `<dd>` flips
 * the visual order only, so a screen reader hears the natural dl reading
 * ("plugins, 52") while sighted users get the big-number-first layout. Both
 * sequences are meaningful, so SC 1.3.2 is satisfied either way.
 *
 * Typography: the value carries the unified title treatment (semibold +
 * tracking-tight, per heading.tsx) at 1.5rem rather than the docs version's
 * 700 weight — one title voice across the system beats a one-off bold.
 * `leading-none` because a value never wraps (it's a number); it also keeps
 * the strip from towering over the sm label it baselines against. No
 * `tabular-nums`: values sit in distinct rows of one, never in a column
 * where digits must align.
 *
 * Colour: values default to `text-foreground`, not the docs' brand — brand
 * emphasis is a page-level choice, not a property of "a statistic", so it is
 * opt-in via `tone="brand"`. Contrast is inherited from theme.css: --brand
 * (--hue-orange) measures 5.08:1 light / 9.63:1 dark on --background, and
 * --muted-foreground labels measure 8.32:1 light on --background.
 */
function StatStrip({ items, tone = "default", className, children, ...props }: StatStripProps) {
  return (
    <dl
      data-slot="stat-strip"
      data-tone={tone}
      // Named group so StatStripItem can read the strip's tone through CSS
      // alone (same trick as toggle-card): a React context would cascade too,
      // but it drags in hooks — and therefore "use client" — for what is
      // purely a styling relationship.
      //
      // gap-x-5 -> sm:gap-x-8 keeps the wrapped mobile rows from reading as
      // one run-on sentence, mirroring the docs original's 640px breakpoint.
      className={cn("group/stat-strip flex flex-wrap items-baseline gap-x-5 gap-y-2 sm:gap-x-8", className)}
      {...props}
    >
      {children ?? items?.map((item, i) => <StatStripItem key={item.key ?? i} value={item.value} label={item.label} />)}
    </dl>
  );
}

interface StatStripItemProps extends Omit<React.ComponentProps<"div">, "children"> {
  value: React.ReactNode;
  label: React.ReactNode;
}

/**
 * One value/label pair. Exists as a public component (rather than only the
 * `items` array) because the `<dl>` content model is an internal contract —
 * a consumer composing custom markup should not need to know that the label
 * must precede the value in the DOM, or that `order-first` restores the
 * visual order. `value`/`label` stay props, not children slots: the pair is
 * a fixed shape with no middle ground, the empty-state end of the
 * config-vs-composition spectrum, not the card end.
 */
function StatStripItem({ value, label, className, ...props }: StatStripItemProps) {
  return (
    <div data-slot="stat-strip-item" className={cn("flex items-baseline gap-1.5", className)} {...props}>
      <dt data-slot="stat-strip-label" className="text-sm text-muted-foreground">
        {label}
      </dt>
      {/* leading-none AFTER text-2xl: tailwind-merge drops a leading-* that
          precedes a text-* utility (see heading.tsx for the full autopsy). */}
      <dd
        data-slot="stat-strip-value"
        className="order-first m-0 text-2xl leading-none font-semibold tracking-tight text-foreground group-data-[tone=brand]/stat-strip:text-brand"
      >
        {value}
      </dd>
    </div>
  );
}

export { StatStrip, StatStripItem };
