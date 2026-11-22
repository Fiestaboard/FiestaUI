# @fiestaboard/ui

## 8.17.0-alpha.7

### Patch Changes

- [#445](https://github.com/Fiestaboard/FiestaUI/pull/445) [`88628e1`](https://github.com/Fiestaboard/FiestaUI/commit/88628e1d8a1dc9226ac203fff77887bb23166356) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Shell insets and overlay details (bug bash F, BB-FS-6/-7/-8):

  - `railBreakpoint="md"`: the tablet band (768–1023) insets the rail 8px instead of 12 (MainContent `md:pl-[72px]`/`md:pl-[264px]`, PageLayout gutter 16 there), so content starts at x 88 beside the collapsed rail, as 07a's 900 frame draws it. From 1024 nothing moves.
  - A bare `PageHeader` (anywhere inside `PageLayout`, not inside a `PageCard`) sits 16px below the page's top from the rail breakpoint up: header top at 28 (24 in the tablet band). `PageLayout` provides its `railBreakpoint` through context, so a wrapping element cannot drop the offset. `PageCard` routes still align with the rail. With `railBreakpoint="md"` the tablet band always insets the rail 8px, whatever `sidebarInset` is.
  - The wide Dialog's close sits 24px from the top. While a Dialog, AlertDialog or Sheet scrim is open the root's reserved scrollbar gutter takes the new `--overlay-on-page`, so no undimmed strip runs down the right edge. Meanwhile `body` covers the viewport, so on a page shorter than the viewport the scrim still dims the page once, not twice.
  - The toast × is 16px (hit area still 44).

## 8.17.0-alpha.6

### Minor Changes

- [#448](https://github.com/Fiestaboard/FiestaUI/pull/448) [`bbdc53c`](https://github.com/Fiestaboard/FiestaUI/commit/bbdc53ced9ef355e58e3089f60d5ced44a5ff708) Thanks [@jeffredodd](https://github.com/jeffredodd)! - ListRow `size="touch"` is now the 05 Setup row: a 60 px floor (was 56), with the 16/24 title, 14/20 description, 16 px side and 10 px vertical padding it already had. New `ListRowChevron`: the 16 px trailing chevron (lucide's default is 24), decorative and mirrored in right-to-left text. HubDiscoveryRow uses it.

- [#444](https://github.com/Fiestaboard/FiestaUI/pull/444) [`d57ec60`](https://github.com/Fiestaboard/FiestaUI/commit/d57ec608341a75b839493d4b25efda578102a010) Thanks [@jeffredodd](https://github.com/jeffredodd)! - ScheduleEntryForm's fixed times use the kit TimePicker (clock trigger, Hour / Minute lists, quick picks) instead of the browser's time input, at one-minute steps; `labels.timePicker` localises its panel (BB-FC-7).

- [#447](https://github.com/Fiestaboard/FiestaUI/pull/447) [`6a80d7e`](https://github.com/Fiestaboard/FiestaUI/commit/6a80d7e41432e8795d522fe70a314369ce77eb8b) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Template editor toolbar: Copy and Cut put the template on the clipboard as the field's own copy does (chips as their markup, no U+200B cursor anchors), and Escape from the Variables, Colors or Formatting picker returns focus to the editor at its caret. New `ToolbarDropdown` prop `returnFocus` says where focus goes on Escape. The field's own copy no longer carries the anchors either.

### Patch Changes

- [#449](https://github.com/Fiestaboard/FiestaUI/pull/449) [`abbce09`](https://github.com/Fiestaboard/FiestaUI/commit/abbce090fba968688eca8838ab0b22190aef473d) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Sidebar: with `collapseHandle="hover"` (the default) the edge collapse handle now follows the same rule on the collapsed rail as on the expanded one, shown only on rail hover or keyboard focus, and it is hidden only on devices that can hover, so touch keeps it visible at rest. The phone tab bar floats 8 px above the safe area (was 12; `--bottom-nav-offset` is now 84 px) and its tabs are rounded 12 px, using the new `--radius-chrome-item` token.

- [#452](https://github.com/Fiestaboard/FiestaUI/pull/452) [`def3418`](https://github.com/Fiestaboard/FiestaUI/commit/def3418d7cec6f23ae14152667f55d3bf6823f65) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Sidebar: on the bottom tab bar a dot badge is 8 px with no ring, 3 px past the icon and 2 px above it, as 07 draws it (BB-FK-10). The rail and drawer keep the 10 px dot with its card ring.

## 8.17.0-alpha.5

### Minor Changes

- [#442](https://github.com/Fiestaboard/FiestaUI/pull/442) [`dd18b09`](https://github.com/Fiestaboard/FiestaUI/commit/dd18b09cc1847d8710df0d08b57ba21ac366a822) Thanks [@jeffredodd](https://github.com/jeffredodd)! - `FormulaAtom` shows its source as written inside an uppercase host such as the template editor (it resets `text-transform` itself), and every state is one 22 px shape: the error edge is an inset ring instead of a 1 px border that made error atoms 24 px (BB-FP-10, BB-FP-12). New `valueColor` prop: a board colour name, code or `{code}` that a `COLOR()` result lights, shown as `=` and that colour's tile instead of the raw code; `value` stays the accessible text. `value` is now optional: undefined or `""` draws no value segment (no empty box), still 22 px tall; an empty result that should show is formatted by the caller (e.g. `= ""`). The `DropdownMenu` (and its submenu and context mode) and `Select` popups no longer draw the browser focus outline around the whole popup when opened with the mouse; the popover surface keeps its 1 px border and shadow (BB-FP-4). `TraceStep` expression and value wrap at word boundaries (`overflow-wrap: break-word`, was `anywhere`), so an identifier such as `random.choice` no longer splits mid-token under a shrink-to-fit container (BB-FP-16). New `Toggle` `variant="tint"`: pressed is the SegmentedControl checked look (primary border over `bg-tint-selected`, foreground ink, hover and press included) instead of the solid primary fill, for Figma 132:20145 "Inspect" (BB-FP-16).

- [#441](https://github.com/Fiestaboard/FiestaUI/pull/441) [`5bd1a91`](https://github.com/Fiestaboard/FiestaUI/commit/5bd1a914d68d5cfb5c6088223660a710087cf51d) Thanks [@jeffredodd](https://github.com/jeffredodd)! - SegmentedControl gains `variant="tray"`: the bordered items joined on one muted tray (2px padding and gap, no wrap), as the screen frames draw Day chips, Day/Week/List, Theme and Pages/Collections (BB-FC-4). WeekStrip now draws that tray by default and no longer scrolls sideways; `variant="pills"` keeps the old scrolling row. PageHeader's unassigned icon is brand orange instead of a hue hashed from the translated title, and `icon` and `description` are optional (BB-FC-3).

- [#440](https://github.com/Fiestaboard/FiestaUI/pull/440) [`61cc5c8`](https://github.com/Fiestaboard/FiestaUI/commit/61cc5c863bef6704e1633c8c97a2e1a77537df06) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Sidebar shell fidelity (bug bash F, BB-FS-1..5, -10):

  - The edge collapse handle is the 07a 16×28 tab with 8px corners, 2px proud of the rail (was a 28px circle hanging 14px off it), with a solid hover fill. New `collapseHandle="hover" | "always"`, default `"hover"` (owner ruling): hidden at rest on the expanded rail, shown while the pointer is on the rail, on keyboard focus, on touch devices (no hover: always visible) and on the collapsed rail. `"always"` keeps it at rest.
  - `SidebarNavItem.nested` indents a row 16px inside the one above it (expanded rail and drawer; flush on the collapsed rail), and `separatorBefore` draws the primary/secondary hairline before a row.
  - One focus treatment across the shell: rail and drawer rows, the collapse handle, the board selector and SkipToContent all use the two-tone `focus-ring` (visible on a lit row in dark, where the browser outline was orange on orange).
  - `variant="bottom-nav"`: with More open, More is the only lit tab (the route's tab keeps `aria-current`), and the scrim is `--overlay` above the header, under the bar and drawer. New z tokens `--z-bottom-nav-backdrop` (102) and `--z-bottom-nav` (105).
  - SidebarAccountTrigger holds its chevrons at the trigger's trailing edge.

### Patch Changes

- [#443](https://github.com/Fiestaboard/FiestaUI/pull/443) [`462e59f`](https://github.com/Fiestaboard/FiestaUI/commit/462e59f84f3e5778c180b7ad6faa326ca3f04b68) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Match the Figma library: a dismissible Badge's dismiss is a 16 px round chip (24 px target kept), Chip hover only fills, toasts use 13/18 type and shadow-lg, and an Alert description is leading-relaxed.

## 8.17.0-alpha.4

### Minor Changes

- [#437](https://github.com/Fiestaboard/FiestaUI/pull/437) [`a1bb706`](https://github.com/Fiestaboard/FiestaUI/commit/a1bb706b28961007da7e02b0bb9e60fb657c9b5e) Thanks [@jeffredodd](https://github.com/jeffredodd)! - SelectItem takes an optional `description`: a muted second line that describes the option without joining its name or the trigger. BoardSelector's `BoardOption.description` uses it, so the switcher can show "Flagship 22 × 6 · Dinner note" under each display.

- [#435](https://github.com/Fiestaboard/FiestaUI/pull/435) [`be4348a`](https://github.com/Fiestaboard/FiestaUI/commit/be4348a5a52ef73c820225245262fa29a4eea8c9) Thanks [@jeffredodd](https://github.com/jeffredodd)! - The opt-in coarse-pointer touch layer (`fui-coarse` on `<html>`) now also covers `Checkbox` (44×44 hit area around the 16 px box), and the Dialog/Sheet close chip (invisible 44×44 target; the chip does not grow).

- [#432](https://github.com/Fiestaboard/FiestaUI/pull/432) [`11d33e1`](https://github.com/Fiestaboard/FiestaUI/commit/11d33e131ce5c59dd958011a9833ded404084953) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Dialog and AlertDialog are inset 16 px and rounded at every width (they were full-bleed with square corners below `sm`), and cap their height to the viewport with scrolling. `AlertDialogAction` takes `variant` and `size` (e.g. `variant="destructive"` for data-loss confirmations).

- [#436](https://github.com/Fiestaboard/FiestaUI/pull/436) [`a393be1`](https://github.com/Fiestaboard/FiestaUI/commit/a393be1a331201519a1d90aac511cad7237d79f3) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Fix `ListRowGroup` list semantics (axe `aria-required-children`, BB-B-20). A `ListRow` with `render` (a link or button row) inside a group now wraps itself in an `<li>`, so `<ListRowGroup><ListRow render={<a />} /></ListRowGroup>` is valid in every group variant. Rows already inside a raw `<li>` or `ListItem` child of the group do not wrap again. Add `ListRowItem`, the `<li>` that holds a row when the item needs more than the row; `HubDiscoveryRow` and `SessionRow` use it.

- [#433](https://github.com/Fiestaboard/FiestaUI/pull/433) [`491eff9`](https://github.com/Fiestaboard/FiestaUI/commit/491eff9005abe3d7c88c65796d580dd9f32c9455) Thanks [@jeffredodd](https://github.com/jeffredodd)! - `FiestaLogo` is now one image named "FiestaBoard" (`role="img"`, optional `label`), with the lockup text hidden from assistive tech, and exports `FIESTA_LOGO_WORDMARK_SELECTOR` (`.logo-fiesta-text`) — the one selector a consumer's axe run should exempt under the WCAG 1.4.3 logotype exception. In dark, an off `Switch` track uses `--input` so it reads at 3.58:1 on a card instead of vanishing (1.10:1).

- [#439](https://github.com/Fiestaboard/FiestaUI/pull/439) [`cf38093`](https://github.com/Fiestaboard/FiestaUI/commit/cf38093faeba838dd8176d034e58092ef72e327f) Thanks [@jeffredodd](https://github.com/jeffredodd)! - `ScheduleEntryForm` takes `layout="compact"` for a phone sheet (07d `322:20318`): the page, start "to" end times on one row, Days in one row of four, then Save. Starts and Ends types, Repeat and "Entry is on" sit behind a "More options" disclosure that opens by itself when the entry already uses one of them or a Save error is inside it, and names what it holds while closed. The default layout is unchanged. New labels: `moreOptions`, `timeRangeTo`, `startsAtSun`, `endsAtSun`, `entryOff`.

### Patch Changes

- [#434](https://github.com/Fiestaboard/FiestaUI/pull/434) [`b559bc5`](https://github.com/Fiestaboard/FiestaUI/commit/b559bc54dd9e119aa8e6f1d337a9bb533d5959af) Thanks [@jeffredodd](https://github.com/jeffredodd)! - BoardDisplay: the first content a board paints lands at once instead of cascading from blank, after loading or after mounting empty. Opening a screen or switching display no longer replays the flap cascade; later content changes still animate.

  Tabs: a tab trigger gets the W2 44px floor on a coarse pointer inside `.fui-coarse`, and the list grows with it.

  Sidebar: the bottom tab bar renders at the end of `<body>` on the client, so it comes after the page in tab and reading order (skip link, header, main content, then the bar).

## 8.17.0-alpha.3

### Minor Changes

- [#420](https://github.com/Fiestaboard/FiestaUI/pull/420) [`ebde502`](https://github.com/Fiestaboard/FiestaUI/commit/ebde502eca3a2d245d63dd8710e52cb820828d91) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add BoardMinimap, a labeled static board overview with a controlled viewport frame, pointer jump and drag, and keyboard panning. Reuses the board renderer and supports caret-following through the viewport prop.

- [#413](https://github.com/Fiestaboard/FiestaUI/pull/413) [`301002f`](https://github.com/Fiestaboard/FiestaUI/commit/301002f91a2ffda24c4df865156ae81546560388) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add ChoiceChip and ChoiceChipGroup for compact choices and filter toggles, with accessible radio-group keyboard navigation, controlled standalone selection, and a 44px touch target around the 32px visual pill.

- [#424](https://github.com/Fiestaboard/FiestaUI/pull/424) [`7f508c2`](https://github.com/Fiestaboard/FiestaUI/commit/7f508c23490629939af1ebcb75c54e904b3f07eb) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add ColumnRuler with configurable column and seam geometry, plus TruncationMap with accessible overflow jump actions and data-driven line lengths.

- [#412](https://github.com/Fiestaboard/FiestaUI/pull/412) [`9e25c9a`](https://github.com/Fiestaboard/FiestaUI/commit/9e25c9a30c0f1acb175ed9afef28efe7f24f17e3) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add DataSourceSwitch for Live, Sample and Missing preview modes, with radio keyboard/form semantics, the shared tabs appearance, localized choices and touch sizing.

- [#421](https://github.com/Fiestaboard/FiestaUI/pull/421) [`f3881ff`](https://github.com/Fiestaboard/FiestaUI/commit/f3881ff1e52f998b7985611e077701fdc97c3324) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add FormulaAtom for compact formula and variable source previews with caller-provided value hints, actual error tags, and fallback status. The Badge-based component uses semantic colors in both themes and preserves full text when a narrow layout truncates it.

- [#422](https://github.com/Fiestaboard/FiestaUI/pull/422) [`ea390e0`](https://github.com/Fiestaboard/FiestaUI/commit/ea390e0f7dbc09c05f9a4031453a49c79442d507) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add InspectorRow, a native action row composed from ListRow with optional detail, trailing value and chevron, a 48px minimum height, and wrapping for narrow inspectors and enlarged text.

- [#425](https://github.com/Fiestaboard/FiestaUI/pull/425) [`37ff508`](https://github.com/Fiestaboard/FiestaUI/commit/37ff508e77a348dc60f6814b2897162759a5b57e) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add NoteFocus and NoteSeams for Note-array editors. The controlled selector uses shared radio controls and reports each Note's canvas range; decorative seams and focus outlines align with the existing board renderer. Export reusable Note-array geometry for host-owned scrolling, cropping and range highlighting without splitting the template.

- [#418](https://github.com/Fiestaboard/FiestaUI/pull/418) [`ca31d3d`](https://github.com/Fiestaboard/FiestaUI/commit/ca31d3d04e80dceb55274cb7898aadb27fcea639) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add PreviewStatus and EditStateChip for creator IDE previews. Display state stays independent from unsaved, draft, testing and saved edits; the Problems action supports localization, keyboard navigation and 44 px touch targets. Status text wraps at narrow widths and large text sizes.

- [#426](https://github.com/Fiestaboard/FiestaUI/pull/426) [`657250f`](https://github.com/Fiestaboard/FiestaUI/commit/657250f8f9aa895d476d5df590ee7ddfe92a8e69) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add ProblemItem for inspector and console diagnostics, one-tap fixes, source jumps, and save warning cards. Add SentLog for the last twenty shown, held, or paused outcomes, with localizable copy and caller-formatted timestamps.

- [#428](https://github.com/Fiestaboard/FiestaUI/pull/428) [`f106b9e`](https://github.com/Fiestaboard/FiestaUI/commit/f106b9e5c7f79849504d87572dd826bd91328b38) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add GoToCell, an inline coordinate field with bounded navigation, Mod+J focus, Escape reset, localized validation, touch sizing and host-owned band or search resolution.

- [#427](https://github.com/Fiestaboard/FiestaUI/pull/427) [`ab382d9`](https://github.com/Fiestaboard/FiestaUI/commit/ab382d95a40c6d7e08c5f7af5c8e8f183591e647) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add RevisionRow and RevisionDiff with shared overview scaling, revision metadata, comparison modes, change-region outlines, and explicit Restore-to-new-draft requests.

- [#410](https://github.com/Fiestaboard/FiestaUI/pull/410) [`1aacc6b`](https://github.com/Fiestaboard/FiestaUI/commit/1aacc6b11adb229b1d7d4f0ae2e4d7bd093301e9) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add SessionRow, DeviceCodeCard and DeviceCodeInput for signed-in devices and TV activation. SessionRow keeps connection and panel timestamps distinct and suppresses sign out for the current browser. DeviceCodeInput presents eight cells while preserving one native text field, paste, keyboard selection and form semantics, with an explicit compact size for terminal code strips. Visible code cells use the shared semibold body font; the invisible native field retains its independent editing metrics. DeviceCodeCard action floors follow the 40px desktop and 44px narrow/coarse control sizes.

  Extend ConnectPhoneCard with claimed, loading and error states and localized lifecycle announcements. Every inactive state removes the actual pairing QR from the DOM; expired codes no longer remain under a visual opacity mask. Existing live defaults and loopback refusal remain unchanged.

- [#414](https://github.com/Fiestaboard/FiestaUI/pull/414) [`972d9da`](https://github.com/Fiestaboard/FiestaUI/commit/972d9da680bb15e7cd072789e34c6573cd6c5451) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add InspectorTabs and InspectorTabsContent: host-supplied tab lists, optional counts, controlled or uncontrolled selection, horizontal scrolling with overflow fades, and touch sizing. Composes the existing Tabs primitives with Core styling; apps own the responsive tab list and panel content.

- [#416](https://github.com/Fiestaboard/FiestaUI/pull/416) [`6bfceaf`](https://github.com/Fiestaboard/FiestaUI/commit/6bfceaf2adbef5db605da718431146cb84b85b75) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add ToolRail for canvas tool selection with vertical and horizontal layouts, 44 px touch targets, keyboard navigation, localized labels, and optional Undo/Redo actions.

- [#411](https://github.com/Fiestaboard/FiestaUI/pull/411) [`899926c`](https://github.com/Fiestaboard/FiestaUI/commit/899926cc83e35f0a4de45fa6ece04fd6b4122842) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Honor `pickerPresentation` for the touch editor toolbar through the existing `TemplateEditor.toolbarProps` integration. Explicit touch popovers use the shared overlay portal and collision positioning, including a host container, while omitted presentation keeps sheets and `auto` keeps the legacy below 48rem/coarse-pointer policy. Add presentation-aware color help and an optional `PopoverContent` portal container.

  Keep touch palette and icon choices at least 48px wide at the default text size, and preserve the Brush picker's 44px stamp cells. Matching minimum grid tracks retain enlarged targets and their keyboard order inside scrollable popovers.

- [#419](https://github.com/Fiestaboard/FiestaUI/pull/419) [`ec38f0a`](https://github.com/Fiestaboard/FiestaUI/commit/ec38f0abf331396d1a05d3da14d99678dcf505c1) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add TraceStep for formula evaluation traces, with evaluated/error/skipped cues, current values, nested indentation and responsive text.

- [#408](https://github.com/Fiestaboard/FiestaUI/pull/408) [`5dcbc44`](https://github.com/Fiestaboard/FiestaUI/commit/5dcbc44863262936ca64696153790483d307b725) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add UpNextCard, OtherDisplaysCard and ScheduleModeCard for Home supporting content. Compose shared card, list, status and switch primitives; support localized copy, authoritative upcoming events, inert peer previews, optional display selection and a controlled Schedule Mode toggle. Schedule computation, navigation and responsive pane placement remain host-owned.

- [#409](https://github.com/Fiestaboard/FiestaUI/pull/409) [`26a9426`](https://github.com/Fiestaboard/FiestaUI/commit/26a94261785c1f637a20b37aaf7a7519909bde31) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add a wide Dialog surface, a bottom Sheet confirmation recipe, and a reference
  snackbar variant for Toaster. Hosts can localize dialog dismissal and configure
  toast edge offsets to clear headers or editor docks while retaining the existing
  overlay engines and default appearances.

- [#423](https://github.com/Fiestaboard/FiestaUI/pull/423) [`e0dd36c`](https://github.com/Fiestaboard/FiestaUI/commit/e0dd36c14a0434370c129b24c2da3599b1b3b354) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add LayerRow and LayersPanel for canvas layers, with controlled selection, visibility, formula inspection, protected-text status and accessible pointer/keyboard reordering.

  Cancel active SortableList gestures when controlled item identities/order change or the list becomes disabled, preserving row identity and ordinary controlled keyboard moves.

- [#417](https://github.com/Fiestaboard/FiestaUI/pull/417) [`8e64efa`](https://github.com/Fiestaboard/FiestaUI/commit/8e64efae2cb8d50efccd5f743ba88d0451d28064) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add RowBand, a selectable template gutter bracket with controlled selection, localized metadata, shared click and context actions, and a composable drag handle. Includes light, dark, mobile, keyboard, and SortableList examples.

- [#430](https://github.com/Fiestaboard/FiestaUI/pull/430) [`ca1ca4e`](https://github.com/Fiestaboard/FiestaUI/commit/ca1ca4eeca5cd916d626f0b7ffa8714435546658) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add pointer move and end-resize to WeekCalendar with `onEntryChange`: a mouse or pen drag moves a scheduled block (to another time or day, keeping its length) or stretches its end, in `snapMinutes` steps inside the visible hours, and reports the new `{ day, start, end }` once on release. Gaps and the silence schedule stay fixed, touch never drags, and a press under 4px is still a click.

- [#415](https://github.com/Fiestaboard/FiestaUI/pull/415) [`aaa1518`](https://github.com/Fiestaboard/FiestaUI/commit/aaa1518dde672de55b238ec4df9bf4bf98b5eb8a) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add the controlled ZoomControl with Fit overview, three tile sizes, a configurable minimum tile size, scoped keyboard shortcuts, touch sizing and a controlled minimap action.

## 8.17.0-alpha.2

### Minor Changes

- [#401](https://github.com/Fiestaboard/FiestaUI/pull/401) [`7e81bd9`](https://github.com/Fiestaboard/FiestaUI/commit/7e81bd9a8f6587423c92200715ae6fe3f8ce6948) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Fit / Actual size has one toggle, and fit-scaled boards have clean corners (slice 1.5d).

  - **New `BoardPreviewModeToggle`.** The Fit / Actual size pills (Figma `ScaledBoardDisplay / Size toggle`): 22 px pills, 11 px text, 4 px apart; the active one is `border-primary` on `primary/10`.
    - It is controlled: pass `mode` and `onModeChange`. Put it in `EditorPreview`'s `headerAction` and drive the board from the same state; BoardViewport's F key reports through the same `onModeChange`, so the two stay in sync.
    - The tap target is 44 px without moving the layout: under the opted-in `coarse:` layer at `size="default"`, on any pointer at `size="touch"` (the [#385](https://github.com/Fiestaboard/FiestaUI/issues/385) touch axis).
    - `labels` (`previewSize`, `fit`, `actual`) localise it.
  - **One source.** `BoardViewport` and `ScaledBoardDisplay` now render this toggle. BoardViewport uses `size="touch"`; its pills are 22 px tall (were 21). ScaledBoardDisplay's pills are 22 px tall (were about 26), so a note array's board sits a few pixels higher.
  - **`showModeToggle`** on `BoardViewport` and `ScaledBoardDisplay` (default `true`). Pass `false` when the host shows the toggle itself, so a preview never shows two. F still works in BoardViewport.
  - **BoardViewport** returns to the start of the board on any switch to Actual size, including one made by a host through a controlled `mode`.
  - **ScaledBoardDisplay corners.** The fit container clipped the board at its square bounding box, so the bezel's drop shadow showed only as grey square notches at the corners (a light square frame in dark). The fit box now reserves room for the original shadow and scales the board and shadow together into the available width. This removes the notches without discarding the shadow or letting it spill outside the slot. Bezel-free boards retain the full slot width.

- [#405](https://github.com/Fiestaboard/FiestaUI/pull/405) [`60bbfae`](https://github.com/Fiestaboard/FiestaUI/commit/60bbfae5eaf3e861107b33a6b9b92f49746b3e78) Thanks [@jeffredodd](https://github.com/jeffredodd)! - `BoardViewport` gets a `layout` prop that places the board the way the screen designs do (slice 1.5e). It uses the same values and the same tile size per layout as `ScaledBoardDisplay`. Without `layout`, nothing changes.

  - **`phone-hero`** (Tile sm), **`medium-hero`** (Tile md) and **`full-screen`** (Tile lg) are hero placements, from 07a's Home hero.
    - **Inset:** the tiles sit 12 px across and 16 px down from the bezel's outer edge, as drawn. A 22-column Flagship is 373 px wide, so it fits a 390 px phone with 8 px gutters and does not scroll.
    - **Bezel:** it hugs a board that fits, centred, with 07a's 10 px radius and small shadow.
    - **Settle to fit:** a hero board that is wider than its slot, but fits with every tile still at or above `minTile` (13 px), is shown fitted, with no scroll chrome. A Flagship at 768 px therefore no longer hides one column behind the edge fade. Below the floor, a board scrolls as before.
    - Hero viewports expose `data-layout` and `data-settled`.
  - **`pane`** (Tile md) is the editor preview: the default inset and Actual size, with no settling.
  - **Export:** `BOARD_VIEWPORT_HERO_INSET` (`{ x: 12, y: 16 }`).

- [#404](https://github.com/Fiestaboard/FiestaUI/pull/404) [`f16c2bc`](https://github.com/Fiestaboard/FiestaUI/commit/f16c2bc4a096aca56f9f04dbe2b18dafcbcb2655) Thanks [@jeffredodd](https://github.com/jeffredodd)! - `ListRow` gains `selected` (and `current`): the open row of a list-detail draws the 07e inset accent pill, sets its title in semibold and carries `aria-current`, without painting over an inset group's rounded corners.

- [#396](https://github.com/Fiestaboard/FiestaUI/pull/396) [`d4ef0d3`](https://github.com/Fiestaboard/FiestaUI/commit/d4ef0d36363913f8e04d748b9a9018fa176aaaf0) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add the onboarding and PWA pieces of the honest install flow (universal slice 1.10a): `InstallCard`, `InstallSteps` and `PrivacyNote`, in a new Onboarding group.

  - `InstallCard` is the in-content install offer (07 Chrome install card): a labelled section on the card surface with a small muted IconTile, a title, a body and the Install (secondary, download icon) and Not now (ghost) actions. `state="installing"` makes Install busy and keeps focus; `state="needs-https"` draws no Install button at all, so an insecure origin never shows a fake button. When to show it and the snooze stay with the consumer. Labels default to `DEFAULT_INSTALL_CARD_LABELS`.
  - `InstallSteps` is a numbered list of browser steps (07 Safari Add to Home Screen sheet): muted rows with a numbered disc, the step copy and an optional trailing glyph. Host it in `Sheet side="bottom" grabber`.
  - `PrivacyNote` is the standing "your data stays on your network" promise (05 Setup / Privacy note): static prose with a shield glyph, a title and a body, on the card ground with a border.

  None of them ships copy: titles, bodies and steps are the consumer's.

- [#398](https://github.com/Fiestaboard/FiestaUI/pull/398) [`dc3a253`](https://github.com/Fiestaboard/FiestaUI/commit/dc3a25333fc7e3341cf4cca61c63772acdc7d56f) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add `ConnectPhoneCard` and `RecoverySteps` to the Onboarding group (universal slice 1.10b).

  - `ConnectPhoneCard` is the body of web Settings › Connect a phone (07e). It shows the pairing QR panel, with the host-rendered code, the hub line, an "Expires in …" countdown and a time-left bar. The phone steps sit beside it, or an `aside` in their place, with an optional `notice` above and `footnote` below. `state="expired"` dims the code and drops the countdown. A loopback `hubAddress` draws no code at all: the slot is hidden, the countdown and bar go, the hub line explains the refusal (`refusedLabel`), `data-refused="loopback"` is set and an error is logged, so a phone is never handed an address it cannot reach. `isLoopbackHost()` is exported for hosts.
  - `RecoverySteps` is a titled card of numbered fixes for an error state (05 Setup / Recovery steps), with the most likely fix first. The retry action stays with the host.

  Both use the same numbered list as `InstallSteps`, in a new `plain` appearance.

- [#406](https://github.com/Fiestaboard/FiestaUI/pull/406) [`233ded5`](https://github.com/Fiestaboard/FiestaUI/commit/233ded587841b9af838d6c9c838f120ff7987364) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add HubDiscoveryRow for host-discovered hubs: a full-row native button composed from ListRow, with name, address, optional decorative icon and status, disabled support and inherited inset-group size. Discovery and navigation stay in the host.

- [#402](https://github.com/Fiestaboard/FiestaUI/pull/402) [`f8b67d0`](https://github.com/Fiestaboard/FiestaUI/commit/f8b67d06f16ea6b4d546c94b0fe70367851b0dcf) Thanks [@jeffredodd](https://github.com/jeffredodd)! - New `ScheduleEntryForm` adds or edits one Schedule entry (slice 1.9a, C27). It uses touch size (44 px controls) by default, and `size="default"` gives the desktop sizes.

  - **The value is the hub's `ScheduleEntry`.** Field names are the same snake_case: `page_id`, `start_type` / `start_time` / `start_sun_offset`, `end_type` / `end_time` (null means open-ended) / `end_sun_offset`, `recurrence_type`, `day_pattern` / `custom_days`, `annual_date` / `annual_end_date`, `one_off_date` / `one_off_end_date` and `enabled`. A host can send the value to the hub without mapping it.
  - **`validateScheduleEntry`** applies the hub's `validate_config` rules:
    - a page is required;
    - a fixed range can't be zero-length, but a midnight rollover is fine;
    - a custom pattern needs at least one day;
    - dates must be real, and an end date can't come before its start.
  - **`normalizeScheduleEntry`** clears the fields that the chosen recurrence and time types don't use, and puts custom days in Monday-first order.
  - **Controls:**
    - Page or Collection, grouped by kind. It can be read-only when opened from Shows on.
    - Starts: At a time, Sunrise or Sunset. Sun times take a ±15-minute offset and show the hub's resolved time.
    - Ends: At a time, Open-ended, Sunrise or Sunset.
    - Repeat: Weekly (All, Weekdays, Weekends, or Custom day toggles), Every year on (month and day, with an optional last day) or Once on (a date, with an optional last day).
    - Entry is on.
    - A host consequence line, Save (busy state) and Delete entry….
  - Times and dates use the system pickers (native `time` and `date` inputs). Every word can be overridden through `labels`.

  - Sun-time validation reveals editable fallback-time fields when stored values are invalid, without silently changing the hub's fallback schedule. Controlled date ranges follow replaced entries, busy form submission is guarded, and one-off dates reject year zero.

- [#400](https://github.com/Fiestaboard/FiestaUI/pull/400) [`979ed4b`](https://github.com/Fiestaboard/FiestaUI/commit/979ed4b84121aafda5a26dad6e964c6be2bc2346) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Schedule agenda rows, the day picker and notification rows (slice 1.8d, C24 and C26).

  - **New `AgendaRow`** (a `ListRow`): one row of the phone and mobile-web Schedule, drawn as the 07d day list draws it. The title is the page or collection, the description is "9:00 AM – 1:00 PM · Page", and a chevron trails. `kind`:
    - `entry`: a plain row.
    - `now`: the filled row, the word "Now" and `aria-current="time"`.
    - `gap`: "Gap · <default page>".
    - `conflict`: the danger tint and the word "Overlap", with the description in destructive.
      The words are overridable `labels`; `status` overrides the word, and `trailing={null}` drops the chevron.
  - **New `WeekStrip` and `DayChip`**: the day picker, built on `SegmentedControl` at the 44 px touch size, on one line that scrolls sideways. `DayChip hasGap` adds a warning dot and ", has a gap" to the day's name (`gapLabel`).
  - **New `NotificationRow`** (a `ListRow`): an alert, why it fires, and a touch `Switch` named by the title and described by the reason. `permission="denied" | "unavailable"` turns the switch off and disables it, and appends "blocked by the browser" or "needs HTTPS" to the reason; `granted` and `ask-on-first` keep it live.

- [#399](https://github.com/Fiestaboard/FiestaUI/pull/399) [`83ec405`](https://github.com/Fiestaboard/FiestaUI/commit/83ec405ab93e1408654dbb8f94d111ea3d240e8a) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Plugin settings from their schema, and settings a display can't offer (slice 1.9c, Figma 08 P9 and P11; web goalpost 07d Integration · Setup required).

  - New `SchemaFormRows`: renders a plugin's or output's JSON Schema settings as stacked rows (label, control, helper line, error in its place). The mapping covers what ships: `ui:widget: "password"` and `secret: true` → `SecretInput` (the hub's `"***"` shows as "Saved — type to replace" and clearing keeps it); `enum` (array or `{ values }`, with `enumNames`) → `Select`; `mode-cards` → a `ToggleCardGroup`; a multi-enum array → chips (`ToggleGroup`); `boolean` → `Switch`; `integer` / `number` → a numeric input with `minimum` / `maximum`; `timezone` → `TimezonePicker`; `textarea` (widget or format) → `Textarea`; `url` / `format: "uri"` and `datetime` → typed inputs; a string array → one per line; a nested object → its own fieldset; `ui:sections` (collapsible) and `ui:placeholder`. Hub-data widgets (remote-options, page-picker, device-picker, tile-grid, json-path-mapper) are rendered by the host through `widgets`; the row still owns label, helper and error.
  - `ui:visible_when` is evaluated exactly as the hub does (same shared vectors). A field the board's facts hide (`facts`, read by `@device_type` / `@device_model`) is listed as an explainer row with a reason (`labels.unavailable`) instead of vanishing, unless `unavailable="hide"`; a field hidden by a sibling value just goes.
  - New `UnavailableSettingRow`: a setting this display can't offer, said in place of its control, with the reason. Also for display settings outside a schema (Brightness on a split-flap).
  - New helpers: `resolveSchemaControl`, `schemaEnumOptions`, `isSecretField`, `isSchemaFieldVisible`, `hiddenByBoard`, `MASKED_SECRET`, `DEFAULT_SCHEMA_FORM_ROWS_LABELS`.

- [#403](https://github.com/Fiestaboard/FiestaUI/pull/403) [`d463a2b`](https://github.com/Fiestaboard/FiestaUI/commit/d463a2b14bbd3c211d8f1d40a9f3c44e41dd2368) Thanks [@jeffredodd](https://github.com/jeffredodd)! - The template editor gets a touch toolbar with bottom-sheet pickers, and the editor can say what the board will drop (slice 1.6b).

  - **`TemplateEditorToolbar size="touch"`.** A 60 px bar of labelled 52 px tools (new `EditorTool`), with no hover-only tooltips. Every picker opens as a non-modal bottom sheet with a grabber, so the live preview above stays visible.
    - **Split-flap:** Variables · Colors · Formatting · Formula │ Undo · Redo · More.
    - **LED:** Variables · Text color · Icon · Size · Formula · More. Undo and Redo move into More.
    - **`capabilities`** (`"split-flap"` or `"led-text"`) picks the tool set. When it is unset, it is derived from `charset`.
    - Tools disable rather than disappear when there is nothing to insert, so the bar never reflows.
    - The Colors sheet stays open while you add tiles. The Formatting sheet holds the snippets plus line alignment. More holds cut, copy and paste, Draw on board, sync from board, the wrap switch, and the host's own rows (`moreContent`).
    - The LED Size sheet comes from the host (`renderSizePicker`). Without it, Size is disabled.
    - **Draw mode on touch:** the bar becomes Brush · Undo · Redo · Done. Brush opens a sheet with 48 px colour swatches, the eraser and 44 px stamp cells.
    - `container` portals the bar into a host dock.
    - New labels have English defaults.
  - **`pickerPresentation`** on the default toolbar passes `"popover"`, `"sheet"` or `"auto"` to its pickers. The default is `"popover"`, which is unchanged.
  - **`ToolbarDropdown`** gains `size="touch"` (a labelled tool trigger, `accent` while open), plus `detents` and `defaultDetent` for the sheet presentation.
  - **`ColorPickerContent`** gains `size="touch"` (48 px swatches in a full-width grid) and `sections`, which picks the groups that render. It also exports `colorSwatchClassName`.
  - **`DrawCharPickerContent`** gains `size="touch"`: 44 px cells in six columns, and the arrow keys follow the column count.
  - **New `EditorWarning`** with `EditorWarningAction`.
    - `kind="line-overflow"` is the validated card: a "Line 4" badge, "24 of 22 columns · 2 cut off", detail, who checked it, and fix buttons (32 px, or 44 px at `size="touch"`).
    - `kind="line-limit"` is the warning box shown when a page is longer than the board.
    - Both are polite status regions on the `Alert` surfaces.

  At the default size, nothing changes.

  Add a `trailing` host slot to TemplateEditorToolbar in default and touch sizes, retained in draw mode.

  Docked editor sheets reserve the toolbar's measured height and stay above the soft keyboard, including full detents. Touch tools keep their labels and a 44 px minimum width; the row scrolls horizontally when a narrow viewport or enlarged text needs more space.

- [#397](https://github.com/Fiestaboard/FiestaUI/pull/397) [`9ee0f2d`](https://github.com/Fiestaboard/FiestaUI/commit/9ee0f2dfc23ef204ce3e1362122c68214b2df282) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Schedule week grid and its inspector pane (slice 1.9b, Figma 08 P8; web goalpost 07d Schedule · Week · Conflict).

  - New `WeekCalendar`: a one-to-seven-day time grid with a 56 px gutter (a label every second hour), mono caps day labels and an hour line every `hourHeight` (34 px). Entries are minutes after midnight; each is a button named by its title and described by its meta, time range and state. Kinds `entry`, `gap` (dashed) and `silence` (muted); states `conflict` (opaque danger tint, red title), `off` (faded surface, muted title) and selected (`selectedId`, `aria-current`, a 2 px primary border, or destructive when in conflict). One tab stop with roving focus: ↑ ↓ within a day, ← → to the block nearest in time on the next day that has one, Home / End. An optional `now` line. With `onCreate`, a mouse or pen drag on an empty part of a day proposes a range in `snapMinutes` (15) steps and reports `{ day, start, end }`; a click proposes one hour; touch never drags; Escape cancels. Localizable through `labels`, `formatTime` and `formatHour`.
  - New `WeekCalendarInspector`: the pane beside the grid, a region named by its title, with a description line, a polite destructive conflict `Alert` with an actions row, a `preview` slot for the board, the fields (children) and an actions row.

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
