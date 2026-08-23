import * as React from "react";

import { cn } from "../../lib/utils";

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-card transition-[box-shadow,border-color] duration-base",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className,
      )}
      {...props}
    />
  );
}

export type CardTitleProps = React.ComponentProps<"h3"> & {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  /**
   * Leading glyph. Decorative — the title text is the accessible name, and
   * the wrapper below is `aria-hidden`, so a glyph passed here is never
   * announced. An icon that carries meaning the title does not is a
   * different component (a Badge, a StatusDot); it does not belong in a
   * heading whose text is the name.
   */
  icon?: React.ReactNode;
  /**
   * `"base"` is the settings-card scale (#274): 19 FiestaBoard headers spell
   * `text-base` by hand because the default here is the parent's size.
   * `"lg"` is the untouched default, so no existing call site moves.
   */
  size?: "base" | "lg";
};

/**
 * The heading inside a CardHeader, with an optional leading glyph.
 *
 * ```tsx
 * <CardTitle size="base" icon={<Info />}>About</CardTitle>
 * ```
 *
 * The icon slot exists because the alternative had already drifted. Every
 * settings card in FiestaBoard restated the same three decisions inline —
 * turn the title into a flex row, drop it to `text-base`, size the glyph to
 * 16px — and the one decision nobody restated consistently was the glyph's
 * tone: most inherited the title's ink, some were `text-muted-foreground`,
 * one `text-destructive`, one `text-brand`.
 *
 * `text-muted-foreground` is the default here. It is the majority of what
 * the app already spelled, and it is the right reading: next to a
 * `font-semibold` title the glyph is decoration, not a second voice. The
 * other two tones stay reachable — the consumer owns the element passed to
 * `icon`, so a `className` on it wins (see the `:not([class*='size-'])`
 * escape hatch below, which does the same for size).
 *
 * Layout only becomes a flex row when an icon is present. A title without
 * one keeps its original block layout, so this is additive for the ~40 call
 * sites across the two apps that pass no icon.
 */
function CardTitle({ className, as: Component = "h3", icon, size = "lg", ...props }: CardTitleProps) {
  const { children, ...rest } = props;

  return (
    <Component
      data-slot="card-title"
      data-size={size}
      className={cn(
        "leading-none font-semibold",
        size === "base" && "text-base",
        // Only a title with a glyph becomes a row. Without this guard every
        // existing CardTitle would gain a flex context it never asked for,
        // which changes how its text children lay out.
        icon && "flex items-center gap-2",
        className,
      )}
      {...rest}
    >
      {icon ? (
        <span
          data-slot="card-title-icon"
          // The heading's text is already the accessible name. Announcing
          // the glyph too is the double-announcement IconTile documents.
          aria-hidden="true"
          className={cn(
            "inline-flex shrink-0 items-center justify-center text-muted-foreground",
            // House escape hatch (button.tsx, icon-tile.tsx): a default that
            // the consumer's own `size-*` silently beats. Without
            // `:not([class*='size-'])` this descendant selector (0,1,1)
            // would outrank a `size-5` on the glyph itself (0,1,0).
            "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          )}
        >
          {icon}
        </span>
      ) : null}
      {children}
    </Component>
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-description" className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-6", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="card-footer" className={cn("flex items-center px-6 [.border-t]:pt-6", className)} {...props} />
  );
}

export { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
