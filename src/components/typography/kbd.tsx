"use client";

import * as React from "react";

import { cn } from "../../lib/utils";

/*
 * Kbd — the keycap, and the chord (#228, item 7).
 *
 * WHY THIS EXISTS. The docs site's navbar renders "input + kbd hint chip" —
 * the ⌘K / Ctrl+K affordance — and there is nothing in the package to render
 * the chip with, so it is hand-rolled CSS on a bare <kbd>. Every other
 * shortcut hint in the system has the same problem: DropdownMenu already
 * paints shortcut text inside its rows, and a tooltip that wants to say "⌘B"
 * has no shared treatment to reach for.
 *
 * WHAT IT IS NOT. Not `Code`. They look adjacent and they are not the same
 * thing: `<code>` is a fragment of computer text you might copy, `<kbd>` is a
 * key you press. That distinction is the entire reason both elements exist in
 * HTML, and it is what lets a stylesheet give one a keycap rim and the other
 * a flat chip. Kbd deliberately reuses Code's proven surface pair
 * (`bg-muted` + `text-foreground`) and adds the rim, so the two read as
 * siblings rather than as two unrelated inventions.
 *
 * SIZE: RELATIVE, AND THEREFORE NO SIZE AXIS. The type size is `0.8125em`,
 * not `text-xs`. An em tracks whatever the cap is sitting in, which is the
 * whole requirement: dropped mid-sentence in `Text size="base"` it comes out
 * at 13px, dropped into an `Input`'s trailing slot (14px field text) it comes
 * out at 11.4px and clears the field's inner padding, and dropped in a small
 * tooltip it shrinks with the tooltip. A `size` union would have promised
 * that every host is one of N sizes, and the first one that is not would be
 * back to hand-rolling — the same argument NavList makes for its row height.
 * `align-middle` keeps the cap centred on the x-height instead of dragging
 * the line's baseline down, and `leading-none` on the cap stops a chip in
 * prose from opening up the paragraph's line box.
 *
 * PLATFORM GLYPHS ARE A PROP, NOT A SNIFF. `platform` defaults to
 * `"generic"`, and `useKbdPlatform()` is the opt-in that resolves the real
 * one. That split is not fussiness: the primary consumer is a
 * server-rendered Docusaurus site, and a component that read `navigator`
 * during render would emit "Ctrl" on the server and "⌘" in the client's first
 * paint — a hydration mismatch on every page that shows the hint. The hook is
 * a `useSyncExternalStore` whose SERVER snapshot is `"generic"`, so React
 * itself guarantees that spelling for the server pass and for the hydrating
 * render and swaps the real one in afterwards; the two trees cannot disagree.
 *
 * ACCESSIBILITY — WHY THERE ARE NO BAKED-IN KEY NAMES. On `"generic"` every
 * modifier renders as a word ("Ctrl", "Shift", "Alt", "Enter"), so a screen
 * reader on Windows or Linux reads the shortcut aloud correctly with no extra
 * markup. The bare glyphs (⌘ ⌥ ⇧ ⌃) only ever render when the caller has said
 * the platform is Apple — which is where VoiceOver announces them by name —
 * so the substitution never strands the reader who receives it. That is why
 * this ships no `labels` object and no sr-only English: adding one would put
 * user-facing copy in the design system (the rule Breadcrumb and Sidebar both
 * state) to fix a case that does not arise. A caller who wants to name the
 * whole chord anyway passes `aria-label` straight through — it is a `<kbd>`
 * with its props spread, so nothing is in the way.
 *
 * SEMANTICS. A chord is nested `<kbd>`s: the outer element is the input as a
 * whole, each inner element is one key. That is the HTML spec's own example
 * for `<kbd>`, and it is what keeps "⌘ then K" one announced unit instead of
 * two loose caps. A single key skips the nesting entirely — one `<kbd>`
 * wearing both the layout and the cap — so `<Kbd>Esc</Kbd>` does not emit a
 * pointless `<kbd><kbd>`.
 */

/** Which spelling of the modifier keys to render. */
export type KbdPlatform = "apple" | "generic";

/**
 * Keys whose printed form differs by platform, or that have a conventional
 * glyph on both. Looked up case-insensitively; anything not listed renders
 * verbatim, so `"K"`, `"F5"` and `"/"` all pass straight through and the map
 * never has to enumerate the alphabet.
 *
 * `Mod` is the portable name for "the accelerator this platform uses" — ⌘ on
 * Apple, Ctrl everywhere else. It is the token to reach for when the shortcut
 * is "the search one" rather than "the Control one"; `Ctrl` stays available
 * for the shortcut that really is Control on both platforms.
 */
