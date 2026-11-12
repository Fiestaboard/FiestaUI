# Universal slice 1.6a: EditorPreview

**Program:** FiestaBoard universal redesign, MASTER-PLAN §4.4 row 1.6a (W1, WEB-03).
**Unblocks:** web 2.5 (editor touch pass: docked preview, "Mirror to board while editing").
**Base:** `origin/alpha` `aa8fa406` (after #388). Lane B (editor).

## Figma (`ZQ8RMELCO6qEOFZUnQu36e`, read only)

- **08 `59:65635` W1** "Always-visible live preview below 1024": the preview never collapses behind "Show preview and live output"; WEB-03 deletes the `lg:hidden` toggle. Tile-sm dock below 768, Tile-md pane above.
- **07 `53:137378`** desktop editor, "Live preview pane (sticky)": `card/default` fill, radius 14 (`--radius-chrome`), padding 16, gap 14.
  - Header (gap 10): StatusDot md success · "Live preview" (Text/sm/semibold) · board name and details in Mono/label, muted · the Fit / Actual size toggle.
  - The board.
  - Live Output row (gap 12): Switch · "Mirror to board while editing" (Text/sm/normal) · outline "Replay" button.
  - Status line: Text/xs/normal, `muted/foreground`.
- **07 `57:64661`** mobile Chrome 390 "Docked live preview (sticky)": `base/background` fill, padding 8, gap 6, no radius. Header (pl 8, gap 6): StatusDot sm · "Live preview · Kitchen board" (Text/xs/medium) · size toggle. Then the board. No switch: on mobile the mirror switch lives in the More sheet.
- **07c `306:34342` / `316:92430`** Mirror on: the pane's label gains " · the Kitchen board shows your edits" and a status line explains the behaviour; the dock shows a `Badge variant=formula` "Mirroring" in its header.

## API

`EditorPreview { variant: "pane" | "docked", title, boardName, details, dotStatus, headerAction, live, defaultLive, onLiveChange, liveLabel, liveDisabled, liveAction, mirroringLabel, statusLine, children }` plus `DEFAULT_EDITOR_PREVIEW_LABELS`.

- `children` is the board (ScaledBoardDisplay, BoardViewport, LED matrix…). EditorPreview owns no board geometry.
- **Never collapses:** no toggle, no hidden state; both variants are `sticky top-0`.
- `pane` renders the live row (Switch labelled by `liveLabel`, default "Mirror to board while editing") with an optional `liveAction`.
- `docked` renders no switch; when `live` is on it shows the "Mirroring" badge in its header.
- `statusLine` is a polite live region under the live row (pane) or under the board (dock).

## Steps (TDD)

1. `editor-preview.test.tsx` first: red (missing module).
2. Implement `src/components/editor/editor-preview.tsx`; green. Changed-file coverage ≥90% lines / ≥85% branches.
3. Stories (`Editor/EditorPreview`): Pane, PaneMirroring, Docked, DockedMirroring, DockedMobile (mobile viewport), NoteArray (size toggle in the header), LongNames. VRT shoots each in light/dark × desktop/mobile.
4. Inventory: EditorPreview in "Template editor", a demo, `src/index.ts` export, one minor changeset.

## Not in this slice

- The Fit / Actual size toggle in the header: it is ScaledBoardDisplay's (note arrays only) or BoardViewport's (#387). The header takes it through `headerAction`.
- Keyboard scroll / F Fit on the pane (07 shows the pane focused): BoardViewport (#387) owns those keys.
- Sending / auto-off after 5 min idle (library EditorPreview description): app logic for 2.5; the copy goes in `statusLine`.
- Code Connect: the repo has no Code Connect setup.
