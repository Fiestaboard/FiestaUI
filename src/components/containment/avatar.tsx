import { cva, type VariantProps } from "class-variance-authority";
import { UserRound } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";

/**
 * Avatar — the round mark that stands in for a person.
 *
 * Taxonomy: `containment/`, beside IconTile, and for IconTile's reason — the
 * job is "box another thing". The thing here is a monogram or a glyph rather
 * than an icon, and the box is a disc rather than a rounded square, because
 * a circle is how every interface a reader has already used says "this is
 * somebody" and a square says "this is something".
 *
 * Not an image component. The package ships no image loading, and the app
 * this is built for has usernames and nothing else — no profile pictures to
 * fetch, fail on, and fall back from. What it draws, in order: a child
 * glyph if one is passed, the initials of `name`, or a person silhouette
 * when there is no name to take initials from.
 *
 * Accessibility: DECORATIVE BY DEFAULT, like IconTile and MessageAvatar. An
 * avatar almost always sits next to the name it was derived from, and "C,
 * casa" is a double announcement. `decorative={false}` exposes it as
 * `role="img"` named after `name`; pass an `aria-label` for anything more
 * than the bare name, since this package ships no copy of its own.
 *
 * Not a control: no focus ring, no hover, no `onClick` contract. Put it
 * inside a button when it needs to be pressable.
 */
const avatarVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full",
    // leading-none: a monogram is centred by the flex box, not by a line box
    // whose half-leading shifts with the font's metrics.
    "font-semibold leading-none",
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  ],
  {
    variants: {
      size: {
        sm: "size-6 text-[0.6875rem] [&_svg:not([class*='size-'])]:size-3.5",
        md: "size-8 text-xs [&_svg:not([class*='size-'])]:size-4",
        lg: "size-10 text-sm [&_svg:not([class*='size-'])]:size-5",
      },
      tone: {
        // The quiet default: a tint of the surface's own foreground, with a
        // hairline to hold the edge. --foreground is re-derived inside the
        // rail and the mobile bar, so the same class reads correctly on a
        // page, a popover and the sidebar. Deliberately NOT `bg-accent`:
        // that is the hover fill, and a disc painted in it disappears the
        // moment the row it sits in is hovered.
        neutral: "bg-foreground/15 text-foreground ring-1 ring-inset ring-foreground/10",
        // The brand disc. --primary also means "selected" and "current
        // route", so keep this off any surface that shows one of those —
        // on the rail an orange disc reads as a second lit destination.
        brand: "bg-primary text-primary-foreground",
      },
    },
    defaultVariants: { size: "md", tone: "neutral" },
  },
);

/**
 * Up to two initials for a display name.
 *
 * Usernames here are free text — `casa`, `ada.lovelace`, an email address —
 * so the word breaks are the separators people actually build them from,
 * not just spaces. An address is read by its local part: the domain says
 * where the mail goes, not who the person is.
 */
export function initialsOf(name: string): string {
  // Only an @ with something in front of it is an address. "@casa" is a
  // handle, and reading it as one with an empty local part would leave a
  // signed-in user with no initials at all.
  const at = name.indexOf("@");
  const local = at > 0 ? name.slice(0, at) : name;
  const initials = local
    .split(/[\s._-]+/)
    .map(initialOf)
    .filter(Boolean);
  if (initials.length === 0) return "";
  const first = initials[0];
  const last = initials.length > 1 ? initials[initials.length - 1] : "";
  return (first + last).toUpperCase();
}

// What can stand as an initial: a letter, a digit, or a pictograph (a
// username that is an emoji should not fall through to the anonymous glyph).
const INITIAL = /[\p{L}\p{N}\p{Extended_Pictographic}]/u;

/**
 * The first grapheme of `word` that can stand as an initial, skipping any
 * punctuation in front of it — "(admin)" is A, not "(".
 *
 * Graphemes, not code points: a decomposed é is two code points and a ZWJ
 * family is seven, and the first one alone is a bare "e" or a lone man.
 * `Intl.Segmenter` is everywhere this package runs; the code-point split is
 * only there so a runtime without it degrades instead of throwing.
 */
function initialOf(word: string): string {
  const graphemes =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(word), (s) => s.segment)
      : Array.from(word);
  return graphemes.find((g) => INITIAL.test(g)) ?? "";
}

export interface AvatarProps extends React.ComponentProps<"span">, VariantProps<typeof avatarVariants> {
  /** The person's display name. Its initials are drawn when no child is given. */
  name?: string;
  /**
   * Hidden from assistive tech by default — see the note above. Pass
   * `decorative={false}` when the avatar is the only thing naming the
   * person; it is then an image named `name`, or your `aria-label`.
   */
  decorative?: boolean;
}

function Avatar({ className, name, size, tone, decorative = true, children, ...props }: AvatarProps) {
  const initials = name ? initialsOf(name) : "";
  // Not `children ?? …`: `{cond && <Icon />}` hands over `false`, which is
  // not nullish, and would draw an empty disc.
  const glyph = children === false || children == null ? undefined : children;
  return (
    <span
      data-slot="avatar"
      aria-hidden={decorative || undefined}
      role={decorative ? undefined : "img"}
      // An exposed avatar is named after the person unless the consumer says
      // otherwise — an unnamed role="img" is worse than a hidden one.
      aria-label={decorative ? undefined : name}
      className={cn(avatarVariants({ size, tone }), className)}
      {...props}
    >
      {glyph ?? (initials || <UserRound aria-hidden="true" />)}
    </span>
  );
}

export { Avatar, avatarVariants };
