---
"@fiestaboard/ui": minor
---

Add `DisplayTypeChip` and Display content props (slice 1.5c).

- **`DisplayTypeChip`** (new, 02 FB / Display type): a 24 px muted pill with an icon and a mono label naming which kind of display something is: `type="flagship" | "note" | "note-array" | "pixoo" | "tc001" | "tc002" | "panel"`. Informational only (no role, no tab stop). `label` and `detail` translate or extend the default text (`detail={null}` drops it). Also exports `DISPLAY_TYPES`, `DISPLAY_TYPE_LABELS` and `displayTypeForModel(model)`.
- **`DisplayPreview` content props** (02 Display / LED & Panel `Content`): `lines` draws Line 1–3 (on an LED, line 2 board green and line 3 board orange; plain on split-flap), and `content="sample"` draws fixed sample art sized to the model and board. The housing carries `data-content`. Without the new props a preview renders exactly as before.
- New helpers `displayLinesMarkup`, `displaySampleMessage`, `DISPLAY_SAMPLES` and `DISPLAY_LINE_COLORS`, and the `DisplayContent` type.
