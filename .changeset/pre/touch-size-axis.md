---
"@fiestaboard/ui": minor
---

Touch size axis (universal slice 1.2). `size="touch"` gives a 44px target on Button (plus `icon-touch` for Icon Button), Input, SelectTrigger, SegmentedControl, Toggle (plus `icon-touch`), Chip (a 30px pill with a 44×44 hit area), Swatch (a 44px target around a 32px fill) and Switch (an unchanged track with a 44×44 hit area). Controls stamp `data-size`.

Adds the C21 pressed state, which is visual only. While a pointer is down, the attribute `data-press` is set on Button, Chip, SegmentedControlItem, Swatch and Toggle. It is a new name, separate from Base UI's `data-pressed`, which means "on" for Toggle and "popup open" for menu and popover triggers. Its styling mirrors `:active`: Button default presses to `primary-active`. Touch sizes also scale to 0.97 under `motion-safe`.

Adds the opt-in W2 coarse-pointer layer. `theme.css` gains a `coarse:` variant, and putting `fui-coarse` on `<html>` floors the default-sized controls at 44px on a coarse pointer.

`cn()` now recognises the `touch`, `control-touch` and `toolbar-touch` spacing keys, so a caller's `className="h-12"` overrides a touch height.

Behaviour and type changes to check:

- **Keyboard press.** Holding Space on an outline, ghost, secondary, destructive or link Button (and on Chip) now shows the hover fill, because those variants gained `active:` styles that a mouse press already showed through hover. Chip also gains `active:border-brand`.
- **`InputProps["size"]` is wider.** It goes from `number` to `"default" | "touch" | number`. This is a type-level break if you spread `InputProps` onto a native `<input>`: narrow the value first. A numeric `size` still reaches the DOM as the HTML attribute.
- **Shrunk icon buttons under `fui-coarse`.** An icon Button made smaller with `className` (e.g. `size-6`) floors back to 44px under `.fui-coarse` on a coarse pointer. Use `size="icon-xs"`, which is excluded from the floor, or override with `coarse:min-h-0 coarse:min-w-0`.

Existing sizes are unchanged.
