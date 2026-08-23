"use client";

import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Spinner } from "../feedback/spinner";
import { cardSurfaceClassName } from "./card";
import { IconTile } from "./icon-tile";

/* ------------------------------------------------------------------ *
 * ActionCard — a card whose whole surface performs an action (#284).
 *
 * TAXONOMY. This lives in `containment/` next to Card, not in `forms/` next
 * to ToggleCard, and the split is not "one is clickable and one is not":
 *
 *   • ToggleCard is in `forms/` because it genuinely IS a form control. It
 *     carries a `value`, it renders a hidden input so a `<form>` can submit
 *     it, it is a `radio` inside a group with a roving tabindex, and its
 *     whole reason to exist is holding SELECTION state.
 *   • ActionCard holds no state and selects nothing. It is Card's surface
 *     wearing button (or anchor) semantics — the same relationship
 *     `IconTile` has to `Card`, one order of magnitude down. It submits
 *     nothing, so a `<form>` never sees it.
 *
 * Borrowing ToggleCard's semantics would be an active bug, not merely
 * over-engineering: the two FiestaBoard sites this replaces sit adjacent in
 * one dialog as two INDEPENDENT actions. As radios they would announce
 * "1 of 2" for a choice that does not exist; as standalone `aria-pressed`
 * toggles they would announce a toggle that never toggles.
 *
 * WHY IT IS NOT JUST `<Card>` WITH AN `onClick`. Card is a `<div>`. Both
 * downstream sites hand-rolled a `<button>` with the card's visuals copied
 * onto it, and neither copy reproduced `shadow-card` or Card's transition —
 * so a pressable card and a static one in the same dialog did not match.
 * The fix is structural: the surface is `cardSurfaceClassName`, exported
 * from card.tsx and composed here, so the two cannot drift again.
 *
 * HOVER (the divergence this component exists to settle). The two sites
 * disagreed: `hover:border-primary/50 hover:bg-primary/5` on one,
 * `hover:border-muted-foreground/40 hover:bg-muted/40` on the other. Neither
 * wins as written, and the recipe below is the house one that ToggleCard and
 * SegmentedControlItem already spell for an unchecked pressable card:
 *
 *   • `border-primary/50` — the boundary a pressable card in this system
 *     already lifts to under the cursor. `border-muted-foreground/40`
 *     invents a boundary pigment used nowhere else in the package.
 *   • `bg-accent/50`, NOT `bg-primary/5` — `primary/5` is ToggleCard's
 *     CHECKED fill. A hover that lands on the selected pigment says "this is
 *     now selected", which is precisely the wrong statement for a card that
 *     selects nothing, and it would make a hovered ActionCard and a selected
 *     ToggleCard the same colour.
 *   • `shadow-card-hover` — the elevation token theme.css has always carried
 *     for exactly this and which nothing used, because until now nothing in
 *     the package was a card you could press.
 *
 * The result: an ActionCard and a ToggleCard sitting in one dialog respond
 * identically under the cursor, which is the whole point of settling it here
 * rather than at two call sites.
 * ------------------------------------------------------------------ */

/**
 * The medallion tint. Tone is a property of the GLYPH GROUND only — it never
 * recolours the card's own surface, because an ActionCard is not a status:
 * a destructive action still sits on the ordinary card ground, the same way
 * a destructive menu item does.
 *
 * `primary` is drawn with `--brand`, not `--primary`, and the mismatch is
 * deliberate. `--primary` is the literal #f5a623 tile — legal as a field,
 * illegal as ink (1.83:1 on a light page; see button.tsx and text-link.tsx).
 * `--brand` is the same hue at the ink plateau, and `bg-brand/10` +
 * `text-brand` is the round tinted medallion EmptyState already draws. The
 * PROP is named for the role (the primary action), not for the token.
 */
const actionCardMedallionVariants = cva(
  // Round, not IconTile's squircle: this is a medallion, the shape both
  // downstream sites drew and the one EmptyState uses for the same job.
  "rounded-full",
  {
    variants: {
      tone: {
        // Empty on purpose — IconTile's own `tone="muted"` is already this.
        muted: "",
        primary: "bg-brand/10 text-brand",
        // The dark step matches DropdownMenu's destructive wash: /10 over a
        // dark card is very nearly the card itself.
        destructive: "bg-destructive/10 text-destructive dark:bg-destructive/20",
      },
    },
    defaultVariants: {
      tone: "muted",
    },
  },
);

