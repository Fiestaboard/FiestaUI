/**
 * @fiestaboard/ui — the FiestaBoard design system.
 *
 * Styling contract (Tailwind v4 consumers):
 *   @import "tailwindcss";
 *   @import "@fiestaboard/ui/theme.css";
 *   @source "../node_modules/@fiestaboard/ui/dist";
 */
export * from "./components/containment/accordion";
export * from "./components/containment/action-card";
export * from "./components/containment/avatar";
export * from "./components/containment/card";
export * from "./components/containment/collapsible";
export * from "./components/containment/icon-tile";
export * from "./components/containment/json-tree";
export * from "./components/containment/media-frame";
export * from "./components/feedback/alert";
export * from "./components/feedback/badge";
export * from "./components/feedback/chip";
export * from "./components/feedback/empty-state";
export * from "./components/forms/button";
export * from "./components/forms/checkbox";
export * from "./components/forms/combobox";
export * from "./components/forms/copy-button";
export * from "./components/forms/field";
export * from "./components/forms/input";
export * from "./components/forms/label";
export * from "./components/forms/secret-input";
export * from "./components/layout/box";
export * from "./components/layout/flex";
export * from "./components/layout/grid";
export * from "./components/overlays/alert-dialog";
export * from "./components/overlays/dialog";
export * from "./components/overlays/dropdown-menu";
export * from "./components/overlays/lightbox";
export * from "./components/overlays/popover";
export * from "./components/typography/code";
export * from "./components/typography/heading";
export * from "./components/typography/kbd";
export * from "./components/typography/list";
// react-bits components are default exports — re-export them as named.
export * from "./components/containment/scroll-area";
export * from "./components/containment/table";
export * from "./components/containment/tabs";
export { default as FadeContent } from "./components/effects/react-bits/fade-content";
export * from "./components/feedback/skeleton";
export * from "./components/feedback/spinner";
export * from "./components/feedback/status-dot";
export * from "./components/forms/select";
export * from "./components/forms/slider";
export * from "./components/forms/swatch";
export * from "./components/forms/switch";
export * from "./components/forms/textarea";
export * from "./components/forms/time-picker";
export * from "./components/forms/timezone-picker";
export * from "./components/forms/toggle";
export * from "./components/forms/toggle-card";
export * from "./components/layout/stack";
export * from "./components/overlays/sheet";
export * from "./components/overlays/tooltip";
export * from "./components/typography/text";
export * from "./components/typography/text-link";
// App chrome — branding, sidebar, layout, festive treatments.
export * from "./components/chrome/board-icon";
export * from "./components/chrome/board-selector";
export * from "./components/chrome/breadcrumb";
export * from "./components/chrome/fiesta-icon";
export * from "./components/chrome/fiesta-logo";
export * from "./components/chrome/language-selector";
export * from "./components/chrome/main-content";
export * from "./components/chrome/nav-list";
export * from "./components/chrome/page-card";
export * from "./components/chrome/page-header";
export * from "./components/chrome/page-inset";
export * from "./components/chrome/page-layout";
export * from "./components/chrome/page-toolbar";
export * from "./components/chrome/pagination";
export * from "./components/chrome/sidebar";
export * from "./components/chrome/sidebar-account-trigger";
export * from "./components/chrome/sidebar-settings-trigger";
export * from "./components/chrome/skip-to-content";
export * from "./components/chrome/theme-toggle";
export * from "./components/chrome/top-nav";
export * from "./components/wizard/wizard-progress";
export * from "./components/wizard/wizard-shell";
export { cn } from "./lib/utils";
// Board preview — the split-flap Vestaboard display renderer + its data.
export * from "./components/board/board-backdrop";
export * from "./components/board/board-display";
export * from "./components/board/board-teaser";
export * from "./components/board/scaled-board-display";
export * from "./components/board/static-board-display";
export * from "./lib/board-characters";
export * from "./lib/board-colors";
export * from "./lib/board-dimensions";
// The icon registry behind `{icon:…}` (parsed only under `extendedMarkup`):
// a curated surface, so the LED glyph data that joins it later stays internal.
export {
  BOARD_ICON_ALIASES,
  BOARD_ICON_NAMES,
  BOARD_ICONS,
  type BoardIconName,
  type BoardIconSpec,
  isBoardIconName,
  resolveBoardIconName,
} from "./lib/board-icons";
export * from "./lib/board-previews";
// One token from a character set, drawn the way its board draws it (LED
// dots or a flap tile), and a specimen sheet of a whole set: the glyph
// surface the editor pickers build on. Curated: the per-renderer internals
// stay unexported.
export {
  CharacterGlyph,
  type CharacterGlyphLabels,
  characterGlyphName,
  type CharacterGlyphProps,
  characterGlyphRenderer,
  type CharacterGlyphSize,
  characterGlyphToken,
  DEFAULT_CHARACTER_GLYPH_LABELS,
} from "./components/board/character-glyph";
export {
  CharacterSetSpecimen,
  type CharacterSetSpecimenLabels,
  type CharacterSetSpecimenProps,
  DEFAULT_CHARACTER_SET_SPECIMEN_LABELS,
} from "./components/board/character-set-specimen";
// The LED matrix preview renderer: one canvas painted from the frame the
// data layer below produces, animated between messages by the transition
// engine.
export {
  LedMatrixDisplay,
  type LedMatrixDisplayProps,
  type LedPixelShape,
} from "./components/board/led-matrix-display";
// One preview entry point for any device model: dispatches on the model's
// declared technology to the split-flap or the LED renderer, so previews
// of plugin-declared devices are derived from their data, never shipped as
// plugin React. The override gate is pure data and stays internal.
export { DisplayPreview, type DisplayPreviewFrame, type DisplayPreviewProps } from "./components/board/display-preview";
// The transition menu as a settings control: one card per entry, judged
// against a device model, with what the device cannot run kept reachable.
export {
  DEFAULT_LED_TRANSITION_PICKER_LABELS,
  LedTransitionPicker,
  type LedTransitionPickerLabels,
  type LedTransitionPickerProps,
} from "./components/board/led-transition-picker";
// The LED data layer: bitmap fonts, character sets, device models and the
// layout → raster pipeline. Curated named exports — the glyph table and the
// cell-level drawing functions are renderer plumbing (`@internal`) and stay
// unexported; the picker components come in a later PR.
export {
  CHARACTER_SET_IDS,
  CHARACTER_SETS,
  type CharacterSet,
  characterSetForDevice,
  type CharacterSetId,
  type CharacterSetInput,
  type CharsetDiff,
  charsetDiff,
  charsetFallback,
  charsetHasChar,
  charsetHasIcon,
  type CharsetIssue,
  charsetIssue,
  charsetLineage,
  charsetSupports,
  type CharsetValidation,
  type CharsetValidationIssue,
  charsInSet,
  iconsInSet,
  isCharacterSetId,
  LOWERCASE_CHARS,
  materializeCharacterSet,
  resolveCharacterSet,
  tryResolveCharacterSet,
  validateCharacterSet,
  validateMessage,
  type ValidationResult,
} from "./lib/character-sets";
export {
  characterSetForModel,
  DEVICE_FAMILIES,
  DEVICE_MODEL_IDS,
  DEVICE_MODELS,
  type DeviceAnimation,
  type DeviceAppearance,
  type DeviceColor,
  type DeviceFamily,
  type DeviceFamilyId,
  type DeviceGeometry,
  type DeviceModel,
  deviceModelForDeviceType,
  deviceModelForPreset,
  type DeviceModelId,
  type DeviceModelRef,
  type DisplayTechnology,
  isDeviceModelId,
  ledSpecForModel,
  modelsByTechnology,
  resolveDeviceModel,
  tryResolveDeviceModel,
  validateDeviceModel,
} from "./lib/devices";
export { LED_FONTS, type LedFont, type LedFontId } from "./lib/led-fonts";
export {
  type BoardCellGrid,
  DEFAULT_LED_TEXT_COLOR,
  frameToAscii,
  frameToBits,
  layoutLedCellGrid,
  layoutLedMessage,
  LED_MATRIX_PRESETS,
  LED_MONO_COLORS,
  ledBackgroundMask,
  type LedCell,
  type LedDrawOp,
  type LedFrame,
  type LedGridLayout,
  ledGridLayout,
  type LedLayout,
  type LedLayoutOptions,
  type LedLetterCase,
  type LedMatrixPreset,
  type LedMatrixPresetId,
  type LedMatrixSpec,
  type LedMonoColorName,
  MAX_MATRIX_SIZE,
  MIN_MATRIX_SIZE,
  parseHexColor,
  rasterizeLedLayout,
  renderLedFrame,
  renderLedGlyph,
} from "./lib/led-matrix";
// LED transitions: the engine (a pure function of time between two layouts,
// sampled by the preview and by device adapters) and the menu a device model
// is judged against. The seeded scramble's hash and generator stay internal;
// `ledScramblePool` and `ledFlipSeed` are exported so a port can prove its
// pool and its seeds match before it compares frames.
export {
  defaultTransitionIdForModel,
  isLedTransitionId,
  LED_TRANSITION_IDS,
  LED_TRANSITIONS,
  type LedTransitionAvailability,
  type LedTransitionEntry,
  type LedTransitionId,
  type ResolvedLedTransition,
  resolveLedTransition,
  transitionsForModel,
  transitionSpecForDevice,
} from "./lib/led-transition-registry";
export {
  DEFAULT_LED_FLIP_STAGGER,
  DEFAULT_LED_FLIP_STEP_MS,
  DEFAULT_LED_SCRAMBLE_STEPS,
  DEFAULT_LED_TRANSITION_MS,
  LED_TRANSITION_KINDS,
  ledFlipSeed,
  ledScramblePool,
  type LedTransition,
  ledTransitionFrames,
  type LedTransitionKind,
  type LedTransitionSpec,
  MIN_CASCADE_SLOT_MS,
  planLedTransition,
} from "./lib/led-transitions";
// Data display — derived metrics rendered for reading, not editing (#229).
export * from "./components/data/bar-list";
export * from "./components/data/stat-strip";
// Plugin directory — how a plugin is advertised on a card and a detail page.
export * from "./components/plugin/board-showcase";
export * from "./components/plugin/plugin-card";
export * from "./components/plugin/plugin-category-badge";
export * from "./components/plugin/scaled-board-teaser";
// Template editor — the TipTap-backed authoring surface for board templates.
//
// Consumers must also import its stylesheet, which is not bundled into the JS:
//   import "@fiestaboard/ui/editor.css";
//
// NOT exported here, deliberately: `components/editor/formula/formula-editor-panel`.
// It pulls in CodeMirror (~140 kB), which must not enter the module graph of an
// app that only renders a board template. It stays reachable by deep subpath:
//   import { FormulaEditorPanel } from "@fiestaboard/ui/components/editor/formula/formula-editor-panel";
// FormulaNodeView reaches it through a `lazy()` dynamic import, so it lands in a
// separate async chunk rather than the barrel's graph — keep it that way.
export * from "./components/editor/constants";
export * from "./components/editor/template-editor";
export * from "./components/editor/template-editor-toolbar";
export * from "./components/editor/toolbar-dropdown";
// Pickers — rendered by the toolbar, exported so an app can host them standalone.
export * from "./components/editor/color-picker-content";
export * from "./components/editor/draw-char-picker-content";
export * from "./components/editor/filter-picker-content";
export * from "./components/editor/formatting-picker-content";
export * from "./components/editor/variable-picker-content";
// TipTap schema + node views, for apps composing their own editor instance.
export * from "./components/editor/extensions/color-tile-node";
export * from "./components/editor/extensions/fill-space-node";
export * from "./components/editor/extensions/formula-node";
export * from "./components/editor/extensions/line-navigation";
export * from "./components/editor/extensions/single-paragraph-doc";
export * from "./components/editor/extensions/trailing-newline";
export * from "./components/editor/extensions/variable-node";
export * from "./components/editor/extensions/wrapped-text-node";
export * from "./components/editor/node-views/color-tile-node-view";
export * from "./components/editor/node-views/fill-space-node-view";
export * from "./components/editor/node-views/formula-node-view";
export * from "./components/editor/node-views/node-view-context";
export * from "./components/editor/node-views/variable-node-view";
export * from "./components/editor/node-views/wrapped-text-view";
// Template (de)serialization and draw-mode geometry — pure, no TipTap instance.
export * from "./components/editor/utils/draw-mode";
export * from "./components/editor/utils/insertion";
export * from "./components/editor/utils/length-calculator";
export * from "./components/editor/utils/serialization";
export * from "./components/editor/utils/stroke-transaction";
// AI — chat/agent surfaces (src/components/ai/CONVENTIONS.md). The
// vocabulary follows shadcn "AI Elements"; the implementation is ours.
export * from "./components/ai/actions";
export * from "./components/ai/conversation";
export * from "./components/ai/loader";
export * from "./components/ai/message";
export * from "./components/ai/prompt-input";
export * from "./components/ai/shimmer";
export * from "./components/ai/spotlight";
export * from "./components/ai/suggestion";
export * from "./components/ai/task";
export * from "./components/ai/tool";
