/**
 * @fiestaboard/ui — the FiestaBoard design system.
 *
 * Styling contract (Tailwind v4 consumers):
 *   @import "tailwindcss";
 *   @import "@fiestaboard/ui/theme.css";
 *   @source "../node_modules/@fiestaboard/ui/dist";
 */
export * from "./components/ui/accordion";
export * from "./components/ui/alert";
export * from "./components/ui/alert-dialog";
export * from "./components/ui/aurora";
export * from "./components/ui/badge";
export * from "./components/ui/button";
export * from "./components/ui/card";
export * from "./components/ui/collapsible";
export * from "./components/ui/dialog";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/empty-state";
export * from "./components/ui/flex";
export * from "./components/ui/grid";
export * from "./components/ui/input";
export * from "./components/ui/label";
// react-bits components are default exports — re-export them as named.
export { default as DecryptedText } from "./components/ui/react-bits/decrypted-text";
export { default as FadeContent } from "./components/ui/react-bits/fade-content";
export * from "./components/ui/scroll-area";
export * from "./components/ui/select";
export * from "./components/ui/sheet";
export * from "./components/ui/skeleton";
export * from "./components/ui/slider";
export * from "./components/ui/stack";
export * from "./components/ui/switch";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/tooltip";
// App chrome — branding, sidebar, layout, festive treatments.
export * from "./components/chrome/board-icon";
export * from "./components/chrome/board-selector";
export * from "./components/chrome/fiesta-icon";
export * from "./components/chrome/fiesta-logo";
export * from "./components/chrome/language-selector";
export * from "./components/chrome/main-content";
export * from "./components/chrome/sidebar";
export * from "./components/chrome/skip-to-content";
export * from "./components/chrome/theme-toggle";
export * from "./components/seasons/sidebar-aurora";
export * from "./components/seasons/sidebar-aurora-horizontal";
export * from "./lib/seasons";
export { cn } from "./lib/utils";
// Board preview — the split-flap Vestaboard display renderer + its data.
export * from "./components/board/board-display";
export * from "./components/board/scaled-board-display";
export * from "./components/board/static-board-display";
export * from "./lib/board-characters";
export * from "./lib/board-colors";
export * from "./lib/board-dimensions";
