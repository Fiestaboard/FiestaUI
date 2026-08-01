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
export * from "./components/ui/checkbox";
export * from "./components/ui/collapsible";
export * from "./components/ui/dialog";
export * from "./components/ui/dropdown-menu";
export * from "./components/ui/empty-state";
export * from "./components/ui/input";
export * from "./components/ui/label";
// react-bits components are default exports — re-export them as named.
export { default as BlurText } from "./components/ui/react-bits/blur-text";
export { default as CountUp } from "./components/ui/react-bits/count-up";
export { default as DecryptedText } from "./components/ui/react-bits/decrypted-text";
export { default as FadeContent } from "./components/ui/react-bits/fade-content";
export { default as SpotlightCard } from "./components/ui/react-bits/spotlight-card";
export * from "./components/ui/scroll-area";
export * from "./components/ui/select";
export * from "./components/ui/sheet";
export * from "./components/ui/skeleton";
export * from "./components/ui/slider";
export * from "./components/ui/switch";
export * from "./components/ui/tabs";
export * from "./components/ui/textarea";
export * from "./components/ui/tooltip";
export { cn } from "./lib/utils";
