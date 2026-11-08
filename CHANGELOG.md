# @fiestaboard/ui

## 8.17.0-alpha.0

### Minor Changes

- [#382](https://github.com/Fiestaboard/FiestaUI/pull/382) [`c3a6816`](https://github.com/Fiestaboard/FiestaUI/commit/c3a68167f9ae164bf0b594fb355c98a493449867) Thanks [@jeffredodd](https://github.com/jeffredodd)! - Add the first universal-design tokens, all additive: touch Metrics (`--touch-target` 44px, `--control-h-touch`, `--toolbar-h-touch` 52px, `--sheet-grabber-*`; utilities `min-h-touch`, `size-touch`, `h-control-touch`, `h-toolbar-touch`), opaque pre-blended tints with dark pairs (`--tint-selected`, `--tint-info`, `--tint-warning`, `--tint-danger`; `bg-tint-*`), the board edge fade (`--board-edge-fade`, `--board-edge-fade-clear`), and the Display/* and editor mono type utilities (`text-display-sm`…`text-display-2xl`, `text-mono-editor-line|chip|gutter|count`). `tokens.json` gains `metrics` and `typography` groups.
