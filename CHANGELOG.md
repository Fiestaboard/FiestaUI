# @fiestaboard/ui

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
