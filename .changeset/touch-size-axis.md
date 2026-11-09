---
"@fiestaboard/ui": minor
---

Touch size axis (universal slice 1.2). `size="touch"` gives a 44px target on Button (plus `icon-touch` for Icon Button), Input, SelectTrigger, SegmentedControl, Toggle (plus `icon-touch`), Chip (a 30px pill with a 44×44 hit area), Swatch (a 44px target around a 32px fill) and Switch (an unchanged track with a 44×44 hit area). Controls stamp `data-size`.

Adds the C21 pressed state, which is visual only: `data-pressed` is set while a pointer is down on Button, Chip, SegmentedControlItem and Swatch, and mirrors `:active` (Button default presses to `primary-active`). Touch sizes also scale to 0.97 under `motion-safe`.

Adds the opt-in W2 coarse-pointer layer: `theme.css` gains a `coarse:` variant, and putting `fui-coarse` on `<html>` floors the default-sized controls at 44px on a coarse pointer. Existing sizes are unchanged. `Input`'s numeric `size` still reaches the DOM as the HTML attribute.
