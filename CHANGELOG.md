# @fiestaboard/ui

## 8.17.0-alpha.1

### Minor Changes

- [#387](https://github.com/Fiestaboard/FiestaUI/pull/387) [`51e385c`](https://github.com/Fiestaboard/FiestaUI/commit/51e385c56c682e8d0348adf2652a27ae5b68fe75) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Boards that are wider than their slot can now scroll instead of shrinking (slices 1.5a and 1.5b).

  - **New `BoardViewport`.** The board scrolls sideways inside a fixed bezel.
    - An edge fade (`--board-edge-fade`) marks each side that has more board.
    - Scrolling snaps one Note at a time on a note array, one column of Notes on a multi-row array, and one tile column on other boards.
    - The indicator reads "Note 1 of 3", "Column 1 of 2 · 4 notes" or "Columns 1–16 of 22". The current page is a pill (web 07) by default; `indicator="dot"` gives mobile 02's dot. Screen readers hear the indicator once a scroll settles.
    - The scroller is a `region` landmark only while the board overflows; a board that fits is a named `group`. In a list, give each board its own `labels.region`.
    - The viewport is a labelled region. ← → move a page, Home / End jump to the ends, and F toggles Fit / Actual size. Scrolling is instant under reduced motion.
    - Fit is the opt-in overview. When it scales a tile below `minTile` (default 13 px), it is labelled "Overview · … · tap Actual to read".
    - Actual size is the default. A board that fits shows no controls.
  - **`ScaledBoardDisplay`** gains `defaultMode`, `persist`, a controlled `mode` with `onModeChange`, and `layout` (`phone-hero`, `medium-hero`, `pane` or `full-screen`).
    - The mode resolves in this order: `mode`, then the session's stored choice (when `persist`, which defaults to true), then `defaultMode`, then `"fit"`.
    - With no new props, it renders exactly as before.
    - Its actual-size scroller is now a focusable, named region (`scrollRegionLabel`).
  - **`BoardSizeIndicator`** gains `format="cols×rows"`, which reads "22 × 6".
  - **Shared Fit / Actual preference.** Both components use one session key.
    - A Fit or Actual tap on any preview carries over to previews mounted later in the session, whatever their board type.
    - Previews already on screen don't follow each other live.
    - Hosts that control `mode` should pass `persist={false}`, so their state doesn't leak into other previews.
  - **New exports:** `useBoardPreviewMode`, `resolveBoardPreviewMode`, `readStoredBoardPreviewMode` and `writeStoredBoardPreviewMode` share one Fit / Actual preference across both components.

- [#388](https://github.com/Fiestaboard/FiestaUI/pull/388) [`aa8fa40`](https://github.com/Fiestaboard/FiestaUI/commit/aa8fa406998c93b8325f1137c61cee5f094f22f6) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Bottom sheets and snackbar actions (slice 1.3).

  - **Visible change:** toasts that pass `action` (and `cancel`) now render them as 44px buttons on their own row under the text: `action` with the secondary fill first, `cancel` as a ghost button after it, in that order in the DOM and tab order too. Toasts without actions are unchanged.
  - `SheetContent side="bottom"` gains `grabber` (a 36×5 drag handle with a 44px hit area; drag down to dismiss), `detents` (`"half"`, `"full"` or viewport fractions) with `detent` / `defaultDetent` / `onDetentChange`, and `scrim={false}` for a sheet that leaves the page visible. With detents the grabber is a keyboard-operable `role="separator"` (↑/↓, Home/End, Enter/Space) with `aria-valuetext` ("Half height"). Under a grabber, a direct `SheetHeader` child is pinned above the scrolling body and a direct `SheetFooter` child is pinned below it (sticky footer). `labels.close`, `labels.grabber` and `labels.detentValue` localize the sheet. The close chip gains a 44px hit area. New exports: `SheetDetent`, `SheetLabels`, `SheetContentProps`, `DEFAULT_SHEET_LABELS`.
  - `ToolbarDropdown presentation="popover" | "sheet" | "auto"` (default `"popover"`). `sheet` shows the panel as a non-modal bottom sheet with no scrim, titled by `label`; `auto` uses it below 48rem or on a coarse pointer. New `labels.close`.
  - `Toaster` lifts bottom-anchored toasts above the mobile bottom nav by reading `--bottom-nav-offset` (falls back to `0px`) plus the bottom safe area; opt out with `clearBottomNav={false}`.

- [#392](https://github.com/Fiestaboard/FiestaUI/pull/392) [`4b624d2`](https://github.com/Fiestaboard/FiestaUI/commit/4b624d2dec55501e80f34861ba76ea86fc6c9279) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Cards for choosing by what a board shows (slice 1.8c, Figma 08 C17 and C25).

  - New `PagePreviewCard`: a page shown as its board (a real Tile-sm `StaticBoardDisplay`, centred and cropped, never scaled), with the page name, a subtitle and a chevron. The whole card is one button, or a link with `render={<a href>}`. `selected` draws the selected ring, tint and check and sets `aria-current`. It is named apart from the existing route-level `PageCard`, which is unchanged.
  - New `ChoiceCard`, `ChoiceCardGroup` and `ChoiceCardPreview`: setup-style options with an actual-size board crop (`offsetX`/`offsetY`, a `--board-edge-fade` right fade, an `overlay` slot), title, description and a mono meta line. `ChoiceCardGroup` is a `radiogroup` (one tab stop, arrows and Home/End move and select, hidden radio inputs under `name`); `ChoiceCardGroup multiple` is a group of checkboxes (each its own tab stop, Space toggles, `value: string[]`). The mark is round for a radio and square for a checkbox; selected is ring + tint + filled mark.
  - `PluginCard variant="compact"` (opt-in; the default `"card"` is unchanged): the Marketplace result row with a board-black `icon` tile, name and category, author, an install action from `installState` (`"available"`, `"installing"`, `"installed"`, `"needs-setup"`, `"update"`) with `onInstallAction` and localizable `installLabels`, and a `displayTypes` "Works with" slot. The install button always reserves the "Installing…" width, so the row does not reflow; the flips to Installing… and Installed are announced politely (`formatInstallAnnouncement`), and when Installed replaces the focused button, focus moves to the plugin name link. New exports: `PluginInstallState`, `DEFAULT_PLUGIN_INSTALL_LABELS`.
  - New class `.selected-ring` in `theme.css`: the shared selected ring (a `--primary` border plus one inset pixel, no change of size), keyed on `data-checked` / `data-selected`. It composes with `.focus-ring`, so keyboard focus on a selected card keeps the selection ring. ChoiceCard and PagePreviewCard both use it.

- [#394](https://github.com/Fiestaboard/FiestaUI/pull/394) [`1f60342`](https://github.com/Fiestaboard/FiestaUI/commit/1f60342b79ba215b745744057f3e20ba05412053) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add `DisplayTypeChip` and Display content props (slice 1.5c).

  - **`DisplayTypeChip`** (new, 02 FB / Display type): a 24 px muted pill with an icon and a mono label naming which kind of display something is: `type="flagship" | "note" | "note-array" | "pixoo" | "tc001" | "tc002" | "panel"`. Informational only (no role, no tab stop). `label` and `detail` translate or extend the default text (`detail={null}` drops it). Also exports `DISPLAY_TYPES`, `DISPLAY_TYPE_LABELS` and `displayTypeForModel(model)`.
  - **`DisplayPreview` content props** (02 Display / LED & Panel `Content`): `lines` draws Line 1–3 (on an LED, line 2 board green and line 3 board orange; plain on split-flap), and `content="sample"` draws fixed sample art sized to the model and board. The housing carries `data-content`. Without the new props a preview renders exactly as before.
  - New helpers `displayLinesMarkup`, `displaySampleMessage`, `DISPLAY_SAMPLES` and `DISPLAY_LINE_COLORS`, and the `DisplayContent` type.

- [#393](https://github.com/Fiestaboard/FiestaUI/pull/393) [`b25317d`](https://github.com/Fiestaboard/FiestaUI/commit/b25317d15e3f328f2c097330e3b3dc52cd5d553f) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Duration chips, Countdown and NowShowingCard (universal slice 1.7b; C15, WEB-11, C14).

  - New `DurationChipGroup`, built on `SegmentedControl` (same radiogroup, arrow keys and Home/End): 44px pill chips that fill with the foreground colour and show a check when selected, `layout="row" | "grid" | "auto"` (2×2 below `sm`), and an `outcome` sentence rendered under the chips as a polite live region that also describes the group. `buildDurationOptions({ nextChange })` returns CANON's 15 min · 1 hr · Until <next change> · Until I cancel. Also exports `OutcomeLine` (`size="sm" | "md"`), `durationChipVariants`, `durationChipGroupVariants`, `outcomeLineVariants` and `DEFAULT_DURATION_OPTION_LABELS`.
  - New `Countdown`: "2h 42m left" with "until 9:00 PM" (formatted with `locale` / `timeZone`, or `untilLabel`) and an optional decorative bar when `startedAt` is known. It re-renders once per minute, never per second; the visible text is `role="timer"` (not announced), and a hidden polite region speaks only at `announceAt` thresholds (default 5 minutes) and once at the end (`onEnd`). Exports `formatRemaining` and `DEFAULT_COUNTDOWN_LABELS`.
  - New `NowShowingCard` (`variant="hero" | "compact"`): status dot and "Now showing · <display>" header, a board slot, a mode badge (Schedule Mode / Manual Mode / Override), the page title, and countdown, outcome and actions slots. `state="preview"` shows "Preview · Not sent yet". Exports `DEFAULT_NOW_SHOWING_CARD_LABELS`.

- [#391](https://github.com/Fiestaboard/FiestaUI/pull/391) [`2482d68`](https://github.com/Fiestaboard/FiestaUI/commit/2482d689b0bc494bfe7f316b9080fe4211d536ca) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add `EditorPreview` (slice 1.6a, W1 / WEB-03): the page editor's always-visible live preview. It frames a board you pass as `children` and never collapses.

  - `variant="pane"` (default): the desktop editor's sticky card, with a header (status dot, "Live preview", the board name and details in mono, and a `headerAction` slot), the board, a mirror `Switch` labelled by `liveLabel` (default "Mirror to board while editing") with an optional `liveAction` such as Replay, and a `statusLine`.
  - `variant="docked"`: the phone editor's sticky strip ("Live preview · Kitchen board"). Its mirror switch lives in the editor's More sheet, so the dock shows a "Mirroring" badge while `live` is on.
  - Mirroring is controlled (`live`, `onLiveChange`) or uncontrolled (`defaultLive`, off by default). The status line is a polite live region. English copy is exported as `DEFAULT_EDITOR_PREVIEW_LABELS`.

- [#389](https://github.com/Fiestaboard/FiestaUI/pull/389) [`e425abd`](https://github.com/Fiestaboard/FiestaUI/commit/e425abdc08e06b05452e6b5fced301adcb639822) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add `ListRow`, `DropdownMenu trigger="context"` and `SortableList` (slices 1.8a and 1.8b).

  - **`ListRow`** and **`ListRowGroup`**: one record in a list, with `leading`, `title`, `description`, `meta` and `trailing` slots. `layout="auto"` (the default) keeps the meta beside the text until the text column falls below 10rem, then wraps it under the description, so rows stack at large text sizes; `inline` and `stacked` pin either form. `variant="plain" | "card"`, `size="default" | "touch"` (48px or 56px floor), and `render` for a link or button row. `ListRowGroup` is a `role="list"` (`inset`, `plain` or `separated`) whose rows render as `<li>` and inherit its variant and size.
  - **`DropdownMenu trigger="context"`**: the `DropdownMenuTrigger` becomes a context-menu area that opens on right-click, a long press, Shift+F10 or the Menu key. A keyboard open anchors the menu under the focused element and returns focus there on close. The default (`click`) menu is unchanged.
  - **`SortableList`**, with `SortableListHandle`, `SortableListMoveButtons`, `useSortableItem` and `arrayMove`: reorder by pointer drag (mouse, pen or touch, with an insertion line), by keyboard (Space lifts, arrows and Home/End move, Space or Enter drops, Escape restores), or with Move up / Move down. Each step is announced in a polite live region that is also the visible status line (`hideStatus` keeps it screen-reader-only). Controlled through `onMove(from, to)`; English `DEFAULT_SORTABLE_LIST_LABELS` are overridable through `labels`. No new dependency.

- [#386](https://github.com/Fiestaboard/FiestaUI/pull/386) [`bd63727`](https://github.com/Fiestaboard/FiestaUI/commit/bd637273306ae23f2563a172eefc48fbe0985657) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Navigation and hub identity for the universal web shell, all additive with backward-compatible defaults:

  - `Sidebar variant="bottom-nav"`: below the rail breakpoint the hamburger gives way to a five-slot tab bar pinned to the bottom. Up to five destinations fit as they are. Past five, or when there is an account menu to reach, the first four are tabs and the fifth is "More" (`labels.more`), which opens the drawer with the rest. More lights while the current route is one it holds, and wears a dot for any badge inside it or for `menuNotice`. The default, `variant="header-menu"`, is unchanged.
  - `SidebarNavItem.badge` (`{ count?, label }`): a dot or a count (99+) over the row's icon, on the rail, in the drawer and on the tab bar. The required `label` joins the row's accessible name, so the badge is never colour alone.
  - `railBreakpoint: "lg" | "md"` on `Sidebar` and `MainContent` (default `"lg"`): the rail, and MainContent's padding for it, can take over from 768px instead of 1024px. `MainContent bottomNav` pads the page clear of the tab bar.
  - `BoardSelector` gains `host` and `status` (`"online" | "remote" | "unreachable"`), with words from `labels.hubStatus`. The sidebar shows a hub line ("fiestapi.local · Online") with a StatusDot. The collapsed rail shows a state glyph (wifi, globe or wifi-off) and moves the words to the tooltip. The mobile header becomes a two-line pill ("Online · fiestapi.local"). The trigger is described by the words, and a state without words draws no indicator.

  The drawer's opener (More, or the hamburger in `header-menu`) rolls up the badges it hides as a red count, and a `menuNotice` alone as a brand dot. The Sidebar publishes `--bottom-nav-offset` on `<html>` while the bar is on screen, and anything that clears the bar reads it with a `0px` fallback. `PageLayout` gains `railBreakpoint`, so a page aligns with an `md` rail.

- [#395](https://github.com/Fiestaboard/FiestaUI/pull/395) [`bcbd9ce`](https://github.com/Fiestaboard/FiestaUI/commit/bcbd9ce9611b0edb270d5d1e76dc217b34071208) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add `ShortcutList` and `ShortcutListPopover` (slice 1.4d, W4 / WEB-17): the keyboard-shortcut list behind the editor's "Shortcuts" button and the `?` key. It documents shortcuts and binds none.

  - Data-driven: `groups={[{ title?, items: [{ label, keys }] }]}`. `keys` is one chord (`["Mod", "S"]`) or several alternatives (`[["Mod", "Z"], ["Mod", "Shift", "Z"]]`), split by "·" and read as "or".
  - Every chord is a `Kbd`, and the platform follows the reader's machine (`useKbdPlatform`): ⌘ on Apple, "Ctrl" elsewhere. Pass `platform` to force one.
  - The popover is a dialog named "Keyboard shortcuts", with a description list inside. Focus moves into it and is trapped, Escape closes it, and focus returns to the trigger. Open it from the app's `?` key through the controlled `open` prop.
  - Phones have no keyboard, so the trigger is hidden where no fine pointer exists. `hideTriggerOnTouch={false}` opts out, and controlled `open` still works.
  - `ShortcutList` renders the list inline, for help or Settings pages. English copy is exported as `DEFAULT_SHORTCUT_LIST_LABELS`.
  - `cn()` now merges the theme shadows (`shadow-card`, `shadow-card-hover`, `shadow-modal`) as shadows. A size or `none` shadow next to one of them is now "last one wins", so `className="shadow-lg"` on Dialog, Sheet or AlertDialog now overrides `shadow-modal`, and a shadow colour such as `shadow-black/20` no longer deletes a theme shadow. `ConversationScrollButton` now shows the `shadow-card` it always asked for, instead of Button outline's `shadow-xs`.

- [#384](https://github.com/Fiestaboard/FiestaUI/pull/384) [`ef6bca2`](https://github.com/Fiestaboard/FiestaUI/commit/ef6bca2605f313b4a4d6a8d7054f9ef0a847fbe7) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add `StatusBanner`, a persistent page-level status banner built on `Alert` with an `action` slot. Kinds: `paused`, `silenced`, `silence-soon`, `display-offline`, `hub-unreachable`, `device-offline`, `out-of-sync`, `no-viewer`, `init-error` and `https`. Each kind picks a tone, a distinct glyph and a default announcement urgency (`politeness` overrides it, `off` renders no live region). The live region wraps only the title and description, so actions are never read as part of the announcement. `StatusBannerAction` is a 32 px outline or ghost button that grows to 44 px (`--control-h-touch`) on a coarse pointer or inside a `touch` banner. The component ships no copy: consumers pass `title` and `description`.

- [#385](https://github.com/Fiestaboard/FiestaUI/pull/385) [`9049332`](https://github.com/Fiestaboard/FiestaUI/commit/90493325fc736b14c38948d9f74b2fe4f342fcf1) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Touch size axis (universal slice 1.2). `size="touch"` gives a 44px target on Button (plus `icon-touch` for Icon Button), Input, SelectTrigger, SegmentedControl, Toggle (plus `icon-touch`), Chip (a 30px pill with a 44×44 hit area), Swatch (a 44px target around a 32px fill) and Switch (an unchanged track with a 44×44 hit area). Controls stamp `data-size`.

  Adds the C21 pressed state, which is visual only. While a pointer is down, the attribute `data-press` is set on Button, Chip, SegmentedControlItem, Swatch and Toggle. It is a new name, separate from Base UI's `data-pressed`, which means "on" for Toggle and "popup open" for menu and popover triggers. Its styling mirrors `:active`: Button default presses to `primary-active`. Touch sizes also scale to 0.97 under `motion-safe`.

  Adds the opt-in W2 coarse-pointer layer. `theme.css` gains a `coarse:` variant, and putting `fui-coarse` on `<html>` floors the default-sized controls at 44px on a coarse pointer.

  `cn()` now recognises the `touch`, `control-touch` and `toolbar-touch` spacing keys, so a caller's `className="h-12"` overrides a touch height.

  Behaviour and type changes to check:

  - **Keyboard press.** Holding Space on an outline, ghost, secondary, destructive or link Button (and on Chip) now shows the hover fill, because those variants gained `active:` styles that a mouse press already showed through hover. Chip also gains `active:border-brand`.
  - **`InputProps["size"]` is wider.** It goes from `number` to `"default" | "touch" | number`. This is a type-level break if you spread `InputProps` onto a native `<input>`: narrow the value first. A numeric `size` still reaches the DOM as the HTML attribute.
  - **Shrunk icon buttons under `fui-coarse`.** An icon Button made smaller with `className` (e.g. `size-6`) floors back to 44px under `.fui-coarse` on a coarse pointer. Use `size="icon-xs"`, which is excluded from the floor, or override with `coarse:min-h-0 coarse:min-w-0`.

  Existing sizes are unchanged.

## 8.17.0-alpha.0

### Minor Changes

- [#382](https://github.com/Fiestaboard/FiestaUI/pull/382) [`c3a6816`](https://github.com/Fiestaboard/FiestaUI/commit/c3a68167f9ae164bf0b594fb355c98a493449867) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add the first universal-design tokens, all additive: touch Metrics (`--touch-target` 44px, `--control-h-touch`, `--toolbar-h-touch` 52px, `--sheet-grabber-*`; utilities `min-h-touch`, `size-touch`, `h-control-touch`, `h-toolbar-touch`), opaque pre-blended tints with dark pairs (`--tint-selected`, `--tint-info`, `--tint-warning`, `--tint-danger`; `bg-tint-*`), the board edge fade (`--board-edge-fade`, `--board-edge-fade-clear`), and the Display/* and editor mono type utilities (`text-display-sm`…`text-display-2xl`, `text-mono-editor-line|chip|gutter|count`). `tokens.json` gains `metrics` and `typography` groups.
