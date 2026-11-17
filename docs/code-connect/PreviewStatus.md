# C29 PreviewStatus Code Connect

The adjacent parserless template maps [04d Preview status row](https://www.figma.com/design/ZQ8RMELCO6qEOFZUnQu36e/FiestaBoard?node-id=171-163202) to `src/components/editor/preview-status.tsx`. It is a local authoring artifact, outside the library TypeScript build because this repository has no Code Connect runtime/configuration. It has not been published; this task keeps Figma read-only.

Display maps exhaustively to `live`, `scheduled` and `not-scheduled`. Message and visible Edit state text map to the corresponding props; Show edit state controls whether the edit chip is rendered. The template maps the English edit labels drawn in this component; translated/custom labels should explicitly select the appropriate semantic `editState` in the consuming code. Saved time text belongs to the host.

Problems text supplies the example count and label; its drawn trailing arrow is stripped because the component owns the decorative arrow. Replace the generated example formatter with the host's localized, count-aware formatter, and provide `openProblems`. The host may choose `problemsDirection="down"` for a docked console. Platform is deliberately unmapped: both Figma variants share Core anatomy and native skins belong to companion kits.

`EditStateChip` is the internal composition and is also exported independently. The Figma edit chip is a hidden child frame rather than its own published component, so no separate published-node mapping is claimed.
