"use client";

import { useRender } from "@base-ui/react/use-render";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * ListRow: one record in a list (slice 1.8a, C16, WEB-18).
 *
 * The web had no list row, only Table, Card and NavList. Displays,
 * Integrations, Schedule, Pages and Collections all hand-rolled one. This is
 * the web twin of the native `iOS / List row` and `M3 / List item` (Figma
 * 06 `31:5`, `368:24902`), with the same five slots:
 *
 *   leading     an IconTile, a board thumbnail, a drag handle
 *   title       required
 *   description the second line ("Pages change on their own")
 *   meta        a short value read with the title ("On", "10 min", "9:00 PM")
 *   trailing    a chevron, a Switch, a menu button, Move up / Move down
 *
 * **Layout and large text.** The Figma rows have `Layout=Inline` and
 * `Layout=Stacked`: at large text sizes the meta drops under the
 * description instead of squeezing the title. `layout` picks one:
 *
 *   * `inline`: the meta always sits beside the text;
 *   * `stacked`: the meta always sits on its own line under the text;
 *   * `auto` (default): the text column has a flex-basis in **rem**, so it
 *     grows with the reader's font size. When the text column and the meta
 *     no longer fit on one line, the meta wraps under it. No container query
 *     is involved (a `container-type` root collapses in a shrink-to-fit
 *     parent, which 1.7a hit), and no viewport breakpoint either.
 *
 * **Element.** A div by default, an `<li>` inside a {@link ListRowGroup}.
 * `render` swaps it: `render={<a href="…" />}` for a row that navigates, or
 * `render={<button />}`. A link or button row gets the hover fill and the
 * shared focus ring. Do not put another control inside a link or button row
 * (nested interactive content); use a plain row with a trailing control, or
 * put the link on the title.
 *
 * **Props pass through.** Every prop and the ref land on the root, so a
 * `DropdownMenuTrigger asChild` (trigger="context") or a SortableList item
 * can wrap the row. An open context menu stamps `data-popup-open` on it,
 * which shows the hover fill so the reader can see which row the menu is
 * for. The row never styles `data-pressed`: Base UI sets it on a menu
 * trigger while the popup is open (the collision #385's review caught).
 *
 * **Swipe actions** (06 `36:8594`) are native-only for now and are not part
 * of this component.
 */

type ListRowLayout = "inline" | "stacked" | "auto";
type ListRowVariant = "plain" | "card";
type ListRowSize = "default" | "touch";
type ListRowGroupVariant = "inset" | "plain" | "separated";

interface ListRowGroupContextValue {
  variant: ListRowVariant;
  size?: ListRowSize;
}

const ListRowGroupContext = React.createContext<ListRowGroupContextValue | null>(null);

const ROW_VARIANT_FOR_GROUP: Record<ListRowGroupVariant, ListRowVariant> = {
  inset: "plain",
  plain: "plain",
  separated: "card",
};

interface ListRowProps extends Omit<useRender.ComponentProps<"div">, "title"> {
  /** Leading visual: an IconTile, a thumbnail, a SortableListHandle. */
  leading?: React.ReactNode;
  /** The row's name. Wraps rather than truncates, so large text stays whole. */
  title: React.ReactNode;
  /** Second line, in the muted tone. */
  description?: React.ReactNode;
  /** A short value read with the title: "On", "10 min", "9:00 PM". */
  meta?: React.ReactNode;
  /** Trailing control or affordance: a chevron, a Switch, a menu button. */
  trailing?: React.ReactNode;
  /** Where the meta goes. Default `auto`: beside the text until it no longer fits. */
  layout?: ListRowLayout;
  /** `plain` (default; dividers come from the group) or `card` (its own border and radius). */
  variant?: ListRowVariant;
  /** `touch` gives a 56px floor and 16px titles. Default `default` (48px floor). */
  size?: ListRowSize;
  /**
   * The row is the open item of a list-detail (slice 1.8e; 07e Settings
   * `318:46000`, `320:6520`): an accent pill inset 4px inside the row, radius
   * md, behind the content, and a semibold title. Sets `aria-current` (an
   * explicit `aria-current` prop wins). The app decides which row is open;
   * the kit never reads the route.
   */
  selected?: boolean;
  /** Which kind of "current" a selected row is, as on NavListLink. Default `"page"`. */
  current?: "page" | "step" | "location" | "date" | "time" | "true";
}

const rowBase = [
  "relative flex w-full items-center gap-3 text-left text-foreground",
  "transition-[background-color,border-color,box-shadow] duration-control",
  "focus-ring focus-visible:z-10",
  "[&_svg]:pointer-events-none [&_svg]:shrink-0",
];

// Only a link or button row reacts to hover. An open context menu shows the
// same fill (data-popup-open, never data-pressed).
const rowInteractive = "[&:is(a,button)]:cursor-pointer [&:is(a,button)]:hover:bg-accent data-[popup-open]:bg-accent";

// The open row of a list-detail (07e): the fill is a pseudo-element inset 4px
// from the row's edges with the md radius, painted behind the content inside
// the row's own stacking context. Inset, it never reaches an inset group's
// rounded corners or its dividers, and a row fill on the element itself would
// (the square that PR #2480's review caught). A selected row skips the
// edge-to-edge hover fill for the same reason; it is already lit.
const rowSelected =
  "isolate [&:is(a,button)]:cursor-pointer before:pointer-events-none before:absolute before:inset-1 before:-z-10 before:rounded-md before:bg-accent";

const variantClasses: Record<ListRowVariant, string> = {
  plain: "px-4",
  // A card row draws its own border; a lifted SortableList item fills it.
  card: "rounded-xl border bg-card px-3 in-data-[lifted]:bg-accent",
};

const sizeClasses: Record<ListRowSize, string> = {
  default: "min-h-12 py-2",
  touch: "min-h-14 py-2.5",
};

const titleSize: Record<ListRowSize, string> = {
  default: "text-sm",
  touch: "text-base",
};

const descriptionSize: Record<ListRowSize, string> = {
  default: "text-xs",
  touch: "text-sm",
};

const textClasses: Record<ListRowLayout, string> = {
  inline: "min-w-0 flex-1",
  stacked: "min-w-0 basis-full",
  // 10rem is the narrowest the text column gets before the meta wraps. At the
  // default 16px root that is 160px: a 390px phone row with a leading tile and
  // a chevron keeps a short meta ("On") inline but stacks a medium one
  // ("Every 15 min"). At 200% text it is 320px, and the row stacks.
  auto: "min-w-0 flex-[1_1_10rem]",
};

const metaClasses: Record<ListRowLayout, string> = {
  inline: "shrink-0",
  stacked: "basis-full",
  auto: "shrink-0",
};

function ListRow({
  leading,
  title,
  description,
  meta,
  trailing,
  layout = "auto",
  variant,
  size,
  className,
  render,
  ref,
  selected = false,
  current = "page",
  ...props
}: ListRowProps) {
  const group = React.useContext(ListRowGroupContext);
  const resolvedVariant = variant ?? group?.variant ?? "plain";
  const resolvedSize = size ?? group?.size ?? "default";
  const hasMeta = meta != null && meta !== false;

  const content = (
    <>
      {leading != null && leading !== false ? (
        <span data-slot="list-row-leading" className="flex shrink-0 items-center text-muted-foreground">
          {leading}
        </span>
      ) : null}
      <span data-slot="list-row-body" className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-0.5">
        <span data-slot="list-row-text" className={cn("flex flex-col gap-0.5", textClasses[layout])}>
          <span
            data-slot="list-row-title"
            className={cn(selected ? "font-semibold" : "font-medium", "break-words", titleSize[resolvedSize])}
          >
            {title}
          </span>
          {description != null && description !== false ? (
            <span
              data-slot="list-row-description"
              className={cn("break-words text-muted-foreground", descriptionSize[resolvedSize])}
            >
              {description}
            </span>
          ) : null}
        </span>
        {hasMeta ? (
          <span
            data-slot="list-row-meta"
            className={cn("text-muted-foreground tabular-nums", titleSize[resolvedSize], metaClasses[layout])}
          >
            {meta}
          </span>
        ) : null}
      </span>
      {trailing != null && trailing !== false ? (
        <span data-slot="list-row-trailing" className="flex shrink-0 items-center gap-1 text-muted-foreground">
          {trailing}
        </span>
      ) : null}
    </>
  );

  return useRender({
    defaultTagName: group ? "li" : "div",
    render,
    ref: ref as React.Ref<HTMLDivElement>,
    props: {
      "data-layout": layout,
      "data-variant": resolvedVariant,
      "data-size": resolvedSize,
      "data-selected": selected ? "" : undefined,
      "aria-current": selected ? current : undefined,
      className: cn(
        rowBase,
        selected ? rowSelected : rowInteractive,
        variantClasses[resolvedVariant],
        sizeClasses[resolvedSize],
        className,
      ),
      children: content,
      ...props,
      // Last, so a wrapper that renders the row (a context-menu trigger
      // stamps its own data-slot) cannot rename it: parity probes and
      // SortableList styling find the row by this slot.
      "data-slot": "list-row",
    },
  });
}

interface ListRowGroupProps extends React.ComponentProps<"ul"> {
  /**
   * `inset` (default): one bordered, rounded surface with dividers between
   * plain rows, like an iOS inset grouped list. `plain`: dividers only.
   * `separated`: card rows with an 8px gap, like the 07 Collection list.
   */
  variant?: ListRowGroupVariant;
  /** Size for rows that do not set their own. */
  size?: ListRowSize;
}

const groupClasses: Record<ListRowGroupVariant, string> = {
  // No overflow-hidden: it would clip the rows' focus rings. The first and
  // last rows take the corner radius instead.
  inset:
    "rounded-xl border bg-card divide-y divide-border [&>li:first-child]:rounded-t-xl [&>li:last-child]:rounded-b-xl",
  plain: "divide-y divide-border",
  separated: "flex flex-col gap-2",
};

/**
 * A `role="list"` of ListRows. Rows inside it render as `<li>` and take the
 * group's row variant and size unless they set their own. The explicit role
 * keeps list semantics in Safari, which drops them from a `list-style: none`
 * list.
 */
function ListRowGroup({ variant = "inset", size, className, ...props }: ListRowGroupProps) {
  const value = React.useMemo(() => ({ variant: ROW_VARIANT_FOR_GROUP[variant], size }), [variant, size]);
  return (
    <ListRowGroupContext.Provider value={value}>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles -- Safari drops list semantics from list-style:none */}
      <ul
        role="list"
        data-slot="list-row-group"
        data-variant={variant}
        className={cn("m-0 list-none p-0", groupClasses[variant], className)}
        {...props}
      />
    </ListRowGroupContext.Provider>
  );
}

export { ListRow, ListRowGroup };
export type { ListRowGroupProps, ListRowGroupVariant, ListRowLayout, ListRowProps, ListRowSize, ListRowVariant };
