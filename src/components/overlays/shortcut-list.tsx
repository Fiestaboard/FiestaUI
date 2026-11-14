"use client";

import { X } from "lucide-react";
import * as React from "react";

import { cn } from "../../lib/utils";
import { Kbd, type KbdPlatform, useKbdPlatform } from "../typography/kbd";
import { overlayCloseVariants } from "./overlay-close";
import { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "./popover";

/*
 * ShortcutList — the keyboard-shortcut list, and its popover (slice 1.4d,
 * W4 / WEB-17). Figma `ZQ8RMELCO6qEOFZUnQu36e`: 07 `57:28953` ("Keyboard
 * shortcuts (popover, opened with ?)") inside the desktop editor `57:27771`,
 * and 08 `59:68086` ("Keyboard shortcut overlay built from Kbd"), whose
 * grouped form comes from 04 `42:90794`.
 *
 * IT DOCUMENTS, IT DOES NOT BIND. Nothing here listens for a shortcut. The
 * list is data the app hands in, so it can never drift from a binding it
 * does not know about, and the keys it describes stay owned by whoever
 * implements them (BoardViewport owns the board's ← → / Home / End / F; the
 * app owns Save, Show now and the global `?` that opens this popover, through
 * the controlled `open` prop).
 *
 * PLATFORM-AWARE KEYS, NO PLATFORM CHROME. Every chord is a `Kbd`, and the
 * platform is `platform ?? useKbdPlatform()`: ⌘ on Apple, "Ctrl" elsewhere,
 * with the hook's server snapshot keeping hydration stable. Write "Mod" for
 * the accelerator. The surface itself is the same on every platform.
 *
 * SEMANTICS. A `<dl>`: the action is the term, its keys the definition —
 * which is what a screen reader's "definition list, 8 items" announces, and
 * why each pair is wrapped in a `<div>` (valid in a `<dl>`) that joins the
 * list's grid as a subgrid, so labels and keys line up across rows. A titled
 * group is a `role="group"` named by its title; an untitled one is plain.
 * Alternatives ("Undo · Redo") read "⌘ Z or ⌘ ⇧ Z": the dot is decoration
 * and a visually hidden "or" carries the meaning.
 *
 * TOUCH. Phones have no keyboard, so by default the popover's trigger is
 * hidden wherever no fine pointer exists (`not-any-pointer-fine:hidden`):
 * WEB-FIGMA-COVERAGE draws the list for desktop only, and 08 calls it
 * "desktop keyboard discoverability" (Jev 2026-11-11, p 0.84). The popover
 * itself still opens from controlled `open`, so an iPad with a keyboard and
 * no trackpad still gets the list from `?`. `hideTriggerOnTouch={false}`
 * opts out.
 *
 * WHY NOT #385's `coarse:`. That variant is `(pointer: coarse)` plus the
 * `.fui-coarse` opt-in, and it is a touch-TARGET floor: it grows a control
 * for a finger. This gate hides a KEYBOARD affordance, so it asks the other
 * question — is any fine pointer present at all? — and is always on. A touch
 * laptop or an iPad with a trackpad keeps the trigger; a phone loses it.
 */

/** One chord: the keys pressed together, in order. `["Mod", "S"]`. */
export type ShortcutChord = readonly string[];

export interface ShortcutItem {
  /** Stable React key. Defaults to the item's position. */
  id?: string;
  /** What the shortcut does: "Save", "Close a picker". */
  label: React.ReactNode;
  /**
   * One chord (`["Mod", "S"]`), or several alternatives
   * (`[["Mod", "Z"], ["Mod", "Shift", "Z"]]`), which render split by "·" and
   * read as "or". Key names follow `Kbd`: "Mod" is ⌘ / Ctrl.
   */
  keys: ShortcutChord | readonly ShortcutChord[];
}

export interface ShortcutGroup {
  /** Stable React key. Defaults to the group's position. */
  id?: string;
  /** Group label ("Insert", "Edit & send"). Omit for a single flat list, as in 07. */
  title?: React.ReactNode;
  items: readonly ShortcutItem[];
}

export interface ShortcutListLabels {
  /** The popover's title, and its accessible name. */
  title: string;
  /** The line after the title; also the dialog's description. Empty hides it. */
  platformNote: string;
  /** Spoken between alternatives. */
  or: string;
  /** The keyboard-only close chip's accessible name. */
  close: string;
}

export const DEFAULT_SHORTCUT_LIST_LABELS: ShortcutListLabels = {
  title: "Keyboard shortcuts",
  platformNote: "⌘ on Mac · Ctrl on Windows and Linux",
  or: "or",
  close: "Close",
};

/** `keys` is a chord when its first entry is a string. */
function toChords(keys: ShortcutItem["keys"]): readonly ShortcutChord[] {
  return typeof keys[0] === "string" ? [keys as ShortcutChord] : (keys as readonly ShortcutChord[]);
}

export interface ShortcutListProps extends Omit<React.ComponentProps<"div">, "children"> {
  groups: readonly ShortcutGroup[];
  /** Force a key spelling. Defaults to the reader's machine (`useKbdPlatform`). */
  platform?: KbdPlatform;
  /** Small print under the list (07: "No single-key shortcuts while typing…"). */
  footnote?: React.ReactNode;
  labels?: Partial<ShortcutListLabels>;
}

/*
 * 07: rows 24 high, the label column 278 wide, keys starting 8 px later. The
 * label column gives way first on a narrow screen; the keys keep their width.
 */
const LIST_GRID = "grid grid-cols-[minmax(0,278px)_minmax(max-content,1fr)] gap-x-2 gap-y-2.5";

function ShortcutList({ groups, platform, footnote, labels, className, ...props }: ShortcutListProps) {
  const machine = useKbdPlatform();
  const keyPlatform = platform ?? machine;
  const or = labels?.or ?? DEFAULT_SHORTCUT_LIST_LABELS.or;
  const baseId = React.useId();

  return (
    <div data-slot="shortcut-list" className={cn("flex flex-col gap-2.5", className)} {...props}>
      {groups.map((group, groupIndex) => {
        const titleId = `${baseId}-group-${groupIndex}`;
        const titled = group.title != null && group.title !== "";
        return (
          <div
            key={group.id ?? groupIndex}
            data-slot="shortcut-list-group"
            role={titled ? "group" : undefined}
            aria-labelledby={titled ? titleId : undefined}
            className="flex flex-col gap-1"
          >
            {titled && (
              <div id={titleId} data-slot="shortcut-list-group-title" className="text-xs text-muted-foreground">
                {group.title}
              </div>
            )}
            <dl data-slot="shortcut-list-items" className={LIST_GRID}>
              {group.items.map((item, itemIndex) => {
                const chords = toChords(item.keys);
                return (
                  <div
                    key={item.id ?? itemIndex}
                    data-slot="shortcut-list-row"
                    className="col-span-2 grid min-h-6 grid-cols-subgrid items-center"
                  >
                    <dt className="text-sm text-foreground">{item.label}</dt>
                    <dd className="m-0 flex flex-wrap items-center gap-1 text-sm">
                      {chords.map((chord, chordIndex) => (
                        <React.Fragment key={chordIndex}>
                          {chordIndex > 0 && (
                            <>
                              <span
                                aria-hidden="true"
                                data-slot="shortcut-list-separator"
                                className="text-xs text-muted-foreground"
                              >
                                ·
                              </span>
                              <span className="sr-only">{` ${or} `}</span>
                            </>
                          )}
                          <Kbd keys={chord} platform={keyPlatform} />
                        </React.Fragment>
                      ))}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        );
      })}
      {footnote != null && (
        <p data-slot="shortcut-list-footnote" className="text-xs text-muted-foreground">
          {footnote}
        </p>
      )}
    </div>
  );
}

type PopoverRootProps = React.ComponentProps<typeof Popover>;
type PopoverContentProps = React.ComponentProps<typeof PopoverContent>;

export interface ShortcutListPopoverProps extends Omit<ShortcutListProps, "className"> {
  /** The element that opens the list: a "Shortcuts" Button, or a "? All shortcuts" hint. */
  trigger: React.ReactElement;
  /** Controlled open state. Pair with `onOpenChange`; set it from the app's `?` key. */
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: PopoverRootProps["onOpenChange"];
  /**
   * Hide the trigger where no fine pointer exists (phones). The popover still
   * opens from `open`.
   * @default true
   */
  hideTriggerOnTouch?: boolean;
  side?: PopoverContentProps["side"];
  /** @default "start" */
  align?: PopoverContentProps["align"];
  /** @default 8 */
  sideOffset?: number;
  /** Anchor the popup somewhere other than the trigger (e.g. while the trigger is hidden). */
  anchor?: PopoverContentProps["anchor"];
  /** Classes for the popup surface. */
  className?: string;
}

/*
 * 07 `57:28953`: 466 wide, radius 14, padding 20, gap 10, 1 px border,
 * Elevation/modal. 14 is `--radius-chrome`, the editor-chrome radius the
 * EditorPreview pane beside it uses (Fable ruling on #391 N1).
 */
const SURFACE =
  "flex w-[466px] flex-col gap-2.5 rounded-[var(--radius-chrome)] border bg-popover p-5 text-popover-foreground shadow-modal";

/** Where the popup hangs from while its trigger is hidden: the top-left gutter. */
const HIDDEN_TRIGGER_ANCHOR = {
  getBoundingClientRect: () => new DOMRect(8, 8, 0, 0),
};

function ShortcutListPopover({
  trigger,
  open,
  defaultOpen,
  onOpenChange,
  hideTriggerOnTouch = true,
  side = "bottom",
  align = "start",
  sideOffset = 8,
  anchor,
  className,
  labels,
  ...listProps
}: ShortcutListPopoverProps) {
  const text = { ...DEFAULT_SHORTCUT_LIST_LABELS, ...labels };
  const popupRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  // A hidden trigger (phones, opened from `?`) has no box, and the popup would
  // pin to the viewport's corner with no gutter. Fall back to a point at the
  // top-left gutter; the kit's collision padding then keeps it on screen.
  const fallbackAnchor = React.useCallback(
    () =>
      triggerRef.current && triggerRef.current.getClientRects().length > 0 ? triggerRef.current : HIDDEN_TRIGGER_ANCHOR,
    [],
  );

  return (
    <Popover open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} modal="trap-focus">
      <PopoverTrigger ref={triggerRef} asChild className={cn(hideTriggerOnTouch && "not-any-pointer-fine:hidden")}>
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        ref={popupRef}
        data-slot="shortcut-list-popover"
        side={side}
        align={align}
        sideOffset={sideOffset}
        anchor={anchor ?? fallbackAnchor}
        label={text.title}
        // The dialog itself takes focus, so the list is read first and the
        // close chip only lights up when someone Tabs to it.
        initialFocus={popupRef}
        className={cn(SURFACE, className)}
      >
        <div data-slot="shortcut-list-header" className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-8">
          <PopoverTitle className="text-base leading-5">{text.title}</PopoverTitle>
          {text.platformNote && (
            <PopoverDescription className="text-xs text-muted-foreground">{text.platformNote}</PopoverDescription>
          )}
        </div>
        <ShortcutList labels={labels} {...listProps} />
        {/*
         * Base UI asks for a Close inside a focus-trapping popup so touch
         * screen readers can leave it. Figma draws none, so the kit's dismiss
         * chip stays invisible until keyboard focus reaches it.
         */}
        <PopoverClose
          data-slot="shortcut-list-close"
          aria-label={text.close}
          className={cn(
            overlayCloseVariants({ size: "sm" }),
            // Opacity only, never pointer-events-none: VoiceOver and TalkBack
            // can activate by a hit-tested tap at the element's centre, and
            // that tap must land on the chip, not fall through to the list.
            "opacity-0 focus-visible:opacity-100",
          )}
        >
          <X aria-hidden />
        </PopoverClose>
      </PopoverContent>
    </Popover>
  );
}

export { ShortcutList, ShortcutListPopover };
