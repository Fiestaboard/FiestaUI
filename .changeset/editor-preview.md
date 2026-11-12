---
"@fiestaboard/ui": minor
---

Add `EditorPreview` (slice 1.6a, W1 / WEB-03): the page editor's always-visible live preview. It frames a board you pass as `children` and never collapses.

- `variant="pane"` (default): the desktop editor's sticky card, with a header (status dot, "Live preview", the board name and details in mono, and a `headerAction` slot), the board, a mirror `Switch` labelled by `liveLabel` (default "Mirror to board while editing") with an optional `liveAction` such as Replay, and a `statusLine`.
- `variant="docked"`: the phone editor's sticky strip ("Live preview · Kitchen board"). Its mirror switch lives in the editor's More sheet, so the dock shows a "Mirroring" badge while `live` is on.
- Mirroring is controlled (`live`, `onLiveChange`) or uncontrolled (`defaultLive`, off by default). The status line is a polite live region. English copy is exported as `DEFAULT_EDITOR_PREVIEW_LABELS`.