const KEY_GLYPHS: Record<string, { apple: string; generic: string }> = {
  mod: { apple: "⌘", generic: "Ctrl" },
  meta: { apple: "⌘", generic: "Win" },
  command: { apple: "⌘", generic: "Ctrl" },
  ctrl: { apple: "⌃", generic: "Ctrl" },
  control: { apple: "⌃", generic: "Ctrl" },
  alt: { apple: "⌥", generic: "Alt" },
  option: { apple: "⌥", generic: "Alt" },
  shift: { apple: "⇧", generic: "Shift" },
  enter: { apple: "⏎", generic: "Enter" },
  return: { apple: "⏎", generic: "Enter" },
  tab: { apple: "⇥", generic: "Tab" },
  backspace: { apple: "⌫", generic: "Backspace" },
  delete: { apple: "⌦", generic: "Delete" },
  escape: { apple: "Esc", generic: "Esc" },
  esc: { apple: "Esc", generic: "Esc" },
  space: { apple: "Space", generic: "Space" },
  up: { apple: "↑", generic: "↑" },
  down: { apple: "↓", generic: "↓" },
  left: { apple: "←", generic: "←" },
  right: { apple: "→", generic: "→" },
};

/** The printed form of one key on one platform. Unknown keys pass through. */
function keyGlyph(key: string, platform: KbdPlatform): string {
  return KEY_GLYPHS[key.toLowerCase()]?.[platform] ?? key;
}

// Layout + type scale. Lives on the outer element exactly once, so a chord's
// caps inherit the size instead of compounding 0.8125em per level of nesting.
const KBD_ROOT = "inline-flex items-center gap-1 whitespace-nowrap align-middle font-mono text-[0.8125em]";

// The cap itself. min-w keeps "K" and "W" the same width so a row of caps
// does not jitter, and the rim is --border, which theme.css rules decoration
// rather than a control boundary — which is exactly what this is.
const KBD_CAP =
  "inline-flex min-w-[1.6em] items-center justify-center rounded-sm border border-border bg-muted px-1 py-0.5 leading-none text-foreground";

export type KbdProps = Omit<React.ComponentProps<"kbd">, "children"> & {
  /**
   * The chord, one entry per key — `["Mod", "K"]`, `["Shift", "Enter"]`. Each
   * key becomes its own cap inside a wrapping `<kbd>`. Omit it and pass
   * `children` instead for a single free-form cap.
   */
  keys?: readonly string[];
  /**
   * Which modifier spelling to print. Defaults to `"generic"` (words); pass
   * `useKbdPlatform()` to follow the reader's actual machine.
   * @default "generic"
   */
  platform?: KbdPlatform;
  /** A single key's label, when `keys` is not used. */
  children?: React.ReactNode;
};

function Kbd({ keys, platform = "generic", className, children, ...props }: KbdProps) {
  return (
    <kbd data-slot="kbd" className={cn(KBD_ROOT, !keys && KBD_CAP, className)} {...props}>
      {keys
        ? keys.map((key, index) => (
            // The index is part of the React key because a chord may
            // legitimately repeat a key name, and the list is never reordered
            // — it is whatever the caller literally wrote.
            <kbd key={`${key}-${index}`} data-slot="kbd-key" className={KBD_CAP}>
              {keyGlyph(key, platform)}
            </kbd>
          ))
        : children}
    </kbd>
  );
}

/**
 * The platform is never going to change under a live page, so there is
 * nothing to subscribe to — but `useSyncExternalStore` still needs a
 * subscribe function, and an unsubscribe that does nothing.
 */
const subscribeToNothing = () => () => {};

/**
 * Reads the machine. `navigator.platform` is deprecated but is still the field
 * that says "MacIntel" on a Mac; the user-agent string is the fallback for
 * engines that have already emptied it.
 */
function readPlatform(): KbdPlatform {
  if (typeof navigator === "undefined") return "generic";
  return /mac|iphone|ipad|ipod/i.test(`${navigator.platform ?? ""} ${navigator.userAgent ?? ""}`) ? "apple" : "generic";
}

/** The server has no machine to read, so it always renders the word spellings. */
const serverPlatform = (): KbdPlatform => "generic";

/**
 * The reader's platform, resolved without breaking hydration.
 *
 * `useSyncExternalStore` is what makes that guarantee structural rather than
 * careful: React uses the SERVER snapshot for the server pass and for the
 * hydrating client render, then re-renders with the real one. So the two trees
 * always agree — a `useEffect` + `setState` version would work too, but it
 * would flip the value on a client-only mount as well, costing a second render
 * on every page whether or not it was ever hydrated.
 *
 * On a plain `createRoot` render (Storybook, the app) there is no server pass,
 * so the real platform is read on the first render and no flash occurs at all.
 */
function useKbdPlatform(): KbdPlatform {
  return React.useSyncExternalStore(subscribeToNothing, readPlatform, serverPlatform);
}

export { Kbd, useKbdPlatform };
