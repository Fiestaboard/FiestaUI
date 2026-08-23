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
export * from "./components/chrome/page-header";
export * from "./components/chrome/page-inset";
export * from "./components/chrome/page-layout";
export * from "./components/chrome/page-toolbar";
export * from "./components/chrome/pagination";
export * from "./components/chrome/sidebar";
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
export * from "./lib/board-previews";
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
