# Slice 1.6b: Touch toolbar and pickers (C5, WEB-04, C6, P6)

**Goal.** The owner's editor bar on touch: a visible toolbar (insert variables, colours, formatting, formula) with
pickers in bottom sheets, sitting under the live preview (1.6a). Web 2.5 consumes it.

## Design source (working file `ZQ8RMELCO6qEOFZUnQu36e`, read only)

- **07 `315:99828` Web / Editor toolbar · touch**, variants `53:100602` (Split-flap) and `315:99783` (LED).
  60 px bar, `card` fill, 1 px top `border`, px 4. Tools are 52 px tall, radius 10, a 20 px Lucide icon over a
  Text/xs/medium label, gap 2. Split-flap: Variables · Colors · Formatting(66 w) · Formula │ Undo · Redo · More, with a
  1×32 `border` divider. LED: Variables · Text color · Icon(66, sparkles) · Size(66) · Formula · More.
- **07c `306:36342` Formatting sheet** and **`306:37535` Formula sheet**: the tool whose sheet is open fills
  `accent` (#ece6df). The Formatting sheet holds FormattingPickerContent plus "Line align" as a touch SegmentedControl.
- **07 `57:65460` Colors sheet**: ColorPickerContent in the 1.3 sheet; "Tap a colour to insert a tile at the cursor.
  The sheet stays open so you can add several".
- **07c `307:43729` / `307:41691` H4 overflow**: the validation card (destructive 8 % fill, destructive border, r10,
  p 12/14, gap 6/8; Badge destructive "Line 4" + Text/sm/semibold title; Text/xs detail; muted "checked" line;
  outline fixes 32 px desktop / 44 px phone).
- **08 C5 `59:143624`, C6 `59:143713`, P6 `61:52064`**: the proposed APIs (`size`, `capabilities`, swatch and picker
  touch sizes, the overflow banner).
- **04b `120:31120`** Capability toolbar · touch: the CANON tool sets (canvas set is 1.11, not here).

## API (additive; `size="default"` renders today's toolbar byte for byte)

- `TemplateEditorToolbar`
  - `size?: "default" | "touch"`.
  - `capabilities?: "split-flap" | "led-text"`; default derived from `charset` (an LED font, or colour spans, means
    `led-text`).
  - `pickerPresentation?: "popover" | "sheet" | "auto"` for the default size (default `popover`); touch is always
    `sheet`.
  - `moreContent?: ReactNode`: host rows at the end of the More sheet (2.5's "Mirror to board while editing", LED
    Effects).
  - `renderSizePicker?: (ctx) => ReactNode`: the LED Size sheet body (the face is a display setting the host owns).
  - `container?: Element | null`: portal the touch bar into a host dock (2.5 pins it above the keyboard).
  - new labels: `formula`, `more`, `textColor`, `icon`, `size`, `brush`, `drawDone`, `align`, `colorsHint`,
    `formattingHint`, `clipboard`, `wrapLine`.
- Draw mode on touch (Jev `jev_decide` brush_sheet, p = 0.95): the bar becomes Brush · Undo · Redo · Done; Brush opens
  a sheet with 48 px colour swatches, the eraser and the stamp grid (cells 44 px).
- `ToolbarDropdown`: `size="touch"` (labelled 52 px tool trigger, `accent` while open, no tooltip), `detents`,
  `defaultDetent` (1.3 sheet detents), `keepOpenOnSelect` is the caller's: the `close` callback is simply not called.
- `ColorPickerContent`: `size="touch"` (48 px swatches, full-width grid) and `sections` (which groups render).
- `DrawCharPickerContent`: `size="touch"` (44 px cells, 6 columns, arrow keys follow).
- New `EditorWarning kind="line-overflow"` + `EditorWarningAction` (built on `Alert variant="destructive"`), `size`.

## Out of scope (recorded)

- Variable / Formatting picker internals at touch scale (07c draws today's popover bodies inside the sheet).
- The formula sheet body (H5 value hint, categories): formula atom work in 1.11; the Formula tool inserts a formula
  as on desktop.
- The canvas tool set (04b Layers · Pan · Brush …): 1.11.
- Full editor layout remains in 2.5. This slice owns toolbar docking via `layout="docked"`, visualViewport, and sheet-height tracking; `container` can portal it into a host dock.

## Steps (test first)

1. Red: `template-editor-toolbar-touch.test.tsx`, `editor-warning.test.tsx`, toolbar-dropdown / colour / draw-char
   touch tests.
2. Green: implement; raise `template-editor-toolbar.tsx` and `draw-char-picker-content.tsx` to the whole-file bar.
3. Stories (light, dark, mobile): touch split-flap, LED, sheet open per tool, draw mode, More; EditorWarning default and
   touch. Inventory entry for EditorWarning; toolbar summary mentions touch.
4. Checks: typecheck, lint, format, test:coverage + changed-file gate, build, release:test, test-storybook (axe).

## Codex handoff completion (2026-11-13)

Add `trailing?: ReactNode` at the trailing edge of both toolbar sizes and draw mode for web 2.7.
Jev selected the bar (p=0.85) over relocating it to More: the latter duplicates
`moreContent` semantics and drops it in draw mode. Hosts keep touch content compact
or responsive. Test the interactive slot in both sizes/modes, its removal, and add
light/dark/mobile Storybook coverage. Rerun the full brief checks and changed-file gate,
review the complete slice, push normally after merging alpha, and record actual CI results.
