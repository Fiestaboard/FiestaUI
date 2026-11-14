---
"@fiestaboard/ui": minor
---

Add `ShortcutList` and `ShortcutListPopover` (slice 1.4d, W4 / WEB-17): the keyboard-shortcut list behind the editor's "Shortcuts" button and the `?` key. It documents shortcuts and binds none.

- Data-driven: `groups={[{ title?, items: [{ label, keys }] }]}`. `keys` is one chord (`["Mod", "S"]`) or several alternatives (`[["Mod", "Z"], ["Mod", "Shift", "Z"]]`), split by "·" and read as "or".
- Every chord is a `Kbd`, and the platform follows the reader's machine (`useKbdPlatform`): ⌘ on Apple, "Ctrl" elsewhere. Pass `platform` to force one.
- The popover is a dialog named "Keyboard shortcuts", with a description list inside. Focus moves into it and is trapped, Escape closes it, and focus returns to the trigger. Open it from the app's `?` key through the controlled `open` prop.
- Phones have no keyboard, so the trigger is hidden where no fine pointer exists. `hideTriggerOnTouch={false}` opts out, and controlled `open` still works.
- `ShortcutList` renders the list inline, for help or Settings pages. English copy is exported as `DEFAULT_SHORTCUT_LIST_LABELS`.
- `cn()` now merges the theme shadows (`shadow-card`, `shadow-card-hover`, `shadow-modal`) as shadows. A size or `none` shadow next to one of them is now "last one wins", so `className="shadow-lg"` on Dialog, Sheet or AlertDialog now overrides `shadow-modal`, and a shadow colour such as `shadow-black/20` no longer deletes a theme shadow. `ConversationScrollButton` now shows the `shadow-card` it always asked for, instead of Button outline's `shadow-xs`.
