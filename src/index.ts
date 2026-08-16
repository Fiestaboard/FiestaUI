/**
 * @fiestaboard/ui — the FiestaBoard design system.
 *
 * Styling contract (Tailwind v4 consumers):
 *   @import "tailwindcss";
 *   @import "@fiestaboard/ui/theme.css";
 *   @source "../node_modules/@fiestaboard/ui/dist";
 */
export * from "./components/containment/accordion";
export * from "./components/containment/card";
export * from "./components/containment/collapsible";
export * from "./components/containment/json-tree";
export * from "./components/effects/aurora";
export * from "./components/feedback/alert";
export * from "./components/feedback/badge";
export * from "./components/feedback/empty-state";
export * from "./components/forms/button";
export * from "./components/forms/checkbox";
export * from "./components/forms/input";
export * from "./components/forms/label";
export * from "./components/forms/secret-input";
export * from "./components/layout/box";
export * from "./components/layout/flex";
export * from "./components/layout/grid";
export * from "./components/overlays/alert-dialog";
export * from "./components/overlays/dialog";
export * from "./components/overlays/dropdown-menu";
export * from "./components/overlays/popover";
export * from "./components/typography/code";
export * from "./components/typography/heading";
export * from "./components/typography/list";
// react-bits components are default exports — re-export them as named.
export * from "./components/containment/scroll-area";
export * from "./components/containment/table";
export * from "./components/containment/tabs";
export { default as DecryptedText } from "./components/effects/react-bits/decrypted-text";
export { default as FadeContent } from "./components/effects/react-bits/fade-content";
export * from "./components/feedback/skeleton";
export * from "./components/feedback/spinner";
export * from "./components/feedback/status-dot";
export * from "./components/forms/select";
export * from "./components/forms/slider";
export * from "./components/forms/switch";
export * from "./components/forms/textarea";
export * from "./components/forms/time-picker";
export * from "./components/forms/toggle-card";
export * from "./components/layout/stack";
export * from "./components/overlays/sheet";
export * from "./components/overlays/tooltip";
export * from "./components/typography/text";
export * from "./components/typography/text-link";
// App chrome — branding, sidebar, layout, festive treatments.
export * from "./components/chrome/board-icon";
export * from "./components/chrome/board-selector";
export * from "./components/chrome/fiesta-icon";
export * from "./components/chrome/fiesta-logo";
export * from "./components/chrome/language-selector";
export * from "./components/chrome/main-content";
export * from "./components/chrome/page-header";
export * from "./components/chrome/page-layout";
export * from "./components/chrome/page-toolbar";
export * from "./components/chrome/sidebar";
export * from "./components/chrome/skip-to-content";
export * from "./components/chrome/theme-toggle";
export * from "./components/seasons/sidebar-aurora";
export * from "./components/seasons/sidebar-aurora-horizontal";
export * from "./lib/seasons";
export { cn } from "./lib/utils";
// Board preview — the split-flap Vestaboard display renderer + its data.
export * from "./components/board/board-display";
export * from "./components/board/board-teaser";
export * from "./components/board/scaled-board-display";
export * from "./components/board/static-board-display";
export * from "./lib/board-characters";
export * from "./lib/board-colors";
export * from "./lib/board-dimensions";
export * from "./lib/board-previews";
// Plugin directory — how a plugin is advertised on a card and a detail page.
export * from "./components/plugin/board-showcase";
export * from "./components/plugin/plugin-card";
export * from "./components/plugin/plugin-category-badge";
export * from "./components/plugin/scaled-board-teaser";
