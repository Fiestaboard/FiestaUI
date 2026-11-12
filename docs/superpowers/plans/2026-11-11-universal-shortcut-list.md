# Slice 1.4d: ShortcutList (W4, WEB-17)

**Goal:** a data-driven keyboard-shortcut list built on `Kbd`, with a popover wrapper, so web 2.7 can ship the `?` list (WEB-17) without hand-rolling one.

**Figma** (`ZQ8RMELCO6qEOFZUnQu36e`, read only):

- 07 `57:27771`: Desktop 1440, Page editor, Note Array, "Overflow start + Shortcuts". The popover is `57:28953`, "Keyboard shortcuts (popover, opened with ?)". The triggers are the header Button "Shortcuts" (`57:28576`) and the toolbar hint "[?] All shortcuts" (`57:28704`).
- 08 `59:68086`: W4, "Keyboard shortcut overlay built from Kbd". It proposes `groups={[{title, items:[{keys, label}]}]}`. The grouped form comes from 04 `42:90794` (iPad, "Insert" and "Edit & send").

**Scope:** documentation only. ShortcutList renders shortcuts and does not bind any of them. BoardViewport (#387) owns the board's ← → / Home / End / F keys, and the consumer (web 2.7) owns the global `?` key, through the controlled `open` prop. The slice does not import from #387, and it does not touch chrome (#386), `kbd.tsx` or `popover.tsx`.

## Measurements (07 `57:28953`)

| Part | Figma | Code |
|---|---|---|
| Surface | 466 wide, radius 14, padding 20, gap 10, 1 px `border`, Elevation/modal | `w-[466px] max-w-[var(--available-width)]`, `rounded-[var(--radius-chrome)]` (14), `p-5 gap-2.5`, `border`, `shadow-modal`, `bg-popover` |
| Header | "Keyboard shortcuts" Heading/base (16/1.25, semibold, -0.4) + note Text/xs muted, gap 8 | `PopoverTitle` overridden to `text-base leading-5 tracking-tight`; note is `PopoverDescription` `text-xs text-muted-foreground` |
| Row | 24 high, label Text/sm 278 wide, gap 8, keys start at x 286 | subgrid row `min-h-6`, columns `minmax(0,278px) minmax(max-content,1fr)`, `gap-x-2` |
| Keys | Kbd caps (11.375 px = 0.8125em of 14), gap 4; alternatives split by a muted "·" | `Kbd keys` in a `text-sm` cell; `gap-1`; separator `text-xs text-muted-foreground`, `aria-hidden`, plus sr-only "or" |
| Footnote | Text/xs muted, full width | `footnote` slot |

## API

- `ShortcutList`: the body, usable inline (on a help page, or in a Sheet). Props: `groups`, `platform?`, `footnote?`, `labels?`.
- `ShortcutListPopover`: `Popover` + `ShortcutList`. Props: `trigger`, `open` / `defaultOpen` / `onOpenChange`, `side` / `align` / `anchor`, `hideTriggerOnTouch` (default true), and the list props.
- Data: `ShortcutGroup { id?, title?, items: ShortcutItem[] }`, `ShortcutItem { id?, label, keys }`. `keys` is either one chord (`["Mod","S"]`) or several alternatives (`[["Mod","Z"],["Mod","Shift","Z"]]`).
- `DEFAULT_SHORTCUT_LIST_LABELS`: `title`, `platformNote`, `or`, `close`.

## Behaviour

- **Semantics:** the popup is Base UI's `role="dialog"`, named by the title and described by the note. Each group is a `role="group"` named by its title (when it has one) around a `<dl>`: `<dt>` holds the action and `<dd>` the keys.
- **Focus:** `modal="trap-focus"`. Initial focus goes to the popup itself, so the list is read and no chip lights up. Tab reaches a close chip that is only visible under keyboard focus (Base UI asks for a `Close` inside the popup so touch screen readers can escape). Escape closes the popup, and focus returns to the trigger.
- **Platform keys:** each `Kbd` gets `platform ?? useKbdPlatform()`, so readers see ⌘ on Apple and "Ctrl" elsewhere. The server snapshot is `generic`, so there is no hydration mismatch. The component has no platform prop for chrome.
- **Touch** (Jev `jev_decide` 2026-11-11, `css_hide_trigger_no_fine_pointer`, p 0.84): the trigger is hidden when no fine pointer exists (`not-any-pointer-fine:hidden`), so phones don't show a keyboard affordance. The popover still opens through controlled `open` (an iPad with a keyboard pressing `?`). `hideTriggerOnTouch={false}` opts out. Evidence: WEB-FIGMA-COVERAGE marks the list "D" (desktop) only; 08 calls it "desktop keyboard discoverability"; no 07 mobile frame draws a trigger.

## Tasks (TDD)

1. Red: write `shortcut-list.test.tsx` (structure, chords, alternatives, groups, platform, labels, popover open/close, Escape, focus return, focus trap, touch class, controlled open).
2. Green: write `shortcut-list.tsx`.
3. Add stories: Default (Apple, 07 data), Generic (Ctrl), Grouped (04 data), Inline list, Header trigger, Toolbar hint trigger, Touch (trigger hidden, opened by key), Narrow (mobile). VRT shoots each one at desktop and mobile, in light and dark.
4. Add the inventory entry and demo, plus the inventory test for the coverage gate; add the `index.ts` export and a minor changeset.
5. Run the local checks: typecheck, lint, format, test:coverage (changed-file gate), build, release:test, and the Storybook a11y test-runner in both themes.
6. Drive the stories in Chromium (desktop, plus a `hasTouch` mobile context) and save the shots to `program/shots/fiestaui-1.4d/`.