export type ActionCardTone = NonNullable<VariantProps<typeof actionCardMedallionVariants>["tone"]>;

export type ActionCardProps = Omit<React.ComponentProps<"button">, "title"> & {
  /**
   * Glyph for the medallion. DECORATIVE — `title` is the accessible name, and
   * the medallion is an `aria-hidden` IconTile, so nothing passed here is
   * announced. An icon carrying meaning the title does not is a different
   * component (a Badge in `meta`, a StatusDot).
   */
  icon?: React.ReactNode;
  /** Medallion tint. Never recolours the card surface. @default "muted" */
  tone?: ActionCardTone;
  /**
   * The primary line, and the card's accessible name. Wired with
   * `aria-labelledby` rather than left to the button's text content, so the
   * description and `meta` do NOT get read as part of the name — a card
   * named "Turn off schedule Stops the schedule for this board Beta" is the
   * failure mode every hand-rolled version shipped.
   */
  title: React.ReactNode;
  /** Secondary line under the title. Announced as the description. */
  description?: React.ReactNode;
  /**
   * "Already running", as distinct from `disabled`'s "not available".
   *
   * Swaps the glyph for a Spinner and marks the card `aria-busy` +
   * `aria-disabled` + `data-loading`, and guards activation — but
   * deliberately NOT the native `disabled` attribute. This is the line
   * Button draws and the reason it draws it: `disabled` drops the element
   * out of the tab order and silently moves focus to `<body>` at the exact
   * moment the user is waiting for feedback on what they just pressed.
   *
   * A disabled card is dimmed and inert; a loading card keeps its full ink,
   * keeps its focus, and spins. They are never the same picture.
   */
  loading?: boolean;
  /** Trailing content on the title row — a chevron, a Badge, a shortcut. */
  meta?: React.ReactNode;
  /**
   * Render the caller's own element instead of a `<button>` — the package's
   * slot convention (Button, Badge, Chip, NavListLink, BreadcrumbLink), on
   * Base UI's `useRender`.
   *
   * This is what a card that NAVIGATES needs: pass `<a href="…">` (or a
   * router Link) and the surface becomes a real anchor — right-clickable,
   * middle-clickable, and announced as a link rather than a button. The
   * element's own children are replaced by the composed card content, so the
   * caller supplies the element and its href, nothing more.
   *
   * `disabled` cannot apply to an anchor (there is no such attribute), so in
   * this form both `disabled` and `loading` fall back to `aria-disabled` plus
   * the activation guard.
   */
  asChild?: boolean;
};

/**
 * A card whose whole surface is one action: medallion, title, description.
 *
 * ```tsx
 * <ActionCard
 *   icon={<CalendarOff />}
 *   title={t("disableScheduleTitle")}
 *   description={t("disableScheduleDescription")}
 *   loading={disableSchedule.isPending}
 *   onClick={() => disableSchedule.mutate()}
 * />
 * ```
 *
 * The navigating form is the same card as a real link:
 *
 * ```tsx
 * <ActionCard asChild icon={<Settings2 />} title={t("boardSettings")} meta={<ChevronRight />}>
 *   <a href="/boards/kitchen/settings" />
 * </ActionCard>
 * ```
 */
