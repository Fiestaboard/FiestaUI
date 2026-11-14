# Universal slice 1.2: the touch size axis

**Program row:** MASTER-PLAN §4.4, row 1.2 (T1, C7, C21 pressed state only, W2).
**Figma (read-only):** `ZQ8RMELCO6qEOFZUnQu36e`, page 08: C7 `59:144018`, C21 `61:30024`, W2 `59:67800`; T1 thumbnail `59:62975`.
**Base:** `origin/alpha` at `900fabf6` (8.17.0-alpha.0, slice 1.1 tokens present).

## Goal

One prop family, landed atomically. `size="touch"` gives a ≥44 px target on every interactive
control a phone reaches first. It builds only on the 1.1 tokens (`--touch-target`,
`--control-h-touch`; utilities `min-h-touch`, `size-touch`, `h-control-touch`). Every existing
size renders byte-identically.

## API

| Component                                      | Touch geometry                                                                           | How the 44 px target is met                   |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------- |
| `Button size="touch"`                          | 44 px tall, `px-6` (T1 draws it wider than the default around the same label), `text-sm` | visible box                                   |
| `Button size="icon-touch"` (Icon Button)       | 44 × 44                                                                                  | visible box                                   |
| `Input size="touch"`                           | 44 px tall, `text-base` (16 px also stops iOS zoom-on-focus)                             | visible box                                   |
| `SelectTrigger size="touch"`                   | 44 px tall, `text-base`                                                                  | visible box                                   |
| `SegmentedControl size="touch"` (and per item) | 44 px pills / `min-h` 44 grid cells                                                      | visible box                                   |
| `Toggle size="touch"` / `"icon-touch"`         | 44 px tall, `min-w` 44 / 44 × 44                                                         | visible box                                   |
| `Chip size="touch"`                            | 30 px pill (C7: "30pt chip, 44pt line")                                                  | invisible `::before` hit area, ≥44 × 44       |
| `Swatch size="touch"`                          | 44 px button, 32 px fill                                                                 | the button is the target (transparent gutter) |
| `Switch size="touch"`                          | track unchanged (24 × 44)                                                                | invisible `::before` hit area, ≥44 × 44       |

Jev (`jev_decide`, p=0.98) chose the mixed approach over "everything visibly 44" and "hit areas only".

**Pressed state (C21, visual only, no haptics and no `navigator.vibrate`).**

- `data-pressed` is the momentary-press hook. Button, Chip, SegmentedControlItem and Swatch set it
  from pointer events (`pointerdown` → set; `pointerup`/`pointercancel`/`pointerleave` → clear).
  iOS Safari applies `:active` only with a touch listener on the element or an ancestor, so `:active`
  alone is not a dependable press on phones. Base UI's Select trigger stamps the same attribute itself; this slice gives the trigger a 44 px size but no pressed fill, so no existing Select shot moves.
- Pressed styling mirrors `:active`: Button default = `primary-active` (Figma "Pressed = primary/active").
  Other variants press to their hover fill. At touch sizes the control also scales to 0.97, under
  `motion-safe` only.
- **Toggle exception.** Base UI's Toggle already uses `data-pressed` for ON (`aria-pressed`). Its
  momentary press uses `:active` only, and that is documented in the source.

**`fui-coarse` (W2).** A new `coarse` custom variant in `theme.css`:
`@media (pointer: coarse)` AND an ancestor `.fui-coarse`. Opt-in: a host puts `fui-coarse` on `<html>`.
Under it, the default sizes of the controls above gain a 44 px `min-height` (and `min-width` for icon
sizes), and Chip and Switch gain their hit area. Nothing changes without the class or on a fine pointer.
Button `icon-xs` is excluded, because it is the in-host affordance whose host is smaller than 44.

## Tasks (TDD)

1. Tests first (vitest, jsdom). Each component renders `data-size="touch"` and the touch utilities,
   sets and clears `data-pressed` on pointer events, and ignores pointer events while disabled or loading.
   Raise whole-file coverage on the touched legacy files (select, switch, toggle, chip) to the gate.
2. `src/lib/press.ts`: compose the press handlers. `theme.css`: one `@custom-variant coarse` line.
3. Component changes, then stories: a `Touch` story per component, and a `Pressed` story (forced
   `data-pressed`). The Button `AllSizes` story includes the touch sizes (story-variant-coverage).
4. Inventory summaries. Parity notes in `program/status/fiestaui-1.2.md`.
5. Verify: format, lint, typecheck, `test:coverage` + `coverage-changed`, `release:test`, build,
   build-storybook. Open the PR into `alpha` with one minor changeset.

## VRT expectations

Additions: the new Touch/Pressed stories × 2 themes × 2 viewports. Changes: Button `AllSizes`
(story-variant-coverage requires every size in it) and the inventory page (four summaries mention touch).
Nothing else moves: every other new class is a new size, an inert `coarse:` variant, or an `active:`/`data-[pressed]:` state no shot captures.