function ActionCard({
  className,
  icon,
  tone = "muted",
  title,
  description,
  loading = false,
  meta,
  asChild = false,
  disabled = false,
  children,
  onClick,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  ...props
}: ActionCardProps) {
  const id = React.useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  // Both states refuse activation; only one of them dims.
  const inert = disabled || loading;

  // `aria-disabled` (loading, and the anchor form of `disabled`) is advisory
  // only — unlike the native attribute it does NOT stop the element being
  // activated. Without this guard a second click, or Enter, would fire the
  // handler again and double-submit the mutation the user is waiting on.
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (inert) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    onClick?.(event);
  };

  const content = (
    <>
      {(icon != null || loading) && (
        <IconTile
          // IconTile owns the 40px box, the radius scale, the glyph sizing
          // and the decorative `aria-hidden`; this overrides only its skin.
          // The tones and the round shape are ActionCard's for now — if a
          // third component wants them they graduate into IconTile's own
          // `tone` axis rather than being copied a third time.
          data-slot="action-card-medallion"
          data-tone={tone}
          className={actionCardMedallionVariants({ tone })}
        >
          {loading ? (
            // 20px, the glyph size IconTile's default box draws. `label={null}`
            // because the CARD carries `aria-busy` — a named spinner here
            // would be a second, unlocalized announcement, and it is inside
            // an aria-hidden tile anyway.
            <Spinner size="lg" label={null} />
          ) : (
            icon
          )}
        </IconTile>
      )}
      <span data-slot="action-card-body" className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span data-slot="action-card-header" className="flex min-w-0 items-center gap-2">
          <span id={titleId} data-slot="action-card-title" className="min-w-0 flex-1 text-sm font-semibold">
            {title}
          </span>
          {meta != null && (
            <span data-slot="action-card-meta" className="shrink-0 text-muted-foreground">
              {meta}
            </span>
          )}
        </span>
        {description != null && (
          <span
            id={descriptionId}
            data-slot="action-card-description"
            className="text-xs leading-relaxed font-normal text-muted-foreground"
          >
            {description}
          </span>
        )}
        {!asChild && children}
      </span>
    </>
  );

  return useRender({
    defaultTagName: "button",
    ref: ref as React.Ref<HTMLButtonElement>,
    // The card owns its content in BOTH forms — unlike Button's `asChild`,
    // where the caller's children ARE the label. Cloning the children in
    // rather than passing them through `props` makes that deterministic:
    // useRender lets the render element's own props win the merge, so an
    // anchor written with stray children could otherwise beat the card.
    render: asChild ? React.cloneElement(React.Children.only(children) as React.ReactElement, {}, content) : undefined,
    props: {
      "data-slot": "action-card",
      "data-tone": tone,
      ...(disabled ? { "data-disabled": "" } : {}),
      ...(loading ? { "data-loading": "" } : {}),
      className: cn(
        "group/action-card relative flex w-full cursor-pointer items-start gap-4 p-4 text-left",
        // The Card surface, composed rather than copied. See card.tsx.
        cardSurfaceClassName,
        // A superset of Card's property list — this one also moves its
        // background and its ink — on the same duration token.
        "transition-[color,background-color,border-color,box-shadow] duration-base",
        // The house two-tone ring. It replaces `shadow-card` while focused,
        // exactly as it does on Button's `shadow-sm`; the indicator is the
        // thing that has to win a box-shadow argument.
        "focus-ring",
        // Hover is scoped away from the busy state (`not-data-[loading]:`,
        // the guard Tabs/ToggleCard/Toggle use) so a card that is already
        // running does not keep inviting a second press. The disabled state
        // needs no guard — it is `pointer-events-none` below.
        "not-data-[loading]:hover:border-primary/50 not-data-[loading]:hover:bg-accent/50",
        "not-data-[loading]:hover:shadow-card-hover",
        "data-[loading]:cursor-progress",
        // Stamped rather than `disabled:`, so the anchor form — which has no
        // native disabled attribute — dims and goes inert identically.
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        "[&_svg]:pointer-events-none [&_svg]:shrink-0",
        className,
      ),
      // Base UI's `renderTag` already defaults a bare `button` to
      // type="button", so a card inside a form never submits it by accident.
      ...(asChild ? {} : { children: content, disabled }),
      ...props,
      // After the spread: these are computed from props this component owns,
      // and the escape hatches are the explicit aria-* the caller passes,
      // which are destructured above and re-applied here.
      "aria-label": ariaLabel,
      // The title alone is the name. A caller who names the card themselves
      // wins — and `aria-label` only wins if we do NOT also emit a
      // labelledby, since labelledby beats label in the ARIA cascade.
      "aria-labelledby": ariaLabelledBy ?? (ariaLabel == null ? titleId : undefined),
      "aria-describedby": ariaDescribedBy ?? (description != null ? descriptionId : undefined),
      ...(loading ? { "aria-busy": true, "aria-disabled": true } : {}),
      // An `<a>` cannot be `disabled`, so the advisory attribute plus the
      // activation guard is all there is. Announced as "dimmed"/"unavailable"
      // rather than removed from the tab order.
      ...(disabled && asChild ? { "aria-disabled": true } : {}),
      onClick: handleClick,
    },
  });
}

export { ActionCard, actionCardMedallionVariants };
